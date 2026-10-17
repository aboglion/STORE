import csv
import os

with open("catalog/קטלוג_מוצרים_מתוקן_מלא.csv", mode="r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    general_items = []
    for row in reader:
        if row.get("מחלקה / קטגוריה") == "פנאי, חשמל וכללי":
            barcode = (row.get("בר-קוד מקורי") or "").strip().rstrip(".0")
            name = row.get("תאור פריט", "")
            img_rel = row.get("תמונה למוצר", "")
            img_path = os.path.join("catalog", img_rel)
            exists = os.path.isfile(img_path)
            general_items.append((barcode, name, img_rel, exists))

print(f"Total general items: {len(general_items)}")
exists_count = sum(1 for x in general_items if x[3])
print(f"Items with file on disk: {exists_count}")

for b, n, img, ex in general_items:
    if ex:
        print(f"PACKSHOT: {b} | {n} -> {img}")
