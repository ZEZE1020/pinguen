// Package main implements a high-performance internet speed test server
// inspired by Fast.com. It provides endpoints for testing network latency,
// download speed, and upload speed with built-in rate limiting and CORS support.
package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

const (
	// downloadSize defines the size of the data stream for download speed testing
	// Currently set to 10MB (10 * 1024 * 1024 bytes)
	downloadSize = 10 * 1024 * 1024
)

// PingResponse represents the response structure for the ping endpoint.
// It includes a high-precision timestamp for accurate latency measurement.
type PingResponse struct {
	// Timestamp is a Unix timestamp in nanoseconds
	Timestamp int64 `json:"timestamp"`
}

// UploadResponse represents the response structure for the upload endpoint.
// It provides information about the upload operation's results.
type UploadResponse struct {
	// BytesUploaded is the total number of bytes received
	BytesUploaded int64 `json:"bytesUploaded"`
	// Duration is the time taken for the upload in milliseconds
	Duration      int64 `json:"duration"`
}

// enableCORS is a middleware that adds CORS headers to responses.
// It allows cross-origin requests from the frontend development server
// and sets appropriate cache and connection headers.
//
// Parameters:
//   - next: The next handler in the middleware chain
//
// Returns:
//   - An http.HandlerFunc that handles CORS and forwards to the next handler
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set common headers
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// pingHandler responds with the current server timestamp in nanoseconds.
// This endpoint is used to measure network latency between client and server.
//
// The client can calculate round-trip time by:
// 1. Recording local time T1 before the request
// 2. Getting server timestamp T2 from the response
// 3. Recording local time T3 after the response
// 4. Latency = (T3 - T1) - (T3 - T2)
func pingHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := PingResponse{
		Timestamp: time.Now().UnixNano(),
	}
	json.NewEncoder(w).Encode(response)
}

// downloadHandler streams a fixed-size (10MB) random data file to the client.
// This endpoint is used to measure download speed by timing how long it takes
// to receive the complete file.
//
// The handler:
// 1. Sets appropriate headers for streaming binary data
// 2. Generates random data in chunks to simulate a real file download
// 3. Streams the data to the client in an efficient manner
func downloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", downloadSize))

	buffer := make([]byte, 1024)
	bytesWritten := 0

	for bytesWritten < downloadSize {
		n, err := rand.Read(buffer)
		if err != nil {
			log.Printf("Error generating random data: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		writeLen := min(n, downloadSize-bytesWritten)
		_, err = w.Write(buffer[:writeLen])
		if err != nil {
			log.Printf("Error writing response: %v", err)
			return
		}

		bytesWritten += writeLen
	}
}

// uploadHandler receives and measures an upload stream from the client.
// This endpoint is used to measure upload speed by timing how long it takes
// to send a file to the server.
//
// The handler:
// 1. Records the start time
// 2. Efficiently reads and discards the uploaded data
// 3. Calculates total bytes received and duration
// 4. Returns timing information to the client
func uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if r.ContentLength == 0 {
		http.Error(w, "Request body is empty", http.StatusBadRequest)
		return
	}

	startTime := time.Now()

	bytesUploaded, err := io.Copy(io.Discard, r.Body)
	if err != nil {
		log.Printf("Error reading upload data: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	duration := time.Since(startTime).Milliseconds()

	w.Header().Set("Content-Type", "application/json")
	response := UploadResponse{
		BytesUploaded: bytesUploaded,
		Duration:      duration,
	}
	json.NewEncoder(w).Encode(response)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	mux := http.NewServeMux()
	limiter := newRateLimiter()
	
	// Register routes with middleware chain
	mux.HandleFunc("/ping", enableCORS(logRequest(withRateLimit(limiter, pingHandler))))
	mux.HandleFunc("/download", enableCORS(logRequest(withRateLimit(limiter, downloadHandler))))
	mux.HandleFunc("/upload", enableCORS(logRequest(withRateLimit(limiter, uploadHandler))))

	// Add a status endpoint for health checks
	mux.HandleFunc("/status", enableCORS(logRequest(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "ok",
			"version": "1.0.0",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})))

	port := ":8080"
	server := &http.Server{
		Addr:    port,
		Handler: mux,
	}

	// Channel to handle shutdown signals
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %s", port)
		log.Printf("Available endpoints: /ping, /download, /upload, /status")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-stop
	log.Println("Shutting down server...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped gracefully")
}
