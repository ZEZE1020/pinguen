# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test suite with error cases
- Benchmark tests for performance measurement
- Server graceful shutdown tests
- Parallel testing for rate limiter
- HTTP method validation in handlers
- Request body validation for upload endpoint
- Better error handling with proper status codes

### Changed
- Improved error response structure
- Enhanced request validation patterns
- Updated documentation for new features

### Fixed
- Method validation in download handler
- Empty body handling in upload handler
- Consistent error status codes
- Remove unused imports in benchmark tests

## [0.1.0] - 2025-07-23

### Added
- Initial release
- Basic speed test functionality
- Ping endpoint for latency testing
- Download endpoint (10MB stream)
- Upload endpoint with byte counting
- Rate limiting middleware
- CORS support
- Request logging
- Basic test coverage
