"""Run the unchanged v3 baseline proof, then verify exact original-lesson expansion.
Only the disposable fictional CI database is accepted by the baseline runner.
"""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import runpy
import uuid

f=runpy.run_path('quality/tests/premium-audio-source-binding.py')
sql=f['sql']; quoted=f['quoted']; identities=f['identities']; path=f['path']
f['reset']()
# Preserve actual submitted/uncertain P1 obligations across the schema change.
pending=[]
for lesson in [f['p1_lesson'],f['english_lesson']]:
    attempt=str(uuid.uuid4());pending.append(attempt)
    assert json.loads(sql(f['begin_query'](attempt,lesson)))['allowed']
    assert json.loads(sql(f['mark_query'](attempt,lesson)))['allowed']
    assert sql(f['close_query'](attempt,lesson))=='uncertain'
snapshot="select jsonb_build_object('attempts',(select jsonb_agg(to_jsonb(a) order by id) from lh_internal.premium_audio_attempts a),'bindings',(select jsonb_agg(to_jsonb(b) order by attempt_id) from lh_internal.premium_audio_attempt_bindings_v3 b))"
before=sql(snapshot)
sql(Path('quality/candidates/premium-audio-service-access-v3.sql').read_text())
source=Path('quality/candidates/premium-audio-golden-v3.sql').read_text()
assert 'audio_golden_table_drift' in sql(source.replace("set local lock_timeout='5s';",
    "grant select on lh_internal.premium_audio_attempt_bindings_v3 to authenticated;\nset local lock_timeout='5s';",1),fail=True)
assert 'audio_golden_function_drift' in sql(source.replace("set local lock_timeout='5s';",
    "grant execute on function public.observe_premium_audio_cache_v3(uuid,uuid,integer,text,integer,text,jsonb) to authenticated;\nset local lock_timeout='5s';",1),fail=True)
sql(source)
assert sql(snapshot)==before

originals=[('b3639582-3c32-4147-a4b3-84237d11a66e','ifrs-18-group-reporting-irish-statutory',f['p1_lesson']),
           ('f455a740-f50f-4eb7-95a7-9e4129ca4a68','story-past-forms-rhythm-follow-up',f['english_lesson'])]
for lesson,slug,template in originals:
    identity={**identities[template],'lessonId':lesson,'lessonSlug':slug,'sequence':1}
    identities[lesson]=identity
    sql("insert into lessons(id,module_id,is_published,content_version,slug,sequence) values("
        +','.join([quoted(lesson),quoted(identity['moduleId']),'true','1',quoted(slug),'1'])+")")
    assert json.loads(sql('set role service_role;'+f['observe_query'](lesson)))=={'status':'miss'}
    # The exact same protected admission still serializes simultaneous requests.
    with ThreadPoolExecutor(max_workers=6) as pool:
        attempts=list(pool.map(lambda _: (lambda a:(a,json.loads(sql('set role service_role;'+f['begin_query'](a,lesson)))))(str(uuid.uuid4())),range(6)))
    admitted=[a for a,result in attempts if result.get('allowed')]
    assert len(admitted)==1,attempts
    attempt=admitted[0]
    assert all(result.get('allowed') or result.get('reason')=='audio_generation_in_progress' for _,result in attempts)
    assert json.loads(sql('set role service_role;'+f['mark_query'](attempt,lesson)))['allowed']
    f['store_exact'](attempt,lesson)
    assert json.loads(sql('set role service_role;'+f['settle_query'](attempt,lesson)))['settled']
    hit=json.loads(sql('set role service_role;'+f['observe_query'](lesson)))
    assert hit=={'status':'hit','attemptId':attempt,'storagePath':path(lesson)}
    assert sql("select count(*) from ai_usage_log where request_id="+quoted('premium-audio-v3:'+attempt))=='1'
    for field,value in [('lessonSlug','forged'),('sequence',2),('lessonId',str(uuid.uuid4()))]:
        invalid={**identity,field:value}
        assert 'invalid_audio_cache_identity' in sql(f['observe_query'](lesson,identity=invalid),fail=True)
    if identity['requestedTrack']=='rafael_finance':
        assert 'audio_lesson_forbidden' in sql(f['observe_query'](lesson,user=f['payroll']),fail=True)

for lesson in [f['p1_lesson'],f['english_lesson']]:
    assert json.loads(sql(f['begin_query'](str(uuid.uuid4()),lesson)))['reason']=='audio_reconciliation_required'
for attempt in pending:
    assert sql("select state='uncertain' and reserved_usd=0.10 from lh_internal.premium_audio_attempts where id="+quoted(attempt))=='t'
for signature in f['public_signatures']:
    assert sql("select has_function_privilege('service_role',"+quoted(signature)+",'EXECUTE') and not has_function_privilege('anon',"+quoted(signature)+",'EXECUTE') and not has_function_privilege('authenticated',"+quoted(signature)+",'EXECUTE')")=='t'
assert 'audio_golden_already_installed' in sql(source,fail=True)
print('PASS: exact Finance/English originals, concurrent single admission, immutable cache and receipt, role isolation, preserved P1 obligations; no live provider')
