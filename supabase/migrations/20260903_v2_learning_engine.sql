-- Learning Hub V2 learning-engine schema draft.
-- PREPARED ONLY: do not apply to production until the V2 data-model gate is approved.

create table if not exists public.user_error_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  domain text not null check (domain in ('technical','grammar','vocabulary','pronunciation','fluency','register')),
  pattern text not null,
  normalized_pattern text not null,
  frequency integer not null default 1 check (frequency > 0),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 100),
  last_seen_at timestamptz not null default now(),
  next_review_at timestamptz not null default now(),
  last_source_type text,
  last_source_id uuid,
  examples jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','mastered','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, domain, normalized_pattern)
);

create index if not exists user_error_bank_user_due_idx
  on public.user_error_bank (user_id, status, next_review_at);

create index if not exists user_error_bank_user_domain_idx
  on public.user_error_bank (user_id, domain, confidence);

create table if not exists public.curriculum_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('competency','error_bank','spaced_review','assessment','professor')),
  source_id uuid,
  label text not null,
  priority_score numeric not null check (priority_score >= 0 and priority_score <= 100),
  recommended_action text not null check (recommended_action in ('micro_lesson','quick_retrieval','case','speaking','pronunciation','review')),
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','served','completed','dismissed')),
  generated_at timestamptz not null default now(),
  served_at timestamptz,
  completed_at timestamptz
);

create index if not exists curriculum_recommendations_user_priority_idx
  on public.curriculum_recommendations (user_id, status, priority_score desc, generated_at desc);

alter table public.user_error_bank enable row level security;
alter table public.curriculum_recommendations enable row level security;

create policy "Learners can read own error bank"
  on public.user_error_bank for select
  using (auth.uid() = user_id);

create policy "Learners can read own curriculum recommendations"
  on public.curriculum_recommendations for select
  using (auth.uid() = user_id);

-- Writes are intentionally not granted to authenticated clients.
-- Error extraction and recommendation writes should come from trusted backend/Edge Functions.

comment on table public.user_error_bank is
  'Recurring technical and language errors used by Learning Hub V2 adaptive review.';

comment on table public.curriculum_recommendations is
  'Ranked next-learning actions generated from competencies, Error Bank, reviews and assessments.';
