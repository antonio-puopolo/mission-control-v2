import { z } from 'zod'

export const SpawnRequestSchema = z.object({
  resultId: z.string().uuid('Invalid result ID'),
  agentId: z.enum(['social', 'coder', 'analyst', 'copywriter', 'strategist']),
  task: z.string().min(1, 'Task cannot be empty').max(5000, 'Task too long'),
  model: z.string().optional().default('sonnet'),
  thinking: z.enum(['on', 'off']).optional(),
})

export type SpawnRequest = z.infer<typeof SpawnRequestSchema>

export const AGENT_CONFIG: Record<
  string,
  { name: string; agentId: string; description: string }
> = {
  social: {
    name: 'Social Media Agent',
    agentId: 'social-agent',
    description: 'Posts, tweets, captions, engagement',
  },
  coder: {
    name: 'Coder Agent',
    agentId: 'coder-agent',
    description: 'Building, debugging, refactoring code',
  },
  analyst: {
    name: 'Analyst Agent',
    agentId: 'analyst-agent',
    description: 'Market research, data analysis, insights',
  },
  copywriter: {
    name: 'Copywriter Agent',
    agentId: 'copywriter-agent',
    description: 'Email, landing pages, marketing copy',
  },
  strategist: {
    name: 'Strategist Agent',
    agentId: 'strategist-agent',
    description: 'Planning, positioning, GTM strategy',
  },
}
