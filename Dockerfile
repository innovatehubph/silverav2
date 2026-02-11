# Stage 1: Build the React client
FROM node:20-alpine AS client-build

WORKDIR /app/client

# Install client dependencies
COPY client/package*.json ./
RUN npm ci

# Copy client source and build
COPY client/ ./
RUN npm run build

# Stage 2: Build the Next.js admin app
FROM node:20-alpine AS admin-build

WORKDIR /app/admin

# Install admin dependencies
COPY admin-app/package*.json ./
RUN npm ci

# Copy admin source and build
COPY admin-app/ ./
# Set API URL for production
ENV NEXT_PUBLIC_API_URL=https://silvera.innoserver.cloud
RUN npm run build

# Stage 3: Production server
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

# Copy built admin app from stage 2
COPY --from=admin-build /app/admin/.next ./admin-app/.next
COPY --from=admin-build /app/admin/public ./admin-app/public
COPY --from=admin-build /app/admin/package*.json ./admin-app/
COPY --from=admin-build /app/admin/next.config.js ./admin-app/

# Install admin production dependencies
WORKDIR /app/admin-app
RUN npm ci --only=production
WORKDIR /app

# Copy public assets (images, etc.)
COPY public/ ./public/

# Create data directory for SQLite (persistent volume mount point)
RUN mkdir -p /data

# Expose port (main app only for now)
EXPOSE 3865

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3865/api/health || exit 1

# Start the main application
CMD ["node", "server/index.js"]
