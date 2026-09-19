-- New isolated target only. Private narration; no learner object-write/read policy.
-- Edge must authorize exact lesson/profile before issuing a short-lived signed URL.
do $$ begin
 if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null
 then raise exception 'supabase_storage_required'; end if;
 if exists(select 1 from storage.buckets where id='lesson-audio')
 then raise exception 'preview_audio_bucket_requires_review'; end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('lesson-audio','lesson-audio',false,20971520,array['audio/mpeg']);
-- Supabase owns storage tables and service grants. Do not alter platform schema or
-- add permissive policies; a new target must retain its default-denied learner access.
