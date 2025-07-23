# Quick Start Guide

This guide will help you quickly test the speed test server functionality.

## 1. Start the Server

```bash
go run .
```

## 2. Test All Endpoints

Open a new terminal and run these commands:

### Test Server Health
```bash
curl http://localhost:8080/status
```
Expected: JSON response with server status

### Test Latency (Ping)
```bash
curl http://localhost:8080/ping
```
Expected: JSON response with timestamp

### Test Download Speed
```bash
time curl -o /dev/null http://localhost:8080/download
```
Expected: Downloads 10MB file, shows time taken

### Test Upload Speed
```bash
# Create 2MB test file
dd if=/dev/zero bs=1M count=2 of=test.bin

# Upload and measure
time curl -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test.bin \
  http://localhost:8080/upload
```
Expected: JSON response with bytes uploaded and duration

### Test Rate Limiting
```bash
# Run multiple requests quickly
for i in {1..70}; do 
  curl -w "\n" http://localhost:8080/ping
  sleep 0.1
done
```
Expected: Some requests will return 429 Too Many Requests

## 3. Monitor Server Logs

While running tests, watch the server terminal for request logs showing:
- IP addresses
- Request methods
- Paths
- Response times

## Troubleshooting

1. If "connection refused":
   - Check if server is running
   - Verify port 8080 is free

2. If CORS errors:
   - Verify client origin matches allowed origin
   - Check browser console for specific CORS error

3. If rate limited:
   - Wait 1 minute
   - Try again with fewer requests
