# === 0. Base ===
FROM node:20-alpine AS base
# pnpm 호환성을 위해 libc6-compat 설치 (모든 단계 공통)
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# 1. pruner Stage (필요 파일 추출)
FROM base AS pruner
WORKDIR /app

# turbo 설치
RUN npm install -g turbo

# monorepo 전체 복사
COPY . .

# backend만 남기고 prune
RUN turbo prune backend --docker


# 2. Builder (전체 의존성 설치 및 빌드)
FROM base AS builder
WORKDIR /app

# turbo 설치
RUN npm install -g turbo

# lockfile과 json 복사
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Prisma 파일 복사 (postinstall의 prisma generate를 위해 필요)
COPY --from=pruner /app/out/full/apps/backend/prisma ./apps/backend/prisma
COPY --from=pruner /app/out/full/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

# [중요] .npmrc 파일을 생성하여 node-linker=hoisted 설정 추가
# 이 설정은 pnpm이 심볼릭 링크 대신 실제 파일을 복사하게 만듭니다.
RUN echo "node-linker=hoisted" > .npmrc

# 전체 의존성 설치 (Build를 위해 devDependencies 필요)
RUN pnpm install --frozen-lockfile

# 소스코드 복사 및 빌드
COPY --from=pruner /app/out/full/ .
RUN turbo run build --filter=backend

# Sentry sourcemap 업로드 (빌드 단계 전용, 이미지에 남기지 않음)
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE

RUN if [ -n "$SENTRY_AUTH_TOKEN" ] && [ -n "$SENTRY_ORG" ] && [ -n "$SENTRY_PROJECT" ] && [ -n "$SENTRY_RELEASE" ]; then \
  SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
  SENTRY_ORG=$SENTRY_ORG \
  SENTRY_PROJECT=$SENTRY_PROJECT \
  SENTRY_RELEASE=$SENTRY_RELEASE \
  npx sentry-cli releases new "$SENTRY_RELEASE" && \
  SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
  SENTRY_ORG=$SENTRY_ORG \
  SENTRY_PROJECT=$SENTRY_PROJECT \
  SENTRY_RELEASE=$SENTRY_RELEASE \
  npx sentry-cli releases files "$SENTRY_RELEASE" upload-sourcemaps ./apps/backend/dist --rewrite --validate && \
  SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
  SENTRY_ORG=$SENTRY_ORG \
  SENTRY_PROJECT=$SENTRY_PROJECT \
  SENTRY_RELEASE=$SENTRY_RELEASE \
  npx sentry-cli releases finalize "$SENTRY_RELEASE"; \
fi

# 3. Prod-Deps (실행용 의존성만 따로 설치)
# 이 단계가 없으면 node_modules가 너무 크거나, 심볼릭 링크가 깨짐
FROM base AS prod-deps
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN echo "node-linker=hoisted" > .npmrc

# Prisma 파일 복사 (postinstall의 prisma generate를 위해 필요)
COPY --from=pruner /app/out/full/apps/backend/prisma ./apps/backend/prisma
COPY --from=pruner /app/out/full/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

# 중요: --prod 옵션으로 실행에 필요한 패키지(Nestjs core 등)만 설치
# postinstall 스크립트가 prisma generate를 실행함
RUN pnpm install --prod --frozen-lockfile

# 4. Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json

# Prisma 파일 복사 (CD 워크플로우에서 마이그레이션 실행을 위해 필요)
COPY --from=prod-deps /app/apps/backend/prisma ./prisma
COPY --from=prod-deps /app/apps/backend/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
