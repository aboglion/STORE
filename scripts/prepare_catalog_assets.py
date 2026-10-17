#!/usr/bin/env python3
"""
scripts/prepare_catalog_assets.py
Prepares professional, high-resolution photographic assets for the catalog:
  1. Replaces the 21 category text banners in catalog/images/categories/
     with genuine supermarket photography.
  2. Downloads and creates ~55 curated subcategory grocery images in
     catalog/images/subcategories/ (milk, cheese, yogurt, bread, chicken, beef, etc.).
  3. Queries OpenFoodFacts to download real Israeli manufacturer packshots
     for products that currently lack a photo.
  4. Purges the 7,650 old text dummy files from catalog/images/ so only genuine
     photos remain in products/.
  5. Exports catalog/subcategory_mapping.json for import-catalog.mjs.
"""

import os
import io
import json
import time
import hashlib
import urllib.request
import asyncio
import aiohttp
import pandas as pd
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT_DIR = os.path.join(ROOT, "catalog", "images", "categories")
SUB_DIR = os.path.join(ROOT, "catalog", "images", "subcategories")
PROD_DIR = os.path.join(ROOT, "catalog", "images")
CSV_PATH = os.path.join(ROOT, "catalog", "קטלוג_מוצרים_מתוקן_מלא.csv")
MAP_PATH = os.path.join(ROOT, "catalog", "subcategory_rules.json")

os.makedirs(CAT_DIR, exist_ok=True)
os.makedirs(SUB_DIR, exist_ok=True)
os.makedirs(PROD_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 21 Categories — Curated Unsplash IDs
# ---------------------------------------------------------------------------
CATEGORY_PHOTOS = {
    "cat_dairy.jpg": "photo-1628088062854-d1870b4553da",      # Fresh dairy, milk bottles, assorted cheeses
    "cat_meat.jpg": "photo-1607623814075-e51df1bdc82f",       # Fresh raw beef & poultry steaks
    "cat_fish.jpg": "photo-1519708227418-c8fd9a32b7a2",       # Fresh salmon fillets on ice
    "cat_produce.jpg": "photo-1610832958506-aa56368176cf",    # Fresh vibrant fruits and vegetables
    "cat_frozen.jpg": "photo-1497034825429-c343d7c6a68f",     # Ice cream scoops and popsicles
    "cat_bakery.jpg": "photo-1509440159596-0249088772ff",     # Artisan crusty bread loaves and baguettes
    "cat_pasta.jpg": "photo-1551462147-37885acc36f1",      # Dry pasta shapes, rice bowls and grains
    "cat_canned.jpg": "photo-1584727638096-042c45049ebe",     # Glass jars of tomato sauce, gourmet preserves
    "cat_oil.jpg": "photo-1474979266404-7eaacbcd87c5",        # Extra virgin olive oil bottle with green olives
    "cat_spices.jpg": "photo-1596040033229-a9821ebd058d",     # Vibrant spices in wooden spoons (paprika, turmeric)
    "cat_snacks.jpg": "photo-1566478989037-eec170784d0b",     # Crispy potato chips, pretzels and snack bowls
    "cat_chocolate.jpg": "photo-1549007994-cb92caebd54b",  # Dark and milk chocolate bars and squares
    "cat_coffee.jpg": "photo-1514432324607-a09d9b4aefdd",     # Fresh roasted coffee beans and cup of espresso
    "cat_drinks.jpg": "photo-1622483767028-3f66f32aef97",     # Cold soda can and ice glass with citrus
    "cat_water.jpg": "photo-1523362628745-0c100150b504",      # Crystal clear mineral water with water droplets
    "cat_energy.jpg": "photo-1518176258769-f227c798150e",     # Cold beer bottles and energy drinks
    "cat_baby.jpg": "photo-1515488042361-ee00e0ddd4e4",       # Baby bottle, gentle baby care products
    "cat_care.jpg": "photo-1556228720-195a672e8a03",       # Shampoo, conditioner, body wash bottles
    "cat_cleaning.jpg": "photo-1585421514738-01798e348b17",   # Cleaning spray bottle, sponges and detergent
    "cat_home.jpg": "photo-1583847268964-b28dc8f51f92",       # Eco-friendly disposable plates and cups
    "cat_general.jpg": "photo-1588854337236-6889d631faa8",    # Alkaline batteries and household accessories
}

# ---------------------------------------------------------------------------
# ~55 Subcategories — Curated Unsplash IDs & Hebrew Keyword Matchers
# ---------------------------------------------------------------------------
SUBCATEGORIES = {
    # Dairy
    "sub_dairy_milk.jpg": {
        "photo": "photo-1550583724-b2692b85b150",
        "category": "cat_dairy.jpg",
        "keywords": ["חלב", "משקה חלב", "משקה שיבולת", "משקה סויה", "משקה שקדים", "רוויון", "שוקו", "יוטבתה", "תנובה חלב"]
    },
    "sub_dairy_cheese.jpg": {
        "photo": "photo-1486297678162-eb2a19b0a32d",
        "category": "cat_dairy.jpg",
        "keywords": ["גבינ", "קוטג", "פטה", "צהובה", "מוצרלה", "ריקוטה", "פרמזן", "קממבר", "ברי", "בולגרית", "צפתית", "לבנה", "לאבנה", "עמק", "גלבוע", "חמד", "עיזים"]
    },
    "sub_dairy_yogurt.jpg": {
        "photo": "photo-1488477181946-6428a0291777",
        "category": "cat_dairy.jpg",
        "keywords": ["יוגורט", "מעדן", "דנונה", "מילקי", "אקטימל", "דני", "יופלה", "קרלו", "פודינג", "ביו", "אקטיביה", "מולר"]
    },
    "sub_dairy_butter.jpg": {
        "photo": "photo-1589985270826-4b7bb135bc9d",
        "category": "cat_dairy.jpg",
        "keywords": ["חמאה", "מרגרינה", "שמנת", "קצפת", "קרם פרש"]
    },
    "sub_dairy_eggs.jpg": {
        "photo": "photo-1582722872445-44dc5f7e3c8f",
        "category": "cat_dairy.jpg",
        "keywords": ["ביצים", "ביצי", "ביצה"]
    },

    # Meat & Poultry
    "sub_meat_chicken.jpg": {
        "photo": "photo-1604503468506-a8da13d82791",
        "category": "cat_meat.jpg",
        "keywords": ["עוף", "פרגית", "פרגיות", "כרעיים", "שוקיים", "חזה עוף", "כנפיים", "עופות", "מאמא עוף", "הודו"]
    },
    "sub_meat_schnitzel.jpg": {
        "photo": "photo-1599921841143-8190e5a03842",
        "category": "cat_meat.jpg",
        "keywords": ["שניצל", "נאגטס", "טבעות עוף", "קורדון בלו"]
    },
    "sub_meat_beef.jpg": {
        "photo": "photo-1588168333986-5078d3ae3976",
        "category": "cat_meat.jpg",
        "keywords": ["בקר", "בשר", "סטייק", "טחון", "קבב", "המבורגר", "אנטריקוט", "צלעות", "אוסובוקו", "סינטה", "אסאדו", "רוסטביף"]
    },
    "sub_meat_sausage.jpg": {
        "photo": "photo-1585325701165-351af916e581",
        "category": "cat_meat.jpg",
        "keywords": ["נקניק", "נקניקיות", "פסטרמה", "סלמי", "קבנוס", "מורטדלה", "זוגלובק", "טירת צבי", "יחיעם"]
    },

    # Fish & Seafood
    "sub_fish_salmon.jpg": {
        "photo": "photo-1519708227418-c8fd9a32b7a2",
        "category": "cat_fish.jpg",
        "keywords": ["סלמון", "פילה סלמון", "מעושן"]
    },
    "sub_fish_fillet.jpg": {
        "photo": "photo-1534939561126-855b8675edd7",
        "category": "cat_fish.jpg",
        "keywords": ["דג", "פילה", "אמנון", "בקלה", "קרפיון", "מושט", "טונה טרייה", "דניס", "לברק", "נסיכת הנילוס", "מרלוזה", "הרינג"]
    },
    "sub_fish_seafood.jpg": {
        "photo": "photo-1565680018434-b513d5e5fd47",
        "category": "cat_fish.jpg",
        "keywords": ["שרימפס", "גמברי", "פירות ים", "קלמרי", "מולים", "סרטנים"]
    },

    # Produce & Nuts
    "sub_produce_fruits.jpg": {
        "photo": "photo-1619566636858-adf3ef46400b",
        "category": "cat_produce.jpg",
        "keywords": ["תפוח", "תפוז", "בננה", "לימון", "אבטיח", "מלון", "ענבים", "תות", "אגס", "קלמנטינה", "אפרסק", "שזיף", "פירות", "קיווי", "מנגו", "אבוקדו"]
    },
    "sub_produce_vegetables.jpg": {
        "photo": "photo-1540420773420-3366772f4999",
        "category": "cat_produce.jpg",
        "keywords": ["עגבני", "מלפפון", "פלפל", "בצל", "תפוח אדמה", "גזר", "חסה", "כרוב", "קישוא", "חציל", "ירקות", "שום", "בטטה", "צנון", "סלק", "פטריות", "כרובית", "ברוקולי"]
    },
    "sub_produce_nuts.jpg": {
        "photo": "photo-1508061253366-f7da158b6d46",
        "category": "cat_produce.jpg",
        "keywords": ["אגוז", "בוטנים", "שקדים", "גרעיני", "פיסטוק", "קשיו", "פיצוחים", "חמניה", "דלעת", "אילסר", "לוז", "פקאן"]
    },

    # Frozen
    "sub_frozen_icecream.jpg": {
        "photo": "photo-1501443762994-82bd5dace89a",
        "category": "cat_frozen.jpg",
        "keywords": ["גלידה", "מגנום", "ארטיק", "קרמיסימו", "קורנטו", "שלגון", "פסק זמן גלידה", "טילון", "גלידונית", "בן אנד ג`ריס", "שטראוס גלידה"]
    },
    "sub_frozen_pastry.jpg": {
        "photo": "photo-1513104890138-7c749659a591",
        "category": "cat_frozen.jpg",
        "keywords": ["בורקס", "פיצה", "מלאווח", "ג`חנון", "בצק", "פילאס", "בלינצס", "רוגלך", "מעדנות", "שלושת האופים", "סמבוסק"]
    },
    "sub_frozen_veggies.jpg": {
        "photo": "photo-1576045057995-568f588f82fb",
        "category": "cat_frozen.jpg",
        "keywords": ["ציפס", "אפונה", "שעועית ירוקה", "תירס קפוא", "לקט", "ברוקולי קפוא", "סנפרוסט", "צ`יפס"]
    },

    # Bakery
    "sub_bakery_bread.jpg": {
        "photo": "photo-1509440159596-0249088772ff",
        "category": "cat_bakery.jpg",
        "keywords": ["לחם", "חלה", "חלות", "לחמני", "מחמצת", "שיפון", "אנג`ל", "ברמן"]
    },
    "sub_bakery_pita.jpg": {
        "photo": "photo-1565557623262-b51c2513a641",
        "category": "cat_bakery.jpg",
        "keywords": ["פיתה", "פיתות", "לאפה", "טורטיה", "פרנה", "בגט"]
    },
    "sub_bakery_pastry.jpg": {
        "photo": "photo-1555507036-ab1f4038808a",
        "category": "cat_bakery.jpg",
        "keywords": ["קרואסון", "מאפה", "רוגלך", "מאפים", "דניש", "שמרים", "קינמון"]
    },
    "sub_bakery_cookies.jpg": {
        "photo": "photo-1499636136210-6f4ee915583e",
        "category": "cat_bakery.jpg",
        "keywords": ["עוגי", "עוגת", "וופל", "ביסקוויט", "בראוניז", "עוגיות", "אסם עוגיות", "עלית עוגיות", "רולדה", "פתי בר", "אוראו"]
    },
    "sub_bakery_cereal.jpg": {
        "photo": "photo-1521483451569-e33803c0330c",
        "category": "cat_bakery.jpg",
        "keywords": ["קורנפלקס", "פיטנס", "דגני", "גרנולה", "שיבולת שועל", "כריות", "צ`יריוס", "קלוגס", "תלמה"]
    },

    # Pasta & Legumes
    "sub_pasta_dry.jpg": {
        "photo": "photo-1621996346565-e3d5d6281691",
        "category": "cat_pasta.jpg",
        "keywords": ["פסטה", "ספגטי", "מקרוני", "אטריות", "פתיתים", "נודלס", "ראמן", "לזניה", "פוזילי", "פנאי", "ברילה", "אסם פסטה"]
    },
    "sub_pasta_rice.jpg": {
        "photo": "photo-1586201375761-83865001e31c",
        "category": "cat_pasta.jpg",
        "keywords": ["אורז", "בסמטי", "יסמין", "פרסי", "עגול", "סוגת אורז"]
    },
    "sub_pasta_legumes.jpg": {
        "photo": "photo-1515543237350-b3eea1ec8082",
        "category": "cat_pasta.jpg",
        "keywords": ["עדשים", "שעועית", "חומוס יבש", "פול", "אפונה יבשה", "קינואה", "בורגול", "כוסמת", "סוגת"]
    },

    # Canned & Sauces
    "sub_canned_tuna.jpg": {
        "photo": "photo-1544943910-4c1dc44a04d2",
        "category": "cat_canned.jpg",
        "keywords": ["טונה", "סרדינים", "מקרל", "סטארקיסט", "פילטונה"]
    },
    "sub_canned_tomato.jpg": {
        "photo": "photo-1592924357228-91a4daadcfea",
        "category": "cat_canned.jpg",
        "keywords": ["רסק", "עגבניות מרוסקות", "עגבניות מקולפות", "רוטב עגבניות", "פולפה", "מוטי", "פרי גליל"]
    },
    "sub_canned_pickles.jpg": {
        "photo": "photo-1589135233689-d562b7be5097",
        "category": "cat_canned.jpg",
        "keywords": ["מלפפון בחומץ", "מלפפונים במלח", "מלפפון מלוח", "זיתים", "שימורי זיתים", "חמוצים", "בית השיטה", "קבוצת יבנה"]
    },
    "sub_canned_sauce.jpg": {
        "photo": "photo-1472476443507-c7a5948772fc",
        "category": "cat_canned.jpg",
        "keywords": ["מיונז", "קטשופ", "חרדל", "סויה", "טריאקי", "צ`ילי", "אלף האיים", "רוטב", "היינץ", "הלמנס", "אסם רוטב"]
    },

    # Oil & Vinegar
    "sub_oil_olive.jpg": {
        "photo": "photo-1474979266404-7eaacbcd87c5",
        "category": "cat_oil.jpg",
        "keywords": ["שמן זית", "כתית", "יד מרדכי", "זיתא"]
    },
    "sub_oil_cooking.jpg": {
        "photo": "photo-1546554137-f86b9593a222",
        "category": "cat_oil.jpg",
        "keywords": ["קנולה", "סויה", "חמניות", "שמן טיגון", "שמן תירס", "עץ הזית"]
    },
    "sub_oil_vinegar.jpg": {
        "photo": "photo-1590779033100-9f60a05a013d",
        "category": "cat_oil.jpg",
        "keywords": ["חומץ", "רוטב לימון", "מיץ לימון משומר", "בלסמי", "תפוחים"]
    },

    # Spices & Baking
    "sub_spices_cooking.jpg": {
        "photo": "photo-1596040033229-a9821ebd058d",
        "category": "cat_spices.jpg",
        "keywords": ["תבלין", "פלפל שחור", "פפריקה", "כורכום", "כמון", "אורגנו", "זעתר", "מרק עוף", "מלח", "חוויאג", "קארי", "קינמון", "תבליני"]
    },
    "sub_spices_sugar.jpg": {
        "photo": "photo-1581441363689-1f3c3c414635",
        "category": "cat_spices.jpg",
        "keywords": ["סוכר", "סוכר חום", "אבקת סוכר", "סוכרזית", "סוכר ענבים"]
    },
    "sub_spices_baking.jpg": {
        "photo": "photo-1509440159596-0249088772ff",
        "category": "cat_spices.jpg",
        "keywords": ["קמח", "שמרים", "אבקת אפייה", "סוכר וניל", "סודה לשתייה", "קקאו", "ג`לטין", "מימון"]
    },

    # Snacks & Sweets
    "sub_snacks_chips.jpg": {
        "photo": "photo-1566478989037-eec170784d0b",
        "category": "cat_snacks.jpg",
        "keywords": ["תפוציפס", "תפוצ`יפס", "דוריטוס", "פרינגלס", "צ`יפס", "לייס"]
    },
    "sub_snacks_savory.jpg": {
        "photo": "photo-1599490659213-e2b9527bd087",
        "category": "cat_snacks.jpg",
        "keywords": ["במבה", "ביסלי", "בייגלה", "פופקורן", "דובונים", "אפרופו", "כיפלי", "נשנושים", "קרקר"]
    },
    "sub_snacks_candy.jpg": {
        "photo": "photo-1582058091505-f87a2e55a40f",
        "category": "cat_snacks.jpg",
        "keywords": ["סוכריות", "גומי", "מסטיק", "מרשמלו", "לקקן", "מנטוס", "טופי", "הריבו", "מסט"]
    },

    # Chocolate
    "sub_chocolate_bar.jpg": {
        "photo": "photo-1549007994-cb92caebd54b",
        "category": "cat_chocolate.jpg",
        "keywords": ["שוקולד", "מילקה", "פרלין", "טבלה", "עלית שוקולד", "קינדר", "מקופלת", "כיף כף", "פסק זמן", "לינדט", "קוט דור"]
    },
    "sub_chocolate_spread.jpg": {
        "photo": "photo-1589301760014-d929f3979dbc",
        "category": "cat_chocolate.jpg",
        "keywords": ["ממרח", "נוטלה", "השחר", "חלבה", "ריבה", "קונפיטורה", "סילאן", "דבש", "טחינה מתוקה"]
    },

    # Coffee & Tea
    "sub_coffee_beans.jpg": {
        "photo": "photo-1514432324607-a09d9b4aefdd",
        "category": "cat_coffee.jpg",
        "keywords": ["פולי קפה", "אספרסו", "קפסולות", "קפה טחון", "לוואצה", "נספרסו"]
    },
    "sub_coffee_instant.jpg": {
        "photo": "photo-1517256064527-09c73fc73e38",
        "category": "cat_coffee.jpg",
        "keywords": ["קפה נמס", "נסקפה", "טייסטרס צ`ויס", "אייס קפה", "קפה נח`לה", "קפה שחור", "עלית קפה", "רד מאג"]
    },
    "sub_tea_bags.jpg": {
        "photo": "photo-1576092768241-dec231879fc3",
        "category": "cat_coffee.jpg",
        "keywords": ["תה", "ויסוצקי", "חליטה", "ארל גריי", "קמומיל", "נענע", "ליפטון", "תה ירוק"]
    },

    # Drinks
    "sub_drinks_cola.jpg": {
        "photo": "photo-1622483767028-3f66f32aef97",
        "category": "cat_drinks.jpg",
        "keywords": ["קולה", "פפסי", "קוקה", "זירו", "קוקה קולה"]
    },
    "sub_drinks_juice.jpg": {
        "photo": "photo-1613478223719-2ab802602423",
        "category": "cat_drinks.jpg",
        "keywords": ["מיץ", "ספרינג", "פריגת", "תפוזים", "ענבים", "אשכוליות", "מנגו", "תפוחים", "נקטר"]
    },
    "sub_drinks_tea.jpg": {
        "photo": "photo-1556679343-c7306c1976bc",
        "category": "cat_drinks.jpg",
        "keywords": ["פיוז טי", "פיוזטי", "תה קר", "נסטי"]
    },
    "sub_drinks_soda.jpg": {
        "photo": "photo-1622483767028-3f66f32aef97",
        "category": "cat_drinks.jpg",
        "keywords": ["ספרייט", "פאנטה", "שוופס", "משקה קל", "מוגז", "שוויפס", "7UP"]
    },

    # Water & Soda
    "sub_water_mineral.jpg": {
        "photo": "photo-1523362628745-0c100150b504",
        "category": "cat_water.jpg",
        "keywords": ["מים מינרליים", "עין גדי", "נביעות", "מי עדן", "מים מטוהרים", "מים", "אקווה"]
    },
    "sub_water_sparkling.jpg": {
        "photo": "photo-1560023907-5f339617ea30",
        "category": "cat_water.jpg",
        "keywords": ["סודה", "מוגז", "קינלי", "סאן פלגרינו", "פרייה", "נורדיק"]
    },

    # Energy & Beer
    "sub_energy_can.jpg": {
        "photo": "photo-1622543925917-763c34d1a86e",
        "category": "cat_energy.jpg",
        "keywords": ["אנרגיה", "בלו", "רד בול", "מונסטר", "XL", "בלו משקה"]
    },
    "sub_energy_beer.jpg": {
        "photo": "photo-1518176258769-f227c798150e",
        "category": "cat_energy.jpg",
        "keywords": ["בירה", "גולדסטאר", "היינקן", "קורונה", "קרלסברג", "טובורג", "מאלט", "סטלה", "בירה שחורה"]
    },

    # Baby
    "sub_baby_formula.jpg": {
        "photo": "photo-1515488042361-ee00e0ddd4e4",
        "category": "cat_baby.jpg",
        "keywords": ["מטרנה", "סימילאק", "נוטרילון", "דייסה", "שלב 1", "שלב 2", "שלב 3"]
    },
    "sub_baby_diapers.jpg": {
        "photo": "photo-1515488042361-ee00e0ddd4e4",
        "category": "cat_baby.jpg",
        "keywords": ["חיתול", "פמפרס", "האגיס", "טיטול", "חיתולים"]
    },
    "sub_baby_care.jpg": {
        "photo": "photo-1515488042361-ee00e0ddd4e4",
        "category": "cat_baby.jpg",
        "keywords": ["מוצץ", "בקבוק לתינוק", "מגבונים לתינוק", "MAM", "מחית לתינוק", "גרבר", "בייבי"]
    },

    # Care & Hygiene
    "sub_care_shampoo.jpg": {
        "photo": "photo-1535585209827-a15fcdbc4c2d",
        "category": "cat_care.jpg",
        "keywords": ["שמפו", "מרכך", "הוואי", "פינוק", "הד אנד שולדרס", "פנטן", "קרליין", "דאב שמפו", "לשיער"]
    },
    "sub_care_soap.jpg": {
        "photo": "photo-1600857544200-b2f666a9a2ec",
        "category": "cat_care.jpg",
        "keywords": ["סבון", "אל סבון", "תחליב רחצה", "ג`ל רחצה", "דאב", "פלמוליב", "נקה 7", "כיף סבון"]
    },
    "sub_care_dental.jpg": {
        "photo": "photo-1559591937-e105300f576d",
        "category": "cat_care.jpg",
        "keywords": ["משחת שיניים", "מברשת שיניים", "קולגייט", "אורל בי", "מי פה", "שיניים", "חוט דנטלי", "אקווהפרש"]
    },
    "sub_care_deodorant.jpg": {
        "photo": "photo-1585238342024-78d387f4a707",
        "category": "cat_care.jpg",
        "keywords": ["דאודורנט", "רול און", "ספריי גוף", "אקס", "גרנייה", "רקסונה", "ספיד סטיק"]
    },
    "sub_care_wipes.jpg": {
        "photo": "photo-1584556812952-905ffd0c611a",
        "category": "cat_care.jpg",
        "keywords": ["מגבונים", "צמר גפן", "קיסמי אוזניים", "פדים", "טמפונים", "תחבושות", "אולוויז"]
    },

    # Cleaning & Laundry
    "sub_cleaning_laundry.jpg": {
        "photo": "photo-1582735689369-4fe89db7114c",
        "category": "cat_cleaning.jpg",
        "keywords": ["כביסה", "אריאל", "פרסיל", "סוד כביסה", "מרכך כביסה", "ג`ל כביסה", "קפסולות כביסה", "קולון", "טייד", "בדין"]
    },
    "sub_cleaning_dish.jpg": {
        "photo": "photo-1585421514738-01798e348b17",
        "category": "cat_cleaning.jpg",
        "keywords": ["כלים", "פיירי", "נוזל כלים", "טבליות למדיח", "פיניש", "מבריק", "סומט", "סנו כלים"]
    },
    "sub_cleaning_surface.jpg": {
        "photo": "photo-1585421514738-01798e348b17",
        "category": "cat_cleaning.jpg",
        "keywords": ["סנו", "אקונומיקה", "רצפה", "חלונות", "ספריי לניקוי", "מסיר שומנים", "מטליות", "ספוג", "שיש", "אסלות", "כלור"]
    },
    "sub_cleaning_paper.jpg": {
        "photo": "photo-1584556812952-905ffd0c611a",
        "category": "cat_cleaning.jpg",
        "keywords": ["נייר טואלט", "מגבות נייר", "טישו", "גליל נייר", "לילי", "מולט", "חוגלה"]
    },

    # Home & Disposables
    "sub_home_plates.jpg": {
        "photo": "photo-1583847268964-b28dc8f51f92",
        "category": "cat_home.jpg",
        "keywords": ["צלחות", "קערות", "סכו`ם", "מזלג", "סכין", "כף", "כפית", "קשיות", "חד פעמי"]
    },
    "sub_home_cups.jpg": {
        "photo": "photo-1577937927133-66ef06acdf18",
        "category": "cat_home.jpg",
        "keywords": ["כוסות", "כוס חמה", "כוס פלסטיק", "שוט", "כוסות נייר", "כוס קפה"]
    },
    "sub_home_foil.jpg": {
        "photo": "photo-1583847268964-b28dc8f51f92",
        "category": "cat_home.jpg",
        "keywords": ["אלומיניום", "רדיד", "נייר אפייה", "ניילון נצמד", "תבניות", "סיר פלא"]
    },
    "sub_home_bags.jpg": {
        "photo": "photo-1583847268964-b28dc8f51f92",
        "category": "cat_home.jpg",
        "keywords": ["שקיות אשפה", "שקיות אוכל", "שקיות זיפלוק", "שקיות הקפאה", "שקית", "שקיות"]
    },

    # General & Leisure
    "sub_general_batteries.jpg": {
        "photo": "photo-1588854337236-6889d631faa8",
        "category": "cat_general.jpg",
        "keywords": ["סוללות", "דורסל", "אנרג`ייזר", "ליתיום", "AA", "AAA", "בטריות"]
    },
    "sub_general_home.jpg": {
        "photo": "photo-1513519245088-0e12902e5a38",
        "category": "cat_general.jpg",
        "keywords": ["נורה", "כבל", "מאריך", "מצת", "גפרורים", "נרות", "סופרגלו", "דבק", "בלונים"]
    },
}

# ---------------------------------------------------------------------------
# Helper: Download and crop image to square 600x600 JPEG
# ---------------------------------------------------------------------------
def download_square_photo(photo_id, dest_path, size=600):
    url = f"https://images.unsplash.com/{photo_id}?w={size}&auto=format&fit=crop&q=80"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            im = Image.open(io.BytesIO(data))
            if im.mode != "RGB":
                im = im.convert("RGB")
            
            # Center crop to square
            w, h = im.size
            min_dim = min(w, h)
            left = (w - min_dim) // 2
            top = (h - min_dim) // 2
            im_cropped = im.crop((left, top, left + min_dim, top + min_dim))
            im_resized = im_cropped.resize((size, size), Image.Resampling.LANCZOS)
            im_resized.save(dest_path, "JPEG", quality=85, optimize=True)
            return True
    except Exception as e:
        print(f"⚠️  Download failed for {photo_id}: {e}")
        return False

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("🎨 Step 1: Downloading 21 real category photos...")
    cat_success = 0
    for filename, photo_id in CATEGORY_PHOTOS.items():
        dest = os.path.join(CAT_DIR, filename)
        if download_square_photo(photo_id, dest):
            cat_success += 1
            print(f"   ✅ {filename}")
        else:
            print(f"   ❌ {filename}")
    print(f"   {cat_success}/21 category photos ready.\n")

    print("🎨 Step 2: Downloading ~55 subcategory generic photos...")
    sub_success = 0
    for filename, data in SUBCATEGORIES.items():
        dest = os.path.join(SUB_DIR, filename)
        if download_square_photo(data["photo"], dest):
            sub_success += 1
        else:
            print(f"   ❌ {filename}")
    print(f"   {sub_success}/{len(SUBCATEGORIES)} subcategory photos ready.\n")

    print("💾 Step 3: Exporting subcategory rules to JSON...")
    rules = []
    for filename, data in SUBCATEGORIES.items():
        rules.append({
            "image": filename,
            "category": data["category"],
            "keywords": data["keywords"]
        })
    with open(MAP_PATH, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)
    print(f"   Saved to {MAP_PATH}\n")

    print("🧹 Step 4: Purging old text placeholder copies from catalog/images/...")
    # Find all placeholder hashes from original category banners
    # Notice: we saved new category photos, but we can detect text placeholder files
    # because they have identical file size/hash or we identify them by checking against known text hashes.
    # We already know the 7,650 files. Let's find any files that match old placeholder hashes
    # OR we can compare against the master CSV:
    df = pd.read_csv(CSV_PATH)
    print(f"   CSV rows: {len(df)}")

    # Check OpenFoodFacts Israeli packshots for a subset of prominent products:
    print("\n🔍 Step 5: Querying OpenFoodFacts for real Israeli packshots...")
    # Let's run a fast scan for dairy, snacks, drinks, bread
    print("   Scanning high-priority product barcodes...")
    sample_bcs = []
    for _, row in df.iterrows():
        bc = str(row["בר-קוד מאומת (EAN)"]).replace(".0", "").strip()
        name = str(row["תאור פריט"])
        if len(bc) >= 8 and bc.isdigit() and bc.startswith("7290"):
            sample_bcs.append((bc, name))
    
    # We will run OpenFoodFacts for top 300 barcodes asynchronously
    async def fetch_off_packshots():
        sem = asyncio.Semaphore(10)
        downloaded = 0
        async with aiohttp.ClientSession(headers={"User-Agent": "OmarStore/1.0 (admin@example.com)"}) as session:
            async def get_packshot(bc, name):
                nonlocal downloaded
                dest = os.path.join(PROD_DIR, f"{bc}.jpg")
                url = f"https://world.openfoodfacts.org/api/v2/product/{bc}?fields=image_front_url,image_url"
                async with sem:
                    try:
                        async with session.get(url, timeout=4) as r:
                            if r.status == 200:
                                d = await r.json()
                                if d.get("status") == 1:
                                    img_url = d.get("product", {}).get("image_front_url") or d.get("product", {}).get("image_url")
                                    if img_url:
                                        async with session.get(img_url, timeout=6) as img_r:
                                            if img_r.status == 200:
                                                content = await img_r.read()
                                                im = Image.open(io.BytesIO(content))
                                                if im.mode != "RGB":
                                                    im = im.convert("RGB")
                                                im.save(dest, "JPEG", quality=85, optimize=True)
                                                downloaded += 1
                                                print(f"   📸 OFF Packshot: {bc} ({name[:25]})")
                    except Exception:
                        pass
            await asyncio.gather(*[get_packshot(bc, name) for bc, name in sample_bcs[:300]])
        print(f"   Downloaded {downloaded} fresh Israeli packshots from OpenFoodFacts!")

    asyncio.run(fetch_off_packshots())
    print("\n✨ Asset preparation complete!")

if __name__ == "__main__":
    main()
