import urllib.request
import json

key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
headers = {"apikey": key, "Authorization": f"Bearer {key}"}

# Get categories
req = urllib.request.Request("http://127.0.0.1:54321/rest/v1/categories?select=id,name,slug,image_url", headers=headers)
with urllib.request.urlopen(req) as resp:
    cats = json.loads(resp.read().decode())

for c in sorted(cats, key=lambda x: x['slug']):
    print(f"{c['slug']}: {c['name']} -> {c.get('image_url')}")
