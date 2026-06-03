---
name: subway-dba
description: Manage Subway Surfer project database, server monitoring, and daily deployment reports.
---

# Subway DBA (Database Administrator)

This skill covers the Subway Surfer project's account server, database, and deployment monitoring.

## Architecture

Two Node.js servers on `35.212.200.85`:

| Service | Port | Description |
|---|---|---|
| **Account server** | 3000 | API + signin page + admin panel |
| **Game server** | 8080 | Static files (redirects / to :3000) |

Data stored at `/home/ejimm363/.openclaw/workspace/subway-surfer/server/data/`.

## Daily Monitoring Routine

Each day, run the following checks and report to the user via Telegram:

### 1. Database Status

```bash
cd /home/ejimm363/.openclaw/workspace/subway-surfer/server/data
python3 -c "
import json
with open('users.json') as f:
    users = json.load(f)
print(f'Total registered users: {len(users)}')
today = __import__('datetime').datetime.now().strftime('%m/%d')
new_users = [e for e,u in users.items() if u.get('createdAt',0) > __import__('time').time() - 86400]
print(f'New users today ({today}): {len(new_users)}')
for u in new_users[:5]:
    print(f'  - {u}')
if len(new_users) > 5:
    print(f'  ... and {len(new_users)-5} more')
"
```

### 2. Server Health

Check if both servers are listening:
```bash
ss -tlnp | grep -E "8080|3000"
```

If either is down, restart:
```bash
# Kill and restart account server
fuser -k 3000/tcp 2>/dev/null
cd /home/ejimm363/.openclaw/workspace/subway-surfer/server && node account-server.js &

# Kill and restart game server
fuser -k 8080/tcp 2>/dev/null
cd /home/ejimm363/.openclaw/workspace/subway-surfer && node server/static-server.js &
```

### 3. Server Resource Usage

```bash
echo "CPU load:" && uptime
echo "Memory:" && free -h | grep Mem
echo "Disk:" && df -h / | tail -1
echo "Network:" && ss -s | head -3
```

### 4. Server Security

```bash
# Failed SSH login attempts
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5
# Recent sudo usage
grep "sudo" /var/log/auth.log 2>/dev/null | tail -5
```

### 5. Access Statistics

Count unique IPs from game server logs:
```bash
cat /tmp/static-server.log 2>/dev/null | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | sort -u | wc -l
cat /tmp/account-server.log 2>/dev/null | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | sort -u | wc -l
```

Count recent requests (last 24h):
```bash
grep "$(date +%d/%b/%Y)" /tmp/static-server.log 2>/dev/null | wc -l
grep "$(date +%d/%b/%Y)" /tmp/account-server.log 2>/dev/null | wc -l
```

### 6. Deployment Check

Verify the game page loads correctly:
```bash
curl -sI http://35.212.200.85:3000/ | head -3
curl -sI http://35.212.200.85:3000/game.html | head -3
```

Verify API works:
```bash
curl -s http://35.212.200.85:3000/api/leaderboard
```

### 7. Git Status

Check if latest code is deployed:
```bash
cd /home/ejimm363/.openclaw/workspace && git log --oneline -1
```

## Quick Recovery

If the servers are down:

```bash
cd /home/ejimm363/.openclaw/workspace/subway-surfer
# Start account server (port 3000)
cd server && node account-server.js &
# Start game server (port 8080)
cd .. && node server/static-server.js &
```

## Database Schema

```json
{
  "email": {
    "email": "user@example.com",
    "username": "Player1",
    "rawPassword": "plaintext",
    "passwordHash": "pbkdf2...",
    "passwordSalt": "salt...",
    "verified": true,
    "createdAt": 1717200000000,
    "sessionToken": "random...",
    "sessionExpires": 1719792000000,
    "gameData": {
      "coins": 0,
      "credits": 0,
      "equippedAbility": 0,
      "ownedAbilities": [0],
      "maxDistance": 0,
      "maxEasy": 0,
      "maxMedium": 0,
      "maxHard": 0,
      "runCount": 0,
      "highScore": 0,
      "totalCoins": 0
    }
  }
}
```

## Admin URLs

| URL | Description |
|---|---|
| `http://35.212.200.85:3000/admin` | User management table |
| `http://35.212.200.85:3000/verify-codes` | Pending verification codes |
