# ============================================================
# מערכת מסחר — Makefile
# ============================================================
#   make local      — הפעלה מקומית בסביבת פיתוח (Dev)
#   make run        — הפעלה דרך דוקר לפרודקשן (Docker Production)
#   make gp         — העלאה ל-GitHub (git add + commit + push)
#   make help       — רשימת כל הפקודות הזמינות
# ============================================================

SUPABASE := npx supabase

.PHONY: help gp GP pg PG local LOCAL dev run RUN prod production docker-build docker-stop docker-down docker-logs logs stop down install db-start db-stop db-reset db-status env admin build test lint typecheck init status service-logs updater-logs

help: ## הצגת רשימת הפקודות הזמינות
	@echo "\033[1;33mמערכת מסחר — פקודות Make זמינות:\033[0m"
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ------------------------------------------------------------
# Git & GitHub (make gp / make GP)
# ------------------------------------------------------------
gp: ## העלאה ל-GitHub (גיטהאב): add, commit ו-push ל-origin master
	@echo "🚀 מעלה שינויים ל-GitHub..."
	git add -A
	@if git diff-index --quiet HEAD -- 2>/dev/null; then \
		echo "ℹ️  אין שינויים חדשים לקומיט. דוחף קומיטים קיימים..."; \
	else \
		git commit -m "$${MSG:-Update and sync project}"; \
	fi
	git push origin master
	@echo "✅ הועלה בהצלחה ל-GitHub!"

GP: gp ## כינוי עבור make gp
pg: gp ## כינוי עבור make gp
PG: gp ## כינוי עבור make gp

# ------------------------------------------------------------
# הפעלה מקומית (Dev)
# ------------------------------------------------------------
local: ## הפעלה מקומית בסביבת פיתוח (Dev עם Next.js ו-Supabase)
	@bash scripts/run.sh

LOCAL: local ## כינוי עבור make local
dev: local   ## כינוי עבור make local

# ------------------------------------------------------------
# הפעלה דרך דוקר לפרודקשן (Production via Docker)
# ------------------------------------------------------------
run: ## הפעלה מלאה דרך דוקר לפרודקשן + שירות רקע אוטונומי ועמידות באתחול
	@bash scripts/docker-run.sh

RUN: run        ## כינוי עבור make run
prod: run       ## כינוי עבור make run
production: run ## כינוי עבור make run

docker-build: ## בניית תמונת הפרודקשן בדוקר בלבד
	docker compose build

docker-stop: stop ## כינוי עבור make stop

docker-down: stop ## כינוי עבור make stop

docker-logs: ## צפייה בלוגים של שירות הפרודקשן בדוקר
	docker compose logs -f

logs: docker-logs ## כינוי לצפייה בלוגים

stop: ## עצירת כל שירותי המערכת (כולל שירות הרקע וקונטיינרים של Docker ו-Supabase)
	@echo "🛑 עוצר את כל שירותי המערכת ושירות הרקע..."
	@bash scripts/service.sh stop 2>/dev/null || true
	@docker compose down 2>/dev/null || true
	@$(SUPABASE) stop 2>/dev/null || true
	@echo "✅ כל שירותי המערכת נעצרו בהצלחה!"

down: stop ## כינוי עבור make stop

status: ## הצגת סטטוס מלא של המערכת, הדוקר ושירות הרקע
	@bash scripts/service.sh status

service-logs: ## צפייה בלוגים שוטפים של שירות הרקע והעדכון האוטומטי
	@bash scripts/service.sh logs

updater-logs: service-logs ## כינוי עבור service-logs

init: ## סקריפט אתחול, התקנת תלויות מערכת (Make, Docker) והרצה
	@bash ./init.sh

# ------------------------------------------------------------
# פקודות עזר נוספות
# ------------------------------------------------------------
install: ## התקנת תלויות פרויקט (npm install)
	npm install

db-start: ## הפעלת שרת Supabase מקומי (Docker)
	$(SUPABASE) start

db-stop: ## עצירת שרת Supabase מקומי
	$(SUPABASE) stop

db-reset: ## איפוס מסד הנתונים: הרצת מיגרציות + seed.sql
	$(SUPABASE) db reset
	@touch .supabase-initialized

db-status: ## סטטוס שרתי Supabase מקומיים
	$(SUPABASE) status

env: ## יצירת קובץ .env.local משרת ה-Supabase המקומי
	bash scripts/env-local.sh

admin: ## יצירת משתמש אדמין ראשוני (admin@example.com / admin1234)
	bash scripts/create-admin.sh

build: ## בניית גרסת פרודקשן מקומית ללא דוקר
	npm run build

test: ## הרצת בדיקות יחידה (Vitest)
	npm test

lint: ## בדיקת תקינות קוד (ESLint)
	npm run lint

typecheck: ## בדיקת טיפוסים (TypeScript)
	npm run typecheck