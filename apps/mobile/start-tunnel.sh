#!/bin/bash

# Use absolute path to verified ngrok v3
NGROK_BIN=/usr/local/bin/ngrok

# Kill old processes
killall -9 ngrok 2>/dev/null
fuser -k 8081/tcp 2>/dev/null

# Check Node version (Expo SDK 56 requires Node 20+)
NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Error: Node.js version is $NODE_MAJOR. Expo SDK 56 requires Node 20 or higher."
  echo "Please run: nvm use 24"
  exit 1
fi

echo "🚀 Configuring ngrok..."
$NGROK_BIN config add-authtoken 39XbGMlDgcOkisupHjwRI6cZkdK_2YD8V5Kqrsq99wuRDMWpG

echo "🚀 Starting manual ngrok tunnel..."
# Start ngrok on Metro's port (8081)
$NGROK_BIN http 8081 --log=stdout > ngrok.log &

# Wait up to 10 seconds for the URL to appear
for i in {1..10}; do
  sleep 1
  TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^ ]*\.ngrok-free\.dev' | head -n 1)
  if [ ! -z "$TUNNEL_URL" ]; then
    echo "✅ Tunnel established: $TUNNEL_URL"
    export EXPO_PACKAGER_PROXY_URL=$TUNNEL_URL
    # Start Expo using the manual tunnel URL and clear Metro cache
    npx expo start --clear --host localhost
    exit 0
  fi
done

echo "❌ Error: Could not start ngrok tunnel. Check ngrok.log"
exit 1
