# Stage 1: Build the Go binary
FROM golang:1.22-alpine AS builder

# Install build dependencies for CGO (required for sqlite3)
RUN apk add --no-cache gcc musl-dev sqlite-dev build-base

WORKDIR /app

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the statically linked Go binary with CGO enabled (for sqlite3)
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-w -s" -o server cmd/server/main.go

# Stage 2: Run the binary in a minimal container
FROM alpine:latest

# Install sqlite runtime and ca-certificates
RUN apk add --no-cache ca-certificates sqlite-libs

WORKDIR /app

# Copy the built binary from the builder stage
COPY --from=builder /app/server .
COPY --from=builder /app/pkg/db/migrations ./pkg/db/migrations

# Expose the API port
EXPOSE 8080

# Run the server
CMD ["./server"]
