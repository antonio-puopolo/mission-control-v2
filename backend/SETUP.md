# Mission Control Backend Service

A robust Node.js/Express backend service that bridges Mission Control (React frontend) and OpenClaw (agent runner).

## What It Does

1. **Receives spawn requests** from MC frontend: `/api/agents/spawn`
2. **Validates** the request (agent type, task length, etc.)
3. **Calls OpenClaw gateway** to run the agent in an isolated session
4. **Persists results** to Supabase (`agent_results` table)
5. **Responds** with output back to frontend for real-time display

## Architecture

```
MC Frontend
    ↓ POST /api/agents/spawn
Backend Service (Express)
    ↓ Call sessions_spawn()
OpenClaw Gateway
    ↓ Execute in isolated session
Agent (runs)
    ↓ Returns result
Backend Service (updates Supabase)
    ↓ Real-time sync
MC Frontend (displays results)
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to OpenClaw gateway (running locally or remote)
- Supabase credentials (in TOOLS.md)

### Installation

```bash
cd mission-control-v2/backend
npm install
```

### Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://zjyrillpennxowntwebo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc
OPENCLAW_GATEWAY_URL=http://localhost:8080
OPENCLAW_GATEWAY_TOKEN=
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

## Running the Service

### Development Mode (with hot reload)

```bash
npm run dev
```

Output:
```
Mission Control Backend running on http://localhost:3001
Environment: development
OpenClaw Gateway: http://localhost:8080
```

### Production Mode

```bash
npm run build
npm start
```

### As a Systemd Service (Optional)

Create `/etc/systemd/system/mission-control-backend.service`:

```ini
[Unit]
Description=Mission Control Backend Service
After=network.target

[Service]
Type=simple
User=antonio
WorkingDirectory=/home/antonio-ubuntu/.openclaw/workspace/mission-control-v2/backend
ExecStart=/usr/bin/node --loader ts-node/esm src/index.ts
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="VITE_SUPABASE_URL=https://zjyrillpennxowntwebo.supabase.co"
Environment="VITE_SUPABASE_ANON_KEY=sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc"
Environment="OPENCLAW_GATEWAY_URL=http://localhost:8080"
Environment="OPENCLAW_GATEWAY_TOKEN="
Environment="PORT=3001"

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mission-control-backend
sudo systemctl start mission-control-backend
sudo systemctl status mission-control-backend
```

View logs:

```bash
sudo journalctl -u mission-control-backend -f
```

## API Endpoints

### POST /api/agents/spawn

Spawn an agent with a task.

**Request:**
```json
{
  "resultId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "coder",
  "task": "Build a Node.js CLI that prints hello world",
  "model": "sonnet",
  "thinking": "off"
}
```

**Response (success):**
```json
{
  "success": true,
  "resultId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output": "[Agent output here...]"
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "OpenClaw error: Agent timeout",
  "resultId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET /api/agents/results/:resultId

Get the status and output of a spawned agent.

**Response:**
```json
{
  "success": true,
  "result": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "agent_type": "coder",
    "task": "Build a CLI",
    "status": "completed",
    "output": "[Agent output]",
    "error": null,
    "created_at": "2026-03-01T00:00:00Z",
    "completed_at": "2026-03-01T00:02:00Z"
  }
}
```

### GET /api/agents/status

Health check for agent spawning service.

**Response:**
```json
{
  "status": "ok",
  "service": "agent-spawning",
  "timestamp": "2026-03-01T00:00:00Z"
}
```

### GET /health

Overall service health (including OpenClaw gateway connectivity).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T00:00:00Z",
  "openclaw": "connected",
  "uptime": 123.45
}
```

## Frontend Integration

The MC frontend (`src/hooks/useAgentSpawn.ts`) automatically:

1. Creates a result record in Supabase with `status: 'queued'`
2. Calls `POST http://localhost:3001/api/agents/spawn` with the request
3. Subscribes to real-time updates on the `agent_results` table
4. Displays results in the UI as they complete

**Important:** Update the API URL in the frontend if the backend runs on a different port/host:

File: `src/hooks/useAgentSpawn.ts`

```typescript
const spawnResponse = await fetch('http://localhost:3001/api/agents/spawn', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ resultId, agentId, task, model }),
})
```

## Troubleshooting

### "Cannot connect to OpenClaw Gateway"

```
OpenClaw error: ECONNREFUSED localhost:8080
```

**Fix:** Ensure OpenClaw is running:
```bash
openclaw status
openclaw gateway start
```

### "VITE_SUPABASE_URL not configured"

**Fix:** Create `.env.local` and add credentials:
```bash
cp .env.example .env.local
# Edit .env.local with actual credentials
```

### "Agent timeout"

The service waits up to 5 minutes for an agent to complete. If exceeded:

```json
{
  "success": false,
  "error": "OpenClaw error: Timeout waiting for agent",
  "resultId": "..."
}
```

**Solution:** Increase timeout in `src/routes/agents.ts`:

```typescript
timeoutSeconds: 600  // Increase to 10 minutes
```

### Backend starts but frontend can't reach it

**Check:**
1. Backend running? `curl http://localhost:3001/health`
2. Firewall blocking port 3001? `sudo ufw allow 3001`
3. Frontend using correct URL? Check `src/hooks/useAgentSpawn.ts`

### Can't find module errors

```bash
npm install
npm run dev
```

## Development

### Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express app setup
│   ├── routes/               # API endpoints
│   │   ├── agents.ts        # Spawn + results endpoints
│   │   └── health.ts        # Health check
│   ├── services/             # Business logic
│   │   ├── openclaw.ts      # OpenClaw integration
│   │   └── supabase.ts      # Supabase integration
│   ├── middleware/           # Express middleware
│   │   └── errorHandler.ts  # Error handling
│   ├── types/                # TypeScript types
│   │   └── index.ts         # Request schemas (Zod)
│   └── utils/                # Utilities
│       └── logger.ts        # Pino logging
├── package.json
├── tsconfig.json
└── SETUP.md (this file)
```

### Adding Logging

Use the `logger` utility:

```typescript
import { logger } from '../utils/logger.js'

logger.info({ agentId, task }, 'Starting agent spawn')
logger.error({ error }, 'Agent spawn failed')
logger.warn({ timeout }, 'Request timing out')
logger.debug({ payload }, 'Full request body')
```

### Running Tests (Future)

```bash
npm test
```

## Performance Targets

- Request validation: <10ms
- OpenClaw spawn call: depends on agent (typically 1-5 seconds for small tasks)
- Supabase update: <100ms
- Total request time: depends on agent execution time

## Security Considerations

1. **Input Validation:** All requests validated with Zod
2. **Error Messages:** Never expose internal errors in production
3. **Timeout Protection:** 5-minute timeout prevents runaway agents
4. **Environment Secrets:** Store in `.env.local` (never commit)
5. **Logs:** Structured logging for audit trails

## Next Steps

1. Start the backend: `npm run dev`
2. Test: `curl -X POST http://localhost:3001/api/agents/status`
3. Update MC frontend API URL if needed
4. Run agent spawn from MC dashboard
5. Monitor logs: `tail -f ~/.npm/_logs/mission-control-backend.log` (or journalctl if using systemd)

---

**Questions?** Check OpenClaw docs or logs for detailed error messages.
