"""Disposable PostgreSQL proof for the closed Premium Audio v3 candidate.

Only the CI-local fictional database is accepted. No Storage or provider call
is made; an audio_assets row is the exact durable-store acknowledgement.
"""
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import uuid

assert os.environ.get("PGHOST") == "127.0.0.1"
assert os.environ.get("PGDATABASE") == "learning_hub_test"
assert os.environ.get("PGUSER") == "postgres"

ROOT = Path(__file__).resolve().parents[2]
CANDIDATE = ROOT / "quality/candidates/premium-audio-source-binding.sql"
SOURCE = CANDIDATE.read_text()
assert "CANDIDATE ONLY" in SOURCE
assert "create or replace" not in SOURCE.lower()
assert "alter table public.audio_assets" not in SOURCE.lower()
assert "grant execute on function public.begin_premium_audio_attempt_v3" not in SOURCE.lower()
assert "^[0-9a-f]{64}$" in SOURCE
assert "premium-audio-v3:" in SOURCE
assert "audio_reconciliation_required" in SOURCE
assert "lesson_identity jsonb" in SOURCE
assert "p_estimated_cost_usd > b.reserved_usd" in SOURCE
assert "p_estimated_cost_usd<>round(p_estimated_cost_usd,6)" in SOURCE
assert "p_reservation_usd<>round(p_reservation_usd,6)" in SOURCE
assert "premium_audio_attempt_bindings_v3 binding_row" in SOURCE
assert "binding_row.attempt_id=attempt_row.id" in SOURCE
assert "asset.voice is distinct from 'marin'" in SOURCE
assert "char_length(asset.transcript_pt)" in SOURCE
assert "set local lock_timeout = '5s'" in SOURCE
assert "set local statement_timeout = '60s'" in SOURCE


def sql(text: str, fail: bool = False) -> str:
    run = subprocess.run(
        ["psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-c", text],
        capture_output=True,
        text=True,
    )
    if fail:
        assert run.returncode != 0, f"Expected SQL rejection: {text}\n{run.stdout}"
        return run.stderr
    assert run.returncode == 0, run.stderr
    return run.stdout.strip().splitlines()[-1] if run.stdout.strip() else ""


assert sql("select label from lh_internal.audio_fixture_guard") == "fictional-audio-concurrency"
assert sql("select label from lh_internal.audio_v3_fixture_guard") == "fictional-audio-v3-source-binding"
finance = sql("select id from profiles where learner_track='rafael_finance'")
payroll = sql("select id from profiles where learner_track='viviane_payroll'")
identities = json.loads(
    sql(
        "select jsonb_object_agg(l.id::text,jsonb_build_object("
        "'lessonId',l.id::text,'moduleId',m.id::text,'courseId',c.id::text,"
        "'lessonSlug',l.slug,'contentVersion',l.content_version,"
        "'requestedTrack',c.learner_track,'studyTrack',case c.learner_track "
        "when 'rafael_finance' then 'finance' when 'viviane_payroll' then 'payroll' "
        "when 'english_academy' then 'english' end,'sequence',l.sequence)) "
        "from lessons l join modules m on m.id=l.module_id "
        "join courses c on c.id=m.course_id"
    )
)
finance_lessons = sorted(
    (key for key, value in identities.items() if value["requestedTrack"] == "rafael_finance"),
    key=lambda key: identities[key]["sequence"],
)
payroll_lesson = next(
    key for key, value in identities.items()
    if value["requestedTrack"] == "viviane_payroll" and value["sequence"] == 2
)
english_lesson = next(
    key for key, value in identities.items()
    if value["requestedTrack"] == "english_academy" and value["sequence"] == 2
)
assert [identities[key]["sequence"] for key in finance_lessons] == [2, 3]
p1_lesson, draft_lesson = finance_lessons
finance_module = identities[p1_lesson]["moduleId"]
finance_course = identities[p1_lesson]["courseId"]
payroll_module = identities[payroll_lesson]["moduleId"]
payroll_course = identities[payroll_lesson]["courseId"]
FP = "a" * 64
OTHER_FP = "b" * 64
passed = 0


def path(lesson: str, fingerprint: str = FP, version: int = 1) -> str:
    return f"lessons/{lesson}/commentary-v{version}-{fingerprint}-r1.mp3"


def quoted(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, dict):
        encoded = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
        return "'" + encoded.replace("'", "''") + "'::jsonb"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def authenticated_sql(user: str, query: str) -> str:
    claims = '{"role":"authenticated"}'
    return sql(
        "select set_config('request.jwt.claim.sub'," + quoted(user) + ",false);"
        "select set_config('request.jwt.claim.role','authenticated',false);"
        "select set_config('request.jwt.claims'," + quoted(claims) + ",false);"
        "set role authenticated;"
        + query
        + ";reset role"
    )


def begin_query(
    attempt: str,
    lesson: str,
    *,
    user: str | None = None,
    fingerprint: str = FP,
    version: int = 1,
    reservation: float = 0.10,
    storage_path: str | None = None,
    identity: dict | None = None,
) -> str:
    user = user or finance
    storage_path = storage_path or path(lesson, fingerprint, version)
    identity = identity or identities[lesson]
    args = [attempt, user, lesson, version, reservation, fingerprint, 1, storage_path, identity]
    return "select public.begin_premium_audio_attempt_v3(" + ",".join(map(quoted, args)) + ")"


def observe_query(
    lesson: str,
    *,
    user: str | None = None,
    fingerprint: str = FP,
    version: int = 1,
    storage_path: str | None = None,
    identity: dict | None = None,
) -> str:
    user = user or finance
    storage_path = storage_path or path(lesson, fingerprint, version)
    identity = identity or identities[lesson]
    args = [user, lesson, version, fingerprint, 1, storage_path, identity]
    return "select public.observe_premium_audio_cache_v3(" + ",".join(map(quoted, args)) + ")"


def mark_query(
    attempt: str,
    lesson: str,
    fingerprint: str = FP,
    storage_path: str | None = None,
) -> str:
    storage_path = storage_path or path(lesson, fingerprint)
    args = [attempt, fingerprint, 1, storage_path]
    return "select public.mark_premium_audio_submitted_v3(" + ",".join(map(quoted, args)) + ")"


def close_query(
    attempt: str,
    lesson: str,
    fingerprint: str = FP,
    storage_path: str | None = None,
) -> str:
    storage_path = storage_path or path(lesson, fingerprint)
    args = [attempt, fingerprint, 1, storage_path]
    return "select public.close_premium_audio_attempt_v3(" + ",".join(map(quoted, args)) + ")"


def settle_query(
    attempt: str,
    lesson: str,
    fingerprint: str = FP,
    storage_path: str | None = None,
    cost: float = 0.04,
    characters: int = 100,
) -> str:
    storage_path = storage_path or path(lesson, fingerprint)
    args = [attempt, fingerprint, 1, storage_path, cost, characters]
    return "select public.settle_premium_audio_attempt_v3(" + ",".join(map(quoted, args)) + ")"


def reset() -> None:
    sql(
        "truncate lh_internal.premium_audio_attempt_bindings_v3,"
        "lh_internal.premium_audio_attempts,public.audio_assets,public.ai_usage_log,"
        "public.ai_tutor_sessions,public.professor_budget_reservations cascade;"
        "update public.learning_hub_budget_settings "
        "set ai_hard_cap_usd=10,professor_cap_usd=10,"
        "premium_audio_cap_usd=10 where id=1;"
        "update public.courses c set learner_track=f.learner_track,is_active=true "
        "from (select distinct course_id,learner_track from lh_internal.audio_v3_identity_fixture) f "
        "where c.id=f.course_id;"
        "update public.modules m set course_id=f.course_id,is_published=true "
        "from (select distinct module_id,course_id from lh_internal.audio_v3_identity_fixture) f "
        "where m.id=f.module_id;"
        "update public.lessons l set module_id=f.module_id,slug=f.lesson_slug,"
        "sequence=f.lesson_sequence,content_version=1,is_published=true "
        "from lh_internal.audio_v3_identity_fixture f where l.id=f.lesson_id;"
    )


def store_exact(
    attempt: str,
    lesson: str,
    fingerprint: str = FP,
    *,
    version: int = 1,
    cost: float = 0.04,
    characters: int = 100,
    transcript: str | None = None,
    voice: str = "marin",
    storage_path: str | None = None,
) -> str:
    transcript = transcript if transcript is not None else "x" * characters
    storage_path = storage_path or path(lesson, fingerprint, version)
    values = [
        lesson, "commentary", storage_path, transcript, voice,
        f"premium-audio-v3:{attempt}", cost,
    ]
    return sql(
        "insert into public.audio_assets(lesson_id,audio_type,storage_path,"
        "transcript_pt,voice,generated_at,generation_request_id,estimated_cost_usd) values("
        + ",".join(map(quoted, values[:5]))
        + ",clock_timestamp(),"
        + ",".join(map(quoted, values[5:]))
        + ") returning id"
    )


def check(label: str) -> None:
    global passed
    passed += 1
    print("PASS:", label, flush=True)


public_signatures = [
    "public.observe_premium_audio_cache_v3(uuid,uuid,integer,text,integer,text,jsonb)",
    "public.begin_premium_audio_attempt_v3(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb)",
    "public.mark_premium_audio_submitted_v3(uuid,text,integer,text)",
    "public.close_premium_audio_attempt_v3(uuid,text,integer,text)",
    "public.settle_premium_audio_attempt_v3(uuid,text,integer,text,numeric,integer)",
]
internal_signatures = [
    "lh_internal.premium_audio_identity_shape_valid_v3(jsonb)",
    "lh_internal.premium_audio_expected_path_v3(uuid,integer,text,integer)",
    "lh_internal.lock_premium_audio_identity_v3(uuid,uuid,jsonb)",
    "lh_internal.inspect_premium_audio_cache_v3(uuid,integer,text,integer,text,jsonb)",
]
for role in ["anon", "authenticated", "service_role"]:
    for signature in public_signatures + internal_signatures:
        assert sql(f"select has_function_privilege('{role}','{signature}','EXECUTE')") == "f"
    assert sql(
        f"select has_table_privilege('{role}',"
        "'lh_internal.premium_audio_attempt_bindings_v3',"
        "'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')"
    ) == "f"
for signature in public_signatures + internal_signatures:
    assert sql(
        "select count(*) from pg_proc p cross join lateral "
        "aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl "
        f"where p.oid='{signature}'::regprocedure and acl.grantee=0 "
        "and acl.privilege_type='EXECUTE'"
    ) == "0"
assert sql(
    "select relrowsecurity from pg_class where oid="
    "'lh_internal.premium_audio_attempt_bindings_v3'::regclass"
) == "t"
assert sql(
    "select not prosecdef from pg_proc where oid="
    "'lh_internal.premium_audio_identity_shape_valid_v3(jsonb)'::regprocedure"
) == "t"
for signature in public_signatures + internal_signatures[1:]:
    assert sql(f"select prosecdef from pg_proc where oid='{signature}'::regprocedure") == "t"
assert sql(
    "select relrowsecurity from pg_class where oid="
    "'lh_internal.premium_audio_attempts'::regclass"
) == "t"
assert sql(
    "select has_function_privilege('service_role',"
    "'public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)','EXECUTE')"
) == "f"
assert sql(
    "select has_function_privilege('service_role',"
    "'public.mark_premium_audio_submitted_v2(uuid)','EXECUTE')"
) == "f"
assert sql(
    "select has_function_privilege('service_role',"
    "'public.close_premium_audio_attempt_v2(uuid)','EXECUTE')"
) == "t"
assert sql(
    "select has_function_privilege('service_role',"
    "'public.settle_premium_audio_attempt_v2(uuid,numeric,integer)','EXECUTE')"
) == "t"
assert sql(
    "select indisunique and indisvalid and indpred is null and indexprs is null "
    "from pg_index where indexrelid='public.audio_assets_atomic_lesson_type_uq'::regclass"
) == "t"
assert sql(
    "select encode(extensions.digest(prosrc,'sha256'),'hex') from pg_proc where oid="
    "'lh_internal.enforce_profile_server_assignment_v1()'::regprocedure"
) == "3a79818cfc6f2e819e8bf2c4414d5a6a02f6c390203bde01033ad34a7148cd72"
assert sql(
    "select count(*) from pg_trigger where tgrelid='auth.users'::regclass "
    "and not tgisinternal"
) == "0"
assert sql(
    "select count(*) from pg_policy where polrelid='public.profiles'::regclass"
) == "2"
check("v3 APIs/helpers and ledger table are closed; approved v2 ACL/RLS/index base is accepted")

reset()
assert json.loads(sql(observe_query(p1_lesson))) == {"status": "miss"}
assert json.loads(sql(observe_query(payroll_lesson, user=payroll))) == {"status": "miss"}
assert json.loads(sql(observe_query(english_lesson))) == {"status": "miss"}
bad_path = path(p1_lesson).replace("-r1.mp3", ".mp3")
assert "invalid_audio_attempt" in sql(
    begin_query(str(uuid.uuid4()), p1_lesson, storage_path=bad_path), fail=True
)
assert "invalid_audio_attempt" in sql(
    begin_query(str(uuid.uuid4()), p1_lesson, fingerprint=FP.upper()), fail=True
)
assert "invalid_audio_attempt" in sql(
    begin_query(str(uuid.uuid4()), p1_lesson, reservation=0.1000001), fail=True
)
malformed = []
malformed.append({**identities[p1_lesson], "extra": "forbidden"})
malformed.append({**identities[p1_lesson], "lessonId": identities[p1_lesson]["lessonId"].upper()})
malformed.append({**identities[p1_lesson], "contentVersion": "1"})
malformed.append({**identities[p1_lesson], "studyTrack": "payroll"})
malformed.append({
    **identities[p1_lesson],
    "lessonSlug": "clarify-check-understanding-handle-meetings",
})
for identity in malformed:
    assert "invalid_audio_attempt" in sql(
        begin_query(str(uuid.uuid4()), p1_lesson, identity=identity), fail=True
    )
assert "invalid_audio_attempt" in sql(
    begin_query(str(uuid.uuid4()), draft_lesson), fail=True
)
assert sql("select count(*) from lh_internal.premium_audio_attempts") == "0"
check("exact P1 identity, lowercase fingerprint and immutable path fail closed before any hold")

reset()
expired_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(expired_attempt, p1_lesson)))["allowed"] is True
sql(
    "update lh_internal.premium_audio_attempts "
    f"set lease_until=clock_timestamp()-interval '1 second' where id='{expired_attempt}'"
)
assert json.loads(sql(observe_query(p1_lesson))) == {"status": "miss"}
replacement_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(replacement_attempt, p1_lesson)))["allowed"] is True
assert sql(
    "select state from lh_internal.premium_audio_attempts "
    f"where id='{expired_attempt}'"
) == "cancelled"
assert sql("select count(*) from lh_internal.premium_audio_attempt_bindings_v3") == "2"
assert sql("select count(*) from public.audio_assets") == "0"
assert sql("select count(*) from public.ai_usage_log") == "0"
check("expired pre-provider lease is retained for audit and safely replaced without receipt")

reset()
anomalous_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(anomalous_attempt, p1_lesson)))["allowed"] is True
sql(
    "update lh_internal.premium_audio_attempts set "
    "lease_until=clock_timestamp()-interval '1 second',"
    "submitted_at=clock_timestamp() "
    f"where id='{anomalous_attempt}'"
)
assert json.loads(sql(observe_query(p1_lesson))) == {"status": "reconciliation_required"}
replacement_attempt = str(uuid.uuid4())
denied = json.loads(sql(begin_query(
    replacement_attempt, payroll_lesson, user=payroll,
)))
assert denied["allowed"] is False
assert denied["reason"] == "audio_reconciliation_required"
assert "audio_reconciliation_required" in sql(
    mark_query(anomalous_attempt, p1_lesson), fail=True
)
assert sql(close_query(anomalous_attempt, p1_lesson)) == "uncertain"
assert sql(
    "select state from lh_internal.premium_audio_attempts "
    f"where id='{anomalous_attempt}'"
) == "uncertain"
assert sql(
    "select count(*) from lh_internal.premium_audio_attempts "
    f"where id='{replacement_attempt}'"
) == "0"
assert sql("select count(*) from public.audio_assets") == "0"
assert sql("select count(*) from public.ai_usage_log") == "0"
check("expired submitted evidence globally blocks cross-lesson admission and becomes uncertain")

reset()
live_anomalous_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(live_anomalous_attempt, p1_lesson)))["allowed"] is True
sql(
    "update lh_internal.premium_audio_attempts set "
    "lease_until=clock_timestamp()+interval '1 hour',"
    "submitted_at=clock_timestamp() "
    f"where id='{live_anomalous_attempt}'"
)
boundary_attempt = str(uuid.uuid4())
denied = json.loads(sql(begin_query(
    boundary_attempt, payroll_lesson, user=payroll,
)))
assert denied == {"allowed": False, "reason": "audio_reconciliation_required"}
assert sql(
    "select state from lh_internal.premium_audio_attempts "
    f"where id='{live_anomalous_attempt}'"
) == "reserved"
assert sql(
    "select count(*) from lh_internal.premium_audio_attempts "
    f"where id='{boundary_attempt}'"
) == "0"
assert sql(close_query(live_anomalous_attempt, p1_lesson)) == "uncertain"
check("live reserved evidence is fenced globally before it can cross the v2 expiry clock")

reset()
cancelled_evidence_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(cancelled_evidence_attempt, p1_lesson)))["allowed"] is True
sql(
    "update lh_internal.premium_audio_attempts set "
    "submitted_at=clock_timestamp() "
    f"where id='{cancelled_evidence_attempt}'"
)
assert "premium_audio_v3_cancelled_no_evidence" in sql(
    f"select public.close_premium_audio_attempt_v2('{cancelled_evidence_attempt}')",
    fail=True,
)
assert sql(
    "select state from lh_internal.premium_audio_attempts "
    f"where id='{cancelled_evidence_attempt}'"
) == "reserved"
assert "audio_reconciliation_required" in sql(
    mark_query(cancelled_evidence_attempt, p1_lesson), fail=True
)
denied = json.loads(sql(begin_query(
    str(uuid.uuid4()), payroll_lesson, user=payroll,
)))
assert denied == {"allowed": False, "reason": "audio_reconciliation_required"}
assert sql(close_query(cancelled_evidence_attempt, p1_lesson)) == "uncertain"
assert sql(
    "select state from lh_internal.premium_audio_attempts "
    f"where id='{cancelled_evidence_attempt}'"
) == "uncertain"
check("legacy cancellation of provider evidence rolls back; v3 close preserves the hold as uncertain")

reset()
attempts = [str(uuid.uuid4()), str(uuid.uuid4())]
with ThreadPoolExecutor(max_workers=2) as pool:
    jobs = [pool.submit(sql, begin_query(item, p1_lesson)) for item in attempts]
    results = [json.loads(job.result(timeout=20)) for job in jobs]
assert sum(result.get("allowed") is True for result in results) == 1
assert sum(result.get("reason") == "audio_generation_in_progress" for result in results) == 1
allowed_index = next(index for index, result in enumerate(results) if result.get("allowed") is True)
attempt = attempts[allowed_index]
assert sql("select count(*) from lh_internal.premium_audio_attempts") == "1"
assert sql("select count(*) from lh_internal.premium_audio_attempt_bindings_v3") == "1"
assert json.loads(sql(observe_query(p1_lesson))) == {"status": "in_progress"}
check("concurrent exact admissions serialize to one v2 hold and one v3 binding")

replay = json.loads(sql(begin_query(attempt, p1_lesson)))
assert replay["reason"] == "audio_attempt_replayed" and replay["state"] == "reserved"
assert "audio_attempt_conflict" in sql(
    begin_query(attempt, p1_lesson, fingerprint=OTHER_FP), fail=True
)
assert "audio_attempt_conflict" in sql(
    mark_query(attempt, p1_lesson, fingerprint=OTHER_FP), fail=True
)
assert "audio_attempt_conflict" in sql(
    mark_query(attempt, p1_lesson, storage_path="lessons/wrong-object.mp3"), fail=True
)
assert sql(f"select state from lh_internal.premium_audio_attempts where id='{attempt}'") == "reserved"
marked = json.loads(sql(mark_query(attempt, p1_lesson)))
assert marked == {"allowed": True, "state": "submitted"}
marked_replay = json.loads(sql(mark_query(attempt, p1_lesson)))
assert marked_replay == {
    "allowed": False,
    "reason": "audio_submission_replayed",
    "state": "submitted",
}
check("attempt replay and mismatched fingerprint/path never authorize a provider fence")

asset_id = store_exact(attempt, p1_lesson)
assert "audio_attempt_conflict" in sql(
    settle_query(attempt, p1_lesson, fingerprint=OTHER_FP), fail=True
)
assert "audio_attempt_conflict" in sql(
    settle_query(attempt, p1_lesson, storage_path="lessons/wrong-object.mp3"), fail=True
)
assert "invalid_audio_receipt" in sql(
    settle_query(attempt, p1_lesson, cost=0.11), fail=True
)
assert "premium_audio_v3_cost_within_reservation" in sql(
    f"select public.settle_premium_audio_attempt_v2('{attempt}',0.11,100)",
    fail=True,
)
assert sql("select count(*) from public.ai_usage_log") == "0"
assert sql(f"select state from lh_internal.premium_audio_attempts where id='{attempt}'") == "submitted"
with ThreadPoolExecutor(max_workers=3) as pool:
    jobs = [pool.submit(sql, settle_query(attempt, p1_lesson)) for _ in range(3)]
    settled = [json.loads(job.result(timeout=20)) for job in jobs]
assert all(item["settled"] is True and item["state"] == "settled" for item in settled)
receipt = f"premium-audio-v3:{attempt}"
assert all(item["receiptRequestId"] == receipt for item in settled)
assert sql(f"select count(*) from ai_usage_log where request_id='{receipt}'") == "1"
assert sql(
    "select created_at is not null and created_at between "
    "clock_timestamp()-interval '1 minute' and clock_timestamp()+interval '1 second' "
    f"from ai_usage_log where request_id='{receipt}'"
) == "t"
assert sql(
    f"select asset_id='{asset_id}' from lh_internal.premium_audio_attempt_bindings_v3"
) == "t"
hit = json.loads(sql(observe_query(p1_lesson)))
assert hit == {"status": "hit", "attemptId": attempt, "storagePath": path(p1_lesson)}
assert json.loads(sql(begin_query(str(uuid.uuid4()), p1_lesson)))["reason"] == "audio_cached"
check("mismatch/over-reserve settlement is inert; concurrent exact settlement yields one cache receipt")

assert "audio_reconciliation_required" in sql(
    settle_query(attempt, p1_lesson, cost=0.05), fail=True
)
assert sql(
    "select estimated_cost_usd=0.04 from ai_usage_log "
    f"where request_id='{receipt}'"
) == "t"
new_identity = {**identities[p1_lesson], "contentVersion": 2}
sql(f"update public.lessons set content_version=2 where id='{p1_lesson}'")
assert json.loads(sql(observe_query(
    p1_lesson, fingerprint=OTHER_FP, version=2, identity=new_identity,
))) == {"status": "reconciliation_required"}
assert json.loads(sql(begin_query(
    str(uuid.uuid4()), p1_lesson, fingerprint=OTHER_FP, version=2, identity=new_identity,
)))["reason"] == "audio_reconciliation_required"
sql(f"update public.lessons set content_version=1 where id='{p1_lesson}'")
check("settled replay divergence and source/version rollover require reviewed reconciliation")

duplicate_asset = (
    "insert into public.audio_assets(lesson_id,audio_type,storage_path,transcript_pt,voice,"
    "generation_request_id,estimated_cost_usd) values("
)
assert "duplicate key" in sql(
    duplicate_asset + ",".join(map(quoted, [
        draft_lesson, "commentary", path(p1_lesson), "x", "marin",
        "premium-audio-v3:" + str(uuid.uuid4()), 0.01,
    ])) + ")", fail=True,
).lower()
assert "duplicate key" in sql(
    duplicate_asset + ",".join(map(quoted, [
        draft_lesson, "commentary", "lessons/other-object.mp3", "x", "marin", receipt, 0.01,
    ])) + ")", fail=True,
).lower()
assert "duplicate key" in sql(
    "insert into public.ai_usage_log(user_id,feature,model,estimated_cost_usd,characters,request_id) "
    f"values('{finance}','other','none',0,1,'{receipt}')", fail=True,
).lower()
assert sql(f"select storage_path from audio_assets where id='{asset_id}'") == path(p1_lesson)
check("global object and receipt uniqueness reject divergent writers without overwrite")

sql(f"update public.audio_assets set storage_path='orphan/divergent.mp3' where id='{asset_id}'")
assert json.loads(sql(observe_query(p1_lesson))) == {"status": "reconciliation_required"}
assert "audio_reconciliation_required" in sql(settle_query(attempt, p1_lesson), fail=True)
assert sql(f"select storage_path from audio_assets where id='{asset_id}'") == "orphan/divergent.mp3"
sql(f"update public.audio_assets set storage_path='{path(p1_lesson)}' where id='{asset_id}'")
sql(f"update public.ai_usage_log set estimated_cost_usd=0.06 where request_id='{receipt}'")
assert json.loads(sql(observe_query(p1_lesson))) == {"status": "reconciliation_required"}
assert "audio_reconciliation_required" in sql(settle_query(attempt, p1_lesson), fail=True)
assert sql(f"select estimated_cost_usd=0.06 from ai_usage_log where request_id='{receipt}'") == "t"
check("divergent object or receipt is reconciliation-only and never repaired automatically")

for label, mutation in [
    ("content version", f"update lessons set content_version=2 where id='{p1_lesson}'"),
    ("lesson slug", f"update lessons set slug='changed-after-begin' where id='{p1_lesson}'"),
    ("lesson sequence", f"update lessons set sequence=3 where id='{p1_lesson}'"),
    ("module identity", f"update lessons set module_id='{payroll_module}' where id='{p1_lesson}'"),
    ("course identity", f"update modules set course_id='{payroll_course}' where id='{finance_module}'"),
    ("track mapping", f"update courses set learner_track='viviane_payroll' where id='{finance_course}'"),
]:
    reset()
    drift_attempt = str(uuid.uuid4())
    assert json.loads(sql(begin_query(drift_attempt, p1_lesson)))["allowed"] is True
    sql(mutation)
    assert "audio_source_changed" in sql(mark_query(drift_attempt, p1_lesson), fail=True)
    assert sql(
        "select state from lh_internal.premium_audio_attempts "
        f"where id='{drift_attempt}'"
    ) == "reserved"
    assert sql("select count(*) from public.ai_usage_log") == "0"
    assert sql(close_query(drift_attempt, p1_lesson)) == "cancelled"
    check(f"{label} drift blocks the first provider fence while exact cleanup remains available")

reset()
post_fence_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(post_fence_attempt, p1_lesson)))["allowed"] is True
assert json.loads(sql(mark_query(post_fence_attempt, p1_lesson)))["allowed"] is True
sql(f"update public.lessons set slug='changed-after-provider-fence' where id='{p1_lesson}'")
assert sql(close_query(post_fence_attempt, p1_lesson)) == "uncertain"
store_exact(post_fence_attempt, p1_lesson)
assert json.loads(sql(settle_query(post_fence_attempt, p1_lesson)))["settled"] is True
assert sql(
    "select count(*) from public.ai_usage_log where request_id="
    f"'premium-audio-v3:{post_fence_attempt}'"
) == "1"
check("post-fence source drift cannot erase provider cleanup or exact cost settlement")

reset()
for label, transcript, voice in [
    ("voice", "x" * 100, "alloy"),
    ("transcript length", "short", "marin"),
]:
    metadata_attempt = str(uuid.uuid4())
    assert json.loads(sql(begin_query(metadata_attempt, p1_lesson)))["allowed"] is True
    assert json.loads(sql(mark_query(metadata_attempt, p1_lesson)))["allowed"] is True
    metadata_asset = store_exact(metadata_attempt, p1_lesson, transcript=transcript, voice=voice)
    assert "audio_reconciliation_required" in sql(
        settle_query(metadata_attempt, p1_lesson), fail=True
    )
    assert sql("select count(*) from public.ai_usage_log") == "0"
    assert sql(f"select voice from audio_assets where id='{metadata_asset}'") == voice
    check(f"divergent {label} metadata is rejected without mutation")
    reset()

unicode_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(unicode_attempt, p1_lesson)))["allowed"] is True
assert json.loads(sql(mark_query(unicode_attempt, p1_lesson)))["allowed"] is True
canonical_realistic_cost = 0.021652
store_exact(
    unicode_attempt,
    p1_lesson,
    characters=2,
    transcript="A😀",
    cost=canonical_realistic_cost,
)
assert "invalid_audio_receipt" in sql(
    settle_query(
        unicode_attempt,
        p1_lesson,
        cost=0.021651724137931035,
        characters=2,
    ),
    fail=True,
)
assert sql("select count(*) from public.ai_usage_log") == "0"
assert json.loads(sql(settle_query(
    unicode_attempt,
    p1_lesson,
    cost=canonical_realistic_cost,
    characters=2,
)))["settled"] is True
assert sql(
    "select estimated_cost_usd::text from public.ai_usage_log where request_id="
    f"'premium-audio-v3:{unicode_attempt}'"
) == "0.021652"
assert json.loads(sql(observe_query(p1_lesson)))["status"] == "hit"
check("six-decimal cost and Unicode character metadata remain exact through cache")

reset()
assert "audio_lesson_forbidden" in sql(
    begin_query(str(uuid.uuid4()), payroll_lesson, user=finance), fail=True
)
attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(attempt, p1_lesson)))["allowed"] is True
assert json.loads(sql(mark_query(attempt, p1_lesson)))["allowed"] is True
assert sql(close_query(attempt, p1_lesson)) == "uncertain"
assert json.loads(sql(observe_query(p1_lesson))) == {"status": "reconciliation_required"}
denied = json.loads(sql(begin_query(str(uuid.uuid4()), p1_lesson)))
assert denied["reason"] == "audio_reconciliation_required"
check("cross-track admission fails and uncertain provider work prevents every paid retry")

reset()
shared_start_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(shared_start_attempt, p1_lesson)))["allowed"] is True
sql(
    "update public.learning_hub_budget_settings "
    "set ai_hard_cap_usd=4.05,professor_cap_usd=4.05,"
    "premium_audio_cap_usd=4.05 where id=1"
)
start_request = str(uuid.uuid4())
start_result = json.loads(authenticated_sql(
    finance,
    "select public.start_professor_session_atomic("
    + ",".join(map(quoted, [
        start_request,
        p1_lesson,
        "chapter_conversation",
        f"lh-{start_request}",
        "c" * 64,
        False,
    ]))
    + ")",
))
assert start_result == {"allowed": False, "reason": "professor_monthly_budget_reached"}
assert sql("select count(*) from public.ai_tutor_sessions") == "0"
assert sql("select count(*) from public.professor_budget_reservations") == "0"
assert sql(close_query(shared_start_attempt, p1_lesson)) == "cancelled"

reset()
shared_legacy_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(shared_legacy_attempt, p1_lesson)))["allowed"] is True
sql(
    "update public.learning_hub_budget_settings "
    "set ai_hard_cap_usd=1.55,professor_cap_usd=1.55,"
    "premium_audio_cap_usd=1.55 where id=1"
)
legacy_reservation = json.loads(sql(
    "select set_config('request.jwt.claim.sub'," + quoted(finance) + ",false);"
    "select row_to_json(result)::text "
    "from public.reserve_professor_budget('standard') result"
))
assert legacy_reservation["allowed"] is False
assert legacy_reservation["global_committed_before_usd"] == 0.10
assert sql("select count(*) from public.professor_budget_reservations") == "0"
assert sql(close_query(shared_legacy_attempt, p1_lesson)) == "cancelled"
check("a real v3 hold blocks both authenticated and retained Professor admission paths")

reset()
cached_attempt = str(uuid.uuid4())
assert json.loads(sql(begin_query(cached_attempt, p1_lesson)))["allowed"] is True
assert json.loads(sql(mark_query(cached_attempt, p1_lesson)))["allowed"] is True
store_exact(cached_attempt, p1_lesson)
assert json.loads(sql(settle_query(cached_attempt, p1_lesson)))["settled"] is True
legacy_attempt = str(uuid.uuid4())
sql(
    "insert into lh_internal.premium_audio_attempts("
    "id,user_id,lesson_id,content_version,reserved_usd,state,created_at,lease_until"
    ") values("
    + ",".join(map(quoted, [
        legacy_attempt,
        finance,
        draft_lesson,
        1,
        0.10,
        "reserved",
    ]))
    + ",clock_timestamp()-interval '2 minutes',"
    "clock_timestamp()-interval '1 minute')"
)
cached_replay = json.loads(sql(begin_query(str(uuid.uuid4()), p1_lesson)))
assert cached_replay == {"allowed": False, "reason": "audio_cached"}
assert sql(
    "select state from lh_internal.premium_audio_attempts where id="
    + quoted(legacy_attempt)
) == "reserved"
assert sql(
    "select count(*) from lh_internal.premium_audio_attempt_bindings_v3 where attempt_id="
    + quoted(legacy_attempt)
) == "0"
check("v3 cache short-circuit never sweeps an unbound expired legacy v2 attempt")

reset()
foreign_path_owner = sql(
    "insert into public.audio_assets(lesson_id,audio_type,storage_path,transcript_pt,voice,"
    "generation_request_id,estimated_cost_usd) "
    f"values('{draft_lesson}','commentary','{path(p1_lesson)}','foreign','marin',"
    "'foreign-path-owner',0.03) returning id"
)
assert json.loads(sql(observe_query(p1_lesson))) == {"status": "reconciliation_required"}
denied = json.loads(sql(begin_query(str(uuid.uuid4()), p1_lesson)))
assert denied["reason"] == "audio_reconciliation_required"
assert sql(f"select storage_path from audio_assets where id='{foreign_path_owner}'") == path(p1_lesson)
assert sql("select count(*) from lh_internal.premium_audio_attempts") == "0"
check("foreign lesson ownership of the exact immutable path blocks admission before provider")

reset()
orphan_path = "lessons/orphan-divergent.mp3"
orphan_id = sql(
    "insert into public.audio_assets(lesson_id,audio_type,storage_path,transcript_pt,voice,"
    "generation_request_id,estimated_cost_usd) "
    f"values('{p1_lesson}','commentary','{orphan_path}','orphan','marin',"
    "'orphan-receipt',0.03) returning id"
)
assert json.loads(sql(observe_query(p1_lesson))) == {"status": "reconciliation_required"}
denied = json.loads(sql(begin_query(str(uuid.uuid4()), p1_lesson)))
assert denied["reason"] == "audio_reconciliation_required"
assert sql(f"select storage_path from audio_assets where id='{orphan_id}'") == orphan_path
assert sql("select count(*) from lh_internal.premium_audio_attempts") == "0"
check("pre-existing divergent asset closes admission without overwrite or budget hold")

print(json.dumps({"passed": passed, "realProviders": 0, "connectedSupabaseWrites": 0}))
