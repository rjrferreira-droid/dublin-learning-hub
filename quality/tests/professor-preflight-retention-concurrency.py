"""Disposable multi-connection proof for Professor ephemera retention.

The database must be the local Supabase CLI stack with the retention candidate
already installed. Fixtures are fictional and every surviving row is removed.
No HTTP, provider, model, audio or connected Supabase path is used.
"""
import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import threading
import time
import uuid
from urllib.parse import unquote, urlparse

status = json.loads(Path(sys.argv[1]).read_text())
db = urlparse(status["DB_URL"])
api = urlparse(status["API_URL"])
assert db.scheme in ("postgres", "postgresql")
assert db.hostname in ("127.0.0.1", "localhost") and db.port == 54322 and db.path == "/postgres"
assert api.scheme == "http" and api.hostname in ("127.0.0.1", "localhost") and api.port == 54321
assert not os.environ.get("SUPABASE_ACCESS_TOKEN")
env = {**os.environ, "PGPASSWORD": unquote(db.password or "")}
args = [
    "psql", "-XAtq", "-h", db.hostname, "-p", str(db.port),
    "-U", unquote(db.username or ""), "-d", "postgres", "-v", "ON_ERROR_STOP=1",
]


def sql(query: str, timeout: int = 8) -> str:
    result = subprocess.run([*args, "-c", query], env=env, capture_output=True, text=True, timeout=timeout)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def last_json(output: str) -> dict:
    return json.loads([line for line in output.splitlines() if line.startswith("{")][-1])


class Connection:
    def __init__(self, name: str):
        self.lines: list[str] = []
        self.events: queue.Queue[str | None] = queue.Queue()
        self.process = subprocess.Popen(
            args,
            env={**env, "PGAPPNAME": name},
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        def pump() -> None:
            assert self.process.stdout
            for line in self.process.stdout:
                self.events.put(line.strip())
            self.events.put(None)

        threading.Thread(target=pump, daemon=True).start()
        self.send("set statement_timeout='12s';set lock_timeout='10s';begin")

    def send(self, query: str) -> None:
        assert self.process.stdin
        self.process.stdin.write(query + ";\n")
        self.process.stdin.flush()

    def until(self, marker: str) -> None:
        deadline = time.monotonic() + 14
        while time.monotonic() < deadline:
            line = self.events.get(timeout=max(0.1, deadline - time.monotonic()))
            assert line is not None, "\n".join(self.lines)
            self.lines.append(line)
            if marker in line:
                return
        raise AssertionError(f"missing SQL barrier {marker}")

    def close(self) -> None:
        if self.process.poll() is None:
            assert self.process.stdin
            self.process.stdin.close()
            self.process.wait(timeout=14)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, *_):
        if self.process.poll() is None and exc_type:
            self.process.kill()
        self.close()


assert sql("select to_regprocedure('lh_internal.prune_professor_ephemera_v1(integer)') is not null") == "t"
assert sql("select count(*) from lh_internal.professor_preflights where expires_at<=clock_timestamp()-interval '24 hours'") == "0"
assert sql("select count(*) from lh_internal.written_professor_references where expires_at<=clock_timestamp()-interval '7 days' and bound_session_id is null") == "0"

user_id = sql("select id from profiles where learner_track='rafael_finance' order by id limit 1")
uuid.UUID(user_id)
identity = json.loads(sql("""
select jsonb_build_object('lessonId',l.id,'moduleId',m.id,'courseId',c.id,'lessonSlug',l.slug,
 'contentVersion',l.content_version,'requestedTrack',c.learner_track,'sequence',l.sequence,'studyTrack','finance')
from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id
where c.learner_track='rafael_finance' and c.is_active and m.is_published and l.is_published
 and l.sequence between 2 and 8 order by l.sequence limit 1
"""))
lesson_id = str(uuid.UUID(identity["lessonId"]))
identity_sql = json.dumps(identity, separators=(",", ":")).replace("'", "''")
old = "'" + sql("select clock_timestamp()-interval '8 days'") + "'::timestamptz"


def insert_reference(reference_id: str, expires: str, *, bound: tuple[str, str] | None = None) -> None:
    bound_sql = ""
    if bound:
        session_id, request_id = bound
        bound_sql = f",bound_session_id,bound_request_id,bound_at) values('{reference_id}','{user_id}','{lesson_id}','{identity_sql}'::jsonb,repeat('a',64),'p1-reference-candidate-v1',{old}-interval '5 minutes',{expires},'{session_id}','{request_id}',{old})"
        prefix = "insert into lh_internal.written_professor_references(id,user_id,lesson_id,identity,source_sha256,descriptor_version,created_at,expires_at"
        sql(prefix + bound_sql)
    else:
        sql(f"insert into lh_internal.written_professor_references(id,user_id,lesson_id,identity,source_sha256,descriptor_version,created_at,expires_at) values('{reference_id}','{user_id}','{lesson_id}','{identity_sql}'::jsonb,repeat('a',64),'p1-reference-candidate-v1',{old}-interval '5 minutes',{expires})")


def insert_preflight(reference_id: str, request_id: str, *, consumed: bool = False) -> None:
    consumed_sql = f",{old}-interval '1 minute'" if consumed else ",null"
    sql(f"insert into lh_internal.professor_preflights(reference_id,user_id,request_id,sealed,expires_at,consumed_at) values('{reference_id}','{user_id}','{request_id}','fixture-retention-race',{old}{consumed_sql})")


def cleanup() -> dict:
    return last_json(sql("select lh_internal.prune_professor_ephemera_v1(20)", timeout=4))


created_references: set[str] = set()
created_sessions: set[str] = set()
created_reservations: set[str] = set()
try:
    # PUT protocol: parent SHARE is held before child insertion. Cleanup skips the
    # parent, so it cannot delete between those two operations.
    put_reference, put_request = str(uuid.uuid4()), str(uuid.uuid4())
    created_references.add(put_reference)
    insert_reference(put_reference, old)
    with Connection("retention_put_parent") as put:
        put.send(f"select id from lh_internal.written_professor_references where id='{put_reference}' for share;select 'put_parent_locked'")
        put.until("put_parent_locked")
        result = cleanup()
        assert result["deletedPreflights"] == 0 and result["deletedUnboundReferences"] == 0
        assert sql(f"select count(*) from lh_internal.written_professor_references where id='{put_reference}'") == "1"
        put.send(f"insert into lh_internal.professor_preflights(reference_id,user_id,request_id,sealed,expires_at) values('{put_reference}','{user_id}','{put_request}','fixture-put-race',{old});select 'put_child_inserted'")
        put.until("put_child_inserted")
        put.send("commit")
    result = cleanup()
    assert result["deletedPreflights"] == 1 and result["deletedUnboundReferences"] == 1
    created_references.discard(put_reference)
    print("PASS: cleanup cannot cut between put parent lock and child insert", flush=True)

    # CONSUME protocol: a child UPDATE lock is skipped without waiting. Its
    # parent remains because the child still exists at reference pruning time.
    consume_reference, consume_request = str(uuid.uuid4()), str(uuid.uuid4())
    created_references.add(consume_reference)
    insert_reference(consume_reference, old)
    insert_preflight(consume_reference, consume_request)
    with Connection("retention_consume_child") as consume:
        consume.send(f"update lh_internal.professor_preflights set consumed_at=expires_at-interval '1 minute' where reference_id='{consume_reference}';select 'consume_child_locked'")
        consume.until("consume_child_locked")
        result = cleanup()
        assert result["deletedPreflights"] == 0 and result["deletedUnboundReferences"] == 0
        assert sql(f"select count(*) from lh_internal.professor_preflights where reference_id='{consume_reference}'") == "1"
        assert sql(f"select count(*) from lh_internal.written_professor_references where id='{consume_reference}'") == "1"
        consume.send("commit")
    result = cleanup()
    assert result["deletedPreflights"] == 1 and result["deletedUnboundReferences"] == 1
    created_references.discard(consume_reference)
    print("PASS: cleanup skips a consuming child and never reopens its fence", flush=True)

    # START protocol: an actual bound-start replay holds settings then the
    # reference lock. Cleanup skips it, does not wait, and changes no obligation.
    start_reference, start_request = str(uuid.uuid4()), str(uuid.uuid4())
    reservation_id = sql(f"insert into professor_budget_reservations(user_id,feature,reserved_usd,max_session_seconds,status,created_at) values('{user_id}','professor_livekit',4,1200,'active',{old}) returning id")
    created_reservations.add(reservation_id)
    room = "validation:lh-" + start_request
    session_id = sql(f"insert into ai_tutor_sessions(user_id,lesson_id,mode,status,started_at,room_name,quality_tier,budget_reservation_id,callback_token_hash,startup_request_id) values('{user_id}','{lesson_id}','chapter_conversation','active',{old},'{room}','premium','{reservation_id}',repeat('a',64),'{start_request}') returning id")
    created_sessions.add(session_id)
    created_references.add(start_reference)
    insert_reference(start_reference, "clock_timestamp()+interval '1 hour'", bound=(session_id, start_request))
    insert_preflight(start_reference, start_request, consumed=True)
    obligation_hash = sql(f"select md5(to_jsonb(s)::text||to_jsonb(r)::text) from ai_tutor_sessions s join professor_budget_reservations r on r.id=s.budget_reservation_id where s.id='{session_id}'")
    with Connection("retention_start_replay") as start:
        start.send(f"select set_config('request.jwt.claim.sub','{user_id}',true);select start_written_professor_session_v1('{start_reference}','{start_request}','chapter_conversation','{room}',repeat('a',64),true);select 'start_reference_locked'")
        start.until("start_reference_locked")
        result = cleanup()
        assert result["deletedPreflights"] == 0 and result["deletedUnboundReferences"] == 0
        assert sql(f"select count(*) from lh_internal.professor_preflights where reference_id='{start_reference}'") == "1"
        start.send("commit")
    result = cleanup()
    assert result["deletedPreflights"] == 1 and result["deletedUnboundReferences"] == 0
    assert sql(f"select md5(to_jsonb(s)::text||to_jsonb(r)::text) from ai_tutor_sessions s join professor_budget_reservations r on r.id=s.budget_reservation_id where s.id='{session_id}'") == obligation_hash
    assert sql(f"select count(*) from lh_internal.written_professor_references where id='{start_reference}'") == "1"
    print("PASS: cleanup skips start lock and preserves bound session/reservation bytes", flush=True)

    # A second cleanup instance reports a skip instead of overlapping batches.
    with Connection("retention_cleanup_owner") as owner:
        owner.send("select pg_advisory_xact_lock(hashtextextended('lh_internal.prune_professor_ephemera_v1',0));select 'cleanup_advisory_locked'")
        owner.until("cleanup_advisory_locked")
        result = cleanup()
        assert result == {
            "status": "skipped", "reason": "cleanup_already_running",
            "deletedPreflights": 0, "deletedConsumedPreflights": 0,
            "deletedUnconsumedPreflights": 0, "deletedUnboundReferences": 0,
        }
        owner.send("rollback")
    print("PASS: overlapping cleanup is bounded by a transaction advisory lock", flush=True)
finally:
    if created_references:
        ids = ",".join(f"'{value}'" for value in created_references)
        sql(f"delete from lh_internal.professor_preflights where reference_id in({ids});delete from lh_internal.written_professor_references where id in({ids})")
    if created_sessions:
        ids = ",".join(f"'{value}'" for value in created_sessions)
        sql(f"delete from ai_tutor_sessions where id in({ids})")
    if created_reservations:
        ids = ",".join(f"'{value}'" for value in created_reservations)
        sql(f"delete from professor_budget_reservations where id in({ids})")

assert sql("select count(*) from lh_internal.professor_preflights where sealed='fixture-retention-race'") == "0"
print(json.dumps({"status": "passed", "races": 4, "providerCalls": 0, "connectedWrites": 0}))
