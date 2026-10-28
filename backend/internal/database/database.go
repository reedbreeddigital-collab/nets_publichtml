package database

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"nets-logistics-backend/internal/config"
	"nets-logistics-backend/internal/models"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.GetFormattedDSN()
	if dsn == "" {
		return nil, fmt.Errorf("database DSN / DATABASE_URL is not configured")
	}

	var dialector gorm.Dialector
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") || cfg.DBDriver == "postgres" || cfg.DBDriver == "postgresql" {
		dialector = postgres.Open(dsn)
	} else {
		dialector = mysql.Open(dsn)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Printf("⚠️ Warning: Initial GORM connection failed: %v", err)
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("✅ GORM PostgreSQL Database connection established successfully.")

	DB = db

	if err := AutoMigrate(db); err != nil {
		log.Printf("⚠️ Migration warning: %v", err)
	}

	SeedInitialData(db)

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	// Skip expensive column-by-column introspection over remote cloud connections if tables already exist
	if db.Migrator().HasTable(&models.Lead{}) && db.Migrator().HasTable(&models.BlogPost{}) {
		log.Println("✅ PostgreSQL schema already initialized; skipping full AutoMigrate introspection.")
		return nil
	}

	err := db.AutoMigrate(
		&models.Lead{},
		&models.Contact{},
		&models.Vehicle{},
		&models.Booking{},
		&models.Customer{},
		&models.User{},
		&models.PricingConfig{},
		&models.SystemSetting{},
		&models.BlogCategory{},
		&models.BlogTag{},
		&models.BlogPost{},
		&models.BlogPostTag{},
		&models.BlogComment{},
		&models.NewsletterSubscriber{},
	)
	if err != nil {
		return fmt.Errorf("failed GORM auto migration: %w", err)
	}

	// Self-healing synchronization: align any existing won or converted leads in PostgreSQL
	db.Model(&models.Lead{}).
		Where("(LOWER(crm_status) IN ('won & paid', 'won', 'converted') OR LOWER(status) IN ('converted', 'paid')) AND status != 'converted'").
		Update("status", "converted")

	db.Model(&models.Lead{}).
		Where("LOWER(status) IN ('converted', 'paid') AND crm_status != 'Won & Paid'").
		Update("crm_status", "Won & Paid")

	// Backfill timing for existing won leads without closed_at
	db.Exec("UPDATE leads SET closed_at = updated_at WHERE (LOWER(crm_status) IN ('won & paid', 'won', 'converted') OR LOWER(status) IN ('converted', 'paid')) AND closed_at IS NULL")
	if db.Dialector.Name() == "postgres" {
		db.Exec("UPDATE leads SET close_time_sec = GREATEST(0, CAST(EXTRACT(EPOCH FROM (closed_at - created_at)) AS BIGINT)) WHERE closed_at IS NOT NULL AND (close_time_sec IS NULL OR close_time_sec = 0)")
	} else {
		db.Exec("UPDATE leads SET close_time_sec = GREATEST(0, TIMESTAMPDIFF(SECOND, created_at, closed_at)) WHERE closed_at IS NOT NULL AND (close_time_sec IS NULL OR close_time_sec = 0)")
	}

	// Backfill response time for existing contacted leads without first_contacted_at
	db.Exec("UPDATE leads SET first_contacted_at = updated_at WHERE LOWER(crm_status) NOT IN ('new lead', 'invalid') AND first_contacted_at IS NULL")
	if db.Dialector.Name() == "postgres" {
		db.Exec("UPDATE leads SET response_time_sec = GREATEST(0, CAST(EXTRACT(EPOCH FROM (first_contacted_at - created_at)) AS BIGINT)) WHERE first_contacted_at IS NOT NULL AND (response_time_sec IS NULL OR response_time_sec = 0)")
	} else {
		db.Exec("UPDATE leads SET response_time_sec = GREATEST(0, TIMESTAMPDIFF(SECOND, created_at, first_contacted_at)) WHERE first_contacted_at IS NOT NULL AND (response_time_sec IS NULL OR response_time_sec = 0)")
	}

	log.Println("✅ GORM AutoMigrate completed successfully (Leads, Contacts, Vehicles, Bookings, Customers, Users tables verified).")
	return nil
}

func SeedInitialData(db *gorm.DB) {
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount > 0 {
		var vehCount int64
		db.Model(&models.Vehicle{}).Count(&vehCount)
		if vehCount > 0 {
			log.Println("✅ PostgreSQL database already seeded.")
			return
		}
	}

	SeedVehicles(db)

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
		log.Println("👤 Seeded initial Admin & Staff Users into PostgreSQL.")
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
		log.Println("👥 Seeded initial corporate & individual customers into PostgreSQL.")
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
		log.Println("📅 Seeded initial bookings into PostgreSQL.")
	}

	SeedBlog(db)
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
	}

	// Remove Sienna if present in database
	db.Where("id = ? OR slug = ?", "sienna", "toyota-sienna").Delete(&models.Vehicle{})

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

	log.Println("🚗 Verified & synchronized vehicle catalog in PostgreSQL database.")
}

func mustJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func SeedBlog(db *gorm.DB) {
	var catCount int64
	db.Model(&models.BlogCategory{}).Count(&catCount)
	if catCount == 0 {
		cats := []models.BlogCategory{
			{ID: "cat-interstate", Name: "Interstate Travel", Slug: "interstate-travel", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: "cat-corporate", Name: "Corporate Mobility", Slug: "corporate-mobility", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: "cat-fleet", Name: "Fleet Safety", Slug: "fleet-safety", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: "cat-guides", Name: "Travel Guides", Slug: "travel-guides", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		}
		for _, c := range cats {
			db.Create(&c)
		}
		log.Println("🏷️ Seeded initial Blog Categories into PostgreSQL.")
	}

	var tagCount int64
	db.Model(&models.BlogTag{}).Count(&tagCount)
	if tagCount == 0 {
		tags := []models.BlogTag{
			{ID: "tag-transit", Name: "Transit", Slug: "transit", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: "tag-luxury", Name: "Luxury Travel", Slug: "luxury-travel", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: "tag-lagos", Name: "Lagos", Slug: "lagos", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: "tag-safety", Name: "Safety First", Slug: "safety-first", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: "tag-executive", Name: "Executive", Slug: "executive", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		}
		for _, t := range tags {
			db.Create(&t)
		}
		log.Println("🏷️ Seeded initial Blog Tags into PostgreSQL.")
	}

	var postCount int64
	db.Model(&models.BlogPost{}).Count(&postCount)
	if postCount == 0 {
		now := time.Now()
		img1 := "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80"
		img2 := "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=80"
		img3 := "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80"
		catInterstate := "cat-interstate"
		catCorporate := "cat-corporate"
		catFleet := "cat-fleet"

		posts := []models.BlogPost{
			{
				ID:          "post-interstate-safe-travel",
				Title:       "Safe Interstate Travel in Nigeria: How Modern Fleets are Redefining Road Transit",
				Slug:        "safe-interstate-travel-in-nigeria",
				Excerpt:     "Discover how speed limiting, scheduled maintenance, and executive chauffeur vetting are changing the standard of intercity travel across Lagos, Abuja, and Benin.",
				Content:     "<p>Long-distance highway travel across Nigeria demands uncompromising attention to vehicle maintenance, professional route intelligence, and experienced chauffeurs. At New Era Transport Services (NETS), we believe road transit should be as smooth, reliable, and secure as executive aviation.</p><h2>The Core Pillars of Fleet Reliability</h2><p>Every commercial vehicle in our interstate fleet undergoes stringent multipoint diagnostics before departure. We evaluate tyre pressure telemetry, brake pad thickness, cooling systems, and cabin air purification to ensure journeys between hubs like Lagos, Ibadan, and Abuja proceed without hitches.</p><blockquote>Safety is not an optional feature—it is the bedrock upon which trust is built on Nigerian highways.</blockquote><p>With real-time satellite tracking and dual-driver rotations for journeys exceeding six hours, NETS passengers enjoy punctual arrivals and supreme cabin comfort.</p>",
				CoverImage:  &img1,
				AuthorID:    "usr-001",
				Author:      "NETS Mobility Insights",
				CategoryID:  &catInterstate,
				Status:      "PUBLISHED",
				PublishedAt: &now,
				CreatedAt:   now.AddDate(0, 0, -5),
				UpdatedAt:   now,
			},
			{
				ID:          "post-corporate-staff-commute",
				Title:       "Optimizing Corporate Commutes: Why Leading Enterprises Choose Dedicated Shuttles",
				Slug:        "optimizing-corporate-commutes",
				Excerpt:     "Employee punctuality, reduced stress, and lower carbon footprints: exploring the return on investment of dedicated corporate shuttle buses.",
				Content:     "<p>Traffic congestion in major metropolitan centres like Lagos places enormous strain on workforce productivity and employee morale. Dedicated corporate shuttle transport bridges the gap between suburban residential hubs and city centre offices.</p><h2>Enhancing Workplace Culture from Door to Door</h2><p>Providing air-conditioned, reliable commuter buses allows team members to recharge, catch up on morning communications via onboard Wi-Fi, and arrive at the office revitalized. Organisations using our Toyota Coaster and HiAce fleets report measurable reductions in morning absenteeism.</p>",
				CoverImage:  &img2,
				AuthorID:    "usr-002",
				Author:      "Corporate Logistics Desk",
				CategoryID:  &catCorporate,
				Status:      "PUBLISHED",
				PublishedAt: &now,
				CreatedAt:   now.AddDate(0, 0, -12),
				UpdatedAt:   now,
			},
			{
				ID:          "post-airport-transfers-guide",
				Title:       "Executive Airport Transfers in Lagos: The Ultimate Smooth Landing Protocol",
				Slug:        "executive-airport-transfers-in-lagos",
				Excerpt:     "From flight tracking to flight-delay protection, here is what makes a private executive transfer frictionless at Murtala Muhammed International Airport.",
				Content:     "<p>Navigating airport pickups in Ikeja requires precision timing. Our flight monitoring systems synchronize chauffeur dispatches with real-time runway touchdowns, guaranteeing zero kerbside waiting time for arriving dignitaries and business leaders.</p><h2>The Executive Fleet Advantage</h2><p>With luxury SUVs and executive minivans equipped with privacy glass, leather upholstery, and chilled refreshments, your transition from flight cabin to executive suite is instantaneous.</p>",
				CoverImage:  &img3,
				AuthorID:    "usr-001",
				Author:      "NETS Concierge Team",
				CategoryID:  &catFleet,
				Status:      "PUBLISHED",
				PublishedAt: &now,
				CreatedAt:   now.AddDate(0, 0, -20),
				UpdatedAt:   now,
			},
		}

		for _, p := range posts {
			db.Create(&p)
		}
		log.Println("📝 Seeded initial Blog Articles into PostgreSQL.")
	}
}
