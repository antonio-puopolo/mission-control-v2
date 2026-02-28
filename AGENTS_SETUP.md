# Agent Spawning Setup Guide

## How It Works

1. **Frontend (React):** User clicks "Spawn Agent" → enters task + model → submits
2. **Frontend Hook:** `useAgentSpawn()` validates task, creates `agent_results` record in Supabase with status `queued`
3. **Frontend Call:** Calls `/api/agents/spawn` with task details
4. **Vercel Serverless:** `/api/agents/spawn.ts` receives request
5. **Serverless → OpenClaw:** Calls OpenClaw gateway `sessions_spawn()` to actually run the agent
6. **Supabase Update:** Serverless function updates `agent_results` with `status: completed` + `output`
7. **Real-time Sync:** MC subscribes to `agent_results` table → auto-updates UI when result arrives
8. **Frontend Display:** Results appear in "Recent Results" section with status badge

## Architecture

```
MC Frontend (Agents.tsx)
        ↓
useAgentSpawn hook (creates result record + calls API)
        ↓
POST /api/agents/spawn (Vercel serverless function)
        ↓
OpenClaw gateway (sessions_spawn)
        ↓
Agent runs (in isolated session)
        ↓
Result posted to Supabase agent_results
        ↓
MC Frontend subscription auto-updates
```

## Local Development Setup

### Prerequisites
- Node.js 18+
- Vercel CLI: `npm i -g vercel`
- OpenClaw running locally

### Steps

1. **Install dependencies:**
   ```bash
   cd mission-control-v2
   npm install
   ```

2. **Create `.env.local` (already created, but verify):**
   ```
   VITE_SUPABASE_URL=https://zauqqaifszugluyactcv.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc
   OPENCLAW_GATEWAY_URL=http://localhost:8080
   OPENCLAW_GATEWAY_TOKEN=<your-token>
   ```

3. **Start Vercel dev server (handles /api proxying):**
   ```bash
   vercel dev
   ```
   This starts:
   - Vite dev server (http://localhost:5173)
   - Vercel serverless functions (http://localhost:3000/api)

4. **In another terminal, verify OpenClaw is running:**
   ```bash
   openclaw status
   ```

5. **Open http://localhost:3000 in browser**

6. **Test Agent Spawning:**
   - Click "Agents" tab
   - Click "+ Spawn Agent"
   - Select "Coder Agent"
   - Enter task: "Build a simple Node.js CLI that says hello world"
   - Select model: Sonnet 4.5
   - Click "Spawn"
   - Watch "Recent Results" section for completion

## What to Expect

### Success Flow (3-5 seconds)
1. Status changes: `queued` → `running` → `completed`
2. Output appears in result card (agent's response)
3. Result saved to Supabase (persists across page refreshes)

### Error Handling
- If OpenClaw gateway is offline: Error message + status `failed`
- If task is invalid: Validation error before spawn
- If timeout: 300s limit, then status `failed` with timeout message

## Testing Checklist

- [ ] Spawn Social Media agent (task: "Write a tweet about real estate")
- [ ] Spawn Coder agent (task: "Build a CLI")
- [ ] Spawn Analyst agent (task: "Analyze Camp Hill market data")
- [ ] Spawn Copywriter agent (task: "Write a property listing description")
- [ ] Spawn Strategist agent (task: "Create a lead generation strategy")
- [ ] Refresh page → results still visible (Supabase persistence)
- [ ] Check Supabase `agent_results` table directly (verify data)

## Deployment to Vercel

1. **Set environment variables in Vercel dashboard:**
   - Go to project settings → Environment Variables
   - Add: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `OPENCLAW_GATEWAY_URL`, `OPENCLAW_GATEWAY_TOKEN`

2. **Push to master (triggers auto-deploy):**
   ```bash
   git add .
   git commit -m "feat: add agent spawning with real OpenClaw integration"
   git push origin master
   ```

3. **Vercel automatically:**
   - Runs tests (CI/CD pipeline)
   - Builds frontend + serverless functions
   - Deploys to https://mission-control-v2-delta.vercel.app
   - Functions available at `/api/agents/spawn`

## Troubleshooting

### "POST /api/agents/spawn 404"
- Vercel dev not running? Try: `vercel dev`
- API file missing? Check `/api/agents/spawn.ts` exists

### "OpenClaw spawn failed"
- Is OpenClaw running? `openclaw status`
- Wrong gateway URL? Check `.env.local` OPENCLAW_GATEWAY_URL
- Invalid token? Set `OPENCLAW_GATEWAY_TOKEN`

### Results not appearing
- Check Supabase directly: https://zauqqaifszugluyactcv.supabase.co
- Go to `agent_results` table → see if record created
- If status stuck on `running`: Agent may have crashed (check OpenClaw logs)

### "Cannot find module '@vercel/node'"
- Run: `npm install`
- Restart Vercel dev server: `vercel dev`

## Files Changed

```
mission-control-v2/
├── api/agents/spawn.ts         ← NEW: Serverless function
├── src/hooks/useAgentSpawn.ts  ← NEW: React hook for spawning
├── src/features/Agents/Agents.tsx  ← UPDATED: Use real hook
├── vite.config.ts              ← UPDATED: Add /api proxy
├── vercel.json                 ← NEW: Vercel config
├── tsconfig.api.json           ← NEW: API TypeScript config
├── .env.local                  ← NEW: Local env vars
└── package.json                ← UPDATED: Add @vercel/node
```

## Next Steps

1. Test spawning all 5 agents locally
2. Verify Supabase persistence
3. Deploy to Vercel
4. Add activity logging (points awarded when agent completes)
5. Add team integration (log result to Activity feed + leaderboard)

---

**Questions?** Check OpenClaw logs or Supabase table directly.
