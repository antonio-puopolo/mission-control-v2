-- George LLM Configuration Table
-- Stores which LLM provider/model George uses for voice responses

CREATE TABLE IF NOT EXISTS george_llm_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'hamm',
  model text NOT NULL DEFAULT 'hamm:main',
  api_key text,
  updated_at timestamptz DEFAULT now()
);

-- Seed default config: Hamm (OpenClaw) as the provider
INSERT INTO george_llm_config (provider, model, api_key)
VALUES ('hamm', 'hamm:main', '0f7ae70c482a469d98a1b922cc1757b2e344b1447c432aae0df47094d0cfdb85')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE george_llm_config ENABLE ROW LEVEL SECURITY;

-- Backend can read/write; frontend can read
CREATE POLICY "George LLM config viewable by all" ON george_llm_config FOR SELECT USING (true);
CREATE POLICY "George LLM config writable by services" ON george_llm_config FOR INSERT WITH CHECK (true);
CREATE POLICY "George LLM config updatable by services" ON george_llm_config FOR UPDATE USING (true);
