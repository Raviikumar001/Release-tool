FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /release-api ./cmd/api

FROM alpine:3.22
WORKDIR /app
COPY --from=builder /release-api /usr/local/bin/release-api
COPY internal/db/migrations ./migrations
EXPOSE 8080
CMD ["release-api"]
