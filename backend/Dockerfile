# backend/Dockerfile
# Multi-stage build for the Go backend application with SQLite support.

# Stage 1: Build the Go binary
FROM golang:1.21-alpine AS builder

# Install build dependencies for CGO (required by SQLite)
RUN apk add --no-cache build-base

WORKDIR /app

# Copy go.mod files first for better layer caching
COPY go.work go.mod go.sum ./
COPY backend/go.mod backend/go.sum ./backend/

# Download dependencies
RUN go mod download || true

# Copy the rest of the source code
COPY backend/ ./backend/

# Build the Go binary with CGO enabled for SQLite
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o /server ./backend/cmd/server/main.go

# Stage 2: Minimal production runtime
FROM alpine:3.18 AS runner

# Install runtime dependencies
RUN apk add --no-cache ca-certificates sqlite

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /server .

# Copy migration files so the app can run them on startup
COPY --from=builder /app/backend/pkg/db/migrations ./pkg/db/migrations

# Create data and uploads directories
RUN mkdir -p ./data ./uploads

EXPOSE 8080

CMD ["./server"]