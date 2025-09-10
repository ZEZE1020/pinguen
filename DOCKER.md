# Docker Setup for Pinguen Speed Test

This document describes how to run the Pinguen Speed Test application using Docker.

## Prerequisites

- Docker
- Docker Compose
- Make (optional, for convenience commands)

## Quick Start

### Production

1. **Build and start all services:**
   ```bash
   make start
   # or
   docker-compose up --build -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Health check: http://localhost:8080/status

3. **View logs:**
   ```bash
   make logs
   # or
   docker-compose logs -f
   ```

4. **Stop services:**
   ```bash
   make down
   # or
   docker-compose down
   ```

### Development (with hot reload)

1. **Start development environment:**
   ```bash
   make dev
   # or
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:5173 (Vite dev server)
   - Backend API: http://localhost:8080

3. **Stop development environment:**
   ```bash
   make dev-down
   # or
   docker-compose -f docker-compose.dev.yml down
   ```

## Docker Images

### Backend
- **Base:** `golang:1.22-alpine` (builder) + `alpine:latest` (runtime)
- **Port:** 8080
- **Healthcheck:** `/status` endpoint

### Frontend
- **Production:** `node:18-alpine` (builder) + `nginx:alpine` (runtime)
- **Development:** `node:18-alpine` with Vite dev server
- **Port:** 80 (production), 5173 (development)

## Environment Variables

### Frontend
- `VITE_API_URL`: Backend API URL (default: http://localhost:8080)

### Backend
- `PORT`: Server port (default: 8080)
- `ENV`: Environment mode (development/production)

## Docker Compose Services

### Production (`docker-compose.yml`)
- **backend**: Go server with optimized build
- **frontend**: Static files served by Nginx with API proxy

### Development (`docker-compose.dev.yml`)
- **backend-dev**: Go server with source code mounting
- **frontend-dev**: Vite dev server with hot reload

## Available Make Commands

```bash
make help       # Show all available commands
make build      # Build all Docker images
make up         # Start production containers
make down       # Stop production containers
make logs       # Show container logs
make clean      # Remove containers, networks, and images
make dev-up     # Start development containers
make dev-down   # Stop development containers
make test       # Run backend tests in container
make start      # Build and start production (build + up)
make dev        # Start development environment
```

## Networking

- **Production network:** `pinguen-network`
- **Development network:** `pinguen-dev-network`
- Services communicate using container names as hostnames

## Health Checks

Both services include health checks:
- **Backend:** Checks `/status` endpoint every 30s
- **Frontend:** Checks root path every 30s

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Production frontend: 3000
   - Development frontend: 5173
   - Backend: 8080

2. **Build failures:**
   ```bash
   make clean  # Clean up everything
   make build  # Rebuild images
   ```

3. **Network issues:**
   ```bash
   docker network ls
   docker network inspect pinguen-network
   ```

4. **View container status:**
   ```bash
   docker-compose ps
   docker-compose logs [service-name]
   ```

### Debugging

1. **Execute commands in containers:**
   ```bash
   docker-compose exec backend sh
   docker-compose exec frontend sh
   ```

2. **Check health status:**
   ```bash
   docker-compose ps
   ```

3. **Monitor resource usage:**
   ```bash
   docker stats
   ```

## Production Deployment

For production deployment, consider:

1. **Environment variables:**
   - Set proper `VITE_API_URL` for your domain
   - Configure any necessary backend environment variables

2. **SSL/TLS:**
   - Add SSL certificates to nginx configuration
   - Update ports and protocols accordingly

3. **Scaling:**
   - Use Docker Swarm or Kubernetes for scaling
   - Consider load balancing for multiple backend instances

4. **Monitoring:**
   - Add logging drivers
   - Implement monitoring solutions
   - Set up alerts for health check failures
