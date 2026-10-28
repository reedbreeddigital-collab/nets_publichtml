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

	var teamAvgResponseSec float64
	var teamAvgCloseSec float64
	db.Model(&models.Lead{}).Where("response_time_sec IS NOT NULL AND response_time_sec >= 0").Select("COALESCE(AVG(response_time_sec), 0)").Scan(&teamAvgResponseSec)
	db.Model(&models.Lead{}).Where("close_time_sec IS NOT NULL AND close_time_sec >= 0 AND (LOWER(crm_status) IN ('won & paid', 'won', 'converted') OR LOWER(status) IN ('converted', 'paid'))").Select("COALESCE(AVG(close_time_sec), 0)").Scan(&teamAvgCloseSec)

	// Fetch all sales closers plus any users with assigned leads
	var assignedUserIDs []string
	db.Model(&models.Lead{}).Where("assigned_to != ''").Distinct("assigned_to").Pluck("assigned_to", &assignedUserIDs)

	var closers []models.User
	if len(assignedUserIDs) > 0 {
		db.Where("role = ? OR id IN (?)", "sales_closer", assignedUserIDs).Find(&closers)
	} else {
		db.Where("role = ?", "sales_closer").Find(&closers)
	}

	closerStats := make([]models.CloserStat, 0, len(closers))
	for _, c := range closers {
		var totalAssigned int64
		var totalWon int64
		var avgResp float64
		var avgClose float64
		var revenue float64

		db.Model(&models.Lead{}).Where("assigned_to = ? AND LOWER(crm_status) != 'invalid'", c.ID).Count(&totalAssigned)
		db.Model(&models.Lead{}).Where("assigned_to = ? AND (LOWER(crm_status) IN ('won & paid', 'won', 'converted') OR LOWER(status) IN ('converted', 'paid'))", c.ID).Count(&totalWon)

		winRate := 0
		if totalAssigned > 0 {
			winRate = int(float64(totalWon) / float64(totalAssigned) * 100)
		}

		db.Model(&models.Lead{}).Where("assigned_to = ? AND response_time_sec IS NOT NULL AND response_time_sec >= 0", c.ID).Select("COALESCE(AVG(response_time_sec), 0)").Scan(&avgResp)
		db.Model(&models.Lead{}).Where("assigned_to = ? AND close_time_sec IS NOT NULL AND close_time_sec >= 0 AND (LOWER(crm_status) IN ('won & paid', 'won', 'converted') OR LOWER(status) IN ('converted', 'paid'))", c.ID).Select("COALESCE(AVG(close_time_sec), 0)").Scan(&avgClose)
		db.Model(&models.Lead{}).Where("assigned_to = ? AND (LOWER(crm_status) IN ('won & paid', 'won', 'converted') OR LOWER(status) IN ('converted', 'paid'))", c.ID).Select("COALESCE(SUM(CASE WHEN estimated_investment_max > 0 THEN estimated_investment_max ELSE estimated_investment_min END), 0)").Scan(&revenue)

		closerStats = append(closerStats, models.CloserStat{
			UserID:             c.ID,
			FullName:           c.FullName,
			Email:              c.Email,
			Role:               c.Role,
			TotalAssigned:      totalAssigned,
			TotalWon:           totalWon,
			WinRate:            winRate,
			AvgResponseTimeSec: int64(avgResp),
			AvgCloseTimeSec:    int64(avgClose),
			TotalRevenue:       revenue,
		})
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"totalQuotes":        totalQuotes,
		"pendingLeads":       pendingLeads,
		"unreadContacts":     unreadContacts,
		"activeFleet":        activeFleet,
		"totalPipelineValue": pipelineSum,
		"avgResponseTimeSec": int64(teamAvgResponseSec),
		"avgCloseTimeSec":    int64(teamAvgCloseSec),
		"closerStats":        closerStats,
	})
}

