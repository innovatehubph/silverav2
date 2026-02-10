# Stage 1: Build the React client
FROM node:20-alpine AS client-build

WORKDIR /app/client

# Install client dependencies
COPY client/package*.json ./
RUN npm ci

# Copy client source and build
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine

# Install build dependencies for better-sqlite3 (native module)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server source
COPY server/ ./server/

# Copy built client from stage 1
COPY --from=client-build /app/client/dist ./client/dist

# Copy public assets (images, etc.)
COPY public/ ./public/

# Create data directory for SQLite (persistent volume mount point)
RUN mkdir -p /data

# Expose port
EXPOSE 3865

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3865/api/health || exit 1

# Start the application
CMD ["node", "server/index.js"]
