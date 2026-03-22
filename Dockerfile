FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY backend/go.mod backend/go.sum* ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /release-api ./cmd/api

FROM alpine:3.22
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /release-api /usr/local/bin/release-api
COPY backend/internal/db/migrations ./migrations
EXPOSE 8080
CMD ["release-api"]
