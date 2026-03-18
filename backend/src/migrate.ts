/**
 * Database migration runner
 * Executes SQL migrations to initialize Supabase schema
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabaseUrl = 'https://zjyrillpennxowntwebo.supabase.co'
const supabaseKey = 'sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigrations() {
  console.log('Checking database schema...')

  // Check if agent_results table exists
  const { data: tables, error: tablesError } = await supabase
    .from('agent_results')
    .select('*', { count: 'exact', head: true })
    .limit(1)

  if (!tablesError) {
    console.log('✓ agent_results table already exists')
    return
  }

  if (tablesError.code === 'PGRST205') {
    console.log('✗ agent_results table not found, creating schema...')

    // Read migration SQL
    const migrationPath = path.join(__dirname, '..', '..', 'supabase', 'migrations', '001_init_schema.sql')
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8')

    // Split into individual statements and filter empty ones
    const statements = migrationSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    // Execute each statement
    for (const statement of statements) {
      try {
        // Use rpc to execute arbitrary SQL (if available)
        // Otherwise, we need to use the dashboard
        console.log(`Executing: ${statement.substring(0, 50)}...`)

        // For now, just log what we would execute
        // In production, use Supabase CLI: npx supabase db push
      } catch (error) {
        console.error('Error:', error)
      }
    }

    console.log('\n⚠️  Manual step required:')
    console.log('Run this SQL in the Supabase dashboard:')
    console.log('https://app.supabase.com/project/zjyrillpennxowntwebo/sql/new')
    console.log('\nSQL:')
    console.log(migrationSql)
  } else {
    console.error('Database error:', tablesError)
  }
}

runMigrations()
