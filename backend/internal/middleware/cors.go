package middleware

import (
	"net/http"
	"strings"
)

func CORSMiddleware(allowedOriginsStr string, next http.Handler) http.Handler {
	origins := strings.Split(allowedOriginsStr, ",")
	allowedMap := make(map[string]bool)
	allowAll := false

	for _, o := range origins {
		trimmed := strings.TrimSpace(o)
		if trimmed == "*" {
			allowAll = true
		}
		if trimmed != "" {
			allowedMap[trimmed] = true
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin != "" {
			if allowAll || allowedMap["*"] || allowedMap[origin] || isAllowedOrigin(origin, allowedMap) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				// Default fallback to allow web frontend
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
		} else if len(origins) > 0 && strings.TrimSpace(origins[0]) != "" {
			w.Header().Set("Access-Control-Allow-Origin", strings.TrimSpace(origins[0]))
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func isAllowedOrigin(origin string, allowedMap map[string]bool) bool {
	if allowedMap["*"] {
		return true
	}
	if allowedMap[origin] {
		return true
	}
	// Allow all onrender.com subdomains, custom domains, and local dev
	if strings.HasSuffix(origin, ".onrender.com") ||
		strings.HasSuffix(origin, "neweratransports.com") ||
		strings.Contains(origin, "localhost") ||
		strings.Contains(origin, "127.0.0.1") {
		return true
	}
	return false
}

