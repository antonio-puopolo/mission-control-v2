-- Fix: Add DELETE policy for laps table (was missing from initial migration)
-- Without this, RLS silently blocks all DELETE operations via the anon key

CREATE POLICY "LAPs can be deleted by users" ON laps FOR DELETE USING (true);
