package handlers

import (
	"net/http"
	"runtime"
	"strings"
	"time"

	"nets-logistics-backend/internal/config"
	"nets-logistics-backend/internal/database"
	"nets-logistics-backend/internal/response"
)

type HealthHandler struct {
	cfg *config.Config
}

func NewHealthHandler(cfg *config.Config) *HealthHandler {
	return &HealthHandler{cfg: cfg}
}

func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	dbStatus := "disconnected"
	dbDriver := h.cfg.DBDriver
	if database.DB != nil {
		dbStatus = "connected"
		dbDriver = database.DB.Dialector.Name()
	}

	dsn := h.cfg.GetFormattedDSN()
	maskedURL := maskDatabaseURL(dsn)

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"status":            "healthy",
		"service":           h.cfg.AppName,
		"environment":       h.cfg.Env,
		"databaseDriver":    dbDriver,
		"databaseStatus":    dbStatus,
		"databaseUrl":       maskedURL,
		"cloudinaryCloud":   h.cfg.CloudinaryCloud,
		"googleMapsApiKey":  h.cfg.GoogleMapsAPIKey,
		"paystackPublicKey": h.cfg.PaystackPublicKey,
		"goVersion":         runtime.Version(),
		"serverTime":        time.Now().Format("2006-01-02 15:04:05 MST"),
	})
}

func maskDatabaseURL(raw string) string {
	if raw == "" {
		return ""
	}
	if atIdx := strings.Index(raw, "@"); atIdx != -1 {
		prefix := raw[:atIdx]
		suffix := raw[atIdx:]
		if colonIdx := strings.LastIndex(prefix, ":"); colonIdx != -1 && !strings.HasSuffix(prefix[:colonIdx], "http") && !strings.HasSuffix(prefix[:colonIdx], "postgres") && !strings.HasSuffix(prefix[:colonIdx], "postgresql") {
			return prefix[:colonIdx] + ":****" + suffix
		}
	}
	return raw
}
