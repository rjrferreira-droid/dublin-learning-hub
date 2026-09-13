import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
async function hashUserId(value: string) { const bytes = new TextEncoder().encode(value); const digest = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
function clip(value: unknown, max = 5500) { return String(value ?? "").slice(0, max); }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const user = authData.user;
  if (authError || !user) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const lessonId = String(body.lesson_id ?? "");
  const mode = String(body.mode ?? "chapter_conversation");
  const allowedModes = new Set(["chapter_conversation", "english_drill", "oral_mock", "case_feedback"]);
  if (!lessonId || !allowedModes.has(mode)) return json({ error: "invalid_request" }, 400);
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: settings } = await admin.from("ai_budget_settings").select("monthly_budget_usd,warning_threshold_pct,hard_stop_enabled").eq("id", 1).maybeSingle();
  const now = new Date(); const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data: usageRows } = await admin.from("ai_usage_log").select("estimated_cost_usd").gte("created_at", monthStart);
  const spent = (usageRows ?? []).reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0);
  const monthlyBudget = Number(settings?.monthly_budget_usd ?? 25);
  if (settings?.hard_stop_enabled && spent >= monthlyBudget) return json({ error: "ai_budget_reached", spent_usd: spent, monthly_budget_usd: monthlyBudget }, 429);

  const { data: profile, error: profileError } = await admin.from("profiles").select("display_name,learner_track").eq("id", user.id).single();
  if (profileError || !profile) return json({ error: "profile_not_found" }, 404);
  const { data: lesson, error: lessonError } = await admin.from("lessons").select("id,module_id,title,subtitle,technical_brief_pt,global_core_pt,ireland_overlay_pt,worked_example_pt,interview_angle_pt").eq("id", lessonId).eq("is_published", true).single();
  if (lessonError || !lesson) return json({ error: "lesson_not_found" }, 404);
  const { data: moduleRow } = await admin.from("modules").select("course_id,title").eq("id", lesson.module_id).single();
  const { data: courseRow } = moduleRow ? await admin.from("courses").select("learner_track,title").eq("id", moduleRow.course_id).single() : { data: null };
  if (!courseRow || courseRow.learner_track !== profile.learner_track) return json({ error: "forbidden" }, 403);

  const [{ data: terms }, { data: caseRows }] = await Promise.all([
    admin.from("lesson_terms").select("term_en,definition_en").eq("lesson_id", lessonId).order("sequence").limit(8),
    admin.from("cases").select("title,scenario_pt,prompt_pt").eq("lesson_id", lessonId).order("sequence").limit(1),
  ]);
  const { data: tutorSession, error: sessionError } = await admin.from("ai_tutor_sessions").insert({ user_id: user.id, lesson_id: lessonId, mode, status: "active" }).select("id").single();
  if (sessionError || !tutorSession) return json({ error: "session_create_failed" }, 500);

  const learnerStyle = profile.learner_track === "viviane_payroll"
    ? "The learner is preparing for Irish Payroll / Payroll Specialist / HR Operations roles. Use clear B1-B2 professional English at first, then gradually increase difficulty. Prioritize workplace communication, payroll accuracy, controls and employee explanations."
    : "The learner is an experienced Finance Manager preparing for Financial Controller / Senior Finance Manager / Regional Finance Manager roles in Dublin. Use fluent professional English and challenge him at manager/controller level. Combine ACCA/global finance thinking with the Ireland overlay when relevant.";
  const termContext = (terms ?? []).map((t) => `${t.term_en}: ${t.definition_en}`).join("; ");
  const caseContext = caseRows?.[0] ? `${caseRows[0].title}: ${clip(caseRows[0].scenario_pt, 1800)} Task: ${clip(caseRows[0].prompt_pt, 900)}` : "";
  const instructions = `You are the Dublin Learning Hub Professor, an expert professional tutor conducting a live oral lesson in English.
Learner: ${profile.display_name}. ${learnerStyle}
Topic: ${lesson.title}.
Module: ${moduleRow?.title ?? ""}.

SOURCE LESSON CONTEXT (authoritative for this tutoring session):
Technical brief: ${clip(lesson.technical_brief_pt)}
Global/ACCA core: ${clip(lesson.global_core_pt, 2800)}
Ireland overlay: ${clip(lesson.ireland_overlay_pt, 2800)}
Worked example: ${clip(lesson.worked_example_pt, 1800)}
Manager/interview angle: ${clip(lesson.interview_angle_pt, 1500)}
Technical vocabulary: ${clip(termContext, 1800)}
Practice scenario: ${clip(caseContext, 2500)}

TEACHING RULES:
- Conduct the conversation in English. If the learner explicitly asks for a brief Portuguese clarification, answer briefly and return to English.
- Ask ONE question at a time. Start with understanding, then application, then professional judgement.
- Aim for roughly 70% learner speaking time. Do not deliver long lectures.
- Adapt each follow-up to the learner's previous answer; do not mechanically follow a fixed script.
- If an answer is incomplete or wrong, first use a Socratic follow-up. Explain the answer only after giving the learner a chance to self-correct.
- Test both technical knowledge and the ability to explain it as a professional in a meeting/interview.
- Do NOT interrupt for every grammar mistake. Correct immediately only if meaning is unclear. Keep mental notes for the final evaluation.
- Encourage precise technical vocabulary naturally, without sounding like a language-learning robot.
- Keep each professor turn concise, normally under 35 seconds.
- Never invent current Irish tax/payroll rates beyond the supplied lesson context. If a current rate is not in context, say that it should be verified rather than guessing.
- Start the session by greeting the learner briefly and asking the first substantive question about this chapter.
- Do not give numerical scores during the live conversation. Scores are delivered after the session ends.`;

  if (!openaiKey) { await admin.from("ai_tutor_sessions").update({ status: "abandoned", completed_at: new Date().toISOString() }).eq("id", tutorSession.id); return json({ error: "openai_not_configured", session_id: tutorSession.id }, 503); }

  const safetyId = await hashUserId(user.id);
  const sessionConfig = {
    session: {
      type: "realtime",
      model: "gpt-realtime-2.1-mini",
      output_modalities: ["audio"],
      instructions,
      max_output_tokens: 700,
      audio: {
        input: {
          noise_reduction: { type: "near_field" },
          transcription: { model: "gpt-4o-mini-transcribe", language: "en", prompt: "Professional finance, accounting, ACCA, Irish payroll and business English terminology." },
          turn_detection: { type: "semantic_vad" },
        },
        output: { voice: "marin" },
      },
    },
  };
  const openaiResponse = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json", "OpenAI-Safety-Identifier": safetyId },
    body: JSON.stringify(sessionConfig),
  });
  if (!openaiResponse.ok) { const detail = await openaiResponse.text(); await admin.from("ai_tutor_sessions").update({ status: "abandoned", completed_at: new Date().toISOString() }).eq("id", tutorSession.id); console.error("OpenAI realtime token error", openaiResponse.status, detail); return json({ error: "realtime_token_failed", status: openaiResponse.status }, 502); }
  const token = await openaiResponse.json();
  return json({ session_id: tutorSession.id, client_secret: token.value, expires_at: token.expires_at ?? null, model: "gpt-realtime-2.1-mini", voice: "marin", budget: { spent_usd: Number(spent.toFixed(4)), monthly_budget_usd: monthlyBudget } });
});