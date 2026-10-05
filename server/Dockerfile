# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY bun.lock* ./

RUN bun install

COPY . .

# Production stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Set environment for SQLite file storage
ENV DOCKER=true

# Set default port for Railway
ENV PORT=8080

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy built files
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json .

# Expose port (Railway uses PORT env var, default to 8080)
EXPOSE 8080

# Run the server
CMD ["bun", "run", "server/index.ts"]
