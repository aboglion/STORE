import json
import csv
import os
from collections import Counter

with open("catalog/subcategory_rules.json", "r", encoding="utf-8") as f:
    rules = json.load(f)

cat_rules = {}
for r in rules:
    cat_rules.setdefault(r["category"], []).append(r)

with open("catalog/קטלוג_מוצרים_מתוקן_מלא.csv", mode="r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

unmatched = {}
for row in rows:
    p_name = row.get("תאור פריט", "")
    cat_file = os.path.basename(row.get("תמונה גנרית למחלקה (מקומי)", ""))
    barcode = (row.get("בר-קוד מקורי") or "").strip().rstrip(".0")
    if os.path.isfile(f"catalog/images/{barcode}.jpg"):
        continue
    matched = False
    for r in cat_rules.get(cat_file, []):
        for kw in r["keywords"]:
            if kw in p_name:
                matched = True
                break
        if matched:
            break
    if not matched:
        unmatched.setdefault(cat_file, []).append(p_name)

for cat in ["cat_home.jpg", "cat_canned.jpg", "cat_produce.jpg", "cat_drinks.jpg", "cat_oil.jpg"]:
    items = unmatched.get(cat, [])
    print(f"\n=== Top unmatched patterns in {cat} ({len(items)} items) ===")
    words = Counter()
    for it in items:
        for w in it.split():
            if len(w) > 2:
                words[w] += 1
    print("Most frequent words:", words.most_common(15))
    print("Sample items:")
    for it in items[:15]:
        print("  *", it)
