# === 0. Base (공통 설정) ===
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate


# 1. pruner (필요 파일 추출)
FROM base AS pruner
WORKDIR /app

RUN npm install -g turbo

COPY . .

RUN turbo prune frontend --docker

# 2. Builder stage
FROM base AS builder
WORKDIR /app

# 1) 의존성 명세 복사 (캐시 활용)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# 2) 의존성 설치
RUN pnpm install --frozen-lockfile

# 3) 소스코드 복사
COPY --from=pruner /app/out/full/ .

# 4) 빌드 실행
RUN turbo run build --filter=frontend

# 3. Nginx
FROM nginx:alpine AS runner

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
