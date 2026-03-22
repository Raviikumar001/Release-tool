package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"github.com/ravi/release-tool/backend/internal/dto"
	"github.com/ravi/release-tool/backend/internal/service"
)

type ReleaseHandler struct {
	service *service.ReleaseService
}

func NewReleaseHandler(service *service.ReleaseService) *ReleaseHandler {
	return &ReleaseHandler{service: service}
}

func (h *ReleaseHandler) RegisterRoutes(group *echo.Group) {
	group.GET("/health", h.Health)
	group.GET("/meta/steps", h.ListSteps)
	group.GET("/releases", h.ListReleases)
	group.GET("/releases/:id", h.GetRelease)
	group.POST("/releases", h.CreateRelease)
	group.PATCH("/releases/:id", h.UpdateRelease)
	group.PATCH("/releases/:id/steps", h.UpdateSteps)
	group.DELETE("/releases/:id", h.DeleteRelease)
}

func (h *ReleaseHandler) Health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func (h *ReleaseHandler) ListSteps(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]any{"steps": h.service.Steps()})
}

func (h *ReleaseHandler) ListReleases(c echo.Context) error {
	releases, err := h.service.List(c.Request().Context())
	if err != nil {
		return respondError(c, http.StatusInternalServerError, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"releases": releases})
}

func (h *ReleaseHandler) GetRelease(c echo.Context) error {
	release, err := h.service.GetByID(c.Request().Context(), c.Param("id"))
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(strings.ToLower(err.Error()), "no rows") {
			status = http.StatusNotFound
		}
		return respondError(c, status, err)
	}
	return c.JSON(http.StatusOK, release)
}

func (h *ReleaseHandler) CreateRelease(c echo.Context) error {
	var req dto.CreateReleaseRequest
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}

	release, err := h.service.Create(c.Request().Context(), req)
	if err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}
	return c.JSON(http.StatusCreated, release)
}

func (h *ReleaseHandler) UpdateRelease(c echo.Context) error {
	var req dto.UpdateReleaseRequest
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}

	release, err := h.service.UpdateAdditionalInfo(c.Request().Context(), c.Param("id"), req)
	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "no rows") {
			status = http.StatusNotFound
		}
		return respondError(c, status, err)
	}
	return c.JSON(http.StatusOK, release)
}

func (h *ReleaseHandler) UpdateSteps(c echo.Context) error {
	var req dto.UpdateStepsRequest
	if err := c.Bind(&req); err != nil {
		return respondError(c, http.StatusBadRequest, err)
	}

	release, err := h.service.UpdateSteps(c.Request().Context(), c.Param("id"), req)
	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "no rows") {
			status = http.StatusNotFound
		}
		return respondError(c, status, err)
	}
	return c.JSON(http.StatusOK, release)
}

func (h *ReleaseHandler) DeleteRelease(c echo.Context) error {
	if err := h.service.Delete(c.Request().Context(), c.Param("id")); err != nil {
		status := http.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			status = http.StatusNotFound
		}
		return respondError(c, status, err)
	}
	return c.NoContent(http.StatusNoContent)
}

func respondError(c echo.Context, status int, err error) error {
	if err == nil {
		err = errors.New("unknown error")
	}
	return c.JSON(status, map[string]string{"error": err.Error()})
}
