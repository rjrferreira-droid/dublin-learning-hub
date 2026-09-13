import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const clip = (v: unknown, max = 5000) => String(v ?? "").slice(0, max);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return json({ error: "openai_not_configured" }, 503);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const user = authData.user;
  if (authError || !user) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const sdp = String(body.sdp ?? "");
  const tutorSessionId = String(body.tutor_session_id ?? "");
  if (!sdp.startsWith("v=0") || sdp.length > 100000 || !tutorSessionId) return json({ error: "invalid_request" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: tutorSession } = await admin.from("ai_tutor_sessions").select("id,user_id,lesson_id,status").eq("id", tutorSessionId).eq("user_id", user.id).maybeSingle();
  if (!tutorSession) return json({ error: "tutor_session_not_found" }, 404);

  const { data: profile } = await admin.from("profiles").select("display_name,learner_track").eq("id", user.id).single();
  const { data: lesson } = await admin.from("lessons").select("id,module_id,title,technical_brief_pt,global_core_pt,ireland_overlay_pt,worked_example_pt,interview_angle_pt").eq("id", tutorSession.lesson_id).eq("is_published", true).single();
  if (!profile || !lesson) return json({ error: "lesson_context_not_found" }, 404);
  const { data: moduleRow } = await admin.from("modules").select("course_id,title").eq("id", lesson.module_id).single();
  const { data: courseRow } = moduleRow ? await admin.from("courses").select("learner_track").eq("id", moduleRow.course_id).single() : { data: null };
  if (!courseRow || courseRow.learner_track !== profile.learner_track) return json({ error: "forbidden" }, 403);

  const [{ data: terms }, { data: caseRows }] = await Promise.all([
    admin.from("lesson_terms").select("term_en,definition_en").eq("lesson_id", lesson.id).order("sequence").limit(8),
    admin.from("cases").select("title,scenario_pt,prompt_pt").eq("lesson_id", lesson.id).order("sequence").limit(1),
  ]);

  const learnerStyle = profile.learner_track === "viviane_payroll"
    ? "The learner is preparing for Irish Payroll / Payroll Specialist / HR Operations roles. Use clear B1-B2 professional English initially and gradually increase difficulty. Prioritize workplace communication, payroll accuracy, controls and employee explanations."
    : "The learner is an experienced Finance Manager preparing for Financial Controller / Senior Finance Manager / Regional Finance Manager roles in Dublin. Use fluent professional English and challenge him at manager/controller level. Combine ACCA/global finance thinking with the Ireland overlay when relevant.";
  const termContext = (terms ?? []).map((t) => `${t.term_en}: ${t.definition_en}`).join("; ");
  const caseContext = caseRows?.[0] ? `${caseRows[0].title}: ${clip(caseRows[0].scenario_pt, 1800)} Task: ${clip(caseRows[0].prompt_pt, 900)}` : "";
  const instructions = `You are the Dublin Learning Hub Professor, an expert professional tutor conducting a live oral lesson in English.\nLearner: ${profile.display_name}. ${learnerStyle}\nTopic: ${lesson.title}.\nModule: ${moduleRow?.title ?? ""}.\n\nSOURCE LESSON CONTEXT:\nTechnical brief: ${clip(lesson.technical_brief_pt)}\nGlobal/ACCA core: ${clip(lesson.global_core_pt, 2800)}\nIreland overlay: ${clip(lesson.ireland_overlay_pt, 2800)}\nWorked example: ${clip(lesson.worked_example_pt, 1800)}\nManager/interview angle: ${clip(lesson.interview_angle_pt, 1500)}\nTechnical vocabulary: ${clip(termContext, 1800)}\nPractice scenario: ${clip(caseContext, 2500)}\n\nTEACHING RULES:\n- Conduct the conversation in English.\n- Ask ONE question at a time, progressing from understanding to application to professional judgement.\n- Aim for roughly 70% learner speaking time.\n- Adapt every follow-up to the learner's previous answer.\n- If an answer is incomplete or wrong, first use a Socratic follow-up before explaining.\n- Test technical knowledge and professional communication.\n- Do not interrupt for every grammar mistake; keep notes for final evaluation.\n- Use precise technical vocabulary naturally.\n- Keep professor turns concise, normally under 35 seconds.\n- Never invent current Irish rates beyond the lesson context.\n- Start by greeting the learner briefly and asking the first substantive question.\n- Do not give numerical scores during the live conversation.`;

  const sessionConfig = {
    type: "realtime",
    model: "gpt-realtime-2.1-mini",
    output_modalities: ["audio"],
    instructions,
    max_output_tokens: 700,
    audio: {
      input: {
        noise_reduction: { type: "near_field" },
        transcription: { model: "gpt-4o-mini-transcribe", language: "en", prompt: "Professional finance, accounting, ACCA, Irish payroll and business English terminology." },
        turn_detection: { type: "semantic_vad" }
      },
      output: { voice: "marin" }
    }
  };

  const openai = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sdp, session: sessionConfig }),
  });
  const answer = await openai.text();
  if (!openai.ok) {
    let detail = answer;
    try { const parsed = JSON.parse(answer); detail = parsed?.error?.message ?? parsed?.message ?? answer; } catch {}
    await admin.from("activity_log").insert({
      user_id: user.id,
      activity_type: "webrtc_error",
      entity_type: "ai_tutor_session",
      entity_id: tutorSessionId,
      metadata: { openai_status: openai.status, detail: clip(detail, 1800) }
    });
    console.error("Realtime call creation failed", openai.status, clip(detail, 1200));
    return json({ error: "openai_signal_failed", status: openai.status, detail: clip(detail, 500) }, 502);
  }

  await admin.from("activity_log").insert({
    user_id: user.id,
    activity_type: "webrtc_connected",
    entity_type: "ai_tutor_session",
    entity_id: tutorSessionId,
    metadata: { model: "gpt-realtime-2.1-mini" }
  });
  return json({ sdp_answer: answer, tutor_session_id: tutorSessionId });
});