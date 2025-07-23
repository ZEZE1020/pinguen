# Pinguen Speed Test Server

A high-performance internet speed test server written in Go, inspired by Fast.com.

## Features

- 🚀 Latency testing (ping)
- 📥 Download speed testing (10MB stream)
- 📤 Upload speed testing (accepts 2-20MB)
- 🔒 Rate limiting protection
- 📝 Request logging
- ✅ CORS support
- 🏥 Health check endpoint

## Prerequisites

- Go 1.21 or higher
- Make (optional, for using Makefile commands)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ZEZE1020/pinguen.git
   cd pinguen/backend
   ```

2. Install dependencies:
   ```bash
   go mod download
   ```

## Running the Server

### Development Mode
```bash
go run .
```

### Production Build
```bash
go build
./backend
```

The server will start on port 8080 by default.

## API Endpoints

### GET /ping
Test server latency.

```bash
curl http://localhost:8080/ping
```

Response:
```json
{
    "timestamp": 1690142400000000000
}
```

### GET /download
Download a 10MB file to test download speed.

```bash
curl http://localhost:8080/download -o test.bin
```

### POST /upload
Upload a file to test upload speed (2-20MB recommended).

```bash
# Create a 2MB test file and upload it
dd if=/dev/zero bs=1M count=2 | curl -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @- \
  http://localhost:8080/upload
```

Response:
```json
{
    "bytesUploaded": 2097152,
    "duration": 123
}
```

### GET /status
Check server health status.

```bash
curl http://localhost:8080/status
```

Response:
```json
{
    "status": "ok",
    "version": "1.0.0",
    "timestamp": "2025-07-23T10:30:00Z"
}
```

## Running Tests

Run all tests:
```bash
go test -v
```

Run tests with coverage:
```bash
go test -v -cover
```

Generate coverage report:
```bash
go test -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Rate Limiting

The server implements rate limiting to prevent abuse:
- 60 requests per minute per IP address
- Applies to all endpoints
- Returns 429 Too Many Requests when limit is exceeded

## CORS Configuration

By default, CORS is enabled for `http://localhost:5173` (Vite development server). To modify allowed origins, update the `enableCORS` middleware in `main.go`.

## Error Handling

The server provides detailed error responses:
- 400 Bad Request - Invalid request
- 429 Too Many Requests - Rate limit exceeded
- 500 Internal Server Error - Server-side errors

## Monitoring

All requests are logged with:
- Remote IP address
- HTTP method
- URL path
- Response time

## Contributing

We welcome contributions! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Areas that need improvement
- Potential new features
- Development guidelines
- Pull request process
- Code style guidelines

## License

MIT License - see the LICENSE file in the root directory
