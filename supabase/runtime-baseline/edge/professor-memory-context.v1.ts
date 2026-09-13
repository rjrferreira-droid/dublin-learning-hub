import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});
function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function clean(value: unknown, max = 600): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function strings(value: unknown, max = 3): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max) : [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "backend_not_configured" }, 503);

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "invalid_request" }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const sessionId = body.sessionId;
  const callbackToken = clean(body.callbackToken, 256);
  if (!isUuid(sessionId) || callbackToken.length < 32) return json({ error: "invalid_callback_credentials" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: current } = await admin
    .from("ai_tutor_sessions")
    .select("id,user_id,lesson_id,callback_token_hash")
    .eq("id", sessionId)
    .maybeSingle();
  if (!current?.callback_token_hash || !current?.user_id) return json({ error: "session_not_found" }, 404);
  if (await sha256Hex(callbackToken) !== current.callback_token_hash) return json({ error: "invalid_callback_credentials" }, 401);

  const [sessions, errors, competencies, reviews] = await Promise.all([
    admin.from("ai_tutor_sessions")
      .select("id,started_at,lesson_id,technical_score,english_score,grammar_score,vocabulary_score,fluency_score,professional_communication_score,final_feedback,lessons(title)")
      .eq("user_id", current.user_id)
      .eq("status", "completed")
      .neq("id", sessionId)
      .order("started_at", { ascending: false })
      .limit(3),
    admin.from("user_error_bank")
      .select("domain,pattern,frequency,confidence,next_review_at")
      .eq("user_id", current.user_id)
      .eq("status", "active")
      .order("confidence", { ascending: false })
      .limit(6),
    admin.from("user_competency_scores")
      .select("score,confidence,evidence_count,competencies(name,category)")
      .eq("user_id", current.user_id)
      .order("score", { ascending: true })
      .limit(6),
    admin.from("spaced_reviews")
      .select("review_stage,due_date,status,lesson_id,lessons(title)")
      .eq("user_id", current.user_id)
      .in("status", ["due", "scheduled"])
      .order("due_date", { ascending: true })
      .limit(4),
  ]);

  const priorSessions = (sessions.data ?? []).map((row: any) => {
    const lesson = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
    const feedback = asObject(row.final_feedback);
    return {
      lessonTitle: clean(lesson?.title, 200) || "Previous Professor session",
      startedAt: row.started_at,
      scores: {
        technical: row.technical_score,
        english: row.english_score,
        grammar: row.grammar_score,
        vocabulary: row.vocabulary_score,
        fluency: row.fluency_score,
        professionalCommunication: row.professional_communication_score,
      },
      summary: clean(feedback?.summary, 700),
      improvements: strings(feedback?.improvements, 3),
      nextSessionFocus: strings(feedback?.nextSessionFocus, 3),
    };
  });

  const activeErrors = (errors.data ?? []).map((row: any) => ({
    domain: clean(row.domain, 40),
    pattern: clean(row.pattern, 500),
    frequency: Number(row.frequency) || 1,
    confidence: Number(row.confidence) || 0,
    nextReviewAt: row.next_review_at,
  }));

  const competencyProfile = (competencies.data ?? []).flatMap((row: any) => {
    const item = Array.isArray(row.competencies) ? row.competencies[0] : row.competencies;
    if (!item?.name) return [];
    return [{
      name: clean(item.name, 180),
      category: clean(item.category, 60),
      score: Number(row.score) || 0,
      confidence: Number(row.confidence) || 0,
      evidenceCount: Number(row.evidence_count) || 0,
    }];
  });

  const upcomingReviews = (reviews.data ?? []).map((row: any) => {
    const lesson = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
    return {
      stage: clean(row.review_stage, 20),
      dueDate: row.due_date,
      status: clean(row.status, 20),
      lessonTitle: clean(lesson?.title, 200) || "Adaptive review",
    };
  });

  return json({
    priorSessions,
    activeErrors,
    competencyProfile,
    upcomingReviews,
    generatedAt: new Date().toISOString(),
  });
});
