"""Disposable loopback acceptance for professor-validation-abandon.sql.

Run only after the authored Preview foundation, closed admission package,
recovery package, this candidate, the disposable authenticated-start grant and
the dispatch-fence candidate are installed. No provider submission is present.
"""
import json, os, queue, subprocess, sys, threading, time, uuid
from pathlib import Path
from urllib.parse import unquote, urlparse

status=json.loads(Path(sys.argv[1]).read_text())
db,url=urlparse(status['DB_URL']),urlparse(status['API_URL'])
assert db.scheme in ('postgres','postgresql') and db.hostname in ('127.0.0.1','localhost') and db.port==54322 and db.path=='/postgres'
assert url.scheme=='http' and url.hostname in ('127.0.0.1','localhost') and url.port==54321
assert not os.environ.get('SUPABASE_ACCESS_TOKEN')
env={**os.environ,'PGPASSWORD':unquote(db.password or '')}
args=['psql','-XAtq','-h',db.hostname,'-p',str(db.port),'-U',unquote(db.username or ''),'-d','postgres','-v','ON_ERROR_STOP=1']

def sql(query,error=None):
 result=subprocess.run([*args,'-c',query],env=env,capture_output=True,text=True,timeout=25)
 if error:
  assert result.returncode!=0 and error in result.stderr,result.stderr
  return result.stderr
 assert result.returncode==0,result.stderr
 return result.stdout.strip()

def last_json(output):
 return json.loads([line for line in output.splitlines() if line.startswith('{')][-1])

finance=sql("select id from profiles where display_name='Fictional Finance' and learner_track='rafael_finance'")
payroll=sql("select id from profiles where display_name='Fictional Payroll' and learner_track='viviane_payroll'")
uuid.UUID(finance);uuid.UUID(payroll)
template=sql(f"select id from lh_internal.written_professor_references where user_id='{finance}' and identity->>'sequence'='3' and identity->>'studyTrack'='finance' limit 1")
uuid.UUID(template)
identity=json.loads(sql(f"select identity from lh_internal.written_professor_references where id='{template}'"))
original_budget=sql("select md5((select to_jsonb(x)::text from professor_budget_settings x where feature='professor_livekit')||(select to_jsonb(x)::text from learning_hub_budget_settings x where id=1))")
created=[]

def auth(uid,query):
 return f"select set_config('request.jwt.claim.sub','{uid}',true);set local role authenticated;{query}"

def mint():
 ticket=last_json(sql(f"set role service_role;select create_written_professor_reference_v1('{finance}',(select identity from lh_internal.written_professor_references where id='{template}'),(select source_sha256 from lh_internal.written_professor_references where id='{template}'),'written-reference-candidate-v3')"))['reference_id']
 created.append(ticket);return ticket

def start(ticket,request):
 query=f"select start_written_professor_session_v1('{ticket}','{request}','chapter_conversation','validation:lh-{request}',repeat('a',64),true)"
 result=last_json(sql('begin;'+auth(finance,query)+';commit'))
 assert result['allowed'] is True
 return result

def acknowledge(ticket,request,result):
 return {'requestId':request,'userId':finance,'mode':'chapter_conversation',
  'reference':{'id':ticket,'sha256':result['written_reference']['source_sha256'],'version':result['written_reference']['descriptor_version'],'identity':identity},
  'sessionId':result['session_id'],'reservationId':result['reservation_id'],'roomName':result['room_name'],
  'validationMode':True,'qualityTier':'premium','maxSessionSeconds':result['max_session_seconds'],'providerAdmission':False}

def abandon(ticket,request,uid=finance):
 return f"select abandon_professor_validation_v1('{ticket}','{request}')"

def claim(ack,claim_id=None):
 encoded=json.dumps(ack,separators=(',',':')).replace("'","''")
 return f"select claim_professor_dispatch_v1('{encoded}'::jsonb,repeat('a',64),repeat('b',64),'{claim_id or uuid.uuid4()}')"

def clean(ticket):
 row=sql(f"select coalesce(bound_session_id::text,'') from lh_internal.written_professor_references where id='{ticket}'")
 if row:
  rid=sql(f"select coalesce(budget_reservation_id::text,'') from ai_tutor_sessions where id='{row}'")
  sql(f"delete from ai_tutor_turns where session_id='{row}';delete from ai_usage_log where session_id='{row}';delete from lh_internal.professor_completion_receipts where session_id='{row}';delete from lh_internal.professor_settlement_receipts where session_id='{row}';delete from lh_internal.professor_preflights where reference_id='{ticket}';delete from lh_internal.written_professor_references where id='{ticket}';delete from ai_tutor_sessions where id='{row}';delete from professor_budget_reservations where id='{rid}'")
 else: sql(f"delete from lh_internal.professor_preflights where reference_id='{ticket}';delete from lh_internal.written_professor_references where id='{ticket}'")

class Connection:
 def __init__(self,name):
  self.name=name;self.lines=[];self.events=queue.Queue()
  self.p=subprocess.Popen(args,env={**env,'PGAPPNAME':name},stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)
  def pump():
   for line in self.p.stdout:self.events.put(line.strip())
   self.events.put(None)
  threading.Thread(target=pump,daemon=True).start()
  self.send("set statement_timeout='15s';set lock_timeout='12s';begin")
 def send(self,query):self.p.stdin.write(query+';\n');self.p.stdin.flush()
 def until(self,marker):
  deadline=time.monotonic()+18
  while time.monotonic()<deadline:
   line=self.events.get(timeout=max(.1,deadline-time.monotonic()))
   assert line is not None,'\n'.join(self.lines);self.lines.append(line)
   if marker in line:return
  raise AssertionError('missing marker '+marker)
 def close(self):
  if self.p.poll() is None:self.p.stdin.close();self.p.wait(timeout=18)
 def __enter__(self):return self
 def __exit__(self,*exc):
  if self.p.poll() is None and exc[0]:self.p.kill()
  self.close()

def waiting(connection):
 deadline=time.monotonic()+8
 while time.monotonic()<deadline:
  if sql(f"select count(*) from pg_stat_activity where application_name='{connection.name}' and wait_event_type='Lock'")=='1':return
  assert connection.p.poll() is None
  time.sleep(.05)
 raise AssertionError('expected PostgreSQL lock wait')

sentinel=None
try:
 sql("update professor_budget_settings set monthly_budget_usd=100;update learning_hub_budget_settings set ai_hard_cap_usd=100,professor_cap_usd=100")
 sentinel=sql(f"insert into professor_budget_reservations(user_id,reserved_usd,max_session_seconds,status,month_start,created_at) values('{finance}',0.25,60,'unresolved',(now()-interval '1 month')::date,now()-interval '40 days') returning id")
 sentinel_hash=sql(f"select md5(to_jsonb(x)::text) from professor_budget_reservations x where id='{sentinel}'")
 exposure=last_json(sql('select lh_internal.professor_reservation_exposure(now())'))

 # Exact success, private preflight deletion, terminal observation and replay.
 ticket,request=mint(),str(uuid.uuid4())
 sql(f"set role service_role;select put_professor_preflight_v1('{ticket}','{finance}','{request}','fictional-sealed-preflight')")
 admitted=start(ticket,request);sid,rid=admitted['session_id'],admitted['reservation_id']
 result=last_json(sql('begin;'+auth(finance,abandon(ticket,request))+';commit'))
 assert result=={'state':'validation_abandoned','referenceId':ticket,'requestId':request,'sessionId':sid,'reservationId':rid,'providerAdmission':False,'learningEvidenceRecorded':False,'reservationReleased':True,'duplicate':False}
 assert sql(f"select status||':'||(completed_at is not null)::text||':'||close_reason||':'||(callback_token_hash is null)::text from ai_tutor_sessions where id='{sid}'")=='abandoned:true:validation_admission_never_dispatched:true'
 assert sql(f"select status||':'||actual_cost_usd||':'||(settled_at is null)::text from professor_budget_reservations where id='{rid}'")=='abandoned:0:true'
 assert sql(f"select (select count(*) from ai_tutor_turns where session_id='{sid}')+(select count(*) from ai_usage_log where session_id='{sid}')+(select count(*) from lh_internal.professor_completion_receipts where session_id='{sid}')+(select count(*) from lh_internal.professor_settlement_receipts where session_id='{sid}')")=='0'
 assert sql(f"select count(*) from lh_internal.professor_preflights where reference_id='{ticket}'")=='0'
 duplicate=last_json(sql('begin;'+auth(finance,abandon(ticket,request))+';commit'));assert duplicate['duplicate'] is True
 observed=last_json(sql('begin;'+auth(finance,f"select observe_professor_dispatch_v1('{ticket}','{request}')")+';rollback'))
 assert observed=={'state':'validation_abandoned','sessionId':sid,'providerAdmission':False,'retryAllowed':False}
 assert last_json(sql('select lh_internal.professor_reservation_exposure(now())'))==exposure
 assert sql(f"select md5(to_jsonb(x)::text) from professor_budget_reservations x where id='{sentinel}'")==sentinel_hash
 sql('begin;'+auth(payroll,abandon(ticket,request))+';rollback',error='validation_abandon_forbidden')

 # Any evidence blocks release until the fictional evidence is removed.
 evidence_ticket,evidence_request=mint(),str(uuid.uuid4());evidence=start(evidence_ticket,evidence_request)
 sql(f"insert into ai_tutor_turns(session_id,turn_number,speaker,transcript) values('{evidence['session_id']}',1,'learner','fictional')")
 sql('begin;'+auth(finance,abandon(evidence_ticket,evidence_request))+';rollback',error='validation_abandon_unavailable')
 assert sql(f"select status from professor_budget_reservations where id='{evidence['reservation_id']}'")=='active'
 sql(f"delete from ai_tutor_turns where session_id='{evidence['session_id']}'")
 last_json(sql('begin;'+auth(finance,abandon(evidence_ticket,evidence_request))+';commit'))

 # Abandon wins: the waiting claim cannot authorize a provider submission.
 win_ticket,win_request=mint(),str(uuid.uuid4());win=start(win_ticket,win_request);win_ack=acknowledge(win_ticket,win_request,win)
 with Connection('validation_abandon_first') as first,Connection('validation_claim_second') as second:
  first.send(auth(finance,abandon(win_ticket,win_request))+";select 'abandon_ready'");first.until('abandon_ready')
  second.send('set local role service_role;'+claim(win_ack));waiting(second)
  first.send('commit');first.close();second.until('dispatch_session_unavailable');second.close()
 assert sql(f"select status from professor_budget_reservations where id='{win['reservation_id']}'")=='abandoned'

 # Claim wins: the hold becomes unresolved and abandon cannot release it.
 lose_ticket,lose_request=mint(),str(uuid.uuid4());lose=start(lose_ticket,lose_request);lose_ack=acknowledge(lose_ticket,lose_request,lose)
 with Connection('validation_claim_first') as first,Connection('validation_abandon_second') as second:
  first.send('set local role service_role;'+claim(lose_ack)+";select 'claim_ready'");first.until('claim_ready')
  second.send(auth(finance,abandon(lose_ticket,lose_request)));waiting(second)
  first.send('commit');first.close();second.until('validation_abandon_unavailable');second.close()
 assert sql(f"select status from professor_budget_reservations where id='{lose['reservation_id']}'")=='unresolved'
 assert sql(f"select dispatch_claim_id is not null from lh_internal.written_professor_references where id='{lose_ticket}'")=='t'

 for role in ('anon','service_role'):
  assert sql(f"select has_function_privilege('{role}','public.abandon_professor_validation_v1(uuid,uuid)','execute')")=='f'
 assert sql("select has_function_privilege('authenticated','public.abandon_professor_validation_v1(uuid,uuid)','execute')")=='t'
 print(json.dumps({'status':'passed','idempotentTerminal':True,'evidenceBlocked':True,'dispatchRaceOrders':2,'existingHoldPreserved':True,'providerCalls':0,'connectedWrites':0}))
finally:
 for ticket in reversed(created):
  try:clean(ticket)
  except Exception:pass
 if sentinel:
  sql(f"delete from professor_budget_reservations where id='{sentinel}'")
 # Restore the disposable zero-budget defaults used by the local package.
 sql("update professor_budget_settings set monthly_budget_usd=0;update learning_hub_budget_settings set ai_hard_cap_usd=0,professor_cap_usd=0")
 assert sql("select md5((select to_jsonb(x)::text from professor_budget_settings x where feature='professor_livekit')||(select to_jsonb(x)::text from learning_hub_budget_settings x where id=1))")==original_budget
