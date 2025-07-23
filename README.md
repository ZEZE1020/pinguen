# Pinguen Speed Test

A simple internet speed test application inspired by Fast.com, built with Go and React.

## Features

- Measures internet connection metrics:
  - Download speed (Mbps)
  - Upload speed (Mbps)
  - Ping latency (ms)
- Clean, responsive UI with real-time progress indicators
- Cross-origin support for development and production environments

## Tech Stack

### Backend
- Go 1.21+
- Standard library (net/http)
- Docker for containerization

### Frontend
- React 18+
- TypeScript
- Vite
- Tailwind CSS
- Modern ECMAScript features

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Node.js 18 or higher
- npm or yarn
- Docker (for deployment)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ZEZE1020/pinguen.git
   cd pinguen
   ```

2. Start the backend server:
   ```bash
   cd backend
   go mod download
   go run main.go
   ```

3. Start the frontend development server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## Deployment

### Frontend (Netlify)

1. Push your changes to GitHub
2. Connect your repository to Netlify
3. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Backend (Fly.io)

1. Install the Fly.io CLI
2. Log in to Fly.io
3. Deploy:
   ```bash
   cd backend
   fly launch
   fly deploy
   ```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
