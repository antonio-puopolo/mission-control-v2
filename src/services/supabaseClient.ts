import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zauqqaifszugluyactcv.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc'

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Using fallback values.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
