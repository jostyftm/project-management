# ==========================================
# Etapa 1: Base con Node.js y pnpm
# ==========================================
FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.5 --activate

# ==========================================
# Etapa 2: Dependencias
# ==========================================
FROM base AS dependencies

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ==========================================
# Etapa 3: Desarrollo (Hot Reload)
# ==========================================
FROM base AS development

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml* ./
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development

EXPOSE 3000

CMD ["pnpm", "dev"]

# ==========================================
# Etapa 4: Compilación para Producción / Staging
# ==========================================
FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/public

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_REPORT_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_LOGIN_ROUTE=/login

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_REPORT_API_URL=$NEXT_PUBLIC_REPORT_API_URL
ENV NEXT_PUBLIC_LOGIN_ROUTE=$NEXT_PUBLIC_LOGIN_ROUTE
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# ==========================================
# Etapa 5: Producción Final
# ==========================================
FROM base AS production

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["pnpm", "start"]
