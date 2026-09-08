package database

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"nets-logistics-backend/internal/config"
	"nets-logistics-backend/internal/models"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.GetFormattedDSN()

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Printf("⚠️ Warning: Initial GORM connection failed: %v", err)
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("✅ GORM Database connection established successfully.")

	DB = db

	if err := AutoMigrate(db); err != nil {
		log.Printf("⚠️ Migration warning: %v", err)
	}

	SeedInitialData(db)

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	err := db.AutoMigrate(
		&models.Lead{},
		&models.Contact{},
		&models.Vehicle{},
		&models.Booking{},
		&models.Customer{},
		&models.User{},
		&models.PricingConfig{},
		&models.SystemSetting{},
	)
	if err != nil {
		return fmt.Errorf("failed GORM auto migration: %w", err)
	}

	// Self-healing synchronization: align any existing won or converted leads in MySQL
	db.Model(&models.Lead{}).
		Where("(LOWER(crm_status) IN ('won & paid', 'won', 'converted') OR LOWER(status) IN ('converted', 'paid')) AND status != 'converted'").
		Update("status", "converted")

	db.Model(&models.Lead{}).
		Where("LOWER(status) IN ('converted', 'paid') AND crm_status != 'Won & Paid'").
		Update("crm_status", "Won & Paid")

	log.Println("✅ GORM AutoMigrate completed successfully (Leads, Contacts, Vehicles, Bookings, Customers, Users tables verified).")
	return nil
}

func SeedInitialData(db *gorm.DB) {
	SeedVehicles(db)

	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		users := []models.User{
			{ID: "usr-001", FullName: "Adebayo Ogundimu", Email: "admin@netsnigeria.com", Role: "admin", Status: "active", LastLogin: time.Now(), CreatedAt: time.Now()},
			{ID: "usr-002", FullName: "Ifeanyi Reed", Email: "reedbreeddigital@gmail.com", Role: "admin", Status: "active", LastLogin: time.Now(), CreatedAt: time.Now()},
			{ID: "usr-staff-01", FullName: "Daniel Olateju", Email: "olateju.daniel@neweratransports.com", Role: "staff", Status: "active", LastLogin: time.Now(), CreatedAt: time.Now()},
			{ID: "usr-staff-02", FullName: "Supo", Email: "supo89@hotmail.com", Role: "staff", Status: "active", LastLogin: time.Now(), CreatedAt: time.Now()},
			{ID: "usr-staff-03", FullName: "Social Media Team", Email: "socialmedia@neweratransports.com", Role: "staff", Status: "active", LastLogin: time.Now(), CreatedAt: time.Now()},
		}
		for _, u := range users {
			db.Create(&u)
		}
		log.Println("👤 Seeded initial Admin & Staff Users into MySQL.")
	}

	var custCount int64
	db.Model(&models.Customer{}).Count(&custCount)
	if custCount == 0 {
		customers := []models.Customer{
			{ID: "cust-001", FullName: "Dr. Adaeze Okonkwo", Email: "adaeze.okonkwo@gtbankplc.com", Phone: "+234 803 100 2000", Company: "GTBank PLC", CustomerType: "corporate", TotalBookings: 12, TotalSpend: 4820000, Notes: "Prefers Coaster for exec events.", CreatedAt: time.Now()},
			{ID: "cust-002", FullName: "Engr. Bola Afolabi", Email: "b.afolabi@dangotelng.com", Phone: "+234 807 200 3000", Company: "Dangote Group", CustomerType: "corporate", TotalBookings: 28, TotalSpend: 14200000, Notes: "Monthly staff transport contract.", CreatedAt: time.Now()},
			{ID: "cust-003", FullName: "Mrs. Chioma Eze", Email: "chioma.eze@gmail.com", Phone: "+234 815 300 4000", Company: "Individual Client", CustomerType: "individual", TotalBookings: 3, TotalSpend: 650000, Notes: "Wedding event client.", CreatedAt: time.Now()},
		}
		for _, c := range customers {
			db.Create(&c)
		}
		log.Println("👥 Seeded initial corporate & individual customers into MySQL.")
	}

	var bkCount int64
	db.Model(&models.Booking{}).Count(&bkCount)
	if bkCount == 0 {
		bookings := []models.Booking{
			{ID: "bk-001", Reference: "BK-20260723-001", QuoteReference: "NETS-20260720-004004", CustomerID: "cust-004", CustomerName: "Mr. Emeka Nwosu", VehicleID: "hiace", VehicleName: "Toyota HiAce", DriverID: "drv-001", DriverName: "Emmanuel Okafor", Pickup: "Yaba, Lagos", Destination: "Murtala Muhammed Airport, Lagos", DistanceKM: 22, DurationMins: 40, TripType: "Airport Transfer", PassengerCount: 8, TravelDate: time.Now().AddDate(0, 0, 1), TotalAmount: 105397.60, PaymentStatus: "paid", OperationalStatus: "confirmed", Notes: "Flight at 08:00. Pickup 05:30.", CreatedAt: time.Now()},
			{ID: "bk-002", Reference: "BK-20260722-002", QuoteReference: "NETS-20260718-006006", CustomerID: "cust-002", CustomerName: "Engr. Bola Afolabi", VehicleID: "coaster", VehicleName: "Toyota Coaster", DriverID: "drv-002", DriverName: "Chukwuemeka Adiele", Pickup: "Dangote Refinery, Ibeju-Lekki", Destination: "AIICO Building, VI", DistanceKM: 50, DurationMins: 90, TripType: "Corporate Shuttle", PassengerCount: 28, TravelDate: time.Now().AddDate(0, 0, -1), TotalAmount: 199020, PaymentStatus: "invoiced", OperationalStatus: "completed", Notes: "Recurring daily contract.", CreatedAt: time.Now()},
		}
		for _, b := range bookings {
			db.Create(&b)
		}
		log.Println("📅 Seeded initial bookings into MySQL.")
	}
}

func SeedVehicles(db *gorm.DB) {
	defaultVehicles := []models.Vehicle{
		{
			ID:              "suv",
			Name:            "Executive SUV",
			Slug:            "executive-suv",
			Category:        "Luxury",
			Capacity:        4,
			BestFor:         "VIP Transport · Executive Travel · Airport Pickups",
			ImageURL:        "/vehicles/suv.png",
			FeaturesJSON:    mustJSON([]string{"Leather Interior", "Air Conditioning", "Professional Driver", "Privacy Glass"}),
			Available:       true,
			ComfortRating:   "Ultra Luxury",
			LuggageSpace:    "Standard (Large boot for multiple suitcases)",
			AirConditioning: "Multi-Zone Automatic Climate Control",
		},
		{
			ID:              "hiace",
			Name:            "Toyota HiAce",
			Slug:            "toyota-hiace",
			Category:        "Standard",
			Capacity:        14,
			BestFor:         "Airport Transfers · Executive Teams · Short Routes",
			ImageURL:        "/vehicles/hiace.jpg",
			FeaturesJSON:    mustJSON([]string{"Air Conditioning", "Tinted Windows", "Professional Driver", "GPS Tracked"}),
			Available:       true,
			ComfortRating:   "Standard",
			LuggageSpace:    "Moderate (Suitable for day trips and cabin baggage)",
			AirConditioning: "Dual-Zone Air Conditioning",
		},
		{
			ID:              "coaster",
			Name:            "Toyota Coaster",
			Slug:            "toyota-coaster",
			Category:        "Executive",
			Capacity:        30,
			BestFor:         "Corporate Events · School Runs · Group Travel",
			ImageURL:        "/vehicles/coaster.jpg",
			FeaturesJSON:    mustJSON([]string{"Air Conditioning", "Reclining Seats", "Professional Driver", "GPS Tracked"}),
			Available:       true,
			ComfortRating:   "Executive",
			LuggageSpace:    "Generous (Rear compartment + overhead parcel racks)",
			AirConditioning: "High-Capacity Climate Control",
		},
		{
			ID:              "sienna",
			Name:            "Toyota Sienna",
			Slug:            "toyota-sienna",
			Category:        "Standard",
			Capacity:        7,
			BestFor:         "Family Travel · Airport Transfers · Executive Teams",
			ImageURL:        "/vehicles/suv.png",
			FeaturesJSON:    mustJSON([]string{"Air Conditioning", "Comfortable Seats", "Professional Driver", "Privacy Glass"}),
			Available:       true,
			ComfortRating:   "Executive",
			LuggageSpace:    "Standard (Good for medium suitcases)",
			AirConditioning: "Multi-Zone Automatic Climate Control",
		},
	}

	for _, v := range defaultVehicles {
		var existing models.Vehicle
		if db.Where("id = ? OR slug = ?", v.ID, v.Slug).First(&existing).Error == nil {
			// Update existing record
			db.Model(&existing).Updates(map[string]interface{}{
				"id":               v.ID,
				"name":             v.Name,
				"slug":             v.Slug,
				"category":         v.Category,
				"capacity":         v.Capacity,
				"best_for":         v.BestFor,
				"image_url":        v.ImageURL,
				"features_json":    v.FeaturesJSON,
				"available":        v.Available,
				"comfort_rating":   v.ComfortRating,
				"luggage_space":    v.LuggageSpace,
				"air_conditioning": v.AirConditioning,
			})
		} else {
			// Insert missing vehicle
			db.Create(&v)
		}
	}

	// Legacy image path cleanup
	db.Model(&models.Vehicle{}).Where("image_url LIKE ?", "%suv.jpg").Update("image_url", "/vehicles/suv.png")
	db.Model(&models.Vehicle{}).Where("image_url LIKE ?", "%/images/%").Update("image_url", gorm.Expr("REPLACE(image_url, '/images/vehicles/', '/vehicles/')"))

	log.Println("🚗 Verified & synchronized vehicle catalog in MySQL database.")
}

func mustJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}
