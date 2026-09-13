-- Additive V2 repair. Original learner records and legacy confidence values are preserved.
alter table public.user_error_bank
  add column if not exists diagnostic_confidence numeric check (diagnostic_confidence between 0 and 100),
  add column if not exists mastery_confidence numeric check (mastery_confidence between 0 and 100),
  add column if not exists confidence_semantics text not null default 'legacy_unclassified';
update public.user_error_bank
set diagnostic_confidence=confidence, confidence_semantics='diagnostic_v1'
where last_source_type='professor_session' and diagnostic_confidence is null;
comment on column public.user_error_bank.confidence is 'Legacy compatibility field. Not a mastery score. New code must use explicitly named confidence fields.';
comment on column public.user_error_bank.diagnostic_confidence is 'Confidence that an error was correctly detected, NOT student mastery.';
comment on column public.user_error_bank.mastery_confidence is 'Provisional mastery estimate backed by retrieval evidence. NULL means unmeasured, never 100 minus diagnostic confidence.';

create schema if not exists lh_internal;
revoke all on schema lh_internal from public,anon,authenticated;
grant usage on schema lh_internal to service_role;
create table if not exists lh_internal.professor_completion_receipts (
  session_id uuid primary key references public.ai_tutor_sessions(id),
  payload_hash text not null,
  trace_id uuid not null default gen_random_uuid(),
  validation_mode boolean not null,
  evaluated boolean not null,
  transcript_turns integer not null,
  completed_at timestamptz not null default now()
);
alter table lh_internal.professor_completion_receipts enable row level security;
revoke all on lh_internal.professor_completion_receipts from public,anon,authenticated;
grant select,insert on lh_internal.professor_completion_receipts to service_role;

create or replace function lh_internal.score_or_null(v jsonb)
returns numeric language sql immutable set search_path=pg_catalog as $$
select case when jsonb_typeof(v)='number' then greatest(0::numeric,least(100::numeric,(v #>> '{}')::numeric)) else null end;
$$;
revoke all on function lh_internal.score_or_null(jsonb) from public,anon,authenticated;
grant execute on function lh_internal.score_or_null(jsonb) to service_role;

create or replace function public.complete_professor_session_v2(p_session_id uuid,p_callback_token text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=public,extensions,pg_temp as $fn$
declare
  s public.ai_tutor_sessions%rowtype;
  r lh_internal.professor_completion_receipts%rowtype;
  v_hash text;
  v_transcript jsonb;
  e jsonb;
  item jsonb;
  v_validation boolean;
  v_has_learner boolean;
  v_status text;
  v_pattern text;
  v_normalized text;
  v_domain text;
  v_diagnostic numeric;
  v_assessment numeric;
  v_example jsonb;
  v_score numeric;
  v_days integer;
  v_stage text;
  v_track text;
  c record;
  v_error_count integer:=0;
begin
  if p_callback_token is null or length(p_callback_token)<32 then raise exception 'invalid_callback_credentials' using errcode='42501'; end if;
  select * into s from public.ai_tutor_sessions where id=p_session_id for update;
  if not found or s.callback_token_hash is distinct from encode(extensions.digest(p_callback_token,'sha256'),'hex') then
    raise exception 'invalid_callback_credentials' using errcode='42501';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_completion_payload'; end if;
  v_hash:=encode(extensions.digest(p_payload::text,'sha256'),'hex');
  select * into r from lh_internal.professor_completion_receipts where session_id=p_session_id;
  if found then
    if r.payload_hash<>v_hash then raise exception 'completion_conflict'; end if;
    return jsonb_build_object('ok',true,'duplicate',true,'traceId',r.trace_id,'validationMode',r.validation_mode,'evaluated',r.evaluated,'transcriptTurns',r.transcript_turns);
  end if;
  -- Never reinterpret historical sessions or permit unbounded late callbacks.
  if s.status<>'active' then raise exception 'session_already_finalized'; end if;
  if s.started_at<now()-interval '24 hours' then raise exception 'callback_expired' using errcode='42501'; end if;
  v_transcript:=p_payload->'transcript';
  if jsonb_typeof(v_transcript) is distinct from 'array' or jsonb_array_length(v_transcript)>200 then raise exception 'invalid_transcript'; end if;
  if exists(select 1 from jsonb_array_elements(v_transcript) t where coalesce(t->>'role','') not in ('user','assistant') or coalesce(length(t->>'text'),0)=0 or length(t->>'text')>4000) then raise exception 'invalid_transcript_turn'; end if;
  select exists(select 1 from jsonb_array_elements(v_transcript) t where t->>'role'='user') into v_has_learner;
  v_validation:=coalesce(s.room_name like 'validation:%',false);
  e:=case when jsonb_typeof(p_payload->'evaluation')='object' then p_payload->'evaluation' else null end;
  v_assessment:=lh_internal.score_or_null(e->'assessmentConfidence');
  v_status:=case when v_validation or not v_has_learner then 'abandoned' else 'completed' end;
  update public.ai_tutor_sessions set
    status=v_status,completed_at=now(),
    duration_seconds=greatest(0,least(1200,coalesce((p_payload->>'durationSeconds')::integer,0))),
    transcript=v_transcript,model_usage=coalesce(p_payload->'modelUsage','[]'::jsonb),
    close_reason=left((case when v_validation then 'validation:' else '' end)||coalesce(p_payload->>'closeReason','session_closed'),120),
    dispatch_id=coalesce(nullif(p_payload->>'dispatchId',''),s.dispatch_id),
    technical_score=lh_internal.score_or_null(e->'technicalScore'),
    english_score=lh_internal.score_or_null(e->'englishScore'),
    grammar_score=lh_internal.score_or_null(e->'grammarScore'),
    vocabulary_score=lh_internal.score_or_null(e->'vocabularyScore'),
    fluency_score=lh_internal.score_or_null(e->'fluencyScore'),
    pronunciation_score=null,
    professional_communication_score=lh_internal.score_or_null(e->'professionalCommunicationScore'),
    final_feedback=case when e is null then null else (e-'model'-'estimatedCostUsd')||jsonb_build_object('validationMode',v_validation,'evidenceStatus',case when v_assessment is null or v_assessment<60 then 'provisional' else 'assessed' end) end,
    evaluation_model=nullif(e->>'model',''),
    evaluation_cost_usd=greatest(0,least(5,coalesce((e->>'estimatedCostUsd')::numeric,0)))
  where id=p_session_id;
  -- Append once. Never delete stored turns during callback processing.
  insert into public.ai_tutor_turns(session_id,turn_number,speaker,transcript,feedback)
  select p_session_id,n::integer,case when t->>'role'='user' then 'learner' else 'tutor' end,t->>'text',jsonb_build_object('interrupted',coalesce((t->>'interrupted')::boolean,false))
  from jsonb_array_elements(v_transcript) with ordinality a(t,n);

  if e is not null and v_has_learner and not v_validation then
    for item in select value from jsonb_array_elements(case when jsonb_typeof(e->'errors')='array' then e->'errors' else '[]'::jsonb end) loop
      v_domain:=item->>'domain';
      -- The evaluator has transcript evidence only: it cannot diagnose pronunciation.
      if coalesce(v_domain,'') not in ('technical','grammar','vocabulary','fluency','register') then continue; end if;
      v_pattern:=left(trim(coalesce(item->>'pattern','')),600);
      v_normalized:=left(trim(regexp_replace(lower(coalesce(nullif(item->>'normalizedPattern',''),v_pattern)),'[^a-z0-9]+',' ','g')),180);
      if v_pattern='' or v_normalized='' then continue; end if;
      v_diagnostic:=coalesce(lh_internal.score_or_null(item->'diagnosticConfidence'),lh_internal.score_or_null(item->'confidence'));
      -- Low-confidence / noisy diagnoses remain in the session, not in durable learning state.
      if v_diagnostic is null or v_diagnostic<60 then continue; end if;
      v_example:=jsonb_build_object('example',left(coalesce(item->>'example',''),900),'correction',left(coalesce(item->>'correction',''),900),'sessionId',p_session_id,'capturedAt',now());
      insert into public.user_error_bank(user_id,domain,pattern,normalized_pattern,frequency,confidence,diagnostic_confidence,mastery_confidence,confidence_semantics,last_seen_at,next_review_at,last_source_type,last_source_id,examples,status)
      values(s.user_id,v_domain,v_pattern,v_normalized,1,v_diagnostic,v_diagnostic,null,'diagnostic_v1',now(),now()+interval '1 day','professor_session',p_session_id,jsonb_build_array(v_example),'active')
      on conflict(user_id,domain,normalized_pattern) do update set
        pattern=excluded.pattern,frequency=user_error_bank.frequency+1,
        confidence=greatest(user_error_bank.confidence,excluded.confidence),
        diagnostic_confidence=greatest(user_error_bank.diagnostic_confidence,excluded.diagnostic_confidence),
        mastery_confidence=null,confidence_semantics='diagnostic_v1',
        last_seen_at=now(),next_review_at=now()+interval '1 day',last_source_type='professor_session',last_source_id=p_session_id,
        examples=(select coalesce(jsonb_agg(x.value order by x.n),'[]'::jsonb) from jsonb_array_elements(user_error_bank.examples||excluded.examples) with ordinality x(value,n) where x.n>greatest(0,jsonb_array_length(user_error_bank.examples||excluded.examples)-6)),
        status='active',updated_at=now();
      v_error_count:=v_error_count+1;
    end loop;
    if coalesce((e->>'needsSpacedReview')::boolean,false) or v_error_count>0 then
      foreach v_days in array array[1,7,30,90] loop
        v_stage:='D+'||v_days;
        if not exists(select 1 from public.spaced_reviews where user_id=s.user_id and lesson_id=s.lesson_id and review_stage=v_stage and status in ('scheduled','due')) then
          insert into public.spaced_reviews(user_id,lesson_id,review_stage,due_date,status)
          values(s.user_id,s.lesson_id,v_stage,(now() at time zone 'UTC')::date+v_days,'scheduled');
        end if;
      end loop;
    end if;
    -- Preserve category-based scoring, but do not increase certainty from weak assessments.
    select learner_track into v_track from public.profiles where id=s.user_id;
    if v_assessment>=60 then
      for c in select co.id,co.category from public.lesson_competencies lc join public.competencies co on co.id=lc.competency_id where lc.lesson_id=s.lesson_id and co.learner_track=v_track loop
        v_score:=lh_internal.score_or_null(e->(case c.category when 'technical' then 'technicalScore' when 'grammar' then 'grammarScore' when 'vocabulary' then 'vocabularyScore' when 'fluency' then 'fluencyScore' when 'register' then 'professionalCommunicationScore' else '__unscored__' end));
        if v_score is null then continue; end if;
        insert into public.user_competency_scores(user_id,competency_id,score,confidence,evidence_count,last_assessed_at,updated_at)
        values(s.user_id,c.id,v_score,least(35,v_assessment),1,now(),now())
        on conflict(user_id,competency_id) do update set
          score=round((user_competency_scores.score*least(user_competency_scores.evidence_count,4)+excluded.score)/(least(user_competency_scores.evidence_count,4)+1),1),
          confidence=least(95,v_assessment,user_competency_scores.confidence+12),
          evidence_count=user_competency_scores.evidence_count+1,last_assessed_at=now(),updated_at=now();
      end loop;
    end if;
  end if;
  insert into lh_internal.professor_completion_receipts(session_id,payload_hash,validation_mode,evaluated,transcript_turns)
  values(p_session_id,v_hash,v_validation,e is not null,jsonb_array_length(v_transcript)) returning * into r;
  return jsonb_build_object('ok',true,'duplicate',false,'status',v_status,'traceId',r.trace_id,'validationMode',v_validation,'evaluated',e is not null,'transcriptTurns',jsonb_array_length(v_transcript),'errorBankItems',v_error_count);
end $fn$;
revoke all on function public.complete_professor_session_v2(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.complete_professor_session_v2(uuid,text,jsonb) to service_role;