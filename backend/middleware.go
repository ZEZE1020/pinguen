// Package main provides middleware components for the speed test server.
// This file contains implementations for rate limiting and request logging.
package main

import (
	"log"
	"net/http"
	"sync"
	"time"
)

type rateLimiter struct {
	requests map[string][]time.Time
	mu       sync.Mutex
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{
		requests: make(map[string][]time.Time),
	}
}

func (rl *rateLimiter) clean(ip string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	window := now.Add(-time.Minute)

	if times, exists := rl.requests[ip]; exists {
		valid := times[:0]
		for _, t := range times {
			if t.After(window) {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(rl.requests, ip)
		} else {
			rl.requests[ip] = valid
		}
	}
}

func (rl *rateLimiter) isAllowed(ip string) bool {
	rl.clean(ip)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	rl.requests[ip] = append(rl.requests[ip], now)

	return len(rl.requests[ip]) <= 60 // 60 requests per minute
}

func logRequest(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		handler(w, r)
		log.Printf(
			"%s %s %s %s",
			r.RemoteAddr,
			r.Method,
			r.URL.Path,
			time.Since(start),
		)
	}
}

func withRateLimit(limiter *rateLimiter, handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if !limiter.isAllowed(ip) {
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		handler(w, r)
	}
}
