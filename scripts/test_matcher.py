import json
import csv
import re
from collections import Counter

with open("catalog/subcategory_rules.json", "r", encoding="utf-8") as f:
    rules = json.load(f)

# Ensure "מים" is replaced with whole-word or specific terms so it does not match inside other words
# Also ensure "לד" in lighting is clean
for r in rules:
    if r["image"] == "sub_general_lighting.jpg":
        # Make sure "לד" only matches whole word
        pass

def matches_keyword(text, kw):
    if not text or not kw:
        return False
    clean_text = text.replace("`", " ").replace("'", " ").replace('"', " ")
    clean_kw = kw.replace("`", " ").replace("'", " ").replace('"', " ").strip()
    
    if " " in clean_kw:
        pattern = r"(?:^|\s)" + re.escape(clean_kw) + r"(?:\s|$)"
        return bool(re.search(pattern, clean_text))
        
    tokens = clean_text.split()
    prefixes = ["", "ה", "ב", "ל", "מ", "ו", "וה", "וב", "ול", "ומ"]
    for t in tokens:
        for p in prefixes:
            if t.startswith(p + clean_kw):
                return True
    return False

with open("catalog/קטלוג_מוצרים_מתוקן_מלא.csv", mode="r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Test bug cases
test_cases = [
    ("ספרינג 1 ליטר טעמים", "sub_water_mineral.jpg", False),
    ("פחמים 8 קילו", "sub_water_mineral.jpg", False),
    ("קולה פח טעמים", "sub_water_mineral.jpg", False),
    ("עוגיות שוקולד צ`יפס עם קרם בטעם, 220 גרם", "sub_general_lighting.jpg", False),
    ("חומוס אחלה 1ק\"ג", "sub_bakery_bread.jpg", False),
    ("ARGANIA שמפו חומצה היאלורונית", "sub_bakery_pita.jpg", False),
    ("יופ.אפרסק%3", "sub_canned_tomato.jpg", False),
    ("פופיט אלקטרוני", "sub_frozen_veggies.jpg", False),
    ("מים מינרליים עין גדי 2 ליטר", "sub_water_mineral.jpg", True),
    ("נורת לד 12W", "sub_general_lighting.jpg", True),
    ("שקית 100 בלונים פסטל", "sub_general_balloons.jpg", True),
    ("סוללות אלקליין AA", "sub_general_batteries.jpg", True),
    ("רובה מים גדול", "sub_general_toys.jpg", True),
    ("קומקום חשמלי נירוסטה", "sub_general_appliances.jpg", True),
    ("כבל מאריך 5 מטר", "sub_general_cables.jpg", True),
]

all_passed = True
for name, target_img, expected in test_cases:
    # find rule
    matched = False
    for r in rules:
        if r["image"] == target_img:
            for kw in r["keywords"]:
                if matches_keyword(name, kw):
                    matched = True
                    break
        if matched:
            break
    status = "✅ PASS" if matched == expected else "❌ FAIL"
    if matched != expected:
        all_passed = False
    print(f"{status}: '{name}' -> {target_img} (got {matched}, expected {expected})")

print(f"\nAll test cases passed? {all_passed}")
