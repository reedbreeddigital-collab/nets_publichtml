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
	DBSource           string
	CloudinaryURL      string
	CloudinaryCloud    string
	CloudinaryKey      string
	CloudinarySecret   string
}

func LoadConfig() *Config {
	// Try loading .env file manually if present
	loadDotEnv(".env")

	port := getEnv("PORT", "8080")
	if !strings.HasPrefix(port, ":") && port != "" {
		port = ":" + port
	}

	cloudinaryURL := getEnv("CLOUDINARY_URL", "cloudinary://768523141117821:KeVQI7I7tuGlCxUIdWC9M6RdWjg@wnmabxiy")
	cloud, key, secret := parseCloudinaryURL(cloudinaryURL)

	return &Config{
		Port:               port,
		Env:                getEnv("ENV", getEnv("APP_ENV", "development")),
		AppName:            getEnv("APP_NAME", "NETS Logistics REST API"),
		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),
		DBDriver:           getEnv("DB_DRIVER", "mysql"),
		DBHost:             getEnv("DB_HOST", "srv1427.hstgr.io"),
		DBPort:             getEnv("DB_PORT", "3306"),
		DBName:             getEnv("DB_NAME", "u859677653_nets_web_db"),
		DBUser:             getEnv("DB_USER", "u859677653_nets_web"),
		DBPassword:         getEnv("DB_PASSWORD", "*Reedb4b4"),
		DBDSN:              getEnv("DB_DSN", ""),
		DBSource:           getEnv("DB_SOURCE", "./storage/database.db"),
		CloudinaryURL:      cloudinaryURL,
		CloudinaryCloud:    cloud,
		CloudinaryKey:      key,
		CloudinarySecret:   secret,
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
	if c.DBDSN != "" {
		return c.DBDSN
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
