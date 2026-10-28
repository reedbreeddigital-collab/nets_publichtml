package config

import (
	"bufio"
	"os"
	"strings"
)

type Config struct {
	Port               string
	Env                string
	AppName            string
	CORSAllowedOrigins string
	DBDriver           string
	DBHost             string
	DBPort             string
	DBName             string
	DBUser             string
	DBPassword         string
	DBDSN              string
	DatabaseURL        string
	DBSource           string
	CloudinaryURL      string
	CloudinaryCloud    string
	CloudinaryKey      string
	CloudinarySecret   string
	GoogleMapsAPIKey   string
	PaystackPublicKey  string
	PaystackSecretKey  string
}

func LoadConfig() *Config {
	// Try loading .env file manually if present
	loadDotEnv(".env")
	loadDotEnv("../.env")
	loadDotEnv("backend/.env")

	port := getEnv("PORT", "8080")
	if !strings.HasPrefix(port, ":") && port != "" {
		port = ":" + port
	}

	cloudinaryURL := getEnv("CLOUDINARY_URL", "")
	cloud, key, secret := parseCloudinaryURL(cloudinaryURL)
	if cloud == "" {
		cloud = getEnv("CLOUDINARY_CLOUD_NAME", "")
	}
	if key == "" {
		key = getEnv("CLOUDINARY_API_KEY", "")
	}
	if secret == "" {
		secret = getEnv("CLOUDINARY_API_SECRET", "")
	}

	databaseURL := getEnv("DATABASE_URL", "")
	dbDSN := getEnv("DB_DSN", databaseURL)
	dbDriver := getEnv("DB_DRIVER", "postgres")
	if dbDriver == "" {
		dbDriver = "postgres"
	}

	return &Config{
		Port:               port,
		Env:                getEnv("ENV", getEnv("APP_ENV", "development")),
		AppName:            getEnv("APP_NAME", "NETS Logistics REST API"),
		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),
		DBDriver:           dbDriver,
		DBHost:             getEnv("DB_HOST", ""),
		DBPort:             getEnv("DB_PORT", "5432"),
		DBName:             getEnv("DB_NAME", "neondb"),
		DBUser:             getEnv("DB_USER", ""),
		DBPassword:         getEnv("DB_PASSWORD", ""),
		DBDSN:              dbDSN,
		DatabaseURL:        databaseURL,
		DBSource:           getEnv("DB_SOURCE", "./storage/database.db"),
		CloudinaryURL:      cloudinaryURL,
		CloudinaryCloud:    cloud,
		CloudinaryKey:      key,
		CloudinarySecret:   secret,
		GoogleMapsAPIKey:   getEnv("GOOGLE_MAPS_API_KEY", getEnv("VITE_GOOGLE_MAPS_API_KEY", "")),
		PaystackPublicKey:  getEnv("PAYSTACK_PUBLIC_KEY", getEnv("VITE_PAYSTACK_PUBLIC_KEY", "")),
		PaystackSecretKey:  getEnv("PAYSTACK_SECRET_KEY", ""),
	}
}

func parseCloudinaryURL(rawURL string) (cloud, key, secret string) {
	if strings.HasPrefix(rawURL, "cloudinary://") {
		trimmed := strings.TrimPrefix(rawURL, "cloudinary://")
		atParts := strings.Split(trimmed, "@")
		if len(atParts) == 2 {
			cloud = atParts[1]
			credParts := strings.Split(atParts[0], ":")
			if len(credParts) == 2 {
				key = credParts[0]
				secret = credParts[1]
			}
		}
	}
	return
}

func (c *Config) GetFormattedDSN() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	if c.DBDSN != "" {
		return c.DBDSN
	}
	if c.DBDriver == "postgres" || c.DBDriver == "postgresql" {
		if c.DBHost != "" {
			return "host=" + c.DBHost + " user=" + c.DBUser + " password=" + c.DBPassword + " dbname=" + c.DBName + " port=" + c.DBPort + " sslmode=require"
		}
		return ""
	}
	if c.DBDriver == "mysql" {
		return c.DBUser + ":" + c.DBPassword + "@tcp(" + c.DBHost + ":" + c.DBPort + ")/" + c.DBName + "?charset=utf8mb4&parseTime=True&loc=Local"
	}
	return c.DBSource
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}

func loadDotEnv(filepath string) {
	file, err := os.Open(filepath)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
			if _, exists := os.LookupEnv(key); !exists {
				os.Setenv(key, val)
			}
		}
	}
}
