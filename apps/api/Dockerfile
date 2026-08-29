FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy sources
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

# Build shared types & generate Prisma client
RUN npm run build --workspace=@queuesense/shared-types
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build API TypeScript
RUN npm run build --workspace=@queuesense/api

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/api/package*.json ./apps/api/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 8000

CMD ["node", "apps/api/dist/server.js"]
