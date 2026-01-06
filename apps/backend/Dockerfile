FROM node:20-alpine AS base

# 1. Builder Stage
FROM base AS builder

# pnpm 활성화
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

# turbo 설치
RUN npm install -g turbo
RUN corepack enable && corepack prepare pnpm@latest --activate

# monorepo 전체 복사
COPY . .

# backend만 남기고 prune
RUN turbo prune backend --docker


# 2. Install + Build
FROM base AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm 및 Turbo 설정
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g turbo

# 1) 의존성 명세(package.json) 복사 -> 캐시 활용
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# 2) 의존성 설치
RUN pnpm install --frozen-lockfile

# 3) 소스코드 복사
COPY --from=builder /app/out/full/ .

# 4) 빌드 실행
RUN turbo run build --filter=backend


# 3. Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

# 실행에 필요한 파일만 복사
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]
