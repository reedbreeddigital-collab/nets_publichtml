package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"nets-logistics-backend/internal/database"
	"nets-logistics-backend/internal/models"
	"nets-logistics-backend/internal/response"
)

type VehicleHandler struct{}

func NewVehicleHandler() *VehicleHandler {
	return &VehicleHandler{}
}

// Index GET /api/v1/vehicles
func (h *VehicleHandler) Index(w http.ResponseWriter, r *http.Request) {
	db := database.DB

	var vehicles []models.Vehicle
	if db != nil {
		if err := db.Order("id asc").Find(&vehicles).Error; err != nil {
			response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch vehicles: %v", err))
			return
		}
	}

	for i := range vehicles {
		if vehicles[i].FeaturesJSON != "" {
			var features []string
			if json.Unmarshal([]byte(vehicles[i].FeaturesJSON), &features) == nil {
				vehicles[i].Features = features
			}
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"count":    len(vehicles),
		"vehicles": vehicles,
	})
}

// Show GET /api/v1/vehicles/{id_or_slug}
func (h *VehicleHandler) Show(w http.ResponseWriter, r *http.Request) {
	slugOrID := strings.TrimPrefix(r.URL.Path, "/api/v1/vehicles/")

	db := database.DB
	if db == nil || slugOrID == "" {
		response.Error(w, http.StatusNotFound, "Vehicle not found.")
		return
	}

	var vehicle models.Vehicle
	if err := db.Where("id = ? OR slug = ?", slugOrID, slugOrID).First(&vehicle).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Vehicle not found.")
		return
	}

	if vehicle.FeaturesJSON != "" {
		var features []string
		if json.Unmarshal([]byte(vehicle.FeaturesJSON), &features) == nil {
			vehicle.Features = features
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"vehicle": vehicle,
	})
}

// Store POST /api/v1/vehicles
func (h *VehicleHandler) Store(w http.ResponseWriter, r *http.Request) {
	var v models.Vehicle
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid vehicle payload")
		return
	}

	if v.ID == "" || v.Name == "" {
		response.Error(w, http.StatusUnprocessableEntity, "Vehicle ID and Name are required")
		return
	}

	if len(v.Features) > 0 {
		b, _ := json.Marshal(v.Features)
		v.FeaturesJSON = string(b)
	}

	db := database.DB
	if db == nil {
		response.Error(w, http.StatusInternalServerError, "Database connection unavailable")
		return
	}

	if err := db.Create(&v).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to create vehicle: %v", err))
		return
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Vehicle created successfully",
		"vehicle": v,
	})
}

// Update PUT /api/v1/vehicles/{id}
func (h *VehicleHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/vehicles/")

	db := database.DB
	if db == nil || id == "" {
		response.Error(w, http.StatusNotFound, "Vehicle not found.")
		return
	}

	var existing models.Vehicle
	if err := db.Where("id = ?", id).First(&existing).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Vehicle not found.")
		return
	}

	var input models.Vehicle
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	if len(input.Features) > 0 {
		b, _ := json.Marshal(input.Features)
		input.FeaturesJSON = string(b)
	}

	db.Model(&existing).Updates(input)

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Vehicle updated successfully",
		"vehicle": existing,
	})
}

// Delete DELETE /api/v1/vehicles/{id}
func (h *VehicleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/vehicles/")

	db := database.DB
	if db == nil || id == "" {
		response.Error(w, http.StatusNotFound, "Vehicle not found.")
		return
	}

	if err := db.Where("id = ?", id).Delete(&models.Vehicle{}).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to delete vehicle: %v", err))
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Vehicle deleted successfully",
	})
}
