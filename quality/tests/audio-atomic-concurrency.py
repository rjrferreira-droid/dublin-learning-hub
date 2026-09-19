"""Real multi-connection PostgreSQL tests; only the disposable CI database is permitted."""
import concurrent.futures as futures
import json
import os
import subprocess
import uuid

assert os.environ.get('PGHOST') == '127.0.0.1'
assert os.environ.get('PGDATABASE') == 'learning_hub_test'
assert os.environ.get('PGUSER') == 'postgres'

def sql(text, fail=False):
    run = subprocess.run(['psql', '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', text], capture_output=True, text=True)
    if fail:
        assert run.returncode != 0, 'Expected SQL rejection: ' + text
        return run.stderr
    assert run.returncode == 0, run.stderr
    return run.stdout.strip().splitlines()[-1] if run.stdout.strip() else ''

assert sql("select label from lh_internal.audio_fixture_guard") == 'fictional-audio-concurrency'
finance = sql("select id from profiles where learner_track='rafael_finance'")
payroll = sql("select id from profiles where learner_track='viviane_payroll'")
lessons = json.loads(sql("select json_agg(l.id order by l.id) from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='rafael_finance'"))
payroll_lesson = sql("select l.id from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='viviane_payroll'")
passed = 0

def reset(cap=10, premium=10):
    sql(f"""truncate lh_internal.premium_audio_attempts,public.ai_usage_log,public.ai_tutor_sessions,public.professor_budget_reservations cascade;
    update learning_hub_budget_settings set ai_hard_cap_usd={cap},premium_audio_cap_usd={premium};
    update lessons set content_version=1,is_published=true;
    update modules set is_published=true;update courses set is_active=true;""")

def begin(lesson, attempt=None, user=None):
    attempt = attempt or str(uuid.uuid4())
    query = f"select public.begin_premium_audio_attempt_v2('{attempt}','{user or finance}','{lesson}',1,0.10)"
    return attempt, query

def execute_begin(lesson, attempt=None):
    attempt, query = begin(lesson, attempt)
    return attempt, json.loads(sql('set role service_role;' + query))

def concurrent(queries):
    with futures.ThreadPoolExecutor(max_workers=len(queries)) as pool:
        jobs = [pool.submit(sql, 'begin;' + q + ';select pg_sleep(0.3);commit;') for q in queries]
        for job in jobs:
            job.result(timeout=20)

def check(name):
    global passed
    passed += 1
    print('PASS:', name, flush=True)

for cap, premium, reason in [(0.15,10,'global'),(10,0.15,'premium')]:
    reset(cap,premium)
    concurrent(['set local role service_role;'+begin(lesson)[1] for lesson in lessons])
    assert sql("select count(*) from lh_internal.premium_audio_attempts where state='reserved'") == '1'
    assert sql('select lh_internal.premium_audio_pending_usd()') == '0.10'
    check(reason + ' cap admits only one of two overlapping different-lesson requests')

reset()
concurrent(['set local role service_role;'+begin(lessons[0])[1] for _ in range(4)])
assert sql('select count(*) from lh_internal.premium_audio_attempts') == '1'
check('same-lesson dedup holds under four overlapping connections')

for iteration in range(4):
    reset(4.05,10)
    professor=f"""select set_config('request.jwt.claim.sub','{finance}',true);set local role authenticated;
    select public.start_professor_session_atomic(gen_random_uuid(),'{lessons[1]}','chapter_conversation','lh-'||gen_random_uuid(),repeat('a',64),true)"""
    audio='set local role service_role;'+begin(lessons[0])[1]
    concurrent([professor,audio] if iteration%2 else [audio,professor])
    count=sql("select (select count(*) from professor_budget_reservations)+(select count(*) from lh_internal.premium_audio_attempts)")
    assert count == '1', 'Professor and Audio exceeded the shared cap'
check('Professor/Audio overlap shares one lock and global cap in both launch orders')

reset(0.15,10)
a,r=execute_begin(lessons[0]);assert r['allowed']
assert sql(f"set role service_role;select mark_premium_audio_submitted_v2('{a}')") == 't'
assert sql(f"set role service_role;select mark_premium_audio_submitted_v2('{a}')") == 'f'
assert sql(f"set role service_role;select close_premium_audio_attempt_v2('{a}')") == 'uncertain'
sql("update lh_internal.premium_audio_attempts set created_at=now()-interval '40 days',lease_until=now()-interval '39 days'")
assert not execute_begin(lessons[0])[1]['allowed']
assert execute_begin(lessons[1])[1]['reason'] == 'global_ai_budget_reached'
check('one-time submission fence; expired uncertain attempts protect both identity and next-month budget')

reset()
old,r=execute_begin(lessons[0]);assert r['allowed']
sql("update lh_internal.premium_audio_attempts set lease_until=now()-interval '1 second'")
new,r=execute_begin(lessons[0]);assert r['allowed']
assert sql(f"set role service_role;select mark_premium_audio_submitted_v2('{old}')") == 'f'
assert sql(f"set role service_role;select close_premium_audio_attempt_v2('{old}')") == 'cancelled'
assert sql(f"select state from lh_internal.premium_audio_attempts where id='{new}'") == 'reserved'
check('only never-submitted expiration is reclaimable; late former owner cannot start or release replacement')

reset()
a,r=execute_begin(lessons[0]);assert r['allowed']
assert execute_begin(lessons[0],a)[1]['reason']=='audio_attempt_replayed'
assert 'audio_attempt_conflict' in sql('set role service_role;'+begin(lessons[1],a)[1],fail=True)
sql(f"set role service_role;select mark_premium_audio_submitted_v2('{a}')")
concurrent([f"set local role service_role;select settle_premium_audio_attempt_v2('{a}',0.04,100)" for _ in range(3)])
assert sql("select count(*) from ai_usage_log where feature='lesson_audio'")=='1'
assert sql('select lh_internal.premium_audio_pending_usd()')=='0'
assert sql('select sum(estimated_cost_usd) from ai_usage_log')=='0.04'
assert 'audio_receipt_conflict' in sql(f"set role service_role;select settle_premium_audio_attempt_v2('{a}',0.05,100)",fail=True)
check('idempotent admission and three concurrent settlements produce exactly one real estimated receipt')

reset()
a,r=execute_begin(lessons[0]);assert r['allowed']
sql(f"set role service_role;select mark_premium_audio_submitted_v2('{a}')")
sql("alter table ai_usage_log add constraint fictional_receipt_failure check(feature<>'lesson_audio')")
try:
    sql(f"set role service_role;select settle_premium_audio_attempt_v2('{a}',0.04,100)",fail=True)
    assert sql('select lh_internal.premium_audio_pending_usd()')=='0.10'
    assert sql(f"select state from lh_internal.premium_audio_attempts where id='{a}'")=='submitted'
finally:
    sql('alter table ai_usage_log drop constraint fictional_receipt_failure')
sql(f"set role service_role;select settle_premium_audio_attempt_v2('{a}',0.04,100)")
assert sql('select count(*) from ai_usage_log')=='1'
check('receipt failure rolls back settlement and preserves reserve; later retry records once')

reset()
a,r=execute_begin(lessons[0]);assert r['allowed']
sql(f"update lessons set content_version=2 where id='{lessons[0]}'")
assert sql(f"set role service_role;select mark_premium_audio_submitted_v2('{a}')")=='f'
assert sql(f"set role service_role;select close_premium_audio_attempt_v2('{a}')")=='cancelled'
check('source version change after reservation cannot cross provider submission fence')

for role in ['anon','authenticated']:
    assert 'permission denied' in sql('set role '+role+';'+begin(lessons[0])[1],fail=True)
    assert 'permission denied' in sql(f"set role {role};select * from lh_internal.premium_audio_attempts",fail=True)
check('anonymous and learner roles cannot invoke service admission or inspect attempts')

reset()
assert 'audio_lesson_forbidden' in sql('set role service_role;'+begin(payroll_lesson,user=finance)[1],fail=True)
sql(f"update lessons set is_published=false where id='{lessons[0]}'")
assert 'audio_lesson_forbidden' in sql('set role service_role;'+begin(lessons[0])[1],fail=True)
assert sql('select count(*) from lh_internal.premium_audio_attempts')=='0'
check('cross-track and unpublished lesson rejected without reserving')

reset()
sql("insert into ai_usage_log(feature,estimated_cost_usd) values('other_ai',NULL)")
assert 'invalid_usage_cost' in sql('set role service_role;'+begin(lessons[0])[1],fail=True)
check('unknown usage cost fails closed')
print(json.dumps({'passed':passed,'realProviders':0,'connectedSupabaseWrites':0}))
