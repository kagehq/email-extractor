#!/bin/bash

# Example Usage Script for Email Extractor & URL Shortener API
# This script demonstrates how to use the API

API_BASE="http://localhost:3000"

echo "🚀 Email Extractor & URL Shortener API - Example Usage"
echo "======================================================"
echo

# Check if server is running
echo "1. Checking if server is running..."
if curl -s "$API_BASE/health" > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start it with: npm start"
    exit 1
fi
echo

# Example 1: GitHub URL
echo "2. Shortening GitHub URL..."
GITHUB_URL="https://github.com/actions/download-artifact/archive/refs/tags/v4.3.0.zip"
echo "Original URL: $GITHUB_URL"

GITHUB_RESPONSE=$(curl -s -X POST "$API_BASE/shorten" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$GITHUB_URL\"}")

GITHUB_SHORT_URL=$(echo "$GITHUB_RESPONSE" | grep -o '"shortUrl":"[^"]*' | cut -d'"' -f4)
echo "Shortened URL: $GITHUB_SHORT_URL"
echo

# Example 2: Docker URL
echo "3. Shortening Docker Hub URL..."
DOCKER_URL="https://hub.docker.com/_/redis"
echo "Original URL: $DOCKER_URL"

DOCKER_RESPONSE=$(curl -s -X POST "$API_BASE/shorten" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$DOCKER_URL\"}")

DOCKER_SHORT_URL=$(echo "$DOCKER_RESPONSE" | grep -o '"shortUrl":"[^"]*' | cut -d'"' -f4)
echo "Shortened URL: $DOCKER_SHORT_URL"
echo

# Show the generated scripts
echo "4. Generated bash scripts:"
echo "========================="
echo
echo "GitHub Script Preview:"
echo "----------------------"
curl -s "$GITHUB_SHORT_URL" | head -10
echo "... (truncated)"
echo
echo "Docker Script Preview:"
echo "----------------------"
curl -s "$DOCKER_SHORT_URL" | head -10
echo "... (truncated)"
echo

# Instructions for users
echo "5. How users would execute these:"
echo "================================"
echo
echo "For GitHub artifact download:"
echo "curl -s $GITHUB_SHORT_URL | bash"
echo
echo "For Docker image pull:"
echo "curl -s $DOCKER_SHORT_URL | bash"
echo
echo "ℹ️  Note: The scripts will optimize download performance based on system configuration."
echo

# Show admin endpoints
echo "6. Admin endpoints (for monitoring):"
echo "===================================="
echo "View all shortened URLs: curl $API_BASE/admin/urls"
echo "View all logged emails:  curl $API_BASE/admin/emails"
echo "Health check:           curl $API_BASE/health"
echo

echo "✅ Example usage complete!" 