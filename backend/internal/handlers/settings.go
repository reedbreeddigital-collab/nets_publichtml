package handlers

import (
	"encoding/json"
	"net/http"

	"nets-logistics-backend/internal/database"
	"nets-logistics-backend/internal/models"
	"nets-logistics-backend/internal/response"
)

type SettingsHandler struct{}

func NewSettingsHandler() *SettingsHandler {
	return &SettingsHandler{}
}

func (h *SettingsHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	db := database.DB
	if db == nil {
		response.Error(w, http.StatusInternalServerError, "Database connection error")
		return
	}

	var setting models.SystemSetting
	if err := db.First(&setting).Error; err != nil {
		// If not found, return an empty object or default
		response.JSON(w, http.StatusOK, map[string]interface{}{})
		return
	}

	var settingsMap map[string]interface{}
	if err := json.Unmarshal([]byte(setting.SettingsJSON), &settingsMap); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to parse settings JSON")
		return
	}

	response.JSON(w, http.StatusOK, settingsMap)
}

func (h *SettingsHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	db := database.DB
	if db == nil {
		response.Error(w, http.StatusInternalServerError, "Database connection error")
		return
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	settingsBytes, err := json.Marshal(payload)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to encode settings JSON")
		return
	}

	var setting models.SystemSetting
	if err := db.First(&setting).Error; err != nil {
		// Create new
		newSetting := models.SystemSetting{
			SettingsJSON: string(settingsBytes),
		}
		if err := db.Create(&newSetting).Error; err != nil {
			response.Error(w, http.StatusInternalServerError, "Failed to save settings")
			return
		}
	} else {
		// Update existing
		setting.SettingsJSON = string(settingsBytes)
		if err := db.Save(&setting).Error; err != nil {
			response.Error(w, http.StatusInternalServerError, "Failed to update settings")
			return
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message":  "Settings updated successfully",
		"settings": payload,
	})
}
