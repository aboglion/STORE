import json
import csv

with open("catalog/subcategory_rules.json", "r", encoding="utf-8") as f:
    rules = json.load(f)

# Find short keywords (length <= 3)
short_kws = []
for r in rules:
    for kw in r["keywords"]:
        if len(kw) <= 3:
            short_kws.append((r["image"], kw))

print(f"Short keywords ({len(short_kws)}):")
for img, kw in short_kws:
    print(f"  {img}: '{kw}'")

# Check which products matched these short keywords and what words they were inside
with open("catalog/קטלוג_מוצרים_מתוקן_מלא.csv", mode="r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

for img, kw in short_kws:
    accidental_matches = []
    for r in rows:
        name = r.get("תאור פריט", "")
        if kw in name:
            words = name.split()
            # check if kw is a standalone word or prefix, or inside another word
            inside_words = [w for w in words if kw in w and w != kw and not w.startswith(kw) and not w.startswith("ב" + kw) and not w.startswith("ה" + kw) and not w.startswith("ל" + kw) and not w.startswith("מ" + kw)]
            if inside_words:
                accidental_matches.append((name, inside_words))
    if accidental_matches:
        print(f"\n⚠️ Keyword '{kw}' in {img} matched inside unrelated words ({len(accidental_matches)} times):")
        for name, in_words in accidental_matches[:5]:
            print(f"    '{name}' -> word: {in_words}")
