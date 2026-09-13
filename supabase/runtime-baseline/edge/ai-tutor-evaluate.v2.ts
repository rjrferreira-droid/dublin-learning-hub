import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const clamp = (n: unknown) => Math.max(0, Math.min(100, Number(n ?? 0)));

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text;
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

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
  const { data: authData } = await userClient.auth.getUser();
  const user = authData.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const sessionId = String(body.session_id ?? "");
  const voiceObservations = body.voice_observations ?? null;
  const durationSeconds = Math.max(0, Number(body.duration_seconds ?? 0));
  const realtimeUsage = body.realtime_usage ?? {};
  if (!sessionId) return json({ error: "session_id_required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: tutorSession } = await admin.from("ai_tutor_sessions").select("*").eq("id", sessionId).eq("user_id", user.id).single();
  if (!tutorSession) return json({ error: "session_not_found" }, 404);

  const { data: turns } = await admin.from("ai_tutor_turns").select("turn_number,speaker,transcript,technical_score,english_score").eq("session_id", sessionId).order("turn_number");
  const learnerTurns = (turns ?? []).filter((t) => t.speaker === "learner" && String(t.transcript ?? "").trim());
  if (learnerTurns.length < 1) return json({ error: "not_enough_conversation" }, 400);

  const { data: lesson } = await admin.from("lessons").select("id,title,technical_brief_pt,global_core_pt,ireland_overlay_pt,worked_example_pt,interview_angle_pt").eq("id", tutorSession.lesson_id).single();
  const { data: profile } = await admin.from("profiles").select("display_name,learner_track").eq("id", user.id).single();
  const { data: competencies } = await admin.from("lesson_competencies").select("competency_id,weight,competencies(code,name)").eq("lesson_id", tutorSession.lesson_id);

  const transcript = (turns ?? []).map((t) => `${t.speaker === "learner" ? "LEARNER" : "PROFESSOR"}: ${t.transcript}`).join("\n");
  const learnerRole = profile?.learner_track === "viviane_payroll"
    ? "Irish Payroll / Payroll Specialist / HR Operations candidate. English is being developed progressively, so judge professional clarity fairly while still identifying improvement areas."
    : "Experienced Finance Manager preparing for Financial Controller / Senior Finance Manager / Regional Finance Manager roles. Expect manager-level technical precision and business judgement.";

  const schema = {
    type: "object",
    properties: {
      technical_score: { type: "number", minimum: 0, maximum: 100 },
      english_score: { type: "number", minimum: 0, maximum: 100 },
      grammar_score: { type: "number", minimum: 0, maximum: 100 },
      vocabulary_score: { type: "number", minimum: 0, maximum: 100 },
      fluency_score: { type: "number", minimum: 0, maximum: 100 },
      pronunciation_score: { anyOf: [{ type: "number", minimum: 0, maximum: 100 }, { type: "null" }] },
      professional_communication_score: { type: "number", minimum: 0, maximum: 100 },
      technical_feedback: { type: "string" },
      english_feedback: { type: "string" },
      overall_feedback: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      gaps: { type: "array", items: { type: "string" } },
      review_terms: { type: "array", items: { type: "string" } },
      corrected_phrases: {
        type: "array",
        items: {
          type: "object",
          properties: { original: { type: "string" }, better: { type: "string" }, why: { type: "string" } },
          required: ["original", "better", "why"],
          additionalProperties: false,
        },
      },
    },
    required: ["technical_score", "english_score", "grammar_score", "vocabulary_score", "fluency_score", "pronunciation_score", "professional_communication_score", "technical_feedback", "english_feedback", "overall_feedback", "strengths", "gaps", "review_terms", "corrected_phrases"],
    additionalProperties: false,
  };

  const evaluationPrompt = `Evaluate this live oral tutoring session. Do not reveal private reasoning; return only the requested structured assessment.

LEARNER PROFILE: ${learnerRole}
LESSON: ${lesson?.title ?? ""}
TECHNICAL CONTEXT:
${String(lesson?.technical_brief_pt ?? "").slice(0, 7000)}
${String(lesson?.global_core_pt ?? "").slice(0, 3500)}
${String(lesson?.ireland_overlay_pt ?? "").slice(0, 3500)}
${String(lesson?.worked_example_pt ?? "").slice(0, 2200)}
${String(lesson?.interview_angle_pt ?? "").slice(0, 1800)}

TRANSCRIPT:
${transcript.slice(0, 24000)}

VOICE-MODEL OBSERVATIONS FROM THE LIVE AUDIO (may be absent):
${voiceObservations ? JSON.stringify(voiceObservations).slice(0, 5000) : "Not available. If absent, set pronunciation_score to null and judge fluency from transcript conservatively."}

SCORING RULES:
- Technical score: accuracy, completeness, application and professional judgement. Do not reward confident but incorrect statements.
- English score: ability to communicate professionally in English, not accent conformity.
- Grammar: grammatical control in spontaneous speech.
- Vocabulary: range and precision, especially technical vocabulary.
- Fluency: coherent, natural delivery; use live-audio observations if available.
- Pronunciation: intelligibility only. Do not penalize a Brazilian accent. If audio observations are unavailable, return null.
- Professional communication: structure, concision, stakeholder-ready language and ability to explain reasoning.
- Corrected phrases: include only genuine useful corrections from what the learner actually said; do not invent errors.
- Feedback should be concise, specific and actionable.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-terra",
      store: false,
      input: [
        { role: "system", content: "You are a rigorous professional finance/payroll tutor and English communication assessor." },
        { role: "user", content: evaluationPrompt },
      ],
      text: { format: { type: "json_schema", name: "tutor_evaluation", strict: true, schema } },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Tutor evaluation failed", response.status, detail);
    return json({ error: "evaluation_failed", status: response.status }, 502);
  }

  const data = await response.json();
  const raw = extractOutputText(data);
  let evaluation: any;
  try { evaluation = JSON.parse(raw); } catch {
    console.error("Invalid structured output", raw);
    return json({ error: "invalid_evaluation_output" }, 502);
  }

  const pronunciation = evaluation.pronunciation_score == null ? null : clamp(evaluation.pronunciation_score);
  const payload = {
    status: "completed",
    completed_at: new Date().toISOString(),
    duration_seconds: durationSeconds || null,
    technical_score: clamp(evaluation.technical_score),
    english_score: clamp(evaluation.english_score),
    grammar_score: clamp(evaluation.grammar_score),
    vocabulary_score: clamp(evaluation.vocabulary_score),
    fluency_score: clamp(evaluation.fluency_score),
    pronunciation_score: pronunciation,
    professional_communication_score: clamp(evaluation.professional_communication_score),
    final_feedback: evaluation,
  };
  await admin.from("ai_tutor_sessions").update(payload).eq("id", sessionId).eq("user_id", user.id);

  // Feed the technical result into the lesson competency map.
  for (const lc of competencies ?? []) {
    const { data: current } = await admin.from("user_competency_scores").select("score,evidence_count").eq("user_id", user.id).eq("competency_id", lc.competency_id).maybeSingle();
    const oldEvidence = Number(current?.evidence_count ?? 0);
    const oldScore = Number(current?.score ?? 0);
    const weight = Math.max(0.25, Number(lc.weight ?? 1));
    const effectiveEvidence = Math.max(1, weight);
    const newEvidence = oldEvidence + 1;
    const newScore = oldEvidence > 0 ? Math.round((oldScore * oldEvidence + payload.technical_score * effectiveEvidence) / (oldEvidence + effectiveEvidence)) : Math.round(payload.technical_score);
    await admin.from("user_competency_scores").upsert({
      user_id: user.id,
      competency_id: lc.competency_id,
      score: newScore,
      confidence: Math.min(100, newEvidence * 20),
      evidence_count: newEvidence,
      last_assessed_at: new Date().toISOString(),
    }, { onConflict: "user_id,competency_id" });
  }

  // Feed the English result into the dedicated English competency where available.
  const { data: englishComp } = await admin.from("competencies").select("id").eq("learner_track", profile?.learner_track).eq("code", "ENG").maybeSingle();
  if (englishComp) {
    const { data: current } = await admin.from("user_competency_scores").select("score,evidence_count").eq("user_id", user.id).eq("competency_id", englishComp.id).maybeSingle();
    const oldEvidence = Number(current?.evidence_count ?? 0);
    const oldScore = Number(current?.score ?? 0);
    const newScore = oldEvidence > 0 ? Math.round((oldScore * oldEvidence + payload.english_score) / (oldEvidence + 1)) : Math.round(payload.english_score);
    await admin.from("user_competency_scores").upsert({
      user_id: user.id,
      competency_id: englishComp.id,
      score: newScore,
      confidence: Math.min(100, (oldEvidence + 1) * 20),
      evidence_count: oldEvidence + 1,
      last_assessed_at: new Date().toISOString(),
    }, { onConflict: "user_id,competency_id" });
  }

  const inputTokens = Number(data?.usage?.input_tokens ?? 0);
  const cachedInput = Number(data?.usage?.input_tokens_details?.cached_tokens ?? 0);
  const outputTokens = Number(data?.usage?.output_tokens ?? 0);
  // Conservative standard short-context estimate for GPT-5.6 Terra: $2/M input, $12/M output.
  const evalCost = inputTokens * 2 / 1_000_000 + outputTokens * 12 / 1_000_000;

  // Realtime usage can be supplied from response.done events. Treat it as metering data only, never as authorization data.
  const audioInput = Number(realtimeUsage.audio_input_tokens ?? 0);
  const audioOutput = Number(realtimeUsage.audio_output_tokens ?? 0);
  const textInput = Number(realtimeUsage.input_tokens ?? 0);
  const textOutput = Number(realtimeUsage.output_tokens ?? 0);
  const realtimeCost = audioInput * 10 / 1_000_000 + audioOutput * 20 / 1_000_000 + textInput * 0.60 / 1_000_000 + textOutput * 2.40 / 1_000_000;

  await admin.from("ai_usage_log").insert([
    {
      user_id: user.id,
      session_id: sessionId,
      feature: "tutor_evaluation",
      model: "gpt-5.6-terra",
      input_tokens: inputTokens,
      cached_input_tokens: cachedInput,
      output_tokens: outputTokens,
      estimated_cost_usd: Number(evalCost.toFixed(6)),
      request_id: data?.id ?? null,
    },
    {
      user_id: user.id,
      session_id: sessionId,
      feature: "realtime_tutor",
      model: "gpt-realtime-2.1-mini",
      input_tokens: textInput,
      output_tokens: textOutput,
      audio_input_tokens: audioInput,
      audio_output_tokens: audioOutput,
      audio_seconds: durationSeconds || null,
      estimated_cost_usd: Number(realtimeCost.toFixed(6)),
    },
  ]);

  return json({ session_id: sessionId, evaluation, estimated_cost_usd: Number((evalCost + realtimeCost).toFixed(4)) });
});