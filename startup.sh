#!/bin/sh

# Silvera V2 - Startup script for main app + admin panel
# Runs both Express backend and Next.js admin app

echo "🚀 Starting Silvera V2..."

# Start the main Express server in the background
echo "📦 Starting main API server on port 3865..."
node server/index.js &
MAIN_PID=$!

# Wait a moment for main server to start
sleep 2

# Start the Next.js admin app
echo "⚙️  Starting admin panel on port 3000..."
cd admin-app && npm start &
ADMIN_PID=$!

echo "✅ Both services started"
echo "   Main API: http://localhost:3865"
echo "   Admin Panel: http://localhost:3000"

# Wait for both processes
wait $MAIN_PID $ADMIN_PID
