# =========================================================================
# Form2Fact API & Web Client — Multi-Stage Production Containerfile
# =========================================================================

# Stage 1: Build Environment
FROM node:22-alpine AS builder

WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm ci

# Copy source and compile production frontend assets
COPY . .
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Prepare non-root runtime directories with correct ownership
RUN mkdir -p /app/data/dockets && \
    chown -R node:node /app

# Install production dependencies only
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled assets and server source files from builder
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/server ./server
COPY --chown=node:node --from=builder /app/server.ts ./server.ts
COPY --chown=node:node --from=builder /app/tsconfig.json ./tsconfig.json
COPY --chown=node:node --from=builder /app/src/types ./src/types

# Run as non-privileged service user
USER node

# Declare persistent storage mount point for SQLite and uploaded dockets
VOLUME ["/app/data"]

EXPOSE 3000

# Container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

# Start production server
CMD ["npx", "--no-install", "tsx", "server.ts"]
