package main
import (
    "context"
    "fmt"
    "os"
    "time"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/joho/godotenv"
)
func main() {
    godotenv.Load()
    url := os.Getenv("DATABASE_URL")
    fmt.Println("URL starts with:", url[:10])
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    pool, err := pgxpool.New(ctx, url)
    if err != nil {
        fmt.Println("New error:", err)
        return
    }
    fmt.Println("Pinging...")
    err = pool.Ping(ctx)
    fmt.Println("Ping error:", err)
}
