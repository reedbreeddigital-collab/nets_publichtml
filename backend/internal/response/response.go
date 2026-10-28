package response

import (
	"encoding/json"
	"net/http"
	"time"
)

type JSONResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp string      `json:"timestamp"`
}

type ErrorResponse struct {
	Success   bool        `json:"success"`
	Error     string      `json:"error"`
	Errors    interface{} `json:"errors,omitempty"`
	Timestamp string      `json:"timestamp"`
}

func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)

	resp := JSONResponse{
		Success:   true,
		Data:      data,
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
	}

	json.NewEncoder(w).Encode(resp)
}

func Error(w http.ResponseWriter, statusCode int, message string, details ...interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)

	var errDetails interface{}
	if len(details) > 0 {
		errDetails = details[0]
	}

	resp := ErrorResponse{
		Success:   false,
		Error:     message,
		Errors:    errDetails,
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
	}

	json.NewEncoder(w).Encode(resp)
}
