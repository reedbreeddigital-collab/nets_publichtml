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

type CustomerHandler struct{}

func NewCustomerHandler() *CustomerHandler {
	return &CustomerHandler{}
}

// Index GET /api/v1/customers
func (h *CustomerHandler) Index(w http.ResponseWriter, r *http.Request) {
	db := database.DB

	var customers []models.Customer
	if db != nil {
		if err := db.Order("created_at desc").Find(&customers).Error; err != nil {
			response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch customers: %v", err))
			return
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"count":     len(customers),
		"customers": customers,
	})
}

// Store POST /api/v1/customers
func (h *CustomerHandler) Store(w http.ResponseWriter, r *http.Request) {
	var c models.Customer
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid customer payload")
		return
	}

	if c.ID == "" {
		c.ID = fmt.Sprintf("cust-%d", len(c.FullName))
	}

	db := database.DB
	if db == nil {
		response.Error(w, http.StatusInternalServerError, "Database connection unavailable")
		return
	}

	if err := db.Create(&c).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to create customer: %v", err))
		return
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{
		"message":  "Customer created successfully",
		"customer": c,
	})
}

// Update PUT /api/v1/customers/{id}
func (h *CustomerHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/customers/")

	db := database.DB
	if db == nil || id == "" {
		response.Error(w, http.StatusNotFound, "Customer not found.")
		return
	}

	var existing models.Customer
	if err := db.Where("id = ?", id).First(&existing).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Customer not found.")
		return
	}

	var input map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	db.Model(&existing).Updates(input)

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message":  "Customer updated successfully",
		"customer": existing,
	})
}
