#!/bin/bash
# Start both servers using Node.js (more reliable than Python http.server)
cd /home/ejimm363/.openclaw/workspace/subway-surfer

# Kill any existing servers
kill $(pgrep -f "static-server") 2>/dev/null
kill $(pgrep -f "account-server") 2>/dev/null
sleep 1

# Game static server (port 8080)
setsid node server/static-server.js < /dev/null > /tmp/static-server.log 2>&1 &
disown
echo "Game server starting on port 8080..."

# Account server (port 3000)
setsid node server/account-server.js < /dev/null > /tmp/account-server.log 2>&1 &
disown
echo "Account server starting on port 3000..."

sleep 2
echo ""
echo "=== Ports ==="
ss -tlnp | grep -E "8080|3000"
echo ""
echo "Game:     http://35.212.200.85:8080/"
echo "Account:  http://35.212.200.85:3000/"
echo "API:      register=POST /api/register, login=POST /api/login, save=POST /api/save, leaderboard=GET /api/leaderboard"
