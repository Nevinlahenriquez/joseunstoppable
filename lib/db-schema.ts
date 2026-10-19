// The whole database, created from the dashboard with one button
// (/admin -> "Preparar base de datos"). Every statement is idempotent, so the
// button is safe to press again after an update adds a column.

type Col = [name: string, type: string]

const TABLES: Record<string, Col[]> = {
  leads: [
    ['name', 'text'], ['email', 'text'], ['phone', 'text'], ['company', 'text'], ['source', 'text'],
    ['status', 'text'], ['notes', 'text'], ['role', 'text'], ['company_size', 'text'], ['product', 'text'],
    ['website', 'text'], ['tags', 'jsonb'], ['activity', 'jsonb'], ['event', 'text'],
    ['created_at', 'timestamptz default now()'], ['updated_at', 'timestamptz'],
  ],
  deals: [
    ['lead_id', 'text'], ['client_name', 'text'], ['client_email', 'text'], ['client_company', 'text'],
    ['client_phone', 'text'], ['client_vat', 'text'], ['client_address', 'text'], ['client_website', 'text'],
    ['client_role', 'text'], ['stage', 'text'], ['value', 'numeric'], ['currency', 'text'], ['service', 'text'],
    ['notes', 'text'], ['location', 'text'], ['instagram', 'text'], ['priority', 'text'], ['next_step', 'text'],
    ['next_step_date', 'text'], ['current_state', 'text'], ['desired_outcome', 'text'], ['goals', 'text'],
    ['blockers', 'text'], ['budget', 'text'], ['activity', 'jsonb'], ['tags', 'jsonb'], ['revenue_type', 'text'],
    ['retainer_months', 'numeric'], ['close_date', 'text'], ['organization', 'text'],
    ['created_at', 'timestamptz default now()'], ['updated_at', 'timestamptz'],
  ],
  proposals: [
    ['token', 'text'], ['ref', 'text'], ['deal_id', 'text'], ['deleted_at', 'timestamptz'],
    ['client_name', 'text'], ['client_email', 'text'], ['client_company', 'text'], ['client_phone', 'text'],
    ['client_address', 'text'], ['client_vat', 'text'], ['one_time', 'boolean'], ['title', 'text'],
    ['intro', 'text'], ['services', 'jsonb'], ['deliverables', 'jsonb'], ['payment_schedule', 'jsonb'],
    ['total', 'numeric'], ['currency', 'text'], ['valid_days', 'numeric'], ['status', 'text'],
    ['payment_link', 'text'], ['bank_info', 'text'], ['notes', 'text'], ['payment_methods', 'jsonb'],
    ['created_at', 'timestamptz default now()'], ['sent_at', 'timestamptz'], ['signed_at', 'timestamptz'],
    ['viewed_at', 'timestamptz'], ['reminder_sent_at', 'timestamptz'],
    ['signer_name', 'text'], ['signer_signature', 'text'], ['offer_id', 'text'], ['linked_invoice_id', 'text'],
    ['billing_day', 'numeric'], ['version', 'numeric'], ['parent_proposal_id', 'text'],
  ],
  invoices: [
    ['number', 'text'], ['token', 'text'], ['client_name', 'text'], ['client_email', 'text'],
    ['client_company', 'text'], ['client_address', 'text'], ['client_phone', 'text'], ['client_vat', 'text'],
    ['project_title', 'text'], ['line_items', 'jsonb'], ['taxes', 'jsonb'], ['tax_label', 'text'],
    ['tax_rate', 'numeric'], ['amount_paid', 'numeric'], ['currency', 'text'], ['status', 'text'],
    ['notes', 'text'], ['issue_date', 'text'], ['due_date', 'text'], ['created_at', 'timestamptz default now()'],
    ['sent_at', 'timestamptz'], ['paid_at', 'timestamptz'], ['viewed_at', 'timestamptz'],
    ['payment_reminder_at', 'timestamptz'], ['reminders', 'jsonb'], ['deleted_at', 'timestamptz'],
    ['proposal_id', 'text'], ['phase_index', 'numeric'], ['recurring', 'boolean'], ['recurring_day', 'numeric'],
    ['recurring_parent_id', 'text'], ['recurring_overrides', 'jsonb'], ['payment_methods', 'jsonb'],
    ['payment_method', 'text'], ['payment_ref', 'text'], ['source', 'text'],
  ],
  events: [
    ['slug', 'text'], ['status', 'text'], ['title', 'text'], ['tagline', 'text'], ['date', 'text'],
    ['time', 'text'], ['end_time', 'text'], ['timezone', 'text'], ['format', 'text'], ['location', 'text'],
    ['location_name', 'text'], ['capacity', 'numeric'], ['price', 'numeric'], ['currency', 'text'],
    ['cover_image', 'text'], ['thumbnail_image', 'text'], ['tags', 'jsonb'], ['speakers', 'jsonb'],
    ['agenda', 'jsonb'], ['faq', 'jsonb'], ['waitlist_enabled', 'boolean'], ['requires_approval', 'boolean'],
    ['email_confirmation', 'text'], ['email_reminder', 'text'], ['email_follow_up', 'text'],
    ['reminder_hours_before', 'numeric'], ['data', 'jsonb'], ['created_at', 'timestamptz default now()'],
  ],
  event_attendees: [
    ['event_id', 'text'], ['event_title', 'text'], ['name', 'text'], ['email', 'text'], ['phone', 'text'],
    ['company', 'text'], ['status', 'text'], ['paid', 'boolean default false'], ['paid_at', 'timestamptz'],
    ['paid_amount', 'numeric'], ['payment_method', 'text'], ['payment_ref', 'text'],
    ['checked_in', 'boolean default false'], ['checked_in_at', 'timestamptz'], ['ticket_code', 'text'],
    ['notes', 'text'], ['source', 'text'], ['registered_at', 'timestamptz default now()'],
    ['proof_path', 'text'], ['proof_uploaded_at', 'timestamptz'], ['proof_check', 'jsonb'],
    ['referral_code', 'text'], ['referred_by', 'text'], ['referred_by_partner', 'text'], ['referral_rewards', 'jsonb'],
    ['reminder_sent_24', 'boolean default false'], ['reminder_sent_10', 'boolean default false'],
    ['reminder_sent_5', 'boolean default false'], ['reminder_sent_3', 'boolean default false'],
    ['reminder_sent', 'boolean default false'], ['followup_sent', 'boolean default false'],
  ],
  offers: [
    ['category', 'text'], ['pyramid_tier', 'text'], ['name', 'text'], ['tagline', 'text'], ['price', 'numeric'],
    ['currency', 'text'], ['billing_type', 'text'], ['services', 'jsonb'], ['deliverables', 'jsonb'],
    ['payment_schedule', 'jsonb'], ['notes', 'text'], ['active', 'boolean default true'], ['data', 'jsonb'],
    ['created_at', 'timestamptz default now()'],
  ],
  funnel_events: [
    ['visitor_id', 'text'], ['funnel_id', 'text'], ['step', 'text'], ['path', 'text'], ['referrer', 'text'],
    ['created_at', 'timestamptz default now()'],
  ],
  bookings: [
    ['name', 'text'], ['email', 'text'], ['phone', 'text'], ['notes', 'text'], ['start_at', 'timestamptz'],
    ['end_at', 'timestamptz'], ['status', 'text'], ['source', 'text'], ['attribution', 'jsonb'],
    ['google_event_id', 'text'], ['meet_url', 'text'], ['created_at', 'timestamptz default now()'],
  ],
  bio_links: [
    ['label', 'text'], ['url', 'text'], ['position', 'numeric'], ['active', 'boolean default true'],
    ['highlight', 'boolean default false'], ['created_at', 'timestamptz default now()'],
  ],
  onboardings: [
    ['token', 'text'], ['name', 'text'], ['email', 'text'], ['phone', 'text'], ['deal_id', 'text'],
    ['status', 'text'], ['answers', 'jsonb'], ['source', 'text'], ['created_at', 'timestamptz default now()'],
    ['opened_at', 'timestamptz'], ['completed_at', 'timestamptz'], ['updated_at', 'timestamptz'], ['last_sent_at', 'timestamptz'],
  ],
  app_settings: [['value', 'jsonb'], ['updated_at', 'timestamptz default now()']],
  // One row per client with portal access (id = lowercased email); token is their personal link.
  portal_access: [
    ['token', 'text'], ['email', 'text'], ['name', 'text'], ['deal_id', 'text'], ['active', 'boolean default true'],
    ['app_url', 'text'], ['app_ready', 'boolean default false'], ['login_nonce', 'text'], ['invited_at', 'timestamptz'], ['last_login_at', 'timestamptz'],
    ['created_at', 'timestamptz default now()'],
  ],
  // Questions from clients in the portal and José's answers.
  portal_messages: [
    ['email', 'text'], ['sender', 'text'], ['body', 'text'], ['read_at', 'timestamptz'],
    ['created_at', 'timestamptz default now()'],
  ],
  // Extra admin logins added from /admin/access (id = lowercased email); password is a scrypt hash.
  admin_users: [
    ['name', 'text'], ['password_hash', 'text'], ['login_nonce', 'text'], ['last_login_at', 'timestamptz'],
    ['created_at', 'timestamptz default now()'],
  ],
  // One row per person, rebuilt from the tables above (lib/contacts-db.ts).
  contacts: [
    ['name', 'text'], ['email', 'text'], ['phone', 'text'], ['status', 'text'], ['source', 'text'],
    ['goals', 'jsonb'], ['tags', 'jsonb'], ['events', 'jsonb'], ['deal_id', 'text'],
    ['booking_count', 'numeric'], ['last_booking_at', 'timestamptz'], ['onboarding_status', 'text'], ['onboarding_id', 'text'],
    ['urgency', 'text'], ['blocker', 'text'], ['key_date', 'text'], ['budget', 'text'], ['call_answers', 'jsonb'],
    ['age', 'numeric'], ['weight_kg', 'numeric'], ['height_cm', 'numeric'], ['measurements', 'jsonb'],
    ['goal_detail', 'text'], ['timeframe', 'text'], ['health', 'text'], ['work', 'text'], ['meals', 'text'],
    ['sleep', 'text'], ['training_days', 'text'], ['training_place', 'text'], ['food_likes', 'text'],
    ['food_dislikes', 'text'], ['commitment', 'numeric'], ['ready_to_change', 'text'], ['why_now', 'text'],
    ['notes', 'text'], ['invoiceshift_customer_id', 'text'], ['invoiceshift_synced_at', 'timestamptz'],
    ['first_seen', 'timestamptz'], ['last_seen', 'timestamptz'], ['updated_at', 'timestamptz'],
  ],
}

const INDEXES = [
  'create index if not exists funnel_events_funnel_idx on funnel_events (funnel_id, step, created_at)',
  'create index if not exists attendees_event_idx on event_attendees (event_id)',
  'create index if not exists bookings_start_idx on bookings (start_at)',
  'create unique index if not exists onboardings_token_uq on onboardings (token)',
  'create unique index if not exists portal_access_token_uq on portal_access (token)',
  'create index if not exists portal_messages_email_idx on portal_messages (email, created_at)',
  'create index if not exists contacts_email_idx on contacts (email)',
  'create unique index if not exists bookings_slot_uq on bookings (start_at) where status <> \'cancelled\'',
]

export function schemaStatements(): string[] {
  const out: string[] = []
  for (const [table, cols] of Object.entries(TABLES)) {
    out.push(`create table if not exists ${table} (id text primary key)`)
    for (const [name, type] of cols) out.push(`alter table ${table} add column if not exists ${name} ${type}`)
    // Deny-all: only the server (service role key) reads and writes.
    out.push(`alter table ${table} enable row level security`)
  }
  return [...out, ...INDEXES]
}

export const SCHEMA_TABLES = Object.keys(TABLES)
