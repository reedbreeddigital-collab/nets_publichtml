package handlers

import (
	"net/http"
	"runtime"
	"time"

	"nets-logistics-backend/internal/config"
	"nets-logistics-backend/internal/response"
)

type HealthHandler struct {
	cfg *config.Config
}

func NewHealthHandler(cfg *config.Config) *HealthHandler {
	return &HealthHandler{cfg: cfg}
}

func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]interface{}{
		"status":      "healthy",
		"service":     h.cfg.AppName,
		"environment": h.cfg.Env,
		"goVersion":   runtime.Version(),
		"serverTime":  time.Now().Format("2006-01-02 15:04:05 MST"),
	})
}
