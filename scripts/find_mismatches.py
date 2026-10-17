import subprocess
import re

cmd = [
    "docker", "exec", "supabase_db_omar", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "\t", "-c",
    """
    SELECT p.name_he, p.barcode, c.slug, c.name_he, COALESCE(pi.storage_path, '')
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_images pi ON pi.product_id = p.id
    ORDER BY c.slug, p.name_he;
    """
]

res = subprocess.run(cmd, capture_output=True, text=True)
rows = [l.split("\t") for l in res.stdout.strip().split("\n") if l and "\t" in l]

print(f"Total products: {len(rows)}")

# Let's check for blatant mismatches
# Example patterns:
# 1. Product is diaper/wipes/formula but has non-baby image
# 2. Product is water/soda but in wrong cat or wrong subcategory
# 3. Product is meat/dairy/oil/etc.
mismatches = []
for p_name, barcode, c_slug, c_name, img in rows:
    # Check if image name contradicts product name
    # e.g. milk product having cheese or eggs image
    # e.g. fruit having nut image or vice versa
    # e.g. bread having cookie image or vice versa
    # e.g. water having beer image or beer having water image
    # e.g. shampoo having toothpaste image
    p_lower = p_name.lower()
    
    # Beer having soft drink / water image
    if ("בירה" in p_name or "goldstar" in p_lower or "heineken" in p_lower) and "beer" not in img and "cat_energy" not in img:
        mismatches.append((p_name, barcode, c_name, img, "Beer without beer image"))
    
    # Mineral water having non-water image
    if ("מי עדן" in p_name or "נביעות" in p_name or "עין גדי" in p_name) and "water" not in img:
        mismatches.append((p_name, barcode, c_name, img, "Water without water image"))
        
    # Eggs having milk/cheese image
    if ("ביצים" in p_name or "ביצי" in p_name) and "eggs" not in img and "products/" not in img:
        mismatches.append((p_name, barcode, c_name, img, "Eggs without eggs image"))
        
    # Nuts in produce-nuts having fruits/veg image or cat_produce (if fruit image)
    if any(k in p_name for k in ["אגוז", "שקד", "בוטן", "פיסטוק", "קשיו", "פיצוח"]) and "nuts" not in img and "products/" not in img:
        mismatches.append((p_name, barcode, c_name, img, "Nuts without nuts image"))
        
    # Fruit having nuts image
    if any(k in p_name for k in ["תפוח", "בננה", "תפוז", "ענבים", "אבטיח", "מלון"]) and "nuts" in img:
        mismatches.append((p_name, barcode, c_name, img, "Fruit with nuts image"))
        
    # Diapers having formula image or vice versa
    if any(k in p_name for k in ["חיתול", "פמפרס", "האגיס", "טיטול"]) and "diapers" not in img and "products/" not in img:
        mismatches.append((p_name, barcode, c_name, img, "Diapers without diapers image"))

    # Body oil / baby oil in cooking oil
    if "שמן" in p_name and any(k in p_name for k in ["גוף", "תינוק", "פישר", "טיפולי", "עיסוי"]) and c_slug == "oil-vinegar":
        mismatches.append((p_name, barcode, c_name, img, "Body/baby oil in cooking oil category"))
        
    # Puree in water
    if "מחית" in p_name and c_slug == "water-soda":
        mismatches.append((p_name, barcode, c_name, img, "Baby puree in water category"))

    # Balloons / party having general hardware image
    if any(k in p_name for k in ["בלון", "קונפטי", "שלג מסיב"]) and "balloons" not in img and "products/" not in img:
        mismatches.append((p_name, barcode, c_name, img, "Balloons without balloon image"))

    # Batteries having general hardware image
    if any(k in p_name for k in ["סולל", "אלקליין", "אנרג`ייזר", "דורסל"]) and "batteries" not in img and "products/" not in img:
        mismatches.append((p_name, barcode, c_name, img, "Batteries without battery image"))

print(f"Total potential mismatches flagged: {len(mismatches)}")
for m in mismatches[:50]:
    print(f"[{m[0]}] ({m[2]}) -> {m[3]} | REASON: {m[4]}")
