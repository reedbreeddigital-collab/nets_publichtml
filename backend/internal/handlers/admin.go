package handlers

import (
	"net/http"

	"nets-logistics-backend/internal/database"
	"nets-logistics-backend/internal/models"
	"nets-logistics-backend/internal/response"
)

type AdminHandler struct{}

func NewAdminHandler() *AdminHandler {
	return &AdminHandler{}
}

func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	db := database.DB
	if db == nil {
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"totalQuotes":        0,
			"pendingLeads":       0,
			"unreadContacts":     0,
			"activeFleet":        0,
			"totalPipelineValue": 0,
		})
		return
	}

	var totalQuotes int64
	var pendingLeads int64
	var unreadContacts int64
	var activeFleet int64
	var pipelineSum float64

	db.Model(&models.Lead{}).Count(&totalQuotes)
	db.Model(&models.Lead{}).Where("status = ? AND LOWER(crm_status) NOT IN (?, ?, ?, ?)", "pending", "invalid", "won & paid", "won", "converted").Count(&pendingLeads)
	db.Model(&models.Contact{}).Where("status = ?", "unread").Count(&unreadContacts)
	db.Model(&models.Vehicle{}).Where("available = ?", true).Count(&activeFleet)

	db.Model(&models.Lead{}).Where("LOWER(crm_status) != ?", "invalid").Select("COALESCE(SUM(estimated_investment_max), 0)").Scan(&pipelineSum)

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"totalQuotes":        totalQuotes,
		"pendingLeads":       pendingLeads,
		"unreadContacts":     unreadContacts,
		"activeFleet":        activeFleet,
		"totalPipelineValue": pipelineSum,
	})
}
