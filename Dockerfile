# ============================================================
# Production Dockerfile for Next.js Storefront & Admin
# ============================================================

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat tzdata
ENV TZ=Asia/Jerusalem
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --prefer-offline --no-audit

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV STANDALONE=true

RUN if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing at build time" && exit 1; fi

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV TZ=Asia/Jerusalem

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# PostgreSQL client tools (pg_dump / pg_restore / psql) + timezone data (Asia/Jerusalem)
RUN apk add --no-cache postgresql17-client tzdata \
    || apk add --no-cache postgresql-client tzdata
RUN cp /usr/share/zoneinfo/Asia/Jerusalem /etc/localtime && echo "Asia/Jerusalem" > /etc/timezone

# Copy static assets, startup script and traced standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/messages ./messages
COPY scripts/start-container.js ./start-container.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Backup & restore scripts executed inside the container (manual UI actions
# and the host-side scheduled trigger via `docker exec`).
COPY --from=builder /app/scripts/db-backup.sh ./scripts/db-backup.sh
COPY --from=builder /app/scripts/db-restore.sh ./scripts/db-restore.sh
RUN chmod +x ./scripts/db-backup.sh ./scripts/db-restore.sh

USER nextjs

EXPOSE 3000

CMD ["node", "start-container.js"]
