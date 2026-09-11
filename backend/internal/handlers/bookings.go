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

type BookingHandler struct{}

func NewBookingHandler() *BookingHandler {
	return &BookingHandler{}
}

// Index GET /api/v1/bookings
func (h *BookingHandler) Index(w http.ResponseWriter, r *http.Request) {
	db := database.DB

	var bookings []models.Booking
	if db != nil {
		if err := db.Order("created_at desc").Find(&bookings).Error; err != nil {
			response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch bookings: %v", err))
			return
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"count":    len(bookings),
		"bookings": bookings,
	})
}

// Show GET /api/v1/bookings/{id}
func (h *BookingHandler) Show(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/bookings/")

	db := database.DB
	if db == nil || id == "" {
		response.Error(w, http.StatusNotFound, "Booking not found.")
		return
	}

	var booking models.Booking
	if err := db.Where("id = ?", id).First(&booking).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Booking not found.")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"booking": booking,
	})
}

// Store POST /api/v1/bookings
func (h *BookingHandler) Store(w http.ResponseWriter, r *http.Request) {
	var b models.Booking
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid booking payload")
		return
	}

	if b.ID == "" {
		b.ID = fmt.Sprintf("bk-%d", len(b.CustomerName))
	}

	db := database.DB
	if db == nil {
		response.Error(w, http.StatusInternalServerError, "Database connection unavailable")
		return
	}

	if err := db.Create(&b).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to create booking: %v", err))
		return
	}

	// Fetch system settings to check if we should notify admin
	var setting models.SystemSetting
	if err := db.First(&setting).Error; err == nil {
		var settingsMap map[string]interface{}
		if err := json.Unmarshal([]byte(setting.SettingsJSON), &settingsMap); err == nil {
			if notify, ok := settingsMap["notificationNewBooking"].(bool); ok && notify {
				adminEmails, _ := settingsMap["adminNotificationEmails"].(string)
				if adminEmails != "" {
					fmt.Printf("=================================================================\n")
					fmt.Printf("[EMAIL NOTIFICATION] To Admin: %s\n", adminEmails)
					fmt.Printf("Subject: New Booking Created: %s\n", b.Reference)
					fmt.Printf("Body: A new booking has been created for %s.\nPlease log in to the admin dashboard to review and assign a driver.\n", b.CustomerName)
					fmt.Printf("=================================================================\n")
				}
			}
		}
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Booking created successfully",
		"booking": b,
	})
}

// Update PUT /api/v1/bookings/{id}
func (h *BookingHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/bookings/")

	db := database.DB
	if db == nil || id == "" {
		response.Error(w, http.StatusNotFound, "Booking not found.")
		return
	}

	var existing models.Booking
	if err := db.Where("id = ?", id).First(&existing).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Booking not found.")
		return
	}

	var input map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	db.Model(&existing).Updates(input)

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Booking updated successfully",
		"booking": existing,
	})
}

// Delete DELETE /api/v1/bookings/{id}
func (h *BookingHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/bookings/")

	db := database.DB
	if db == nil || id == "" {
		response.Error(w, http.StatusNotFound, "Booking not found.")
		return
	}

	if err := db.Where("id = ? OR reference = ?", id, id).Delete(&models.Booking{}).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to delete booking: %v", err))
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Booking deleted successfully",
	})
}
