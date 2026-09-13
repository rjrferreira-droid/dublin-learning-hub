-- V2 only. Additive migration; existing charges, reservations and budget limits remain unchanged.
create table if not exists lh_internal.professor_price_cards (
  model text primary key,
  pricing_version text not null,
  input_text numeric not null,
  cached_text numeric not null,
  output_text numeric not null,
  input_audio numeric not null,
  cached_audio numeric not null,
  output_audio numeric not null,
  source_url text not null,
  verified_on date not null
);
alter table lh_internal.professor_price_cards enable row level security;
revoke all on lh_internal.professor_price_cards from public,anon,authenticated;
grant select on lh_internal.professor_price_cards to service_role;
insert into lh_internal.professor_price_cards values
 ('gpt-realtime-2.1','openai-2026-09-13',4,0.4,24,32,0.4,64,'https://developers.openai.com/api/docs/models/gpt-realtime-2.1','2026-09-13'),
 ('gpt-realtime-2.1-mini','openai-2026-09-13',0.60,0.06,2.40,10,0.30,20,'https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini','2026-09-13')
on conflict(model) do nothing;

create table if not exists lh_internal.professor_settlement_receipts (
 session_id uuid primary key references public.ai_tutor_sessions(id),
 payload_hash text not null,
 state text not null check(state in ('pending','settled')),
 reason text,
 realtime_model text,
 pricing_version text,
 realtime_cost_usd numeric,
 evaluation_cost_usd numeric,
 usage_totals jsonb,
 attempts integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table lh_internal.professor_settlement_receipts enable row level security;
revoke all on lh_internal.professor_settlement_receipts from public,anon,authenticated;
grant select,insert,update on lh_internal.professor_settlement_receipts to service_role;

create or replace function lh_internal.validate_professor_usage(p_usage jsonb,p_model text)
returns jsonb language plpgsql immutable security invoker set search_path=pg_catalog as $$
declare row jsonb; k text; n numeric; t jsonb; rows_seen integer:=0;
 keys text[]:=array['inputTokens','inputCachedTokens','outputTokens','inputTextTokens','inputCachedTextTokens','outputTextTokens','inputAudioTokens','inputCachedAudioTokens','outputAudioTokens'];
begin
 t:='{"inputTokens":0,"inputCachedTokens":0,"outputTokens":0,"inputTextTokens":0,"inputCachedTextTokens":0,"outputTextTokens":0,"inputAudioTokens":0,"inputCachedAudioTokens":0,"outputAudioTokens":0}'::jsonb;
 if jsonb_typeof(p_usage) is distinct from 'array' or jsonb_array_length(p_usage)=0 then return jsonb_build_object('valid',false,'reason','missing_usage'); end if;
 if jsonb_array_length(p_usage)>200 then return jsonb_build_object('valid',false,'reason','usage_too_large'); end if;
 for row in select value from jsonb_array_elements(p_usage) loop
  if jsonb_typeof(row) is distinct from 'object' or coalesce(row->>'type','')<>'llm_usage' then return jsonb_build_object('valid',false,'reason','unsupported_usage_type'); end if;
  if nullif(row->>'model','') is not null and row->>'model' is distinct from p_model then return jsonb_build_object('valid',false,'reason','model_mismatch'); end if;
  if exists(select 1 from jsonb_each(row) x where x.key like '%Tokens' and not x.key=any(keys) and x.value<>'0'::jsonb and x.value<>'null'::jsonb) then return jsonb_build_object('valid',false,'reason','unsupported_token_modality'); end if;
  foreach k in array keys loop
   if jsonb_typeof(row->k) is distinct from 'number' then return jsonb_build_object('valid',false,'reason','incomplete_usage'); end if;
   n:=(row->>k)::numeric;
   if n<0 or n<>trunc(n) or n>1000000000 then return jsonb_build_object('valid',false,'reason','invalid_usage_counter'); end if;
   t:=jsonb_set(t,array[k],to_jsonb((t->>k)::numeric+n));
  end loop;
  if (row->>'inputTextTokens')::numeric+(row->>'inputAudioTokens')::numeric<>(row->>'inputTokens')::numeric
    or (row->>'outputTextTokens')::numeric+(row->>'outputAudioTokens')::numeric<>(row->>'outputTokens')::numeric
    or (row->>'inputCachedTextTokens')::numeric+(row->>'inputCachedAudioTokens')::numeric<>(row->>'inputCachedTokens')::numeric
    or (row->>'inputCachedTextTokens')::numeric>(row->>'inputTextTokens')::numeric
    or (row->>'inputCachedAudioTokens')::numeric>(row->>'inputAudioTokens')::numeric then
   return jsonb_build_object('valid',false,'reason','inconsistent_usage');
  end if;
  rows_seen:=rows_seen+1;
 end loop;
 if (t->>'inputTokens')::numeric+(t->>'outputTokens')::numeric=0 then return jsonb_build_object('valid',false,'reason','zero_usage_requires_verification'); end if;
 return jsonb_build_object('valid',true,'totals',t,'rows',rows_seen);
end $$;
revoke all on function lh_internal.validate_professor_usage(jsonb,text) from public,anon,authenticated;
grant execute on function lh_internal.validate_professor_usage(jsonb,text) to service_role;

create or replace function public.settle_professor_usage_v2(p_session_id uuid,p_callback_token text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=public,extensions,pg_temp as $$
declare
 s public.ai_tutor_sessions%rowtype; r public.professor_budget_reservations%rowtype;
 receipt lh_internal.professor_settlement_receipts%rowtype; price lh_internal.professor_price_cards%rowtype;
 usage_check jsonb; t jsonb; e jsonb; h text; m text; reason text;
 rt numeric; ev numeric; ev_model text; has_learner boolean; ev_required boolean;
 rt_key text; ev_key text; existing public.ai_usage_log%rowtype;
begin
 if p_callback_token is null or length(p_callback_token) not between 32 and 256 then raise exception 'invalid_callback_credentials' using errcode='42501'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>200000 then raise exception 'invalid_settlement_payload'; end if;
 perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 if not found then raise exception 'budget_settings_unavailable'; end if;
 select * into s from public.ai_tutor_sessions where id=p_session_id for update;
 if not found or s.callback_token_hash is distinct from encode(extensions.digest(p_callback_token,'sha256'),'hex') then raise exception 'invalid_callback_credentials' using errcode='42501'; end if;
 h:=encode(extensions.digest(p_payload::text,'sha256'),'hex');
 select * into receipt from lh_internal.professor_settlement_receipts where session_id=p_session_id;
 if found and receipt.state='settled' then
  if receipt.payload_hash<>h then raise exception 'settlement_conflict'; end if;
  return jsonb_build_object('ok',true,'duplicate',true,'state','settled','realtimeCostUsd',receipt.realtime_cost_usd,'evaluationCostUsd',receipt.evaluation_cost_usd,'reservationSettled',true);
 end if;
 select * into r from public.professor_budget_reservations where id=s.budget_reservation_id for update;
 if not found or r.user_id<>s.user_id then raise exception 'reservation_not_owned'; end if;
 if r.status='settled' and receipt.session_id is null then return jsonb_build_object('ok',true,'state','legacy_settled_preserved','reservationSettled',true,'repriced',false); end if;
 if s.started_at<now()-interval '24 hours' then raise exception 'callback_expired' using errcode='42501'; end if;
 m:=nullif(trim(p_payload->>'realtimeModel'),'');
 select * into price from lh_internal.professor_price_cards where model=m;
 usage_check:=lh_internal.validate_professor_usage(p_payload->'modelUsage',m);
 if price.model is null then reason:='unknown_realtime_pricing';
 elsif not (usage_check->>'valid')::boolean then reason:=usage_check->>'reason';
 else
  t:=usage_check->'totals';
  rt:=round((((t->>'inputTextTokens')::numeric-(t->>'inputCachedTextTokens')::numeric)*price.input_text
   +(t->>'inputCachedTextTokens')::numeric*price.cached_text
   +(t->>'outputTextTokens')::numeric*price.output_text
   +((t->>'inputAudioTokens')::numeric-(t->>'inputCachedAudioTokens')::numeric)*price.input_audio
   +(t->>'inputCachedAudioTokens')::numeric*price.cached_audio
   +(t->>'outputAudioTokens')::numeric*price.output_audio)/1000000,6);
 end if;
 if not exists(select 1 from lh_internal.professor_completion_receipts where session_id=p_session_id) then reason:=coalesce(reason,'completion_not_verified'); end if;
 select exists(select 1 from jsonb_array_elements(s.transcript) x where x->>'role'='user') into has_learner;
 e:=case when jsonb_typeof(p_payload->'evaluation')='object' then p_payload->'evaluation' else null end;
 ev_required:=has_learner or e is not null;
 if ev_required then
  ev_model:=e->>'model';
  if e is null or ev_model is distinct from 'gpt-5.6-terra' or jsonb_typeof(e->'estimatedCostUsd') is distinct from 'number' then reason:=coalesce(reason,'evaluation_cost_unknown');
  else
   ev:=(e->>'estimatedCostUsd')::numeric;
   if ev<=0 or ev>5 then ev:=null; reason:=coalesce(reason,'evaluation_cost_unknown'); else ev:=round(ev,6); end if;
  end if;
 else ev:=0;
 end if;
 if reason is not null then
  update public.professor_budget_reservations set status='unresolved' where id=r.id and status in ('active','unresolved');
  insert into lh_internal.professor_settlement_receipts(session_id,payload_hash,state,reason,realtime_model,pricing_version,realtime_cost_usd,evaluation_cost_usd,usage_totals)
  values(p_session_id,h,'pending',reason,m,price.pricing_version,rt,ev,t)
  on conflict(session_id) do update set payload_hash=excluded.payload_hash,reason=excluded.reason,realtime_model=excluded.realtime_model,pricing_version=excluded.pricing_version,realtime_cost_usd=excluded.realtime_cost_usd,evaluation_cost_usd=excluded.evaluation_cost_usd,usage_totals=excluded.usage_totals,attempts=professor_settlement_receipts.attempts+1,updated_at=now();
  return jsonb_build_object('ok',true,'state','pending','reason',reason,'reservationSettled',false,'pricingKnown',price.model is not null,'knownRealtimeEstimateUsd',rt,'knownEvaluationEstimateUsd',ev);
 end if;
 rt_key:='professor-realtime:'||p_session_id; ev_key:='professor-eval:'||p_session_id;
 select * into existing from public.ai_usage_log where request_id=rt_key;
 if found and (existing.session_id is distinct from s.id or existing.user_id is distinct from s.user_id or existing.model<>m or existing.estimated_cost_usd<>rt) then raise exception 'usage_record_conflict'; end if;
 insert into public.ai_usage_log(user_id,session_id,feature,model,input_tokens,cached_input_tokens,output_tokens,audio_input_tokens,audio_output_tokens,estimated_cost_usd,request_id)
 values(s.user_id,s.id,'professor_livekit',m,(t->>'inputTokens')::bigint,(t->>'inputCachedTokens')::bigint,(t->>'outputTokens')::bigint,(t->>'inputAudioTokens')::bigint,(t->>'outputAudioTokens')::bigint,rt,rt_key)
 on conflict(request_id) where request_id is not null do nothing;
 if ev_required then
  select * into existing from public.ai_usage_log where request_id=ev_key;
  if found and (existing.session_id is distinct from s.id or existing.user_id is distinct from s.user_id or existing.model<>ev_model or existing.estimated_cost_usd<>ev) then raise exception 'usage_record_conflict'; end if;
  insert into public.ai_usage_log(user_id,session_id,feature,model,estimated_cost_usd,request_id)
  values(s.user_id,s.id,'professor_evaluation',ev_model,ev,ev_key)
  on conflict(request_id) where request_id is not null do nothing;
 end if;
 update public.professor_budget_reservations set status='settled',actual_cost_usd=rt,settled_at=now() where id=r.id;
 insert into lh_internal.professor_settlement_receipts(session_id,payload_hash,state,realtime_model,pricing_version,realtime_cost_usd,evaluation_cost_usd,usage_totals)
 values(s.id,h,'settled',m,price.pricing_version,rt,ev,t)
 on conflict(session_id) do update set payload_hash=excluded.payload_hash,state='settled',reason=null,realtime_model=excluded.realtime_model,pricing_version=excluded.pricing_version,realtime_cost_usd=excluded.realtime_cost_usd,evaluation_cost_usd=excluded.evaluation_cost_usd,usage_totals=excluded.usage_totals,attempts=professor_settlement_receipts.attempts+1,updated_at=now();
 return jsonb_build_object('ok',true,'duplicate',false,'state','settled','realtimeModel',m,'realtimeCostUsd',rt,'evaluationCostUsd',ev,'reservationSettled',true,'pricingKnown',true,'pricingVersion',price.pricing_version,'evaluationCostBasis',case when ev_required then 'worker_reported_estimate' else 'not_requested' end);
end $$;
revoke all on function public.settle_professor_usage_v2(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.settle_professor_usage_v2(uuid,text,jsonb) to service_role;
comment on function public.settle_professor_usage_v2(uuid,text,jsonb) is 'V2 atomic settlement. Missing/invalid usage or unknown pricing retains the reserve. Estimates are not provider invoices.';