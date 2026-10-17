import json
import csv
import os

with open("catalog/subcategory_rules.json", "r", encoding="utf-8") as f:
    rules = json.load(f)

# Group rules by category
cat_rules = {}
for r in rules:
    c = r["category"]
    cat_rules.setdefault(c, []).append(r)

print("Categories in rules:", list(cat_rules.keys()))

# Check which products in CSV match which rule, or fallback to cat_*.jpg
with open("catalog/קטלוג_מוצרים_מתוקן_מלא.csv", mode="r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

from collections import Counter
cat_stats = {}
unmatched_by_cat = {}

for row in rows:
    p_name = row.get("תאור פריט", "")
    cat_file = os.path.basename(row.get("תמונה גנרית למחלקה (מקומי)", ""))
    barcode = (row.get("בר-קוד מקורי") or "").strip().rstrip(".0")
    
    # Check if packshot exists
    packshot = os.path.isfile(f"catalog/images/{barcode}.jpg")
    
    cat_stats.setdefault(cat_file, Counter())
    if packshot:
        cat_stats[cat_file]["PACKSHOT"] += 1
        continue
        
    matched_img = None
    for r in cat_rules.get(cat_file, []):
        for kw in r["keywords"]:
            if kw in p_name:
                matched_img = r["image"]
                break
        if matched_img:
            break
            
    if matched_img:
        cat_stats[cat_file][matched_img] += 1
    else:
        cat_stats[cat_file]["FALLBACK_TO_CAT"] += 1
        unmatched_by_cat.setdefault(cat_file, []).append(p_name)

print("\n--- Fallback vs Subcategory vs Packshot by Category ---")
for cat, counts in sorted(cat_stats.items()):
    total = sum(counts.values())
    fb = counts.get("FALLBACK_TO_CAT", 0)
    ps = counts.get("PACKSHOT", 0)
    sub = total - fb - ps
    print(f"{cat}: Total={total} | Packshots={ps} | Subcat={sub} | Fallback={fb} ({fb*100//total}%)")

print("\n--- Sample Unmatched Items for cat_general.jpg (first 40) ---")
for item in unmatched_by_cat.get("cat_general.jpg", [])[:40]:
    print(" ", item)
