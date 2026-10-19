import os
import asyncio
import aiohttp
import pandas as pd

async def download_packshot(session, bc, dest_path, sem):
    if not bc or len(bc) < 8 or not bc.isdigit():
        return False
    url = f"https://world.openfoodfacts.org/api/v2/product/{bc}?fields=image_front_url,image_url"
    async with sem:
        try:
            async with session.get(url, timeout=8) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get('status') == 1:
                        img_url = data.get('product', {}).get('image_front_url') or data.get('product', {}).get('image_url')
                        if img_url:
                            async with session.get(img_url, timeout=10) as img_resp:
                                if img_resp.status == 200:
                                    content = await img_resp.read()
                                    with open(dest_path, 'wb') as f:
                                        f.write(content)
                                    return True
        except Exception:
            pass
    return False

async def main():
    df = pd.read_excel('קטלוג_מוצרים_מקומי_מלא.xlsx')
    sem = asyncio.Semaphore(30)
    updated = 0
    async with aiohttp.ClientSession() as session:
        tasks = []
        for _, row in df.iterrows():
            bc = str(row['בר-קוד מאומת (EAN)']).strip()
            rel_path = str(row['תמונה למוצר']).strip()
            tasks.append(download_packshot(session, bc, rel_path, sem))
        results = await asyncio.gather(*tasks)
        updated = sum(1 for r in results if r)
    print(f"הורדו בהצלחה {updated} תמונות יצרן מקוריות לתוך תיקיית images/ (שאר המוצרים שומרים על התמונה המקומית המוכנה).")

if __name__ == '__main__':
    asyncio.run(main())
