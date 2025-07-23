package main

import (
	"context"
	"net/http"
	"testing"
	"time"
)

func TestServerGracefulShutdown(t *testing.T) {
	server := &http.Server{
		Addr:    ":0", // Random port
		Handler: http.NewServeMux(),
	}

	// Start server
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			t.Errorf("ListenAndServe failed: %v", err)
		}
	}()

	// Give it time to start
	time.Sleep(100 * time.Millisecond)

	// Try graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		t.Errorf("Shutdown failed: %v", err)
	}
}
