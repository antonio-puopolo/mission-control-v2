# Database Setup - Mission Control v2

## Required Schema

The `agent_results` table needs to be created in Supabase before agent spawning will work.

## Option 1: Supabase Dashboard (Easiest)

1. Go to: https://app.supabase.com/project/zauqqaifszugluyactcv/sql/new
2. Copy the entire SQL below into the editor
3. Click "Run" button

### SQL to Execute

```sql
-- Agent results table (stores agent outputs)
CREATE TABLE IF NOT EXISTS agent_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  output TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Enable RLS
ALTER TABLE agent_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agent results are viewable by all users" ON agent_results FOR SELECT USING (true);
CREATE POLICY "Agent results can be inserted" ON agent_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Agent results can be updated" ON agent_results FOR UPDATE USING (true);

-- Create index for faster queries
CREATE INDEX idx_agent_results_created_at ON agent_results(created_at);
```

## Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
cd /home/antonio-ubuntu/.openclaw/workspace/mission-control-v2
supabase db push
```

## Verification

After running the SQL, verify the table was created:

```bash
curl -s "https://zauqqaifszugluyactcv.supabase.co/rest/v1/agent_results?limit=1" \
  -H "apikey: sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc" | jq .
```

Should return:
```json
[]
```
(Empty array = table exists but has no rows)

If you get an error like `"code": "PGRST205"`, the table wasn't created yet.

## Testing Agent Spawning

Once the table is created:

1. **Start backend:**
   ```bash
   cd backend && npm run dev
   ```

2. **Start frontend:**
   ```bash
   cd ../ && npm run dev
   ```

3. **Go to:** http://localhost:5173

4. **Click Agents tab → + Spawn Agent**

5. **Select Coder → Enter task → Click Spawn**

6. **Watch results appear in real-time**

## Tables in Supabase (All Required)

```
┌──────────────────────┐
│ laps                 │ (existing - LAP tracking)
├──────────────────────┤
│ id (UUID)            │
│ address (TEXT)       │
│ client_name (TEXT)   │
│ status (TEXT)        │
│ follow_up_date (DATE)│
│ notes (JSONB)        │
│ created_at (TIMESTAMP)
└──────────────────────┘

┌──────────────────────┐
│ agent_results        │ (needed for spawning)
├──────────────────────┤
│ id (UUID)            │
│ agent_type (TEXT)    │
│ task (TEXT)          │
│ status (TEXT)        │
│ output (TEXT)        │
│ error (TEXT)         │
│ created_at (TIMESTAMP)
│ completed_at (TIMESTAMP)
└──────────────────────┘

┌──────────────────────┐
│ activity_log         │ (for gamification)
├──────────────────────┤
│ id (UUID)            │
│ user_id (UUID)       │
│ activity_type (TEXT) │
│ description (TEXT)   │
│ points_awarded (INT) │
│ created_at (TIMESTAMP)
└──────────────────────┘
```

## Troubleshooting

**Error: "Could not find the table 'public.agent_results'"**
→ Run the SQL above in the Supabase dashboard

**Error: "ECONNREFUSED localhost:8080"**
→ OpenClaw gateway not running. Run: `openclaw status`

**Error: "Unknown error" from backend**
→ Check backend logs: See `npm run dev` terminal for error details

---

**Status:** Database setup required before testing agent spawning.
**Next:** Run the SQL above, then test spawning agents from MC frontend.
