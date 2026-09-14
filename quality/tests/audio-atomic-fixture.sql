-- Extends only the disposable budget fixture, never a connected project.
alter table public.lessons add column content_version integer not null default 1;
insert into public.lessons(module_id) select id from public.modules where course_id=(select id from courses where learner_track='rafael_finance');
create table lh_internal.audio_fixture_guard(label text primary key check(label='fictional-audio-concurrency'));
insert into lh_internal.audio_fixture_guard values('fictional-audio-concurrency');
