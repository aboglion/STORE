# ============================================================
# מערכת מסחר — Makefile shortcuts
# ============================================================
#   make run        — הכל בפקודה אחת: התקנה + Supabase (Docker) +
#                     דאטהבייס + .env.local + משתמש אדמין + שרת פיתוח
#   make help       — רשימת כל הפקודות
# ============================================================

SUPABASE := npx supabase

.PHONY: help install db-start db-stop db-reset db-status env admin dev build test lint typecheck down run PG

help: ## Show all available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install npm dependencies (includes the Supabase CLI)
	npm install

db-start: ## Start the local Supabase stack (Docker)
	$(SUPABASE) start

db-stop: ## Stop the local Supabase stack
	$(SUPABASE) stop

db-reset: ## Reset the DB: re-apply migrations + seed.sql (destructive)
	$(SUPABASE) db reset
	@touch .supabase-initialized

db-status: ## Show local Supabase status
	$(SUPABASE) status

env: ## Generate .env.local from the running local stack
	bash scripts/env-local.sh

admin: ## Create the first admin user (admin@example.com / admin1234)
	bash scripts/create-admin.sh

dev: ## Run the Next.js dev server
	npm run dev

build: ## Production build
	npm run build

test: ## Unit tests (Vitest)
	npm test

lint: ## ESLint
	npm run lint

typecheck: ## TypeScript type check
	npm run typecheck

down: ## Stop the local Supabase stack
	$(SUPABASE) stop

run: ## ALL-IN-ONE: setup + launch (first run) / quick start (later)
	@bash scripts/run.sh

PG: ## Push everything to GitHub (origin master)
	git add -A
	git commit -m "update" || true
	git push origin master