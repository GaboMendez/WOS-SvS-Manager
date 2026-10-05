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

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy built files
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json .

# Expose port
EXPOSE 3001

# Run the server
CMD ["bun", "run", "server/index.ts"]
