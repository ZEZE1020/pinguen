#!/bin/bash

# Simple test script for the Pinguen Speed Test API
echo "Testing Pinguen Speed Test API..."
echo "=================================="

# Test /status endpoint
echo -n "Testing /status endpoint: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/status)
if [ $STATUS -eq 200 ]; then
    echo "✅ OK ($STATUS)"
    curl -s http://localhost:8080/status | jq .
else
    echo "❌ Failed ($STATUS)"
fi

echo ""

# Test /ping endpoint
echo -n "Testing /ping endpoint: "
PING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ping)
if [ $PING_STATUS -eq 200 ]; then
    echo "✅ OK ($PING_STATUS)"
    curl -s http://localhost:8080/ping | jq .
else
    echo "❌ Failed ($PING_STATUS)"
fi

echo ""

# Test /download endpoint (just check response code, don't download full content)
echo -n "Testing /download endpoint: "
DOWNLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8080/download)
if [ $DOWNLOAD_STATUS -eq 200 ]; then
    echo "✅ OK ($DOWNLOAD_STATUS)"
else
    echo "❌ Failed ($DOWNLOAD_STATUS)"
fi

echo ""

# Test /upload endpoint
echo -n "Testing /upload endpoint: "
UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -d "test data for upload" http://localhost:8080/upload)
if [ $UPLOAD_STATUS -eq 200 ]; then
    echo "✅ OK ($UPLOAD_STATUS)"
    UPLOAD_RESPONSE=$(curl -s -X POST -d "test data for upload" http://localhost:8080/upload)
    echo $UPLOAD_RESPONSE | jq .
else
    echo "❌ Failed ($UPLOAD_STATUS)"
fi

echo ""
echo "Testing complete!"
echo ""
echo "Frontend is running at: http://localhost:5173"
echo "Backend API is running at: http://localhost:8080"
