# 1. Builder Stage
FROM node:20-alpine AS builder

WORKDIR /app

# pnpm 활성화
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# turbo 설치
RUN pnpm add -g turbo

# monorepo 전체 복사
COPY . .

# backend만 남기고 prune
RUN turbo prune backend --docker


# 2. Install Dependencies
FROM node:20-alpine AS installer

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# prune 결과 복사
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile


# 3. Build
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/out/full/ .

RUN pnpm turbo run build --filter=backend


# 4. Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# 실행에 필요한 파일만 복사
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=installer /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]
