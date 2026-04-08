// George MC Tool Definitions — 8 functions for Groq function calling

export const GEORGE_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_laps',
      description: 'Fetch LAPs (Listing Appointment Presentations) from the database. Can filter by status, priority, or search by client name/address.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['LAP', 'Listed', 'Sold', 'Withdrawn', 'all'],
            description: 'Filter by LAP status. Use "all" to get all statuses.',
          },
          priority: {
            type: 'string',
            enum: ['urgent', 'high', 'normal', 'low'],
            description: 'Filter by priority level.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return. Default 20.',
          },
          search: {
            type: 'string',
            description: 'Search by client name or address (partial match).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_lap',
      description: 'Update a LAP record. Can update follow-up date, priority, notes, phone, email, status, next action, etc.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the LAP to update.',
          },
          follow_up_date: {
            type: 'string',
            description: 'Follow-up date in YYYY-MM-DD format.',
          },
          priority: {
            type: 'string',
            enum: ['urgent', 'high', 'normal', 'low'],
            description: 'Priority level for this LAP.',
          },
          note_text: {
            type: 'string',
            description: 'Notes or text to add/update on the LAP.',
          },
          phone: {
            type: 'string',
            description: 'Phone number for the client.',
          },
          email: {
            type: 'string',
            description: 'Email address for the client.',
          },
          status: {
            type: 'string',
            enum: ['LAP', 'Listed', 'Sold', 'Withdrawn'],
            description: 'New status for the LAP.',
          },
          next_action: {
            type: 'string',
            description: 'Next action to take for this LAP.',
          },
          price_expectation: {
            type: 'string',
            description: 'Client price expectation (e.g. "$850,000 - $900,000").',
          },
          agent_assigned: {
            type: 'string',
            description: 'Agent assigned to this LAP.',
          },
          pipeline_section: {
            type: 'string',
            enum: ['pipeline_a', 'pipeline_b', 'pipeline_c', 'under_construction'],
            description: 'Which pipeline section this LAP is in.',
          },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_projects',
      description: 'Fetch projects from the database. Can filter by status or owner.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'on_hold', 'completed', 'archived', 'all'],
            description: 'Filter by project status.',
          },
          owner: {
            type: 'string',
            enum: ['antonio', 'hamm'],
            description: 'Filter by project owner.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results. Default 20.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_project',
      description: 'Update a project record. Can update status, description, or add checklist items.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The UUID of the project to update.',
          },
          status: {
            type: 'string',
            enum: ['active', 'on_hold', 'completed', 'archived'],
            description: 'New status for the project.',
          },
          description: {
            type: 'string',
            description: 'Updated description for the project.',
          },
          title: {
            type: 'string',
            description: 'Updated title for the project.',
          },
          notes: {
            type: 'string',
            description: 'Notes to add to the project.',
          },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_activities',
      description: 'Fetch recent activity log entries (calls, emails, meetings, BAP/MAP/LAP activities).',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to look back. Default 7.',
          },
          activity_type: {
            type: 'string',
            description: 'Filter by activity type (e.g. "BAP", "MAP", "LAP", "call", "email").',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results. Default 20.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'log_activity',
      description: 'Record a new activity entry (call made, email sent, meeting held, BAP/MAP/LAP completed).',
      parameters: {
        type: 'object',
        properties: {
          activity_type: {
            type: 'string',
            description: 'Type of activity. E.g. "BAP", "MAP", "LAP", "call", "email", "meeting", "open_home".',
          },
          description: {
            type: 'string',
            description: 'Description of the activity.',
          },
          lap_id: {
            type: 'string',
            description: 'Optional UUID of a LAP to associate this activity with.',
          },
          points_awarded: {
            type: 'number',
            description: 'Points to award for this activity. BAP=1, MAP=2, LAP=5 by default.',
          },
        },
        required: ['activity_type', 'description'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_market_data',
      description: 'Fetch property market listings and market pulse data (recent sales, for-sale properties in Camp Hill area).',
      parameters: {
        type: 'object',
        properties: {
          listing_type: {
            type: 'string',
            enum: ['for_sale', 'sold', 'all'],
            description: 'Type of listings to fetch.',
          },
          suburb: {
            type: 'string',
            description: 'Suburb to filter by (e.g. "Camp Hill").',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of listings. Default 10.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_goals',
      description: 'Fetch KPI targets and current progress (GCI, listings, LAPs, weekly activity targets).',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['weekly', 'quarterly', 'annual', 'all'],
            description: 'Time period for goals. Default "all".',
          },
        },
        required: [],
      },
    },
  },
]

export type ToolName = 'get_laps' | 'update_lap' | 'get_projects' | 'update_project' | 
  'get_activities' | 'log_activity' | 'get_market_data' | 'get_goals'
