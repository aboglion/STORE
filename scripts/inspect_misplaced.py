import subprocess

cmd = [
    "docker", "exec", "supabase_db_omar", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "\t", "-c",
    """
    SELECT c.slug, c.name_he, p.name_he, p.barcode, COALESCE(pi.storage_path, '')
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_images pi ON pi.product_id = p.id
    ORDER BY c.slug, p.name_he;
    """
]

res = subprocess.run(cmd, capture_output=True, text=True)
rows = [l.split("\t") for l in res.stdout.strip().split("\n") if l and "\t" in l]

print("\n--- Items with battery keywords in ANY category ---")
for c_slug, c_name, p_name, barcode, img in rows:
    if any(k in p_name for k in ["סולל", "אלקליין", "דורסל", "אנרג`ייזר", "אנרגייזר"]):
        print(f"[{c_name}] {p_name} -> {img}")

print("\n--- Items with balloon/party keywords in ANY category ---")
for c_slug, c_name, p_name, barcode, img in rows:
    if any(k in p_name for k in ["בלון", "קונפטי", "שלג מסיב", "זר לראש"]):
        print(f"[{c_name}] {p_name} -> {img}")

print("\n--- Items with toy keywords in ANY category ---")
for c_slug, c_name, p_name, barcode, img in rows:
    if any(k in p_name for k in ["רובה", "אקדח", "סליים", "פופיט", "מטקות", "צעצוע", "משחק מים", "בועות"]):
        print(f"[{c_name}] {p_name} -> {img}")
