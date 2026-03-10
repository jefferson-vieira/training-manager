FROM node:24.14-alpine AS base

WORKDIR /app

FROM base AS deps

COPY ./package.json ./package-lock.json ./
COPY ./packages/backend/package.json ./packages/backend/

RUN npm ci

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY ./package.json ./
COPY ./packages/backend ./packages/backend/

RUN npx prisma generate --schema=packages/backend/prisma/schema.prisma

RUN npm run build --workspace=backend

FROM base AS build-deps

COPY ./package.json ./package-lock.json ./
COPY ./packages/backend/package.json ./packages/backend/

RUN npm ci --omit=dev

FROM base AS runner

ENV NODE_ENV=production

COPY --from=build-deps /app/node_modules ./node_modules
COPY --from=build /app/packages/backend/dist ./dist

CMD ["node", "dist/index.js"]
