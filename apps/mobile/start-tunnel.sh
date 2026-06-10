#!/bin/bash

# Kill old processes
killall -9 ngrok 2>/dev/null
fuser -k 8081/tcp 2>/dev/null

# Get Local IP
LOCAL_IP=$(ip route get 1 | awk '{print $7;exit}')
NGROK_BIN=/usr/local/bin/ngrok

echo "🚀 Starting manual ngrok tunnel on $LOCAL_IP:8081..."
# Start ngrok on Metro's port with host-header rewrite to prevent "Invalid Host" errors
$NGROK_BIN http 127.0.0.1:8081 --log=stdout --host-header=localhost > ngrok.log &

# Wait for the URL
sleep 3
for i in {1..120}; do
  TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -n 1 | cut -d'"' -f4)
  if [ ! -z "$TUNNEL_URL" ]; then
    echo "✅ Tunnel established: $TUNNEL_URL"
    export EXPO_PACKAGER_PROXY_URL=$TUNNEL_URL
    # Start Expo using the manual tunnel URL
    # We use --host lan to ensure the manifest uses the proxy URL correctly
    npx expo start --clear --host lan
    exit 0
  fi
  sleep 1
done

echo "❌ Error: Could not start ngrok tunnel."
exit 1
