"""Multi-connection SQL checks on the real disposable Supabase DB, no provider.
HTTP authentication is tested separately. SQL sessions below use fictional claims.
"""
import json, os, queue, subprocess, sys, threading, time, uuid
from pathlib import Path
from urllib.parse import urlparse, unquote

status = json.loads(Path(sys.argv[1]).read_text())
u, api = urlparse(status['DB_URL']), urlparse(status['API_URL'])
assert u.scheme in ('postgres', 'postgresql') and u.hostname in ('127.0.0.1', 'localhost') and u.port == 54322 and u.path == '/postgres'
assert api.scheme == 'http' and api.hostname in ('127.0.0.1', 'localhost') and api.port == 54321
assert not os.environ.get('SUPABASE_ACCESS_TOKEN')
env = {**os.environ, 'PGPASSWORD': unquote(u.password or '')}
args = ['psql', '-XAtq', '-h', u.hostname, '-p', str(u.port), '-U', unquote(u.username or ''), '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']

def sql(query, error=None):
    r = subprocess.run([*args, '-c', query], env=env, capture_output=True, text=True, timeout=20)
    if error:
        assert r.returncode != 0 and error in r.stderr, r.stderr
        return r.stderr
    assert r.returncode == 0, r.stderr
    return r.stdout.strip()

def last_json(output):
    return json.loads([line for line in output.splitlines() if line.startswith('{')][-1])

finance = sql("select id from profiles where display_name='Fictional Finance' and learner_track='rafael_finance'")
uuid.UUID(finance)
assert sql('select count(*) from ai_tutor_sessions') == '0'
assert sql('select count(*) from professor_budget_reservations') == '0'
assert sql('select ai_hard_cap_usd from learning_hub_budget_settings where id=1') == '0'
template = sql(f"select id from lh_internal.written_professor_references where user_id='{finance}' and identity->>'sequence'='3' and identity->>'studyTrack'='finance' limit 1")
uuid.UUID(template)
identity = json.loads(sql(f"select identity from lh_internal.written_professor_references where id='{template}'"))
lesson, module, course = identity['lessonId'], identity['moduleId'], identity['courseId']
for value in (lesson, module, course): uuid.UUID(value)
version = int(identity['contentVersion'])
passed = 0

def check(label):
    global passed
    passed += 1
    print('PASS: ' + label, flush=True)

def mint():
    # Source attestation fixture comes from the actual server adapter's HTTP test.
    return last_json(sql(f"set role service_role;select create_written_professor_reference_v1('{finance}',(select identity from lh_internal.written_professor_references where id='{template}'),(select source_sha256 from lh_internal.written_professor_references where id='{template}'),'written-reference-candidate-v3')"))['reference_id']

def start(ticket, request=None, callback='a'):
    request = request or str(uuid.uuid4())
    return f"select start_written_professor_session_v1('{ticket}','{request}','chapter_conversation','lh-{request}',repeat('{callback}',64),true)"

def auth(query):
    return f"select set_config('request.jwt.claim.sub','{finance}',true);set local role authenticated;{query}"

def cleanup():
    # Only fictional validation rows: never submitted or explicitly fake fixture IDs.
    rows = json.loads(sql("select coalesce(json_agg(json_build_object('id',s.id,'rid',s.budget_reservation_id)),'[]') from ai_tutor_sessions s join lh_internal.written_professor_references r on r.bound_session_id=s.id join profiles p on p.id=s.user_id where p.display_name in ('Fictional Finance','Fictional Payroll') and s.room_name like 'validation:%' and (s.dispatch_id is null or left(s.dispatch_id,8)='fixture_')"))
    for row in rows:
        sid, rid = str(uuid.UUID(row['id'])), str(uuid.UUID(row['rid']))
        sql(f"begin;delete from lh_internal.written_professor_references where bound_session_id='{sid}';delete from ai_tutor_sessions where id='{sid}';delete from professor_budget_reservations where id='{rid}';commit")

class Connection:
    def __init__(self, name):
        self.name, self.lines, self.events = name, [], queue.Queue()
        self.p = subprocess.Popen(args, env={**env, 'PGAPPNAME': name}, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        def pump():
            for line in self.p.stdout: self.events.put(line.strip())
            self.events.put(None)
        threading.Thread(target=pump, daemon=True).start()
        self.send("set statement_timeout='15s';set lock_timeout='12s';begin")
    def send(self, query):
        self.p.stdin.write(query + ';\n'); self.p.stdin.flush()
    def until(self, marker):
        deadline = time.monotonic() + 18
        while time.monotonic() < deadline:
            line = self.events.get(timeout=max(0.1, deadline-time.monotonic()))
            assert line is not None, '\n'.join(self.lines)
            self.lines.append(line)
            if marker in line: return
        raise AssertionError('Missing SQL barrier ' + marker)
    def close(self):
        if self.p.poll() is None:
            self.p.stdin.close(); self.p.wait(timeout=18)
    def __enter__(self): return self
    def __exit__(self, *exc):
        if self.p.poll() is None and exc[0]: self.p.kill()
        self.close()

def waiting(connection):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if sql(f"select count(*) from pg_stat_activity where application_name='{connection.name}' and wait_event_type='Lock'") == '1': return
        assert connection.p.poll() is None, 'Connection ended before contention'
        time.sleep(0.05)
    raise AssertionError('Expected a real PostgreSQL lock wait')

sql('update professor_budget_settings set monthly_budget_usd=10;update learning_hub_budget_settings set ai_hard_cap_usd=10,professor_cap_usd=10,premium_audio_cap_usd=10')
try:
    p1 = sql(f"select id from lh_internal.written_professor_references where user_id='{finance}' and identity->>'sequence'='2' and identity->>'studyTrack'='finance' limit 1")
    uuid.UUID(p1)
    result = last_json(sql('begin;' + auth(start(p1)) + ';rollback'))
    assert result['allowed'] is True and result['written_reference']['identity']['sequence'] == 2
    assert result['written_reference']['descriptor_version'] == 'p1-reference-candidate-v1'
    sql(f"set role service_role;select create_written_professor_reference_v1('{finance}',(select identity from lh_internal.written_professor_references where id='{p1}'),repeat('a',64),'written-reference-candidate-v3')", error='written_reference_descriptor_mismatch')
    check('P1 exact authored descriptor binds through the same atomic path; descriptor family mismatch is rejected')

    ticket, request = mint(), str(uuid.uuid4())
    output = sql('begin;' + auth(start(ticket, request) + ';' + start(ticket, request)) + ';rollback')
    results = [json.loads(line) for line in output.splitlines() if line.startswith('{')]
    assert results[0]['allowed'] is True and results[0]['written_reference']['identity'] == identity
    assert results[1]['allowed'] is False and results[1]['reason'] == 'request_already_started'
    assert sql('select count(*) from professor_budget_reservations') == '0'
    check('atomic reference/session/reservation binding and replay denial, transaction rollback leaves no hold')

    for changed in [start(ticket, str(uuid.uuid4())), start(ticket, request, 'b')]:
        sql('begin;' + auth(start(ticket, request) + ';' + changed) + ';rollback', error='written_request_conflict')
    fresh = mint()
    sql('begin;' + auth(start(ticket, request) + ';' + start(fresh, request)) + ';rollback', error='written_request_conflict')
    check('different request, callback and replacement ticket cannot reuse a started request')

    for role in ('anon', 'authenticated', 'service_role'):
        sql(f"begin;set local role {role};update lh_internal.written_professor_references set source_sha256=repeat('b',64) where id='{ticket}';rollback", error='permission denied')
    sql(f"update lh_internal.written_professor_references set expires_at=clock_timestamp()-interval '1 second' where id='{ticket}'")
    sql('begin;' + auth(start(ticket)) + ';rollback', error='written_reference_expired')
    check('reference content is immutable through app roles; expired ticket fails closed')

    ticket = mint()
    alternate = str(uuid.uuid4())
    sql(f"begin;insert into modules(id,course_id,slug,title,sequence,is_published) values('{alternate}','{course}','fictional-alternate','Fictional alternate',99,true);update lessons set module_id='{alternate}' where id='{lesson}';" + auth(start(ticket)) + ';rollback', error='written_reference_stale_or_forbidden')
    check('same lesson UUID/version cannot move to another published module under an old reference')

    sql('alter table lh_internal.written_professor_references add constraint fictional_binding_failure check(bound_session_id is null)')
    try:
        sql('begin;' + auth(start(ticket)) + ';commit', error='fictional_binding_failure')
        assert sql('select count(*) from professor_budget_reservations') == '0'
        assert sql('select count(*) from ai_tutor_sessions') == '0'
    finally:
        sql('alter table lh_internal.written_professor_references drop constraint fictional_binding_failure')
    check('binding storage failure rolls back both session and reservation')

    with Connection('written_version_writer') as writer, Connection('written_stale_start') as starter:
        writer.send(f"update lessons set content_version={version+1} where id='{lesson}';select 'writer_ready'"); writer.until('writer_ready')
        starter.send(auth(start(ticket))); waiting(starter)
        writer.send('commit'); writer.close()
        starter.until('written_reference_stale_or_forbidden'); starter.close()
    assert sql('select count(*) from professor_budget_reservations') == '0'
    sql(f"update lessons set content_version={version} where id='{lesson}'")
    check('start waiting behind committed content update sees new version and creates no reservation')

    ticket = mint()
    with Connection('written_admission_owner') as starter, Connection('written_publication_writer') as writer:
        starter.send(auth(start(ticket)) + ";select 'admission_ready'"); starter.until('admission_ready')
        assert last_json('\n'.join(starter.lines))['allowed'] is True
        writer.send(f"update lessons set is_published=false where id='{lesson}';select 'publication_ready'"); waiting(writer)
        starter.send('commit'); starter.close()
        writer.until('publication_ready'); writer.send('commit'); writer.close()
    assert sql('select count(*) from ai_tutor_sessions') == '1'
    sql(f"update lessons set is_published=true where id='{lesson}'"); cleanup()
    check('publication update waits until reference, session and reservation commit together')

    ticket, request = mint(), str(uuid.uuid4())
    with Connection('written_first_request') as first, Connection('written_replayed_request') as second:
        first.send(auth(start(ticket, request)) + ";select 'first_ready'"); first.until('first_ready')
        second.send(auth(start(ticket, request)) + ";select 'second_ready'"); waiting(second)
        first.send('commit'); first.close()
        second.until('second_ready'); second.send('commit'); second.close()
        assert last_json('\n'.join(first.lines))['allowed'] is True
        replay = last_json('\n'.join(second.lines))
        assert replay['allowed'] is False and replay['reason'] == 'request_already_started'
    assert sql('select count(*) from ai_tutor_sessions') == '1'; cleanup()
    check('two overlapping same-ticket requests admit exactly once')

    for audio_first in (False, True):
        sql('update learning_hub_budget_settings set ai_hard_cap_usd=0.15')
        ticket, attempt = mint(), str(uuid.uuid4())
        audio = f"set local role service_role;select begin_premium_audio_attempt_v2('{attempt}','{finance}','{lesson}',{version},0.10)"
        professor = auth(start(ticket))
        first_query, second_query = (audio, professor) if audio_first else (professor, audio)
        with Connection('written_budget_first') as first, Connection('written_budget_second') as second:
            first.send(first_query + ";select 'budget_first_ready'"); first.until('budget_first_ready')
            assert last_json('\n'.join(first.lines))['allowed'] is True
            second.send(second_query + ";select 'budget_second_ready'"); waiting(second)
            first.send('commit'); first.close()
            second.until('budget_second_ready'); second.send('commit'); second.close()
            assert last_json('\n'.join(second.lines))['allowed'] is False
        assert sql('select (select count(*) from professor_budget_reservations)+(select count(*) from lh_internal.premium_audio_attempts)') == '1'
        cleanup()
        sql(f"delete from lh_internal.premium_audio_attempts where id='{attempt}' and state='reserved'")
        sql('update learning_hub_budget_settings set ai_hard_cap_usd=10')
    check('new Professor binding shares existing Audio global cap under both overlapping launch orders')

    ticket, request = mint(), str(uuid.uuid4())
    admission = last_json(sql('begin;' + auth(start(ticket, request)) + ';commit'))
    ack = {'requestId':request,'userId':finance,'mode':'chapter_conversation',
        'reference':{'id':ticket,'sha256':admission['written_reference']['source_sha256'],'version':admission['written_reference']['descriptor_version'],'identity':identity},
        'sessionId':admission['session_id'],'reservationId':admission['reservation_id'],'roomName':admission['room_name'],
        'validationMode':True,'qualityTier':'premium','maxSessionSeconds':admission['max_session_seconds'],'providerAdmission':False}
    encoded = json.dumps(ack).replace("'", "''")
    claim_id = str(uuid.uuid4())
    claim = f"select claim_professor_dispatch_v1('{encoded}'::jsonb,repeat('a',64),repeat('b',64),'{claim_id}')"
    observe = f"select observe_professor_dispatch_v1('{ticket}','{request}')"
    assert last_json(sql('begin;' + auth(observe) + ';rollback'))['state'] == 'admitted_not_claimed'
    for role in ('anon','authenticated'):
        sql(f'begin;set local role {role};' + claim + ';rollback', error='permission denied')
    sql(f"update lessons set content_version={version+1} where id='{lesson}'")
    sql('set role service_role;' + claim, error='written_reference_stale_or_forbidden')
    sql(f"update lessons set content_version={version} where id='{lesson}'")
    assert sql(f"select dispatch_claim_id is null from lh_internal.written_professor_references where id='{ticket}'") == 't'
    check('service-only dispatch claim revalidates authored version after admission')

    sql("alter table professor_budget_reservations add constraint fictional_claim_failure check(status<>'unresolved')")
    try:
        sql('set role service_role;' + claim, error='fictional_claim_failure')
        assert sql(f"select dispatch_claim_id is null from lh_internal.written_professor_references where id='{ticket}'") == 't'
        assert sql(f"select status from professor_budget_reservations where id='{ack['reservationId']}'") == 'active'
    finally:
        sql('alter table professor_budget_reservations drop constraint fictional_claim_failure')
    check('reservation transition failure rolls back durable claim atomically')

    with Connection('dispatch_first_claim') as first, Connection('dispatch_second_claim') as second:
        first.send('set local role service_role;' + claim + ";select 'claim_first_ready'"); first.until('claim_first_ready')
        second.send('set local role service_role;' + claim + ";select 'claim_second_ready'"); waiting(second)
        first.send('commit'); first.close()
        second.until('claim_second_ready'); second.send('commit'); second.close()
        assert last_json('\n'.join(first.lines))['claimed'] is True
        assert last_json('\n'.join(second.lines)) == {'claimed':False,'reason':'dispatch_already_claimed'}
    observation = last_json(sql('begin;' + auth(observe) + ';rollback'))
    assert observation == {'state':'dispatch_unconfirmed','sessionId':ack['sessionId'],'providerAdmission':False,'retryAllowed':False}
    assert sql(f"select status from professor_budget_reservations where id='{ack['reservationId']}'") == 'unresolved'
    sql(f"update lh_internal.written_professor_references set expires_at=now()-interval '40 days' where id='{ticket}';update professor_budget_reservations set month_start=(now()-interval '40 days')::date,created_at=now()-interval '40 days' where id='{ack['reservationId']}'")
    assert last_json(sql('set role service_role;' + claim))['claimed'] is False
    assert last_json(sql("select lh_internal.professor_reservation_exposure(now())"))['carriedReservedUsd'] > 0
    check('overlapping claims return one positive result; expired cross-month uncertainty retains budget and forbids retry')

    # Foundation denies learner writes. Even an independently injected public
    # dispatch_id is not a verified private receipt; inject only inside rollback.
    public_write = f"update ai_tutor_sessions set dispatch_id='fixture_forged' where id='{ack['sessionId']}'"
    sql('begin;' + auth(public_write) + ';rollback', error='permission denied')
    assert last_json(sql('begin;' + public_write + ';' + auth(observe) + ';rollback'))['state'] == 'dispatch_unconfirmed'
    assert last_json(sql('begin;' + auth(observe) + ';rollback'))['state'] == 'dispatch_unconfirmed'
    record = f"select record_professor_dispatch_v1('{ticket}','{finance}','{claim_id}',repeat('b',64),'fixture_sql_ack')"
    assert sql('set role service_role;' + record) == 't'
    assert sql('set role service_role;' + record) == 't'
    sql('set role service_role;' + record.replace('fixture_sql_ack','fixture_conflicting'), error='dispatch_receipt_conflict')
    assert last_json(sql('begin;' + auth(observe) + ';rollback'))['state'] == 'dispatch_acknowledged'
    assert sql(f"select status from professor_budget_reservations where id='{ack['reservationId']}'") == 'unresolved'
    check('late provider-ID observation is idempotent, conflict-safe and cannot settle costs or release holds')
finally:
    cleanup()
    sql(f"update lessons set content_version={version},is_published=true where id='{lesson}'")
    sql('update professor_budget_settings set monthly_budget_usd=0;update learning_hub_budget_settings set ai_hard_cap_usd=0,professor_cap_usd=0,premium_audio_cap_usd=0')
try:
    subprocess.run(['node','--experimental-strip-types','quality/tests/written-binding-admission.mjs',sys.argv[1]],check=True,timeout=90)
finally:
    cleanup()
    sql('update professor_budget_settings set monthly_budget_usd=0;update learning_hub_budget_settings set ai_hard_cap_usd=0,professor_cap_usd=0,premium_audio_cap_usd=0')
try:
    subprocess.run(['node','--experimental-strip-types','quality/tests/written-binding-dispatch.mjs',sys.argv[1]],check=True,timeout=90)
finally:
    cleanup()
    sql('update professor_budget_settings set monthly_budget_usd=0;update learning_hub_budget_settings set ai_hard_cap_usd=0,professor_cap_usd=0,premium_audio_cap_usd=0')
assert sql('select count(*) from ai_tutor_sessions') == '0'
assert sql('select count(*) from professor_budget_reservations') == '0'
assert sql('select count(*) from ai_usage_log') == '0'
assert sql('select count(*) from lh_internal.premium_audio_attempts') == '0'
print(json.dumps({'status':'passed','concurrencyAndIntegrityScenarios':passed,'fictionalLocalBudgetRestoredToZero':True,'providerCalls':0,'connectedWrites':0}))
