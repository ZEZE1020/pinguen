# Use the official Go image as a builder
FROM golang:1.21-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy go mod and sum files
COPY go.mod ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Use a minimal alpine image for the final image
FROM alpine:latest

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/main .

# Expose the port
EXPOSE 8080

# Command to run the executable
CMD ["./main"]
