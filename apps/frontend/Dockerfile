FROM node:20-alpine AS base

# 1. Builder
FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

RUN npm install -g turbo
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY . .

RUN turbo prune frontend --docker


# 2. Build (Install + Build 통합)
FROM base AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm 및 Turbo 설정
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g turbo

# 1) 의존성 명세(package.json 등) 먼저 복사 -> 캐싱 활용
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# 2) 의존성 설치
RUN pnpm install --frozen-lockfile

# 3) 소스코드(out/full) 복사
COPY --from=builder /app/out/full/ .

# 4) 빌드 시점에 필요한 VITE 환경 변수 주입
COPY .env.production ./apps/frontend/.env.production

# 4-1) Sentry sourcemap 업로드용 환경 변수 (빌드 단계 전용, 이미지에 남기지 않음)
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG VITE_SENTRY_RELEASE
ARG SENTRY_RELEASE

# 5) 빌드 실행 (필요 시에만 Sentry 환경변수 주입)
RUN SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
  SENTRY_ORG=$SENTRY_ORG \
  SENTRY_PROJECT=$SENTRY_PROJECT \
  VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE \
  SENTRY_RELEASE=$SENTRY_RELEASE \
  turbo run build --filter=frontend


# 3. Nginx
FROM nginx:alpine AS runner

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
