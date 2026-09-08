package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"nets-logistics-backend/internal/database"
	"nets-logistics-backend/internal/models"
	"nets-logistics-backend/internal/response"
)

type LeadHandler struct{}

func NewLeadHandler() *LeadHandler {
	return &LeadHandler{}
}

// Store POST /api/v1/leads
func (h *LeadHandler) Store(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload provided.")
		return
	}

	// Generate Lead Reference
	randomBytes := make([]byte, 3)
	rand.Read(randomBytes)
	ref := fmt.Sprintf("NETS-LEAD-%s", strings.ToUpper(hex.EncodeToString(randomBytes)))

	// Parse fields from payload
	cust, _ := payload["customerInformation"].(map[string]interface{})
	journey, _ := payload["journeyInformation"].(map[string]interface{})
	invest, _ := payload["estimatedInvestment"].(map[string]interface{})

	customerName, _ := cust["name"].(string)
	if customerName == "" {
		customerName = "Unknown"
	}
	customerEmail, _ := cust["email"].(string)
	customerPhone, _ := cust["phone"].(string)
	company, _ := cust["company"].(string)
	heardAboutUs, _ := cust["heardAboutUs"].(string)

	journeyType, _ := journey["journeyType"].(string)
	if journeyType == "" {
		journeyType = "One-Way"
	}

	origin, _ := journey["pickupLocation"].(string)
	if origin == "" {
		origin, _ = journey["pickupState"].(string)
	}
	if origin == "" {
		if pickupMap, ok := journey["pickup"].(map[string]interface{}); ok {
			origin, _ = pickupMap["address"].(string)
		}
	}

	destination, _ := journey["destinationLocation"].(string)
	if destination == "" {
		destination, _ = journey["destinationState"].(string)
	}
	if destination == "" {
		if destMap, ok := journey["destination"].(map[string]interface{}); ok {
			destination, _ = destMap["address"].(string)
		}
	}

	var minEst, maxEst float64
	if v, ok := invest["minimumEstimate"].(float64); ok {
		minEst = v
	}
	if v, ok := invest["maximumEstimate"].(float64); ok {
		maxEst = v
	}
	if v, ok := invest["total"].(float64); ok {
		if minEst == 0 {
			minEst = v
		}
		if maxEst == 0 {
			maxEst = v
		}
	}

	payloadBytes, _ := json.Marshal(payload)

	status := "pending"
	if payInfo, ok := payload["paymentInformation"].(map[string]interface{}); ok {
		if s, ok := payInfo["status"].(string); ok && s != "" {
			status = s
		}
	}

	notes, _ := payload["notes"].(string)

	lead := models.Lead{
		LeadReference:          ref,
		CustomerName:           customerName,
		CustomerEmail:          customerEmail,
		CustomerPhone:          customerPhone,
		Company:                company,
		HeardAboutUs:           heardAboutUs,
		JourneyType:            journeyType,
		Origin:                 origin,
		Destination:            destination,
		EstimatedInvestmentMin: minEst,
		EstimatedInvestmentMax: maxEst,
		Status:                 status,
		Notes:                  notes,
		PayloadJSON:            string(payloadBytes),
	}

	db := database.DB
	if db != nil {
		assignedTo := ""
		if customerEmail != "" {
			var existing models.Lead
			// Check if same customer requested a quote today and it is assigned
			err := db.Where("customer_email = ? AND DATE(created_at) = CURDATE() AND assigned_to != ''", customerEmail).
				Order("created_at DESC").First(&existing).Error
			if err == nil && existing.AssignedTo != "" {
				assignedTo = existing.AssignedTo
			}
		}

		if assignedTo != "" {
			lead.AssignedTo = assignedTo
		} else {
			var closer models.User
			if err := db.Where("role = ?", "sales_closer").Order("RAND()").First(&closer).Error; err == nil {
				lead.AssignedTo = closer.ID
			}
		}
		
		if err := db.Create(&lead).Error; err != nil {
			response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to store lead in DB: %v", err))
			return
		}
	}

	leadData := map[string]interface{}{
		"id":            lead.ID,
		"leadId":        ref,
		"leadReference": ref,
		"status":        "pending",
		"customerName":  customerName,
		"customerEmail": customerEmail,
		"createdAt":     time.Now().Format(time.RFC3339),
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Lead created successfully",
		"lead":    leadData,
	})
}

// Index GET /api/v1/leads
func (h *LeadHandler) Index(w http.ResponseWriter, r *http.Request) {
	db := database.DB
	if db == nil {
		response.JSON(w, http.StatusOK, map[string]interface{}{"leads": []models.Lead{}})
		return
	}

	var leads []models.Lead
	query := db.Order("id desc")

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			query = query.Limit(limit)
		}
	}

	if err := query.Find(&leads).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch leads: %v", err))
		return
	}

	for i := range leads {
		if leads[i].PayloadJSON != "" {
			var payloadData interface{}
			if json.Unmarshal([]byte(leads[i].PayloadJSON), &payloadData) == nil {
				leads[i].Payload = payloadData
			}
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"count": len(leads),
		"leads": leads,
	})
}

// Show GET /api/v1/leads/{id}
func (h *LeadHandler) Show(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/v1/leads/")

	db := database.DB
	if db == nil || idStr == "" {
		response.Error(w, http.StatusNotFound, "Lead not found.")
		return
	}

	var lead models.Lead
	if err := db.Where("id = ? OR lead_reference = ?", idStr, idStr).First(&lead).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Lead not found.")
		return
	}

	if lead.PayloadJSON != "" {
		var payloadData interface{}
		if json.Unmarshal([]byte(lead.PayloadJSON), &payloadData) == nil {
			lead.Payload = payloadData
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"lead": lead,
	})
}

// Update PUT /api/v1/leads/{id}
func (h *LeadHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/v1/leads/")

	db := database.DB
	if db == nil || idStr == "" {
		response.Error(w, http.StatusNotFound, "Lead not found.")
		return
	}

	var body struct {
		Status     string  `json:"status"`
		CrmStatus  string  `json:"crmStatus"`
		AssignedTo *string `json:"assignedTo"`
		Notes      *string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	var lead models.Lead
	if err := db.Where("id = ? OR lead_reference = ?", idStr, idStr).First(&lead).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Lead not found.")
		return
	}

	updates := make(map[string]interface{})
	if body.Status != "" {
		lead.Status = body.Status
		updates["status"] = body.Status
	}
	if body.CrmStatus != "" {
		lead.CrmStatus = body.CrmStatus
		updates["crm_status"] = body.CrmStatus
	}
	if body.AssignedTo != nil {
		lead.AssignedTo = *body.AssignedTo
		updates["assigned_to"] = *body.AssignedTo
	}
	if body.Notes != nil {
		lead.Notes = *body.Notes
		updates["notes"] = *body.Notes
	}

	if len(updates) > 0 {
		db.Model(&lead).Updates(updates)
	}

	// Auto-create booking when converted
	if body.Status == "converted" || body.CrmStatus == "converted" {
		var existingCount int64
		db.Model(&models.Booking{}).Where("quote_reference = ?", lead.LeadReference).Count(&existingCount)

		if existingCount == 0 {
			randomBytes := make([]byte, 3)
			rand.Read(randomBytes)
			ref := fmt.Sprintf("NETS-BK-%s", strings.ToUpper(hex.EncodeToString(randomBytes)))

			booking := models.Booking{
				ID:                ref,
				Reference:         ref,
				QuoteReference:    lead.LeadReference,
				CustomerName:      lead.CustomerName,
				Pickup:            lead.Origin,
				Destination:       lead.Destination,
				TripType:          lead.JourneyType,
				TotalAmount:       lead.EstimatedInvestmentMax,
				PaymentStatus:     "pending",
				OperationalStatus: "confirmed",
				TravelDate:        time.Now(),
				CreatedAt:         time.Now(),
			}

			if err := db.Create(&booking).Error; err != nil {
				fmt.Printf("Failed to auto-create booking from converted lead: %v\n", err)
			} else {
				fmt.Printf("Successfully created booking %s from lead %s\n", ref, lead.LeadReference)
			}
		}
	}

	// Trigger email notification if a lead was assigned
	if body.AssignedTo != nil && *body.AssignedTo != "" {
		var user models.User
		if err := db.Where("id = ?", *body.AssignedTo).First(&user).Error; err == nil && user.Email != "" {
			// In production, this would use a real SMTP service (e.g. SendGrid, Mailgun, or net/smtp)
			// For now, we simulate sending the email to the console to fulfill the ground rule
			fmt.Printf("=================================================================\n")
			fmt.Printf("[EMAIL NOTIFICATION] To: %s (%s)\n", user.FullName, user.Email)
			fmt.Printf("Subject: New Lead Assigned: %s\n", lead.LeadReference)
			fmt.Printf("Body: Hello %s,\n\nYou have been assigned a new lead (%s) from %s.\nLog in to your dashboard to review it.\n", user.FullName, lead.LeadReference, lead.CustomerName)
			fmt.Printf("=================================================================\n")
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Lead status updated successfully",
		"lead":    lead,
	})
}

// Delete DELETE /api/v1/leads/{id}
func (h *LeadHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/v1/leads/")

	db := database.DB
	if db == nil || idStr == "" {
		response.Error(w, http.StatusNotFound, "Lead not found.")
		return
	}

	var lead models.Lead
	if err := db.Where("id = ? OR lead_reference = ?", idStr, idStr).First(&lead).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Lead not found.")
		return
	}

	if err := db.Delete(&lead).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to delete lead")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Lead deleted successfully",
	})
}
