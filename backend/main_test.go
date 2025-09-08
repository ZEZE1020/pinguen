package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// TestPingHandler verifies that the ping endpoint:
// - Returns 200 OK status
// - Returns a valid JSON response
// - Includes a non-zero timestamp
func TestPingHandler(t *testing.T) {
	req, err := http.NewRequest("GET", "/ping", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(pingHandler)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var response PingResponse
	err = json.NewDecoder(rr.Body).Decode(&response)
	if err != nil {
		t.Fatal(err)
	}

	if response.Timestamp <= 0 {
		t.Error("expected non-zero timestamp")
	}
}

// TestDownloadHandler verifies that the download endpoint:
// - Returns 200 OK status
// - Sets correct Content-Length header
// - Returns exactly downloadSize bytes of data
func TestDownloadHandler(t *testing.T) {
	req, err := http.NewRequest("GET", "/download", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(downloadHandler)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	contentLength := rr.Header().Get("Content-Length")
	expectedLength := fmt.Sprintf("%d", downloadSize)
	if contentLength != expectedLength {
		t.Errorf("expected Content-Length %v, got %v", expectedLength, contentLength)
	}

	body := rr.Body.Bytes()
	if len(body) != downloadSize {
		t.Errorf("expected body length %v, got %v", downloadSize, len(body))
	}
}

// TestUploadHandler verifies that the upload endpoint:
// - Returns 200 OK status
// - Correctly counts uploaded bytes
// - Returns valid duration
// - Returns proper JSON response
type slowReader struct {
	data []byte
	pos  int
}

func (r *slowReader) Read(p []byte) (int, error) {
	if r.pos >= len(r.data) {
		return 0, io.EOF
	}
	n := copy(p, r.data[r.pos:])
	r.pos += n
	time.Sleep(1 * time.Millisecond) // Simulate slow upload
	return n, nil
}

func TestUploadHandler(t *testing.T) {
	payload := strings.Repeat("a", 1024*10) // 10KB for test speed
	body := &slowReader{data: []byte(payload)}
	req, err := http.NewRequest("POST", "/upload", body)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(payload)))
	req.ContentLength = int64(len(payload)) 

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(uploadHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var response UploadResponse
	err = json.NewDecoder(rr.Body).Decode(&response)
	if err != nil {
		t.Fatal(err)
	}

	expectedBytes := int64(len(payload))
	if response.BytesUploaded != expectedBytes {
		t.Errorf("expected BytesUploaded %v, got %v", expectedBytes, response.BytesUploaded)
	}

	if response.Duration <= 0 {
		t.Error("expected non-zero duration")
	}
}

// TestCORS verifies that the CORS middleware:
// - Handles OPTIONS requests correctly
// - Sets proper CORS headers
// - Allows specified HTTP methods
// - Forwards requests to next handler when appropriate
func TestCORS(t *testing.T) {
	testCases := []struct {
		method           string
		expectedHeaders  bool
		expectedStatus   int
		shouldCallNext   bool
	}{
		{"OPTIONS", true, http.StatusOK, false},
		{"GET", true, http.StatusOK, true},
		{"POST", true, http.StatusOK, true},
	}

	for _, tc := range testCases {
		t.Run(tc.method, func(t *testing.T) {
			req, err := http.NewRequest(tc.method, "/test", nil)
			if err != nil {
				t.Fatal(err)
			}

			rr := httptest.NewRecorder()
			var nextCalled bool
			next := func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			}

			handler := enableCORS(next)
			handler(rr, req)

			if tc.expectedHeaders {
				if h := rr.Header().Get("Access-Control-Allow-Origin"); h != "http://localhost:5173" {
					t.Errorf("expected CORS header, got %v", h)
				}
			}

			if status := rr.Code; status != tc.expectedStatus {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, tc.expectedStatus)
			}

			if tc.shouldCallNext != nextCalled {
				t.Errorf("next handler called: %v, expected: %v", nextCalled, tc.shouldCallNext)
			}
		})
	}
}
