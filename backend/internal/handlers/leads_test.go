package handlers

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"nets-logistics-backend/internal/models"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to in-memory test database: %v", err)
	}

	err = db.AutoMigrate(&models.Lead{}, &models.User{})
	if err != nil {
		t.Fatalf("Failed to auto-migrate test schema: %v", err)
	}

	return db
}

func TestIsLeadClosed(t *testing.T) {
	if IsLeadClosed(nil) {
		t.Errorf("expected nil lead to not be closed")
	}

	now := time.Now()
	leadWithClosedAt := &models.Lead{ClosedAt: &now}
	if !IsLeadClosed(leadWithClosedAt) {
		t.Errorf("expected lead with ClosedAt to be closed")
	}

	closedCrmStatuses := []string{"Won & Paid", "won", "converted", "paid & confirmed", "paid"}
	for _, st := range closedCrmStatuses {
		l := &models.Lead{CrmStatus: st}
		if !IsLeadClosed(l) {
			t.Errorf("expected CRM status %q to be closed", st)
		}
	}

	closedStatuses := []string{"converted", "won", "paid", "paid & confirmed"}
	for _, st := range closedStatuses {
		l := &models.Lead{Status: st}
		if !IsLeadClosed(l) {
			t.Errorf("expected status %q to be closed", st)
		}
	}

	openStatuses := []string{"New Lead", "Pending Review", "Contacted", "Proposal Sent", "pending"}
	for _, st := range openStatuses {
		l := &models.Lead{Status: st, CrmStatus: st}
		if IsLeadClosed(l) {
			t.Errorf("expected status %q to be open", st)
		}
	}
}

func TestFindActiveDealCloser_ReturningClient_OpenDeal(t *testing.T) {
	db := setupTestDB(t)

	// Create active sales closer
	closer := models.User{
		ID:       "closer-1",
		FullName: "Test Closer 1",
		Email:    "closer1@nets.com",
		Role:     "sales_closer",
		Status:   "active",
	}
	db.Create(&closer)

	// Lead started 2 weeks ago, still in open negotiation
	previousLead := models.Lead{
		LeadReference: "NETS-LEAD-PREV01",
		CustomerName:  "Alice Client",
		CustomerEmail: "alice@example.com",
		CustomerPhone: "08011112222",
		Status:        "pending",
		CrmStatus:     "Proposal Sent",
		AssignedTo:    "closer-1",
		CreatedAt:     time.Now().AddDate(0, 0, -14),
	}
	db.Create(&previousLead)

	// Client returns today with a new inquiry / quote submission
	assigned := FindActiveDealCloser(db, "alice@example.com", "08011112222")
	if assigned != "closer-1" {
		t.Fatalf("expected returning client with open deal to be assigned to %q, got %q", "closer-1", assigned)
	}
}

func TestFindActiveDealCloser_ReturningClient_DealClosed_BondBroken(t *testing.T) {
	db := setupTestDB(t)

	closer := models.User{
		ID:       "closer-1",
		FullName: "Test Closer 1",
		Email:    "closer1@nets.com",
		Role:     "sales_closer",
		Status:   "active",
	}
	db.Create(&closer)

	now := time.Now().AddDate(0, 0, -5)
	// Closer previously won and closed this deal 5 days ago
	closedLead := models.Lead{
		LeadReference: "NETS-LEAD-CLOSED01",
		CustomerName:  "Bob Client",
		CustomerEmail: "bob@example.com",
		CustomerPhone: "08033334444",
		Status:        "converted",
		CrmStatus:     "Won & Paid",
		AssignedTo:    "closer-1",
		ClosedAt:      &now,
		CreatedAt:     time.Now().AddDate(0, 0, -10),
	}
	db.Create(&closedLead)

	// Client comes back for their NEXT deal
	assigned := FindActiveDealCloser(db, "bob@example.com", "08033334444")
	if assigned != "" {
		t.Fatalf("expected bond to be broken after deal was closed/won, but got assigned to %q", assigned)
	}
}

func TestFindActiveDealCloser_MatchingByPhone(t *testing.T) {
	db := setupTestDB(t)

	closer := models.User{
		ID:       "closer-2",
		FullName: "Test Closer 2",
		Email:    "closer2@nets.com",
		Role:     "sales_closer",
		Status:   "active",
	}
	db.Create(&closer)

	// Previous lead used company email
	previousLead := models.Lead{
		LeadReference: "NETS-LEAD-PHONE01",
		CustomerName:  "Charlie",
		CustomerEmail: "charlie.work@corp.com",
		CustomerPhone: "08055556666",
		Status:        "pending",
		CrmStatus:     "Contacted",
		AssignedTo:    "closer-2",
		CreatedAt:     time.Now().AddDate(0, 0, -7),
	}
	db.Create(&previousLead)

	// Client returns using personal email, but exact same phone number
	assigned := FindActiveDealCloser(db, "charlie.personal@gmail.com", "08055556666")
	if assigned != "closer-2" {
		t.Fatalf("expected phone match to preserve bond with closer-2, got %q", assigned)
	}
}

func TestFindActiveDealCloser_StaleDeal_ExpiredLookback(t *testing.T) {
	db := setupTestDB(t)

	closer := models.User{
		ID:       "closer-1",
		FullName: "Test Closer 1",
		Email:    "closer1@nets.com",
		Role:     "sales_closer",
		Status:   "active",
	}
	db.Create(&closer)

	// Lead created 75 days ago (older than 60 days limit) and left unclosed
	staleLead := models.Lead{
		LeadReference: "NETS-LEAD-STALE",
		CustomerName:  "Diana",
		CustomerEmail: "diana@example.com",
		CustomerPhone: "08077778888",
		Status:        "pending",
		CrmStatus:     "New Lead",
		AssignedTo:    "closer-1",
		CreatedAt:     time.Now().AddDate(0, 0, -75),
	}
	db.Create(&staleLead)

	assigned := FindActiveDealCloser(db, "diana@example.com", "08077778888")
	if assigned != "" {
		t.Fatalf("expected stale unclosed lead past 60 days to have bond broken, but got %q", assigned)
	}
}

func TestFindActiveDealCloser_CloserInactive(t *testing.T) {
	db := setupTestDB(t)

	// Closer who left the company / deactivated
	inactiveCloser := models.User{
		ID:       "closer-inactive",
		FullName: "Former Closer",
		Email:    "former@nets.com",
		Role:     "sales_closer",
		Status:   "inactive",
	}
	db.Create(&inactiveCloser)

	lead := models.Lead{
		LeadReference: "NETS-LEAD-INACTIVE",
		CustomerName:  "Evan",
		CustomerEmail: "evan@example.com",
		CustomerPhone: "08099990000",
		Status:        "pending",
		CrmStatus:     "Contacted",
		AssignedTo:    "closer-inactive",
		CreatedAt:     time.Now().AddDate(0, 0, -3),
	}
	db.Create(&lead)

	assigned := FindActiveDealCloser(db, "evan@example.com", "08099990000")
	if assigned != "" {
		t.Fatalf("expected inactive closer to not retain bond, got %q", assigned)
	}
}

func TestFindActiveDealCloser_MultipleDeals_Sequence(t *testing.T) {
	db := setupTestDB(t)

	closerA := models.User{ID: "closer-a", FullName: "Closer A", Email: "closera@nets.com", Role: "sales_closer", Status: "active"}
	closerB := models.User{ID: "closer-b", FullName: "Closer B", Email: "closerb@nets.com", Role: "sales_closer", Status: "active"}
	db.Create(&closerA)
	db.Create(&closerB)

	now := time.Now()
	// Deal 1: 50 days ago, won with Closer A (bond broken)
	deal1 := models.Lead{
		LeadReference: "NETS-DEAL-1",
		CustomerEmail: "fiona@example.com",
		CustomerPhone: "08011223344",
		Status:        "converted",
		CrmStatus:     "Won & Paid",
		AssignedTo:    "closer-a",
		ClosedAt:      &now,
		CreatedAt:     time.Now().AddDate(0, 0, -50),
	}
	db.Create(&deal1)

	// Deal 2: 10 days ago, opened with Closer B (bond active with Closer B)
	deal2 := models.Lead{
		LeadReference: "NETS-DEAL-2",
		CustomerEmail: "fiona@example.com",
		CustomerPhone: "08011223344",
		Status:        "pending",
		CrmStatus:     "Proposal Sent",
		AssignedTo:    "closer-b",
		CreatedAt:     time.Now().AddDate(0, 0, -10),
	}
	db.Create(&deal2)

	// Today: Fiona inquires again regarding Deal 2
	assigned := FindActiveDealCloser(db, "fiona@example.com", "08011223344")
	if assigned != "closer-b" {
		t.Fatalf("expected most recent open deal with Closer B to be bonded, got %q", assigned)
	}
}
