#!/usr/bin/env python3
"""
scripts/replace_duplicate_images.py

Finds products that currently use duplicate/fallback category or subcategory images,
searches for authentic manufacturer packshots by barcode or exact name across:
  1. Shufersal Direct (Cloudinary high-res packshots by barcode & item_code)
  2. Pricez Direct (Israeli supermarket photo database by barcode & item_code)
  3. Super-Pharm Direct (Cosmetics, baby care & hygiene packshots)
  4. OpenFoodFacts API (Manufacturer packaging database)
  5. Shufersal Search (Search by exact product title & verification)
  6. Bing Image Search (Exact barcode packshots for specialty items)

Normalizes downloaded photos into professional 800x800 white-padded JPEGs,
saves them to catalog/images/{barcode}.jpg, uploads them to Supabase Storage
under product-images/products/{barcode}.jpg, and updates product_images in PostgreSQL.
"""

import os
import io
import re
import json
import time
import asyncio
import subprocess
import urllib.parse
from PIL import Image
from curl_cffi.requests import AsyncSession

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_IMAGES_DIR = os.path.join(ROOT, "catalog", "images")
REPORT_PATH = os.path.join(ROOT, "scripts", "duplicate_images_replacement_report.json")
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
STORAGE_URL = "http://127.0.0.1:54321/storage/v1/object/product-images"
CONCURRENCY = 25

os.makedirs(CATALOG_IMAGES_DIR, exist_ok=True)

def get_products_with_duplicate_images():
    """Fetch all products currently pointing to category or subcategory fallback images."""
    cmd = [
        "docker", "exec", "supabase_db_omar", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "\t", "-c",
        """
        SELECT p.id, p.barcode, COALESCE(p.item_code, ''), p.name_he, pi.storage_path
        FROM products p
        JOIN product_images pi ON pi.product_id = p.id
        WHERE pi.storage_path LIKE 'categories/%' OR pi.storage_path LIKE 'subcategories/%'
        ORDER BY p.id;
        """
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    items = []
    for line in res.stdout.strip().split("\n"):
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) >= 5:
            items.append({
                "id": parts[0],
                "barcode": parts[1].strip(),
                "item_code": parts[2].strip(),
                "name": parts[3].strip(),
                "current_image": parts[4].strip()
            })
    return items

def normalize_to_square_jpeg(data: bytes) -> bytes:
    """Validate image bytes and convert to clean square 800x800 white-padded JPEG."""
    im = Image.open(io.BytesIO(data))
    if im.width < 50 or im.height < 50:
        raise ValueError("Image too small")

    if im.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', im.size, (255, 255, 255))
        if im.mode == 'P':
            im = im.convert('RGBA')
        alpha = im.split()[-1]
        bg.paste(im, mask=alpha)
        im = bg
    elif im.mode != 'RGB':
        im = im.convert('RGB')

    max_dim = max(im.width, im.height)
    square = Image.new('RGB', (max_dim, max_dim), (255, 255, 255))
    square.paste(im, ((max_dim - im.width) // 2, (max_dim - im.height) // 2))

    if max_dim > 800:
        square = square.resize((800, 800), Image.Resampling.LANCZOS)

    out = io.BytesIO()
    square.save(out, format='JPEG', quality=88, optimize=True)
    return out.getvalue()

async def upload_image_to_storage(session: AsyncSession, storage_path: str, data: bytes) -> bool:
    headers = {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "apikey": SERVICE_KEY,
        "Content-Type": "image/jpeg",
        "x-upsert": "true"
    }
    url = f"{STORAGE_URL}/{storage_path}"
    try:
        r = await session.post(url, headers=headers, data=data, timeout=8)
        return r.status_code in (200, 201)
    except Exception:
        return False

def clean_product_name(name: str) -> str:
    """Clean product name by removing special packaging codes, asterisk quantities, etc."""
    # remove asterisk packages like '12*80ג' or '24 יח`'
    s = re.sub(r'\d+\s*[\*xX]\s*\d+.*', '', name)
    s = re.sub(r'\d+\s*(?:יח|גרם|גר|קג|ק``ג|ליטר|מל|מ``ל|מ\"ל|ל\').*', '', s)
    s = s.replace('`', ' ').replace('"', ' ').replace("'", ' ').strip()
    return s

async def search_shufersal_direct(session: AsyncSession, code: str):
    url = f"https://www.shufersal.co.il/online/he/p/P_{code}"
    try:
        r = await session.get(url, timeout=3)
        if r.status_code == 200:
            m = re.findall(r'https://res\.cloudinary\.com/shufersal/image/upload/[^"\']+/products_(?:zoom|large)/[^"\']*_P_' + code + r'_[^"\']+', r.text)
            if not m:
                m = re.findall(r'https://res\.cloudinary\.com/shufersal/image/upload/[^"\']+/products_(?:zoom|large)/[^"\']+', r.text)
            if m:
                # fetch the image content
                img_resp = await session.get(m[0], timeout=5)
                if img_resp.status_code == 200 and len(img_resp.content) > 1500:
                    return m[0], img_resp.content
    except Exception:
        pass
    return None, None

async def search_pricez_direct(session: AsyncSession, code: str):
    url = f"https://m.pricez.co.il/ProductPictures/{code}.jpg"
    try:
        r = await session.get(url, timeout=3)
        if r.status_code == 200 and len(r.content) > 1500:
            return url, r.content
    except Exception:
        pass
    return None, None

async def search_superpharm_direct(session: AsyncSession, code: str):
    for size in ['large', 'medium']:
        url = f"https://superpharmstorage.blob.core.windows.net/hybris/products/desktop/{size}/{code}.jpg"
        try:
            r = await session.get(url, timeout=3)
            if r.status_code == 200 and len(r.content) > 1500:
                return url, r.content
        except Exception:
            pass
    return None, None

async def search_openfoodfacts(session: AsyncSession, barcode: str):
    if len(barcode) < 8 or not barcode.isdigit():
        return None, None
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}?fields=image_front_url,image_url"
    try:
        r = await session.get(url, timeout=3)
        if r.status_code == 200:
            d = r.json()
            if d.get("status") == 1:
                img_url = d.get("product", {}).get("image_front_url") or d.get("product", {}).get("image_url")
                if img_url:
                    img_resp = await session.get(img_url, timeout=5)
                    if img_resp.status_code == 200 and len(img_resp.content) > 1500:
                        return img_url, img_resp.content
    except Exception:
        pass
    return None, None

async def search_shufersal_by_name(session: AsyncSession, name: str, barcode: str, item_code: str):
    clean_name = clean_product_name(name)
    if len(clean_name) < 4:
        return None, None
    url = f"https://www.shufersal.co.il/online/he/search/results?q={urllib.parse.quote(clean_name)}"
    try:
        r = await session.get(url, timeout=3)
        if r.status_code == 200:
            data = r.json()
            results = data.get("results", [])
            for res in results[:3]:
                res_code = res.get("code", "").replace("P_", "")
                res_name = res.get("name", "")
                # Exact barcode or code match
                if res_code in (barcode, item_code) or (len(res_name) > 3 and res_name in name):
                    for im in res.get("images", []):
                        u = im.get("url")
                        if u and ("large" in u or "zoom" in u):
                            img_resp = await session.get(u, timeout=5)
                            if img_resp.status_code == 200 and len(img_resp.content) > 1500:
                                return u, img_resp.content
    except Exception:
        pass
    return None, None

async def find_product_image(session: AsyncSession, item: dict):
    bc = item["barcode"]
    ic = item["item_code"]
    name = item["name"]

    candidates = []
    if bc and len(bc) >= 6:
        candidates.append(bc)
    if ic and ic not in candidates and len(ic) >= 4:
        candidates.append(ic)

    # 1. Shufersal direct (by barcode, then item_code)
    for c in candidates:
        src_url, content = await search_shufersal_direct(session, c)
        if content:
            return "shufersal_direct", src_url, content

    # 2. Pricez direct
    for c in candidates:
        src_url, content = await search_pricez_direct(session, c)
        if content:
            return "pricez_direct", src_url, content

    # 3. Super-Pharm direct
    for c in candidates:
        src_url, content = await search_superpharm_direct(session, c)
        if content:
            return "superpharm_direct", src_url, content

    # 4. OpenFoodFacts
    if bc and len(bc) >= 8:
        src_url, content = await search_openfoodfacts(session, bc)
        if content:
            return "openfoodfacts", src_url, content

    # 5. Shufersal Search by Name
    src_url, content = await search_shufersal_by_name(session, name, bc, ic)
    if content:
        return "shufersal_name_search", src_url, content

    return None, None, None

def update_db_batch(batch_updates):
    """Execute SQL updates in PostgreSQL for a batch of updated product images."""
    if not batch_updates:
        return
    # Generate bulk UPDATE using a VALUES list for speed
    values = ",\n".join(f"('{u['id']}'::uuid, '{u['storage_path']}')" for u in batch_updates)
    sql = f"""
    UPDATE product_images AS pi
    SET storage_path = v.storage_path
    FROM (VALUES
        {values}
    ) AS v(product_id, storage_path)
    WHERE pi.product_id = v.product_id;
    """
    cmd = ["docker", "exec", "-i", "supabase_db_omar", "psql", "-U", "postgres", "-d", "postgres"]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = p.communicate(sql)
    if p.returncode != 0:
        print(f"⚠️  Database update batch error: {stderr}")

async def main():
    print("🔍 Fetching products with repeating/duplicate images...")
    items = get_products_with_duplicate_images()
    total = len(items)
    print(f"📦 Total products with duplicate images: {total}")

    sem = asyncio.Semaphore(CONCURRENCY)
    processed = 0
    found_count = 0
    by_source = {
        "shufersal_direct": 0,
        "pricez_direct": 0,
        "superpharm_direct": 0,
        "openfoodfacts": 0,
        "shufersal_name_search": 0
    }
    replaced_list = []
    db_buffer = []

    t0 = time.time()

    async with AsyncSession(impersonate="chrome120") as session:
        async def process_item(item):
            nonlocal processed, found_count
            async with sem:
                src, src_url, raw_bytes = await find_product_image(session, item)
                if raw_bytes:
                    try:
                        jpeg_data = normalize_to_square_jpeg(raw_bytes)
                        dest_local = os.path.join(CATALOG_IMAGES_DIR, f"{item['barcode']}.jpg")
                        with open(dest_local, "wb") as f:
                            f.write(jpeg_data)

                        storage_path = f"products/{item['barcode']}.jpg"
                        up_ok = await upload_image_to_storage(session, storage_path, jpeg_data)
                        if up_ok:
                            found_count += 1
                            by_source[src] = by_source.get(src, 0) + 1
                            db_buffer.append({"id": item["id"], "storage_path": storage_path})
                            replaced_list.append({
                                "barcode": item["barcode"],
                                "name": item["name"],
                                "source": src,
                                "source_url": src_url,
                                "storage_path": storage_path
                            })
                    except Exception as e:
                        pass

                processed += 1
                if processed % 100 == 0 or processed == total:
                    elapsed = time.time() - t0
                    rate = processed / elapsed if elapsed > 0 else 0
                    pct = (processed / total) * 100
                    found_pct = (found_count / processed) * 100
                    print(f"⏳ [{processed}/{total}] {pct:.1f}% complete | Found: {found_count} ({found_pct:.1f}%) | Rate: {rate:.1f} items/s")

                if len(db_buffer) >= 100:
                    to_commit = list(db_buffer)
                    db_buffer.clear()
                    update_db_batch(to_commit)

        # Run in chunks to prevent unbounded memory growth
        chunk_size = 500
        for i in range(0, total, chunk_size):
            chunk = items[i:i + chunk_size]
            await asyncio.gather(*[process_item(item) for item in chunk])
            if db_buffer:
                update_db_batch(db_buffer)
                db_buffer.clear()

    total_time = time.time() - t0
    print(f"\n🎉 Search & Replacement complete in {total_time:.1f} seconds!")
    print(f"📊 Replaced {found_count}/{total} products ({found_count/total*100:.1f}%) with authentic manufacturer packshots.")
    print("📈 Breakdown by source:")
    for s, c in sorted(by_source.items(), key=lambda x: -x[1]):
        print(f"   - {s}: {c} photos")

    report_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_checked": total,
        "total_replaced": found_count,
        "replacement_percentage": round(found_count / total * 100, 2),
        "by_source": by_source,
        "replaced_samples": replaced_list[:50]
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
    print(f"💾 Detailed report saved to {REPORT_PATH}")

if __name__ == "__main__":
    asyncio.run(main())
