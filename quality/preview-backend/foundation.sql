-- NEW PREVIEW BASELINE CANDIDATE, NOT HISTORICAL RECONSTRUCTION OR A MIGRATION.
-- Empty, separately approved Supabase target only. No Auth stubs, learners or lessons.
-- Structural starting point: repository fixture contracts; constraints/grants/publication
-- are deliberately authored here and must be reviewed independently from the live schema.
do $$ begin
 if to_regclass('auth.users') is null or to_regprocedure('auth.uid()') is null
 then raise exception 'real_supabase_auth_required'; end if;
 if to_regclass('public.profiles') is not null then raise exception 'empty_preview_schema_required'; end if;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to service_role;
create table public.profiles(id uuid primary key references auth.users(id),display_name text not null,learner_track text not null check(learner_track in ('rafael_finance','viviane_payroll')),created_at timestamptz not null default now());

create table public.courses(id uuid primary key default gen_random_uuid(),slug text not null unique,title text not null,learner_track text not null check(learner_track in ('rafael_finance','viviane_payroll','english_academy')),is_active boolean not null default false);

create table public.modules(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id),slug text not null,title text not null,sequence integer not null check(sequence>0),is_published boolean not null default false,unique(course_id,slug),unique(course_id,sequence));

create table public.lessons(
 id uuid primary key default gen_random_uuid(),module_id uuid not null references public.modules(id),
 slug text not null,title text not null,subtitle text,sequence integer not null check(sequence>0),
 estimated_minutes integer not null default 30 check(estimated_minutes>0),
 learning_objectives jsonb not null default '[]',technical_brief_pt text,manager_commentary_pt text,
 worked_example_pt text,ireland_overlay_pt text,global_core_pt text,common_mistakes_pt text,interview_angle_pt text,
 source_last_reviewed date,content_version integer not null default 1 check(content_version>0),
 is_published boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(module_id,slug),unique(module_id,sequence));

create table public.competencies(id uuid primary key default gen_random_uuid(),learner_track text not null check(learner_track in ('rafael_finance','viviane_payroll','english_academy')),code text not null unique,name text not null,category text not null);

create table public.lesson_competencies(lesson_id uuid not null references public.lessons(id),competency_id uuid not null references public.competencies(id),weight numeric not null default 1 check(weight>0),primary key(lesson_id,competency_id));

create table public.user_competency_scores(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),competency_id uuid references public.competencies(id),score numeric,confidence numeric,evidence_count integer default 0,last_assessed_at timestamptz,updated_at timestamptz default now(),unique(user_id,competency_id));

create table public.user_error_bank(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),domain text,pattern text,normalized_pattern text,frequency integer default 1,confidence numeric,last_seen_at timestamptz default now(),next_review_at timestamptz default now(),last_source_type text,last_source_id uuid,examples jsonb default '[]',status text default 'active',created_at timestamptz default now(),updated_at timestamptz default now(),unique(user_id,domain,normalized_pattern));

create table public.spaced_reviews(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),lesson_id uuid references public.lessons(id),competency_id uuid references public.competencies(id),review_stage text,due_date date,status text,score numeric,completed_at timestamptz,created_at timestamptz default now());

create table public.learning_hub_budget_settings(id integer primary key,absolute_total_budget_usd numeric,infrastructure_reserve_usd numeric,ai_hard_cap_usd numeric,professor_cap_usd numeric,premium_audio_cap_usd numeric,updated_at timestamptz default now());

create table public.professor_budget_settings(feature text primary key,monthly_budget_usd numeric,reservation_usd numeric,premium_reservation_usd numeric,max_session_seconds integer,hard_stop_enabled boolean,updated_at timestamptz default now());

create table public.professor_budget_reservations(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,feature text default 'professor_livekit',month_start date default date_trunc('month',now())::date,reserved_usd numeric not null check(reserved_usd>0),max_session_seconds integer not null,status text default 'active' check(status in ('active','settled','unresolved','abandoned')),actual_cost_usd numeric not null default 0,settled_at timestamptz,created_at timestamptz default now());

create table public.ai_tutor_sessions(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,lesson_id uuid references lessons,mode text default 'chapter_conversation',status text default 'active',started_at timestamptz default now(),completed_at timestamptz,duration_seconds integer not null default 0,technical_score numeric,english_score numeric,grammar_score numeric,vocabulary_score numeric,fluency_score numeric,pronunciation_score numeric,professional_communication_score numeric,final_feedback jsonb,created_at timestamptz default now(),room_name text,dispatch_id text,quality_tier text,budget_reservation_id uuid references professor_budget_reservations,callback_token_hash text,transcript jsonb not null default '[]',model_usage jsonb not null default '[]',close_reason text,evaluation_model text,evaluation_cost_usd numeric not null default 0);

create table public.ai_tutor_turns(id uuid primary key default gen_random_uuid(),session_id uuid not null references ai_tutor_sessions,turn_number integer,speaker text,transcript text,feedback jsonb,created_at timestamptz default now());

create table public.ai_usage_log(id bigint generated by default as identity primary key,user_id uuid references public.profiles(id),session_id uuid references public.ai_tutor_sessions(id),feature text,model text,input_tokens bigint default 0,cached_input_tokens bigint default 0,output_tokens bigint default 0,audio_input_tokens bigint default 0,audio_output_tokens bigint default 0,audio_seconds numeric default 0,characters bigint default 0,estimated_cost_usd numeric,request_id text,created_at timestamptz default now());

create table public.professor_validation_flags(user_id uuid primary key references public.profiles(id),expires_at timestamptz);
create table public.audio_assets(
 id uuid primary key default gen_random_uuid(),lesson_id uuid not null references public.lessons(id),
 audio_type text not null check(audio_type='commentary'),storage_path text not null,
 transcript_pt text,voice text,generated_at timestamptz not null default now(),
 duration_seconds integer check(duration_seconds>=0),created_at timestamptz not null default now());
create unique index preview_usage_request_uq on public.ai_usage_log(feature,request_id);
create index preview_sessions_owner_idx on public.ai_tutor_sessions(user_id,started_at);
create index preview_lessons_module_idx on public.lessons(module_id);
create index preview_modules_course_idx on public.modules(course_id);

-- No model budget or publication is activated by installation.
insert into public.learning_hub_budget_settings values(1,0,0,0,0,0,now());
insert into public.professor_budget_settings values('professor_livekit',0,0.10,0.10,60,true,now());
alter table public.profiles enable row level security;
revoke all on public.profiles from public,anon,authenticated;
grant select,insert,update,delete on public.profiles to service_role;
alter table public.courses enable row level security;
revoke all on public.courses from public,anon,authenticated;
grant select,insert,update,delete on public.courses to service_role;
alter table public.modules enable row level security;
revoke all on public.modules from public,anon,authenticated;
grant select,insert,update,delete on public.modules to service_role;
alter table public.lessons enable row level security;
revoke all on public.lessons from public,anon,authenticated;
grant select,insert,update,delete on public.lessons to service_role;
alter table public.competencies enable row level security;
revoke all on public.competencies from public,anon,authenticated;
grant select,insert,update,delete on public.competencies to service_role;
alter table public.lesson_competencies enable row level security;
revoke all on public.lesson_competencies from public,anon,authenticated;
grant select,insert,update,delete on public.lesson_competencies to service_role;
alter table public.user_competency_scores enable row level security;
revoke all on public.user_competency_scores from public,anon,authenticated;
grant select,insert,update,delete on public.user_competency_scores to service_role;
alter table public.user_error_bank enable row level security;
revoke all on public.user_error_bank from public,anon,authenticated;
grant select,insert,update,delete on public.user_error_bank to service_role;
alter table public.spaced_reviews enable row level security;
revoke all on public.spaced_reviews from public,anon,authenticated;
grant select,insert,update,delete on public.spaced_reviews to service_role;
alter table public.learning_hub_budget_settings enable row level security;
revoke all on public.learning_hub_budget_settings from public,anon,authenticated;
grant select,insert,update,delete on public.learning_hub_budget_settings to service_role;
alter table public.professor_budget_settings enable row level security;
revoke all on public.professor_budget_settings from public,anon,authenticated;
grant select,insert,update,delete on public.professor_budget_settings to service_role;
alter table public.professor_budget_reservations enable row level security;
revoke all on public.professor_budget_reservations from public,anon,authenticated;
grant select,insert,update,delete on public.professor_budget_reservations to service_role;
alter table public.ai_tutor_sessions enable row level security;
revoke all on public.ai_tutor_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.ai_tutor_sessions to service_role;
alter table public.ai_tutor_turns enable row level security;
revoke all on public.ai_tutor_turns from public,anon,authenticated;
grant select,insert,update,delete on public.ai_tutor_turns to service_role;
alter table public.ai_usage_log enable row level security;
revoke all on public.ai_usage_log from public,anon,authenticated;
grant select,insert,update,delete on public.ai_usage_log to service_role;
alter table public.professor_validation_flags enable row level security;
revoke all on public.professor_validation_flags from public,anon,authenticated;
grant select,insert,update,delete on public.professor_validation_flags to service_role;
alter table public.audio_assets enable row level security;
revoke all on public.audio_assets from public,anon,authenticated;
grant select,insert,update,delete on public.audio_assets to service_role;
grant usage on sequence public.ai_usage_log_id_seq to service_role;
-- Profiles are provisioned only by a reviewed service workflow. No client self-enrolment.
grant select on public.profiles,public.courses,public.modules,public.lessons,public.competencies,public.lesson_competencies,
 public.user_competency_scores,public.user_error_bank,public.spaced_reviews,public.audio_assets to authenticated;
create policy preview_own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy preview_course on public.courses for select to authenticated using(
 is_active and exists(select 1 from public.profiles p where p.id=(select auth.uid())
 and (courses.learner_track=p.learner_track or courses.learner_track='english_academy')));
create policy preview_module on public.modules for select to authenticated using(
 is_published and exists(select 1 from public.courses c where c.id=modules.course_id));
create policy preview_lesson on public.lessons for select to authenticated using(
 is_published and exists(select 1 from public.modules m where m.id=lessons.module_id));
create policy preview_competency on public.competencies for select to authenticated using(
 exists(select 1 from public.profiles p where p.id=(select auth.uid())
 and (competencies.learner_track=p.learner_track or competencies.learner_track='english_academy')));
create policy preview_lesson_competency on public.lesson_competencies for select to authenticated using(
 exists(select 1 from public.lessons l where l.id=lesson_competencies.lesson_id)
 and exists(select 1 from public.competencies c where c.id=lesson_competencies.competency_id));
create policy preview_asset on public.audio_assets for select to authenticated using(
 exists(select 1 from public.lessons l where l.id=audio_assets.lesson_id));
-- Only columns consumed by the current learner readers; callback secrets/usage/transcripts stay server-owned.
grant select(id,user_id,lesson_id,room_name,mode,status,started_at,completed_at,duration_seconds,quality_tier,
 technical_score,english_score,grammar_score,vocabulary_score,fluency_score,pronunciation_score,
 professional_communication_score,final_feedback) on public.ai_tutor_sessions to authenticated;
create policy preview_session on public.ai_tutor_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy preview_own_evidence on public.user_competency_scores for select to authenticated using(user_id=(select auth.uid()));
create policy preview_own_evidence on public.user_error_bank for select to authenticated using(user_id=(select auth.uid()));
create policy preview_own_evidence on public.spaced_reviews for select to authenticated using(user_id=(select auth.uid()));
