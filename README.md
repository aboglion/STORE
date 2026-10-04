# מערכת מסחר — Next.js + Supabase

מערכת מסחר מלאה בפרויקט אחד (מונולית): חנות ללקוח + דאשבורד ניהול + דאטהבייס + שטח אחסון.
עברית מלאה, RTL, מותאם מובייל.

## טכנולוגיות

| רכיב | טכנולוגיה |
|---|---|
| פרונט + באק | Next.js App Router + TypeScript (Server Actions) |
| דאטהבייס | Supabase PostgreSQL (RLS, RPC, Views) |
| אחסון תמונות | Supabase Storage |
| התחברות מנהל | Supabase Auth (אימייל + סיסמה) |
| עיצוב | Tailwind CSS + shadcn/ui |
| טפסים | React Hook Form + Zod |
| גרפים | Recharts |
| בדיקות | Vitest |

## תכונות

**חנות (ללקוח):**
- קטלוג מוצרים + סינון לפי קטגוריה
- דף מוצר עם גלריית תמונות
- סל קניות (localStorage)
- צ'קאאוט: שם, טלפון, כתובת + מיקום אוטומטי מהדפדפן
- בחירת תשלום: מזומן / אשראי
- דף אישור הזמנה
- אין צורך בהרשמה — זיהוי לקוח לפי טלפון מנורמל

**דאשבורד (מנהל):**
- התחברות מאובטחת (Auth + RLS + middleware)
- ניהול מוצרים: שמירה, עריכה, מחיקה, העלאת תמונות (עם דחיסה)
- ניהול קטגוריות
- ניהול מלאי: עדכונים ידניים עם יומן שינויים, התראות מלאי נמוך
- ניהול הזמנות: סטטוסים, תשלום, ביטול (מחזיר מלאי), היסטוריית אירועים
- ניהול לקוחות: פרופיל, היסטוריה, מוצרים נפוצים, איתור כתובות כפולות
- סטטיסטיקות: הכנסות יומיות/חודשיות, מוצרים נמכרים, סטטוסי הזמנות
- הגדרות חנות: שם, דמי משלוח, סף משלוח חינם, סף מלאי נמוך

## עקרונות חשובים ביישום

1. **כסף באגורות** — כל המחירים נשמרים כ-int (`price_agorot`), 100 אגורות = 1 ₪.
2. **מחירים מהשרת בלבד** — בצ'קאאוט המחירים נמשכים מהדאטהבייס מעולם, לא מה-localStorage.
3. **מניעת מכירת יתר** — הפונקציה `create_order()` בדאטהבייס נועלת שורות מוצרים (`SELECT ... FOR UPDATE`) בתוך transaction אחד: שני צ'קאאוטים מקבילים על המוצר האחרון — רק אחד מצליח.
4. **תמונת מצב** — הזמנות שומרות שם ומחיר בזמן ההזמנה, כך ששינוי מחיר/מחיקת מוצר לא שוברים היסטוריה.
5. **נרמול טלפון** — `0501234567`, `050-123-4567`, `+972501234567` → `+972501234567` (libphonenumber-js).
6. **נרמול כתובת** — אותיות קטנות, ללא פסיקים/רווחים מיותרים; כתובות זהות מזוהות, כפילויות מסומנות לבדיקה ידנית בלבד.
7. **RLS** — הציבור קורא רק מוצרים פעילים; כל הכתיבה עוברת דרך Server Actions עם `service_role` בצד שרת.

## התקנה מקומית

### 0. פקודה אחת שמתקינה ומריצה הכל

```bash
npm run setup        # התקנת חבילות + בדיקות + lint + typecheck + build
npm run setup:dev    # כמו למעלה + הרצת שרת הפיתוח
```

או ישירות:

```bash
./scripts/setup.sh
./scripts/setup.sh dev
```

הסקריפט:
1. בודק Node/npm
2. מתקין חבילות (`npm install`)
3. יוצר `.env.local` מ-`.env.example` אם חסר
4. מריץ בדיקות, lint, typecheck ו-build
5. אם Supabase CLI מוגדר — מריץ המיגרציות; אחרי� מדפיס הוראות ידניות
6. עם `dev` — מריץ שרת הפיתוח

### 0.5. הרצה מהירה — Docker + Makefile (מומלץ)

הדרך הקלה ביותר להריץ את כל המערכת מקומית (Supabase ב-Docker + שרת פיתוח):

```bash
make run
```

הפקודה עושה הכל בבת אחת:
1. מתקינה חבילות (`npm install` + Supabase CLI)
2. מריצה את כל ערימת Supabase ב-Docker (`supabase start`)
3. בפעם הראשונה: מריצה מיגרציות + `seed.sql` (נתוני דמו)
4. יוצרת `.env.local` אוטומטית מהערכים המקומיים
5. יוצרת משתמש אדמין: `admin@example.com` / `admin1234`
6. מריצה את שרת הפיתוח

כתובות:
- חנות: http://localhost:3000
- דאשבורד: http://localhost:3000/admin/login
- Supabase Studio: http://127.0.0.1:54323

פקודות נוספות:

```bash
make help        # רשימת כל הפקודות
make db-start    # הפעלת Supabase (Docker)
make db-stop     # עצירת Supabase
make db-reset    # איפוס דאטהבייס (מיגרציות + seed) — הרסני
make env         # יצירת .env.local מחדש
make admin       # יצירת משתמש אדמין
make dev         # שרת פיתוח בלבד
make build       # בנייה
make test        # בדיקות
make lint        # ESLint
make typecheck   # TypeScript
```

> דרישות: Docker רץ + Node 20+. בפעם הראשונה `supabase start` מוריד תמונות Docker (כמה דקות).

### 1. יצירת פרויקט Supabase

1. היכנסו ל-https://supabase.com וצרו פרויקט חדש.
2. נכנסים ל-**SQL Editor** ומריצים את הקבצים לפי הסדר:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_functions.sql`
   - `supabase/migrations/0003_views.sql`
   - `supabase/migrations/0004_rls.sql`
3. רצוי: מריצים גם `supabase/seed.sql` לנתוני דמו (קטגוריות + מוצרים + הגדרות).

> אם אתם מעדיפים CLI: `supabase db push` על דאטהבייס מרוחק, או `supabase db reset` מקומית.

### 2. משתני סביבה

```bash
cp .env.example .env.local
```

ממלאים:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `SUPABASE_SERVICE_ROLE_KEY` הוא **סודי** — אסור שיגיע לפרונט. הוא נמצא רק בקבצים עם `import "server-only"`.

### 3. יצירת משתמש מנהל ראשון

1. Supabase Dashboard → **Authentication → Users → Add user** (אימייל + סיסמה).
2. מעתיקים את ה-UUID של המשתמש ומריצים (אפשרי ליד ההערה ב-`seed.sql`):

```sql
insert into admin_profiles (id, email, role)
values ('REPLACE_WITH_USER_UUID', 'admin@example.com', 'admin');
```

### 4. התקנת חבילות והרצה

```bash
npm install
npm run dev
```

פותחים: `http://localhost:3000` (חנות) ו-`http://localhost:3000/admin/login` (דאשבורד).

### סקריפטים

```bash
npm run dev        # פיתוח
npm run build      # בנייה
npm start          # הרצת גרסת production
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # בדיקות יחידה (Vitest)
```

## פריסה ב-Vercel

1. דוחפים את הקוד ל-GitHub.
2. ב-Vercel: **New Project → Import** — Vercel מזהה Next.js אוטומטית.
3. מוסיפים את משתני הסביבה (אותם מהשלב הקודם).
4. Deploy.

## מבנה הפרויקט

```text
app/
  admin/               דאשבורד ניהול
  products/[slug]/     דף מוצר
  cart/  checkout/     סל וצ'קאאוט
  order-success/       אישור הזמנה
components/
  ui/  store/  admin/  קומפוננטות
lib/
  actions/             Server Actions (מוטציות)
  data/                שאילתות קריאה מהשרת
  supabase/            לקוחות Supabase (client/server/admin)
  utils/               טלפון, כתובת, מטבע, תאריכים, תמונות
  validations/         סכמות Zod
supabase/
  migrations/          סכמת דאטהבייס + פונקציות + RLS
  seed.sql             נתוני דמו
types/
  database.types.ts    טיפוסי TS
tests/                 בדיקות יחידה
```

## בדיקות קצה שחשוב לוודא

- מוצר עם מלאי 0 לא ניתן להזמנה
- שני הזמנות מקבילות על יחידה אחרונה — רק אחת עוברת
- ביטול הזמנה מחזיר מלאי
- אותו טלפון בפורמטים שונים = לקוח אחד
- אותה כתובת עם רווחים/פסיקים = אותה כתובת
- סירוב לאיתור מיקום → עדיין ניתן למלא כתובת ידנית
- סל ריק/מוצר לא פעיל/טלפון לא תקין → הודעות שגיאה ברורות

## תשלום אשראי (שלב עתידי)

בגרסה זו תשלום האשראי הוא בחירה בלבד (מנהל מסמן "שולם"). לחיבור סליקה אמיתי (Cardcom/Tranzila וכו'):
יש לעבוד דרך iframe/redirect של הספק, בלי לשמור פרטי כרטיס, ולעדכן את `payment_status` דרך webhook.