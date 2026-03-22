package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/ravi/release-tool/backend/internal/app"
	"github.com/ravi/release-tool/backend/internal/config"
	"github.com/ravi/release-tool/backend/internal/db"
)

func main() {
	_ = godotenv.Load()
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	ctx := context.Background()
	log.Println("Attempting to connect to the database...")
	pool, err := connectWithRetry(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer pool.Close()

	log.Println("Running database migrations...")
	if err := db.RunMigrations(ctx, pool); err != nil {
		log.Fatalf("run migrations: %v", err)
	}
	log.Println("Migrations applied successfully!")

	server := app.NewServer(cfg, pool)

	log.Printf("Server starting on port %s", cfg.Port)
	go func() {
		if err := server.Start(":" + cfg.Port); err != nil && err != http.ErrServerClosed {
			log.Fatalf("start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown server: %v", err)
	}
}

func connectWithRetry(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	var lastErr error
	for attempt := range 10 {
		pool, err := pgxpool.New(ctx, databaseURL)
		if err == nil {
			pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
			pingErr := pool.Ping(pingCtx)
			cancel()
			if pingErr == nil {
				return pool, nil
			}
			lastErr = pingErr
			pool.Close()
		} else {
			lastErr = err
		}

		log.Printf("Database connection attempt %d failed. Retrying in %v...\n", attempt+1, time.Duration(attempt+1)*500*time.Millisecond)
		time.Sleep(time.Duration(attempt+1) * 500 * time.Millisecond)
	}
	return nil, lastErr
}
