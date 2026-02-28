/**
 * Database initialization script
 * Creates agent_results table if it doesn't exist
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zauqqaifszugluyactcv.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// Use admin key for DDL operations (if available)
// Otherwise, use public key with permission to modify schema
const KEY =
  SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc'

const supabase = createClient(SUPABASE_URL, KEY)

async function initializeDatabase() {
  console.log('🔄 Initializing database schema...\n')

  try {
    // Check if table exists by querying it
    const { error: checkError } = await supabase
      .from('agent_results')
      .select('*')
      .limit(1)

    if (!checkError) {
      console.log('✅ agent_results table already exists')
      return true
    }

    if (checkError.code === 'PGRST205') {
      console.log('⚠️  agent_results table not found')
      console.log('\n📋 To create the table, run this SQL in Supabase dashboard:')
      console.log('   https://app.supabase.com/project/zauqqaifszugluyactcv/sql/new\n')

      const sql = `CREATE TABLE agent_results (
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

CREATE INDEX idx_agent_results_created_at ON agent_results(created_at);`

      console.log(sql)
      console.log(
        '\n⚠️  Agent spawning will not work until this table is created.\n'
      )
      return false
    }

    console.error('❌ Unexpected error:', checkError.message)
    return false
  } catch (error) {
    console.error('❌ Error checking database:', error)
    return false
  }
}

// Run if executed directly
initializeDatabase()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

export { initializeDatabase }
