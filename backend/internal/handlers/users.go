package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"nets-logistics-backend/internal/database"
	"nets-logistics-backend/internal/models"
	"nets-logistics-backend/internal/response"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

// Index GET /api/v1/users
func (h *UserHandler) Index(w http.ResponseWriter, r *http.Request) {
	db := database.DB

	var users []models.User
	if db != nil {
		if err := db.Order("created_at desc").Find(&users).Error; err != nil {
			response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch users: %v", err))
			return
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"count": len(users),
		"users": users,
	})
}

// Store POST /api/v1/users
func (h *UserHandler) Store(w http.ResponseWriter, r *http.Request) {
	var u models.User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid user payload")
		return
	}

	if u.ID == "" {
		u.ID = fmt.Sprintf("usr-%d", time.Now().UnixNano()%100000)
	}

	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now()
	}

	db := database.DB
	if db == nil {
		response.Error(w, http.StatusInternalServerError, "Database connection unavailable")
		return
	}

	if err := db.Create(&u).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to create user: %v", err))
		return
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{
		"message": "User created successfully",
		"user":    u,
	})
}

// Update PUT /api/v1/users/{id}
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/users/")

	db := database.DB
	if db == nil || id == "" {
		response.Error(w, http.StatusNotFound, "User not found.")
		return
	}

	var existing models.User
	if err := db.Where("id = ?", id).First(&existing).Error; err != nil {
		response.Error(w, http.StatusNotFound, "User not found.")
		return
	}

	var input map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	db.Model(&existing).Updates(input)

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "User updated successfully",
		"user":    existing,
	})
}

// Delete DELETE /api/v1/users/{id}
func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/users/")

	db := database.DB
	if db == nil || id == "" {
		response.Error(w, http.StatusNotFound, "User not found.")
		return
	}

	var existing models.User
	if err := db.Where("id = ? OR email = ?", id, id).First(&existing).Error; err != nil {
		response.Error(w, http.StatusNotFound, "User not found.")
		return
	}

	if err := db.Delete(&existing).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to delete user: %v", err))
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "User deleted successfully",
		"id":      id,
	})
}
