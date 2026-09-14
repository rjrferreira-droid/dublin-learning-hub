-- Extends only the disposable budget fixture, never a connected project.
alter table public.lessons add column content_version integer not null default 1;
insert into public.lessons(module_id) select id from public.modules where course_id=(select id from courses where learner_track='rafael_finance');
create table lh_internal.audio_fixture_guard(label text primary key check(label='fictional-audio-concurrency'));
insert into lh_internal.audio_fixture_guard values('fictional-audio-concurrency');

-- Minimal asset shape for the reviewed isolated installation package.
create table public.audio_assets(id uuid primary key default gen_random_uuid(),lesson_id uuid references public.lessons(id),audio_type text,storage_path text);
