package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"nets-logistics-backend/internal/database"
	"nets-logistics-backend/internal/models"
	"nets-logistics-backend/internal/response"
)

type ContactHandler struct{}

func NewContactHandler() *ContactHandler {
	return &ContactHandler{}
}

// Store POST /api/v1/contact
func (h *ContactHandler) Store(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Phone   string `json:"phone"`
		Subject string `json:"subject"`
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		r.ParseForm()
		payload.Name = r.FormValue("name")
		payload.Email = r.FormValue("email")
		payload.Phone = r.FormValue("phone")
		payload.Subject = r.FormValue("subject")
		payload.Message = r.FormValue("message")
	}

	payload.Name = strings.TrimSpace(payload.Name)
	payload.Email = strings.TrimSpace(payload.Email)
	payload.Message = strings.TrimSpace(payload.Message)

	if payload.Name == "" || payload.Email == "" || payload.Message == "" {
		response.Error(w, http.StatusUnprocessableEntity, "Name, email, and message are required.")
		return
	}

	if payload.Subject == "" {
		payload.Subject = "General Inquiry"
	}

	contact := models.Contact{
		Name:    payload.Name,
		Email:   payload.Email,
		Phone:   payload.Phone,
		Subject: payload.Subject,
		Message: payload.Message,
		Status:  "unread",
	}

	db := database.DB
	if db != nil {
		if err := db.Create(&contact).Error; err != nil {
			response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to store contact inquiry: %v", err))
			return
		}
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Your message has been received. Our team will get back to you shortly.",
		"contact": contact,
	})
}

// Index GET /api/v1/contact
func (h *ContactHandler) Index(w http.ResponseWriter, r *http.Request) {
	db := database.DB
	if db == nil {
		response.JSON(w, http.StatusOK, map[string]interface{}{"contacts": []models.Contact{}})
		return
	}

	var contacts []models.Contact
	query := db.Order("id desc")
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			query = query.Limit(limit)
		}
	}

	if err := query.Find(&contacts).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch contact messages: %v", err))
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"count":    len(contacts),
		"contacts": contacts,
	})
}
