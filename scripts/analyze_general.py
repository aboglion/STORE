import subprocess
from collections import Counter

cmd = [
    "docker", "exec", "supabase_db_omar", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "\t", "-c",
    """
    SELECT p.name_he, p.barcode, COALESCE(pi.storage_path, 'NO_IMAGE')
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE c.slug = 'electronics-leisure'
    ORDER BY p.name_he;
    """
]

res = subprocess.run(cmd, capture_output=True, text=True)
valid_lines = []
for line in res.stdout.strip().split("\n"):
    parts = line.split("\t")
    if len(parts) >= 3:
        valid_lines.append(parts)

print(f"Total rows found: {len(valid_lines)}")
counts = Counter(l[2] for l in valid_lines)
print("\nElectronics-leisure image distribution:")
for img, c in counts.most_common():
    print(f"  {img}: {c}")

print("\nItems with cat_general.jpg:")
for l in valid_lines:
    if "cat_general.jpg" in l[2]:
        print(f"  {l[0]} ({l[1]})")
