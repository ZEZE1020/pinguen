package main

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func BenchmarkPingHandler(b *testing.B) {
	req := httptest.NewRequest("GET", "/ping", nil)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		pingHandler(w, req)
	}
}

func BenchmarkDownloadHandler(b *testing.B) {
	req := httptest.NewRequest("GET", "/download", nil)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		downloadHandler(w, req)
	}
}

func BenchmarkUploadHandler(b *testing.B) {
	data := strings.NewReader(strings.Repeat("a", 1024*1024)) // 1MB of data
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		req := httptest.NewRequest("POST", "/upload", data)
		w := httptest.NewRecorder()
		b.StartTimer()
		
		uploadHandler(w, req)
	}
}

func BenchmarkRateLimiter(b *testing.B) {
	limiter := newRateLimiter()
	
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			limiter.isAllowed("test-ip")
		}
	})
}
