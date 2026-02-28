# Mission Control v2 - Testing Guide

**Status:** ✅ All services running, ready for database setup

## System Status

### Services Running ✅
```
Backend:  http://localhost:3001 (Express, Node.js)
Frontend: http://localhost:5173 (React, Vite)
```

### Health Checks ✅
```
GET http://localhost:3001/health
Response: { "status": "ok", "openclaw": "disconnected" }

GET http://localhost:3001/api/agents/status
Response: { "status": "ok", "service": "agent-spawning" }
```

### API Endpoints ✅
```
POST /api/agents/spawn        (Main: spawn an agent)
GET  /api/agents/results/:id  (Get agent result)
GET  /api/agents/status       (Service health)
GET  /health                  (Overall health)
```

## Prerequisites

1. ✅ Backend running (`cd backend && npm run dev`)
2. ✅ Frontend running (`npm run dev`)
3. ⚠️ **Database table created** (step below)

## Step 1: Create Database Table

⏱️ **Time: 1 minute**

### Option A: Via Setup Page (Easiest)

1. Open: http://localhost:5173/setup.html
2. Click "Open Supabase Dashboard"
3. Copy the SQL from the page
4. Paste into Supabase SQL editor
5. Click "Run"

### Option B: Direct SQL

1. Go to: https://app.supabase.com/project/zauqqaifszugluyactcv/sql/new
2. Paste this SQL:

```sql
CREATE TABLE agent_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  output TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

ALTER TABLE agent_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent results are viewable by all users" ON agent_results FOR SELECT USING (true);
CREATE POLICY "Agent results can be inserted" ON agent_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Agent results can be updated" ON agent_results FOR UPDATE USING (true);

CREATE INDEX idx_agent_results_created_at ON agent_results(created_at);
```

3. Click "Run"

## Step 2: Test Agent Spawning via API

⏱️ **Time: 5 seconds**

### Test Coder Agent

```bash
curl -X POST http://localhost:3001/api/agents/spawn \
  -H "Content-Type: application/json" \
  -d '{
    "resultId": "550e8400-e29b-41d4-a716-446655440000",
    "agentId": "coder",
    "task": "Write a simple hello world Node.js script",
    "model": "haiku"
  }'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "resultId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output": "[agent output here...]"
}
```

**If DB table exists but OpenClaw not running:**
```json
{
  "success": false,
  "error": "OpenClaw error: ECONNREFUSED localhost:8080",
  "resultId": "550e8400-e29b-41d4-a716-446655440000"
}
```
→ Start OpenClaw: `openclaw gateway start`

### Test All 5 Agents

```bash
# Social Media Agent
curl -X POST http://localhost:3001/api/agents/spawn \
  -H "Content-Type: application/json" \
  -d '{
    "resultId": "550e8400-e29b-41d4-a716-446655440001",
    "agentId": "social",
    "task": "Write a tweet about real estate"
  }'

# Analyst Agent
curl -X POST http://localhost:3001/api/agents/spawn \
  -H "Content-Type: application/json" \
  -d '{
    "resultId": "550e8400-e29b-41d4-a716-446655440002",
    "agentId": "analyst",
    "task": "Analyze Camp Hill property market trends"
  }'

# Copywriter Agent
curl -X POST http://localhost:3001/api/agents/spawn \
  -H "Content-Type: application/json" \
  -d '{
    "resultId": "550e8400-e29b-41d4-a716-446655440003",
    "agentId": "copywriter",
    "task": "Write a compelling property listing description"
  }'

# Strategist Agent
curl -X POST http://localhost:3001/api/agents/spawn \
  -H "Content-Type: application/json" \
  -d '{
    "resultId": "550e8400-e29b-41d4-a716-446655440004",
    "agentId": "strategist",
    "task": "Create a lead generation strategy for real estate"
  }'
```

## Step 3: Test Agent Spawning via MC Dashboard

⏱️ **Time: 2 minutes**

1. **Open:** http://localhost:5173
2. **Navigate:** Click "Agents" tab
3. **Spawn Agent:** Click "+ Spawn Agent" button
4. **Select Agent:** Choose "Coder Agent"
5. **Enter Task:** 
   ```
   Build a Node.js CLI that reads a CSV file and prints formatted output
   ```
6. **Choose Model:** Select "Sonnet 4.5" (or default)
7. **Submit:** Click "Spawn"
8. **Watch:** Results appear in "Recent Results" section
   - Initial status: `queued`
   - Updates to: `running`
   - Final status: `completed` (or `failed` if error)
   - Output displays automatically

### Expected Behavior

```
Status Timeline:
queued (0s)    → Running in OpenClaw...
running (1-2s) → Agent executing task...
completed (X s)→ Results displayed in UI
```

### What You'll See

**Card with:**
- Agent icon + name
- Task description
- Status badge (green = completed)
- Agent output (code, analysis, etc.)
- Timestamp

## Step 4: Verify Persistence

⏱️ **Time: 30 seconds**

1. After spawning an agent, **refresh the page** (Ctrl+R)
2. **Results should still be visible**
3. This verifies Supabase persistence is working

### Verify in Supabase

Go to: https://app.supabase.com/project/zauqqaifszugluyactcv/editor/125671

You should see rows in the `agent_results` table:
```
id                           | agent_type | task              | status    | output  | created_at
550e8400-e29b-41d4-...      | coder      | Build a Node...   | completed | {...}   | 2026-03-01T...
550e8400-e29b-41d4-...      | social     | Write a tweet     | completed | {...}   | 2026-03-01T...
...
```

## Testing Checklist

### Prerequisites
- [ ] Backend running (npm run dev in backend/)
- [ ] Frontend running (npm run dev in root)
- [ ] Supabase credentials working
- [ ] Database table created

### API Tests
- [ ] GET /health responds with status ok
- [ ] GET /api/agents/status responds
- [ ] POST /api/agents/spawn validates schema
- [ ] Spawn request fails gracefully (DB table missing message is clear)

### UI Tests
- [ ] Open http://localhost:5173
- [ ] Agents tab displays 5 agent cards
- [ ] Spawn modal opens on "+ Spawn Agent" click
- [ ] Model dropdown shows all options
- [ ] Spawn button is disabled when task is empty
- [ ] Results display after spawn

### End-to-End Tests
- [ ] Spawn Social Media agent → see output
- [ ] Spawn Coder agent → see code
- [ ] Spawn Analyst agent → see analysis
- [ ] Spawn Copywriter agent → see copy
- [ ] Spawn Strategist agent → see strategy
- [ ] Refresh page → results persist
- [ ] Check Supabase → agent_results table has entries

## Troubleshooting

### "Could not find the table 'public.agent_results'"
**Problem:** Database table not created
**Fix:** Follow Step 1 above to create the table in Supabase

### "OpenClaw error: ECONNREFUSED localhost:8080"
**Problem:** OpenClaw gateway not running
**Fix:** 
```bash
openclaw status
openclaw gateway start
```

### Backend shows "Agent spawn failed" with "Unknown error"
**Problem:** Likely DB table missing or credentials wrong
**Fix:** 
1. Check table exists in Supabase: https://app.supabase.com/project/zauqqaifszugluyactcv/editor
2. Check backend logs: Look at terminal running `npm run dev`
3. Verify .env.local has correct Supabase credentials

### Frontend can't reach backend
**Problem:** Backend not running or API proxy not configured
**Fix:**
```bash
# Terminal 1: Start backend
cd mission-control-v2/backend && npm run dev

# Terminal 2: Check frontend can reach backend
curl http://localhost:3001/health
```

### Agent timeout
**Problem:** Agent taking >5 minutes
**Fix:** This is normal for complex tasks. Timeout can be increased in `backend/src/routes/agents.ts` (line ~20)

## Performance Expectations

| Operation | Time |
|-----------|------|
| API validation | <10ms |
| Supabase create record | <100ms |
| OpenClaw spawn call | <1s setup |
| Agent execution | 1-10s (depends on task) |
| Supabase update result | <100ms |
| Real-time sync to UI | <500ms |
| **Total** | **2-15s** (mostly agent work) |

## Next Steps After Testing

1. ✅ All tests pass
2. Commit changes: `git add . && git commit -m "test: verify agent spawning"`
3. Push: `git push origin master`
4. Deploy to Vercel: Auto-deploys on push
5. Start Activity/Team components (Phase 3)

## Files for Testing

- **Setup Page:** http://localhost:5173/setup.html (interactive guide)
- **API Docs:** See `backend/SETUP.md` for endpoint details
- **Database:** https://app.supabase.com/project/zauqqaifszugluyactcv/editor

---

**Ready?** Create the database table and start testing! 🚀
