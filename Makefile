# Pinguen Speed Test - Docker Commands

.PHONY: help build up down logs clean dev-up dev-down test

# Default target
help:
	@echo "Available commands:"
	@echo "  build     - Build all Docker images"
	@echo "  up        - Start production containers"
	@echo "  down      - Stop production containers"
	@echo "  logs      - Show container logs"
	@echo "  clean     - Remove containers, networks, and images"
	@echo "  dev-up    - Start development containers with hot reload"
	@echo "  dev-down  - Stop development containers"
	@echo "  test      - Run backend tests in container"

# Production commands
build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

# Development commands
dev-up:
	docker-compose -f docker-compose.dev.yml up -d

dev-down:
	docker-compose -f docker-compose.dev.yml down

# Utility commands
clean:
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	docker system prune -af

test:
	docker-compose exec backend go test -v ./...

# Build and start production
start: build up

# Build and start development
dev: dev-up
