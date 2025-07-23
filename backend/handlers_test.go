package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"io"
)

func TestDownloadHandlerErrors(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		expectedStatus int
	}{
		{
			name:           "Invalid Method",
			method:         "POST",
			expectedStatus: http.StatusMethodNotAllowed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/download", nil)
			w := httptest.NewRecorder()
			
			downloadHandler(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestUploadHandlerErrors(t *testing.T) {
	tests := []struct {
		name           string
		body           io.Reader
		expectedStatus int
	}{
		{
			name:           "Empty Body",
			body:           strings.NewReader(""),
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid Body",
			body:           &errorReader{},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/upload", tt.body)
			w := httptest.NewRecorder()
			
			uploadHandler(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

// errorReader is a helper that always returns an error
type errorReader struct{}

func (e *errorReader) Read(p []byte) (n int, err error) {
	return 0, io.ErrUnexpectedEOF
}
