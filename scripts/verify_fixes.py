import subprocess

names = [
    'ספרינג 1 ליטר טעמים',
    'קולה פח טעמים',
    'פחמים 8 קילו',
    'רובה מים גדול',
    'פופיט אלקטרוני',
    'סוללות אלקליין AA',
    'שקית 100 בלונים',
    'כבל מאריך 5 מטר'
]

# Use parameterized psql or python query
cmd = [
    "docker", "exec", "supabase_db_omar", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", " | ", "-c",
    """
    SELECT p.name_he, c.name_he, pi.storage_path
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN product_images pi ON pi.product_id = p.id
    WHERE p.name_he ILIKE '%ספרינג%טעמים%'
       OR p.name_he ILIKE '%קולה%טעמים%'
       OR p.name_he ILIKE '%פחמים%קילו%'
       OR p.name_he ILIKE '%רובה מים גדול%'
       OR p.name_he ILIKE '%פופיט אלקטרוני%'
       OR p.name_he ILIKE '%כבל מאריך 5 מטר%'
    LIMIT 20;
    """
]

res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout.strip())
