"""New baseline acceptance under real PostgreSQL RLS, with fictional platform identities."""
import json,os,subprocess,uuid
assert os.environ.get('PGHOST')=='127.0.0.1'
assert os.environ.get('PGDATABASE')=='learning_hub_preview_test'
assert os.environ.get('PGUSER')=='postgres'
def sql(query,deny=False):
 r=subprocess.run(['psql','-XAtq','-v','ON_ERROR_STOP=1','-c',query],capture_output=True,text=True)
 if deny:
  assert r.returncode!=0,'Expected permission denial';return r.stderr
 assert r.returncode==0,r.stderr
 return r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ''
def as_user(uid,query,deny=False):
 return sql(f"set role authenticated;set request.jwt.claim.sub='{uid}';"+query,deny)
assert sql("select public from storage.buckets where id='lesson-audio'")=='f'
assert sql('select count(*) from public.profiles')=='0'
assert sql('select count(*) from public.lessons')=='0'
assert sql('select ai_hard_cap_usd from learning_hub_budget_settings')=='0'
assert sql("select to_regprocedure('public.reserve_professor_budget(text)') is null")=='t'
ids=[str(uuid.uuid4()) for _ in range(3)]
for uid in ids:sql(f"insert into auth.users values('{uid}')")
for uid,track in zip(ids,['rafael_finance','viviane_payroll']):
 sql(f"insert into profiles(id,display_name,learner_track) values('{uid}','Fictional','{track}')")
lessons={}
for i,track in enumerate(['rafael_finance','viviane_payroll','english_academy']):
 c=sql(f"insert into courses(slug,title,learner_track) values('course-{i}','Fictional','{track}') returning id")
 m=sql(f"insert into modules(course_id,slug,title,sequence) values('{c}','module','Fictional',1) returning id")
 l=sql(f"insert into lessons(module_id,slug,title,sequence) values('{m}','lesson','Fictional',1) returning id")
 assert as_user(ids[0],f"select count(*) from lessons where id='{l}'")=='0'
 sql(f"update courses set is_active=true where id='{c}';update modules set is_published=true where id='{m}';update lessons set is_published=true where id='{l}'")
 lessons[track]=l
for uid in ids[:2]:
 assert as_user(uid,'select count(*) from profiles')=='1'
 assert as_user(uid,'select count(*) from courses')=='2'
 assert as_user(uid,'select count(*) from lessons')=='2'
 assert as_user(uid,'select count(*) from user_competency_scores')=='0'
 assert as_user(uid,'select count(*) from user_error_bank')=='0'
as_user(ids[2],f"insert into profiles(id,display_name,learner_track) values('{ids[2]}','Self','rafael_finance')",True)
as_user(ids[0],"update profiles set learner_track='viviane_payroll'",True)
as_user(ids[0],"update lessons set is_published=true",True)
as_user(ids[0],f"insert into ai_tutor_sessions(user_id) values('{ids[0]}')",True)
as_user(ids[0],'select * from ai_usage_log',True)
as_user(ids[0],'select callback_token_hash from ai_tutor_sessions',True)
assert as_user(ids[2],'select count(*) from courses')=='0'
sql('set role anon;select * from profiles',True)
sid=sql(f"insert into ai_tutor_sessions(user_id,lesson_id,room_name,callback_token_hash) values('{ids[0]}','{lessons['rafael_finance']}','fictional','secret-not-for-client') returning id")
assert as_user(ids[0],f"select id from ai_tutor_sessions where id='{sid}'")==sid
assert as_user(ids[1],f"select count(*) from ai_tutor_sessions where id='{sid}'")=='0'
# Zero budget rejects a provider-free exact startup; no budget/session side effect.
sql(f"update ai_tutor_sessions set status='completed' where id='{sid}'")
request=str(uuid.uuid4())
d=json.loads(as_user(ids[0],f"select start_professor_session_atomic('{request}','{lessons['rafael_finance']}','chapter_conversation','lh-{request}','{'a'*64}',false)"))
assert d['allowed'] is False
assert sql('select count(*) from professor_budget_reservations')=='0'
# Check published ancestor fences, even when child itself remains published.
sql("update courses set is_active=false where learner_track='english_academy'")
assert as_user(ids[0],'select count(*) from lessons')=='1'
assert sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity")=='0'
print('PASS: fresh baseline, zero budgets, publication chain, profile/course isolation, no client evidence/write/secret access, unknown-user and anonymous denial')

assert as_user(ids[0],'select count(*) from storage.objects')=='0'
as_user(ids[0],f"insert into storage.objects(id,bucket_id,name) values('{uuid.uuid4()}','lesson-audio','forbidden.mp3')",True)
print('PASS: private bucket and no direct learner storage writes')
