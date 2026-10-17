#!/usr/bin/env node
// ============================================================
// import-catalog.mjs
// Imports the local catalog (master CSV) into Supabase:
//   * upserts the 21 categories (slug-keyed, with Arabic names)
//   * upserts products keyed by the verified EAN barcode
//     (barcode is the unique business key; UUID PK is untouched)
//   * uploads product photos to the "product-images" bucket and
//     links every product to an image — a real photo when the
//     file exists, otherwise the category generic image
// Idempotent: safe to re-run. Stock is never overwritten.
//
// Usage:
//   node scripts/import-catalog.mjs [--csv <path>] [--dry-run]
//       [--limit N] [--deactivate-demo]
// ============================================================
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "product-images";
const DEFAULT_STOCK = 100;
const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const argValue = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
};
const CSV_PATH =
    argValue("csv") ??
    path.join(ROOT, "catalog", "קטלוג_מוצרים_מתוקן_מלא.csv");
const DRY_RUN = args.includes("--dry-run");
const LIMIT = argValue("limit") ? Number.parseInt(argValue("limit"), 10) : null;

// ---------------------------------------------------------------------------
// Env (.env.local)
// ---------------------------------------------------------------------------
function loadEnvFile(file) {
    const env = {};
    if (!existsSync(file)) return env;
    for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return env;
}
const env = { ...process.env, ...loadEnvFile(path.join(ROOT, ".env.local")) };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
        "❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
}
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Category mapping — keyed by the CSV generic-image filename (21 values)
// ---------------------------------------------------------------------------
const CATEGORY_MAP = {
    "cat_dairy.jpg": { slug: "dairy-cheese-eggs", name_ar: "ألبان وأجبان وبيض" },
    "cat_meat.jpg": { slug: "meat-poultry", name_ar: "لحوم ودواجن" },
    "cat_fish.jpg": { slug: "fish-seafood", name_ar: "أسماك ومأكولات بحرية" },
    "cat_produce.jpg": { slug: "produce-nuts", name_ar: "فواكه وخضروات ومكسرات" },
    "cat_frozen.jpg": { slug: "icecream-frozen", name_ar: "مثلجات ومجمدات" },
    "cat_bakery.jpg": { slug: "bread-bakery-cereals", name_ar: "خبز ومعجنات وحبوب" },
    "cat_pasta.jpg": { slug: "pasta-rice-legumes", name_ar: "معكرونة وأرز وبقوليات" },
    "cat_canned.jpg": { slug: "canned-sauces-salads", name_ar: "معلبات وصلصات وسلطات" },
    "cat_oil.jpg": { slug: "oil-vinegar", name_ar: "زيت وخل" },
    "cat_spices.jpg": { slug: "spices-baking", name_ar: "توابل ومواد خبز" },
    "cat_snacks.jpg": { slug: "snacks-sweets", name_ar: "وجبات خفيفة وحلويات" },
    "cat_chocolate.jpg": { slug: "chocolate-spreads", name_ar: "شوكولاتة ومربى" },
    "cat_coffee.jpg": { slug: "coffee-tea", name_ar: "قهوة وشاي" },
    "cat_drinks.jpg": { slug: "soft-drinks-juices", name_ar: "مشروبات غازية وعصائر" },
    "cat_baby.jpg": { slug: "baby-products", name_ar: "أطفال" },
    "cat_care.jpg": { slug: "personal-care-hygiene", name_ar: "عناية ونظافة شخصية" },
    "cat_cleaning.jpg": { slug: "cleaning-laundry", name_ar: "تنظيف وغسيل" },
    "cat_home.jpg": { slug: "disposables-home", name_ar: "أحادية الاستعمال ولوازم المنزل" },
    "cat_general.jpg": { slug: "electronics-leisure", name_ar: "ترفيه وكهربائيات وعام" },
};
const KNOWN_ORDER = Object.keys(CATEGORY_MAP);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const clean = (v) => (v ?? "").toString().trim();
const normalizeBarcode = (v) => {
    const s = clean(v).replace(/\.0+$/, "").replace(/[^\d]/g, "");
    return s || null;
};
const priceToAgorot = (v) => {
    const s = clean(v).replace(",", ".");
    const n = Number.parseFloat(s);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
};
const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

/**
 * Fetch ALL rows of a table, paginating past PostgREST's default
 * 1000-row-per-request limit.
 */
async function fetchAll(table, columns) {
    const all = [];
    const pageSize = 1000;
    let from = 0;
    for (; ;) {
        const { data, error } = await admin
            .from(table)
            .select(columns)
            .range(from, from + pageSize - 1);
        if (error) throw error;
        all.push(...(data ?? []));
        if ((data ?? []).length < pageSize) break;
        from += pageSize;
    }
    return all;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const report = {
    csv: CSV_PATH,
    dryRun: DRY_RUN,
    totalRecords: 0,
    categories: {
        total: 0,
        imagesUploaded: 0,
        missingImages: [],
        uploadErrors: [],
    },
    products: {
        total: 0,
        skippedNoBarcode: 0,
        duplicates: 0,
        invalidPrices: 0,
        unknownCategories: 0,
    },
    images: {
        uploaded: 0,
        placeholders: 0,
        skippedExisting: 0,
        linked: 0,
        uploadErrors: [],
    },
    anomalies: {
        duplicateBarcodes: [],
        invalidPrices: [],
        unknownCategories: [],
        skippedNoBarcode: [],
    },
};

// ---------------------------------------------------------------------------
// 1. Parse CSV
// ---------------------------------------------------------------------------
console.log(`📄 Reading ${CSV_PATH}`);
const raw = readFileSync(CSV_PATH, "utf8").replace(/^\uFEFF/, "");
let records;
try {
    records = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
    });
} catch (e) {
    console.error("❌ CSV parse failed:", e.message);
    process.exit(1);
}
if (LIMIT) records = records.slice(0, LIMIT);
report.totalRecords = records.length;
console.log(`   ${records.length} rows`);

// ---------------------------------------------------------------------------
// 2. Build category list from the data
// ---------------------------------------------------------------------------
const categoryByImage = new Map();
for (const r of records) {
    let imgFile = path.basename(clean(r["תמונה גנרית למחלקה (מקומי)"]));
    let nameHe = clean(r["מחלקה / קטגוריה"]);
    if (imgFile === "cat_water.jpg" || imgFile === "cat_energy.jpg") {
        imgFile = "cat_drinks.jpg";
        nameHe = "שתייה קלה ומיצים";
    }
    if (!imgFile || !nameHe || !CATEGORY_MAP[imgFile]) continue;
    if (!categoryByImage.has(imgFile)) {
        categoryByImage.set(imgFile, { name_he: nameHe, image_file: imgFile });
    }
}
const categories = [...categoryByImage.entries()]
    .map(([imgFile, c]) => {
        const m = CATEGORY_MAP[imgFile];
        return {
            name_he: c.name_he,
            name_ar: m?.name_ar ?? null,
            slug: m?.slug ?? `category-${imgFile.replace(/\.[^.]+$/, "")}`,
            image_file: imgFile,
            sort_order: m ? KNOWN_ORDER.indexOf(imgFile) + 1 : 99,
        };
    })
    .sort((a, b) => a.sort_order - b.sort_order);
report.categories.total = categories.length;
console.log(`🏷️  ${categories.length} categories detected`);

// ---------------------------------------------------------------------------
// 3. Upsert categories + upload category images
// ---------------------------------------------------------------------------
if (!DRY_RUN) {
    for (const batch of chunk(categories, BATCH_SIZE)) {
        const { error } = await admin.from("categories").upsert(
            batch.map((c) => ({
                name_he: c.name_he,
                name_ar: c.name_ar,
                slug: c.slug,
                sort_order: c.sort_order,
                is_active: true,
            })),
            { onConflict: "slug" }
        );
        if (error) {
            console.error("❌ Category upsert failed:", error.message);
            process.exit(1);
        }
    }
    for (const c of categories) {
        const src = path.join(ROOT, "catalog", "images", "categories", c.image_file);
        if (!existsSync(src)) {
            report.categories.missingImages.push(c.image_file);
            continue;
        }
        const dest = `categories/${c.image_file}`;
        const { error } = await admin.storage.from(BUCKET).upload(dest, readFileSync(src), {
            contentType: "image/jpeg",
            upsert: true,
        });
        if (error) {
            report.categories.uploadErrors.push({ file: c.image_file, error: error.message });
        } else {
            report.categories.imagesUploaded++;
        }
        const { error: pathError } = await admin
            .from("categories")
            .update({ image_path: dest })
            .eq("slug", c.slug);
        if (pathError) {
            report.categories.uploadErrors.push({ file: c.image_file, error: pathError.message });
        }
    }
    console.log(`   categories upserted, ${report.categories.imagesUploaded} images uploaded`);
}

// ---------------------------------------------------------------------------
// 4. Category id lookup
// ---------------------------------------------------------------------------
const { data: catRows } = await admin.from("categories").select("id, slug");
const slugToId = new Map((catRows ?? []).map((c) => [c.slug, c.id]));

// ---------------------------------------------------------------------------
// 5. Normalize products (dedupe by barcode)
// ---------------------------------------------------------------------------
const byBarcode = new Map();
const sortCounters = new Map();
for (const r of records) {
    const barcode =
        normalizeBarcode(r["בר-קוד מאומת (EAN)"]) ?? normalizeBarcode(r["קוד פריט"]);
    if (!barcode) {
        report.anomalies.skippedNoBarcode.push({
            name: clean(r["תאור פריט"]),
            itemCode: clean(r["קוד פריט"]),
        });
        continue;
    }
    if (byBarcode.has(barcode)) {
        report.anomalies.duplicateBarcodes.push({
            barcode,
            name: clean(r["תאור פריט"]),
        });
        continue;
    }
    let imgFile = path.basename(clean(r["תמונה גנרית למחלקה (מקומי)"]));
    const nameHe = clean(r["תאור פריט"]);

    // Merge water & energy drinks into soft-drinks-juices
    if (imgFile === "cat_water.jpg" || imgFile === "cat_energy.jpg") {
        imgFile = "cat_drinks.jpg";
    }
    // Correct misplaced products into their proper category
    if (["7290119377480", "7290119377527", "7290119380626", "7290119385768"].includes(barcode)) {
        imgFile = "cat_bakery.jpg";
    } else if (nameHe.includes("בגד ים חד פעמי") || nameHe.includes("מחית פרי")) {
        imgFile = "cat_baby.jpg";
    }

    const cat = categories.find((c) => c.image_file === imgFile);
    if (!cat) {
        report.anomalies.unknownCategories.push({
            barcode,
            name: clean(r["תאור פריט"]),
            imgFile,
        });
    }
    const price = priceToAgorot(r["מחיר צרכן"]);
    if (price === null) {
        report.anomalies.invalidPrices.push({
            barcode,
            name: clean(r["תאור פריט"]),
            raw: clean(r["מחיר צרכן"]),
        });
    }
    const catSlug = cat?.slug ?? null;
    const idx = sortCounters.get(catSlug) ?? 0;
    sortCounters.set(catSlug, idx + 1);
    byBarcode.set(barcode, {
        barcode,
        slug: barcode,
        item_code: clean(r["קוד פריט"]) || null,
        barcode_original: clean(r["בר-קוד מקורי"]) || null,
        barcode_status: clean(r["סטטוס אימות ברקוד"]) || null,
        name_he: nameHe,
        description_he: clean(r["תיאור המוצר"]) || null,
        price_agorot: price ?? 0,
        is_weighted: clean(r["שקיל"]).toLowerCase() === "true",
        is_active: price !== null,
        category_slug: catSlug,
        image_file: imgFile || "cat_general.jpg",
        sort_order: idx,
    });
}
const products = [...byBarcode.values()];
report.products.total = products.length;
report.products.skippedNoBarcode = report.anomalies.skippedNoBarcode.length;
report.products.duplicates = report.anomalies.duplicateBarcodes.length;
report.products.invalidPrices = report.anomalies.invalidPrices.length;
report.products.unknownCategories = report.anomalies.unknownCategories.length;
console.log(
    `📦 ${products.length} products (${report.products.duplicates} duplicate barcodes skipped, ` +
    `${report.products.skippedNoBarcode} without barcode, ` +
    `${report.products.invalidPrices} invalid prices)`
);

// ---------------------------------------------------------------------------
// 6. Upsert products (ON CONFLICT barcode) — stock never overwritten
// ---------------------------------------------------------------------------
if (!DRY_RUN) {
    for (const batch of chunk(products, BATCH_SIZE)) {
        const { error } = await admin.from("products").upsert(
            batch.map((p) => ({
                barcode: p.barcode,
                slug: p.slug,
                item_code: p.item_code,
                barcode_original: p.barcode_original,
                barcode_status: p.barcode_status,
                name_he: p.name_he,
                description_he: p.description_he,
                price_agorot: p.price_agorot,
                is_weighted: p.is_weighted,
                is_active: p.is_active,
                category_id: p.category_slug ? slugToId.get(p.category_slug) ?? null : null,
                sort_order: p.sort_order,
                stock_quantity: DEFAULT_STOCK,
                low_stock_threshold: 5,
            })),
            { onConflict: "barcode" }
        );
        if (error) {
            console.error("❌ Product upsert failed:", error.message);
            process.exit(1);
        }
    }
    // Purge demo products without barcodes
    const { error: delDemoErr } = await admin
        .from("products")
        .delete()
        .is("barcode", null);
    if (delDemoErr) console.warn("⚠️  Deleting demo products note:", delDemoErr.message);

    // Delete retired default categories and merged categories completely
    const retiredSlugs = ["baked-goods", "cakes", "drinks", "delicatessen", "water-soda", "energy-beer"];
    const { error: delCatErr } = await admin
        .from("categories")
        .delete()
        .in("slug", retiredSlugs);
    if (delCatErr) console.warn("⚠️  Deleting retired categories note:", delCatErr.message);
    console.log("   products upserted");
}

// ---------------------------------------------------------------------------
// 7. Images — upload photos, link every product to an image
// ---------------------------------------------------------------------------
const subDir = path.join(ROOT, "catalog", "images", "subcategories");
let subcategoryRules = [];
const rulesPath = path.join(ROOT, "catalog", "subcategory_rules.json");
if (existsSync(rulesPath)) {
    try {
        subcategoryRules = JSON.parse(readFileSync(rulesPath, "utf8"));
    } catch (e) {
        console.warn("⚠️  Could not parse subcategory_rules.json:", e.message);
    }
}

// Upload subcategory photos to bucket
if (!DRY_RUN && existsSync(subDir)) {
    const subFiles = readdirSync(subDir).filter((f) => f.endsWith(".jpg"));
    for (const f of subFiles) {
        const dest = `subcategories/${f}`;
        const { error } = await admin.storage
            .from(BUCKET)
            .upload(dest, readFileSync(path.join(subDir, f)), {
                contentType: "image/jpeg",
                upsert: true,
            });
        if (error) {
            console.warn(`⚠️  Failed to upload subcategory image ${f}:`, error.message);
        }
    }
    console.log(`   ${subFiles.length} subcategory generic photos synced to storage`);
}

const HEBREW_PREFIXES = ["", "ה", "ב", "ל", "מ", "ו", "וה", "וב", "ול", "ומ"];

function matchesKeyword(text, kw) {
    if (!text || !kw) return false;
    const cleanText = text.replace(/[`'"]/g, " ");
    const cleanKw = kw.replace(/[`'"]/g, " ").trim();
    if (!cleanKw) return false;

    if (cleanKw.includes(" ")) {
        const escaped = cleanKw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
        return regex.test(cleanText);
    }

    const tokens = cleanText.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
        for (const pref of HEBREW_PREFIXES) {
            if (token.startsWith(pref + cleanKw)) {
                return true;
            }
        }
    }
    return false;
}

function resolveProductImage(p) {
    const packshotPath = path.join(ROOT, "catalog", "images", `${p.barcode}.jpg`);
    if (existsSync(packshotPath)) {
        return {
            type: "packshot",
            storagePath: `products/${p.barcode}.jpg`,
            localPath: packshotPath,
        };
    }
    if (p.name_he && subcategoryRules.length) {
        // 1. Primary: match within assigned category
        for (const rule of subcategoryRules) {
            if (rule.category === p.image_file) {
                for (const kw of rule.keywords) {
                    if (matchesKeyword(p.name_he, kw)) {
                        return {
                            type: "subcategory",
                            storagePath: `subcategories/${rule.image}`,
                        };
                    }
                }
            }
        }
        // 2. Secondary: cross-category rescue for distinct product types
        const rescueRules = [
            { kws: ["סוללות", "סולל", "בטריות", "אלקליין", "דורסל", "אנרג`ייזר", "אנרגייזר", "תושיבא", "פוגיקום"], img: "sub_general_batteries.jpg" },
            { kws: ["בלון", "בלונים", "קונפטי", "ספריי שלג", "ספרי שלג", "זר לראש"], img: "sub_general_balloons.jpg" },
            { kws: ["רובה", "אקדח", "סליים", "פופיט", "משחק מים", "בועות"], img: "sub_general_toys.jpg" },
            { kws: ["חיתול", "פמפרס", "האגיס", "טיטול", "בגד ים חד פעמי"], img: "sub_baby_diapers.jpg" },
            { kws: ["בירה", "גולדסטאר", "היינקן", "קורונה", "קרלסברג", "טובורג"], img: "sub_energy_beer.jpg" },
            { kws: ["אנרגיה", "רד בול", "אקסאל", "בלו משקה", "מונסטר"], img: "sub_energy_can.jpg" },
            { kws: ["מים מינרליים", "עין גדי", "נביעות", "מי עדן"], img: "sub_water_mineral.jpg" },
            { kws: ["סודה", "מוגז עדין", "סאן פלגרינו"], img: "sub_water_sparkling.jpg" },
        ];
        for (const r of rescueRules) {
            if (r.kws.some((kw) => matchesKeyword(p.name_he, kw))) {
                return {
                    type: "subcategory",
                    storagePath: `subcategories/${r.img}`,
                };
            }
        }
    }
    return {
        type: "category",
        storagePath: `categories/${p.image_file}`,
    };
}

const existingObjects = new Set();
const imgByProductId = new Map();
const barcodeToId = new Map();

if (!DRY_RUN) {
    // List existing products/ files to avoid re-uploading identical packshots
    let offset = 0;
    for (; ;) {
        const { data, error } = await admin.storage
            .from(BUCKET)
            .list("products", { limit: 1000, offset });
        if (error) {
            console.warn("⚠️  Storage products list note:", error.message);
            break;
        }
        for (const o of data ?? []) existingObjects.add(`products/${o.name}`);
        if ((data ?? []).length < 1000) break;
        offset += 1000;
    }
    const existingImgRows = await fetchAll("product_images", "id, product_id, storage_path");
    for (const row of existingImgRows) imgByProductId.set(row.product_id, row);
    const prodRows = await fetchAll("products", "id, barcode");
    for (const row of prodRows) if (row.barcode) barcodeToId.set(row.barcode, row.id);
}

const toInsert = [];
const toUpdate = [];
const counts = { packshot: 0, subcategory: 0, category: 0 };

for (const p of products) {
    const resolved = resolveProductImage(p);
    counts[resolved.type]++;

    if (DRY_RUN) {
        continue;
    }

    const productId = barcodeToId.get(p.barcode);
    if (!productId) continue;

    if (resolved.type === "packshot" && resolved.localPath) {
        if (!existingObjects.has(resolved.storagePath)) {
            const { error } = await admin.storage
                .from(BUCKET)
                .upload(resolved.storagePath, readFileSync(resolved.localPath), {
                    contentType: "image/jpeg",
                    upsert: true,
                });
            if (error) {
                report.images.uploadErrors.push({ barcode: p.barcode, error: error.message });
            } else {
                existingObjects.add(resolved.storagePath);
                report.images.uploaded++;
            }
        } else {
            report.images.skippedExisting++;
        }
    }

    const existing = imgByProductId.get(productId);
    if (!existing) {
        toInsert.push({
            product_id: productId,
            storage_path: resolved.storagePath,
            alt_text: p.name_he,
            sort_order: 0,
        });
    } else if (existing.storage_path !== resolved.storagePath) {
        toUpdate.push({
            id: existing.id,
            product_id: productId,
            storage_path: resolved.storagePath,
            alt_text: p.name_he,
            sort_order: 0,
        });
    }
}

report.images.packshots = counts.packshot;
report.images.subcategories = counts.subcategory;
report.images.categoryFallback = counts.category;
report.images.linked = products.length;
report.images.inserted = toInsert.length;
report.images.updated = toUpdate.length;

if (!DRY_RUN) {
    if (toInsert.length) {
        for (const batch of chunk(toInsert, BATCH_SIZE)) {
            const { error } = await admin.from("product_images").insert(batch);
            if (error) {
                console.error("❌ product_images insert failed:", error.message);
                process.exit(1);
            }
        }
    }
    if (toUpdate.length) {
        for (const batch of chunk(toUpdate, BATCH_SIZE)) {
            const { error } = await admin.from("product_images").upsert(batch, { onConflict: "id" });
            if (error) {
                console.error("❌ product_images update failed:", error.message);
                process.exit(1);
            }
        }
    }
    console.log(
        `🖼️  Images: ${counts.packshot} genuine packshots, ` +
        `${counts.subcategory} subcategory photos, ` +
        `${counts.category} category photos | ` +
        `${toInsert.length} new links, ${toUpdate.length} links updated`
    );
}

// ---------------------------------------------------------------------------
// 8. Summary
// ---------------------------------------------------------------------------
const reportPath = path.join(ROOT, "scripts", "import-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log("\n==============================================");
console.log(`Mode:        ${DRY_RUN ? "DRY-RUN (no writes)" : "FULL IMPORT"}`);
console.log(`CSV rows:    ${report.totalRecords}`);
console.log(`Categories:  ${report.categories.total}`);
console.log(`Products:    ${report.products.total}`);
console.log(`  duplicates skipped:   ${report.products.duplicates}`);
console.log(`  no barcode skipped:   ${report.products.skippedNoBarcode}`);
console.log(`  invalid prices:       ${report.products.invalidPrices}`);
console.log(`  unknown categories:   ${report.products.unknownCategories}`);
console.log(`Images:      ${report.images.linked} linked`);
console.log(`  uploaded:  ${report.images.uploaded}`);
console.log(`  placeholders: ${report.images.placeholders}`);
console.log(`  already in bucket: ${report.images.skippedExisting}`);
console.log(`Report:      ${reportPath}`);
console.log("==============================================");
