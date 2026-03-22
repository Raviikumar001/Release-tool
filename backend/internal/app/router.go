package app

import (
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/ravi/release-tool/backend/internal/config"
	"github.com/ravi/release-tool/backend/internal/handler"
	"github.com/ravi/release-tool/backend/internal/repository"
	"github.com/ravi/release-tool/backend/internal/service"
)

func NewServer(cfg config.Config, pool *pgxpool.Pool) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true
	e.HTTPErrorHandler = func(err error, c echo.Context) {
		if c.Response().Committed {
			return
		}
		_ = c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	e.Use(middleware.RequestID())
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.TimeoutWithConfig(middleware.TimeoutConfig{Timeout: 15 * time.Second}))
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{cfg.AllowedOrigin, "https://release-tool-bice.vercel.app"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept},
	}))

	repo := repository.NewReleaseRepository(pool)
	service := service.NewReleaseService(repo)
	handler := handler.NewReleaseHandler(service)
	handler.RegisterRoutes(e.Group("/api"))

	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"message": fmt.Sprintf("release-tool API listening on %s", cfg.Port)})
	})

	return e
}
