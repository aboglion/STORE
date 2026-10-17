import subprocess
import json

cmd = [
    "docker", "exec", "supabase_db_omar", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "\t", "-c",
    """
    SELECT c.slug, c.name_he, p.name_he, p.barcode, COALESCE(pi.storage_path, 'NO_IMAGE')
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_images pi ON pi.product_id = p.id
    ORDER BY c.slug, p.name_he;
    """
]

res = subprocess.run(cmd, capture_output=True, text=True)
lines = res.stdout.strip().split("\n")
print(f"Total product rows in DB: {len(lines)}")

# Group by category and check storage_paths
from collections import Counter
cat_imgs = {}
for line in lines:
    parts = line.split("\t")
    if len(parts) < 5:
        continue
    c_slug, c_name, p_name, barcode, img = parts[0], parts[1], parts[2], parts[3], parts[4]
    if c_slug not in cat_imgs:
        cat_imgs[c_slug] = {"name": c_name, "total": 0, "images": Counter(), "samples": []}
    cat_imgs[c_slug]["total"] += 1
    cat_imgs[c_slug]["images"][img] += 1
    if len(cat_imgs[c_slug]["samples"]) < 5:
        cat_imgs[c_slug]["samples"].append((p_name, img))

for slug, data in sorted(cat_imgs.items()):
    print(f"\n=== {slug} ({data['name']}) - {data['total']} items ===")
    print("Top images used:")
    for img, count in data["images"].most_common(5):
        print(f"  {img}: {count}")
    print("Samples:")
    for p_name, img in data["samples"]:
        print(f"  [{p_name}] -> {img}")
