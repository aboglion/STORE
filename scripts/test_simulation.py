import json
import csv
import os
from collections import Counter

with open("catalog/subcategory_rules.json", "r", encoding="utf-8") as f:
    rules = json.load(f)

with open("catalog/קטלוג_מוצרים_מתוקן_מלא.csv", mode="r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Simulate logic
counts = Counter()
general_sub_counts = Counter()
mismatches_remaining = []

for r in rows:
    p_name = r.get("תאור פריט", "").strip()
    barcode = (r.get("בר-קוד מקורי") or "").strip().rstrip(".0")
    img_file = os.path.basename(r.get("תמונה גנרית למחלקה (מקומי)", ""))
    
    # Merge water and energy into drinks
    if img_file in ["cat_water.jpg", "cat_energy.jpg"]:
        img_file = "cat_drinks.jpg"
        
    # Misplaced items
    if barcode in ["7290119377480", "7290119377527", "7290119380626", "7290119385768"]:
        img_file = "cat_bakery.jpg"
    if "בגד ים חד פעמי" in p_name:
        img_file = "cat_baby.jpg"
    if "מחית פרי" in p_name:
        img_file = "cat_baby.jpg"

    # 1. Packshot
    packshot = os.path.isfile(f"catalog/images/{barcode}.jpg")
    if packshot:
        counts["packshot"] += 1
        continue
        
    # 2. Category subcategory match
    matched = None
    for rule in rules:
        if rule["category"] == img_file:
            for kw in rule["keywords"]:
                if kw in p_name:
                    matched = rule["image"]
                    break
            if matched:
                break
                
    # 3. Cross-category rescue
    if not matched:
        if any(k in p_name for k in ["סולל", "בטריות", "אלקליין", "דורסל", "אנרג`ייזר", "אנרגייזר"]):
            matched = "sub_general_batteries.jpg"
        elif any(k in p_name for k in ["בלון", "בלונים", "קונפטי", "שלג מסיב"]):
            matched = "sub_general_balloons.jpg"
        elif any(k in p_name for k in ["רובה", "אקדח", "בועות", "סליים", "פופיט"]):
            matched = "sub_general_toys.jpg"
        elif any(k in p_name for k in ["חיתול", "פמפרס", "האגיס"]):
            matched = "sub_baby_diapers.jpg"
            
    if matched:
        counts["subcategory"] += 1
        if img_file == "cat_general.jpg":
            general_sub_counts[matched] += 1
    else:
        counts["category"] += 1
        if img_file == "cat_general.jpg":
            general_sub_counts["FALLBACK_TO_CAT"] += 1

print("Overall counts:", counts)
print("\nElectronics-leisure subcategory breakdown:")
for img, c in general_sub_counts.most_common():
    print(f"  {img}: {c}")
