package main

import (
	"log"
	"net/http"
	"strings"

	"nets-logistics-backend/internal/config"
	"nets-logistics-backend/internal/database"
	"nets-logistics-backend/internal/handlers"
	"nets-logistics-backend/internal/middleware"
	"nets-logistics-backend/internal/response"
)

func main() {
	cfg := config.LoadConfig()

	log.Printf("🚀 Starting %s in [%s] mode...", cfg.AppName, cfg.Env)

	// Initialize MySQL / DB Connection
	_, err := database.InitDB(cfg)
	if err != nil {
		log.Printf("⚠️ Database warning: %v", err)
	}

	mux := http.NewServeMux()

	healthHandler := handlers.NewHealthHandler(cfg)
	leadHandler := handlers.NewLeadHandler()
	contactHandler := handlers.NewContactHandler()
	vehicleHandler := handlers.NewVehicleHandler()
	bookingHandler := handlers.NewBookingHandler()
	customerHandler := handlers.NewCustomerHandler()
	userHandler := handlers.NewUserHandler()
	adminHandler := handlers.NewAdminHandler()
	pricingHandler := handlers.NewPricingHandler()
	settingsHandler := handlers.NewSettingsHandler()
	blogHandler := handlers.NewBlogHandler(cfg)

	// Root Route & Dynamic Sub-routes
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" {
			response.JSON(w, http.StatusOK, map[string]interface{}{
				"message":       "Welcome to NETS Logistics REST API (Go Backend)",
				"documentation": "/api/v1/health",
				"version":       "1.0.0",
			})
			return
		}

		if path == "/api/v1/leads/auto-assign" {
			if r.Method == http.MethodPost {
				leadHandler.AutoAssignUnassigned(w, r)
			} else {
				response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
			return
		}

		if strings.HasPrefix(path, "/api/v1/leads/") {
			switch r.Method {
			case http.MethodGet:
				leadHandler.Show(w, r)
			case http.MethodPut, http.MethodPatch:
				leadHandler.Update(w, r)
			case http.MethodDelete:
				leadHandler.Delete(w, r)
			default:
				response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
			return
		}

		if strings.HasPrefix(path, "/api/v1/vehicles/") {
			switch r.Method {
			case http.MethodGet:
				vehicleHandler.Show(w, r)
			case http.MethodPut, http.MethodPatch:
				vehicleHandler.Update(w, r)
			case http.MethodDelete:
				vehicleHandler.Delete(w, r)
			default:
				response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
			return
		}

		if strings.HasPrefix(path, "/api/v1/bookings/") {
			switch r.Method {
			case http.MethodGet:
				bookingHandler.Show(w, r)
			case http.MethodPut, http.MethodPatch:
				bookingHandler.Update(w, r)
			case http.MethodDelete:
				bookingHandler.Delete(w, r)
			default:
				response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
			return
		}

		if strings.HasPrefix(path, "/api/v1/customers/") {
			switch r.Method {
			case http.MethodPut, http.MethodPatch:
				customerHandler.Update(w, r)
			default:
				response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
			return
		}

		if strings.HasPrefix(path, "/api/v1/users/") {
			switch r.Method {
			case http.MethodPut, http.MethodPatch:
				userHandler.Update(w, r)
			case http.MethodDelete:
				userHandler.Delete(w, r)
			default:
				response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
			return
		}

		if strings.HasPrefix(path, "/api/v1/cms/blog/posts/") {
			slugOrId := strings.TrimPrefix(path, "/api/v1/cms/blog/posts/")
			switch r.Method {
			case http.MethodGet:
				blogHandler.GetPostBySlug(w, r, slugOrId)
			case http.MethodDelete:
				blogHandler.DeletePost(w, r, slugOrId)
			default:
				response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
			return
		}

		if strings.HasPrefix(path, "/api/v1/cms/blog/categories/") {
			id := strings.TrimPrefix(path, "/api/v1/cms/blog/categories/")
			switch r.Method {
			case http.MethodDelete:
				blogHandler.DeleteCategory(w, r, id)
			default:
				response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
			return
		}

		if strings.HasPrefix(path, "/api/v1/cms/blog/tags/") {
			id := strings.TrimPrefix(path, "/api/v1/cms/blog/tags/")
			switch r.Method {
			case http.MethodDelete:
				blogHandler.DeleteTag(w, r, id)
			default:
				response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
			return
		}

		response.Error(w, http.StatusNotFound, "Requested endpoint not found.")
	})

	// API v1 Routes
	mux.HandleFunc("/api/v1/health", healthHandler.HealthCheck)
	mux.HandleFunc("/api/v1/admin/stats", adminHandler.GetStats)

	mux.HandleFunc("/api/v1/leads", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			leadHandler.Store(w, r)
		case http.MethodGet:
			leadHandler.Index(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/contact", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			contactHandler.Store(w, r)
		case http.MethodGet:
			contactHandler.Index(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/vehicles", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			vehicleHandler.Index(w, r)
		case http.MethodPost:
			vehicleHandler.Store(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/bookings", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			bookingHandler.Index(w, r)
		case http.MethodPost:
			bookingHandler.Store(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/customers", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			customerHandler.Index(w, r)
		case http.MethodPost:
			customerHandler.Store(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/users", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			userHandler.Index(w, r)
		case http.MethodPost:
			userHandler.Store(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/pricing", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			pricingHandler.GetConfig(w, r)
		case http.MethodPut, http.MethodPost:
			pricingHandler.UpdateConfig(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/settings", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			settingsHandler.GetSettings(w, r)
		case http.MethodPut, http.MethodPost:
			settingsHandler.UpdateSettings(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	// Blog & CMS Routes
	mux.HandleFunc("/api/v1/cms/blog/posts", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			blogHandler.GetPosts(w, r)
		case http.MethodPost:
			blogHandler.CreatePost(w, r)
		case http.MethodPut:
			blogHandler.UpdatePost(w, r)
		case http.MethodDelete:
			id := r.URL.Query().Get("id")
			blogHandler.DeletePost(w, r, id)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/cms/blog/categories", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			blogHandler.GetCategories(w, r)
		case http.MethodPost:
			blogHandler.CreateCategory(w, r)
		case http.MethodDelete:
			id := r.URL.Query().Get("id")
			blogHandler.DeleteCategory(w, r, id)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/cms/blog/tags", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			blogHandler.GetTags(w, r)
		case http.MethodPost:
			blogHandler.CreateTag(w, r)
		case http.MethodDelete:
			id := r.URL.Query().Get("id")
			blogHandler.DeleteTag(w, r, id)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/cms/blog/comments", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			blogHandler.GetComments(w, r)
		case http.MethodPost:
			blogHandler.CreateComment(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/cms/blog/comments/status", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut || r.Method == http.MethodPost {
			blogHandler.UpdateCommentStatus(w, r)
		} else {
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/cms/blog/comments/delete", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete || r.Method == http.MethodPost {
			blogHandler.DeleteComment(w, r)
		} else {
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/cms/blog/subscribe", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			blogHandler.GetSubscribers(w, r)
		case http.MethodPost:
			blogHandler.SubscribeNewsletter(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/cms/blog/subscribe/delete", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete || r.Method == http.MethodPost {
			blogHandler.DeleteSubscriber(w, r)
		} else {
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	// Cloudinary Image Upload & Fetch Routes
	mux.HandleFunc("/api/v1/cms/blog/upload-image", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			blogHandler.UploadImage(w, r)
		} else {
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/cms/blog/images", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			blogHandler.GetImages(w, r)
		case http.MethodDelete, http.MethodPost:
			blogHandler.DeleteImage(w, r)
		default:
			response.Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	})

	// Apply CORS Middleware
	handler := middleware.CORSMiddleware(cfg.CORSAllowedOrigins, mux)

	log.Printf("🌐 Go HTTP Server listening on port %s", cfg.Port)
	if err := http.ListenAndServe(cfg.Port, handler); err != nil {
		log.Fatalf("❌ Server error: %v", err)
	}
}
