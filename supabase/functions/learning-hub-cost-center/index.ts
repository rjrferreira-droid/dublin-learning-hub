import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const monthStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthStartIso = monthStartDate.toISOString();
  const monthStartDay = monthStartIso.slice(0, 10);

  const [budgetResult, usageResult, professorResult, sessionsResult] = await Promise.all([
    admin.from("learning_hub_budget_settings")
      .select("absolute_total_budget_usd,infrastructure_reserve_usd,ai_hard_cap_usd,professor_cap_usd,premium_audio_cap_usd")
      .eq("id", 1)
      .maybeSingle(),
    admin.from("ai_usage_log")
      .select("feature,estimated_cost_usd,created_at")
      .gte("created_at", monthStartIso),
    admin.from("professor_budget_reservations")
      .select("reserved_usd,status,actual_cost_usd,created_at")
      .eq("month_start", monthStartDay),
    admin.from("ai_tutor_sessions")
      .select("id,status,started_at")
      .gte("started_at", monthStartIso),
  ]);

  if (budgetResult.error || !budgetResult.data) {
    console.error("cost center budget read failed", budgetResult.error?.message ?? "missing_settings");
    return json({ error: "cost_center_unavailable" }, 503);
  }
  if (usageResult.error || professorResult.error || sessionsResult.error) {
    console.error(
      "cost center usage read failed",
      usageResult.error?.message ?? professorResult.error?.message ?? sessionsResult.error?.message ?? "unknown_usage_error",
    );
    return json({ error: "cost_center_unavailable" }, 503);
  }

  const settings = budgetResult.data;
  const usageRows = usageResult.data ?? [];
  const professorRows = professorResult.data ?? [];
  const sessionRows = sessionsResult.data ?? [];

  const usageByFeature = usageRows.reduce<Record<string, number>>((acc, row) => {
    const feature = String(row.feature ?? "other");
    acc[feature] = (acc[feature] ?? 0) + Number(row.estimated_cost_usd ?? 0);
    return acc;
  }, {});

  const actualAiSpendUsd = Object.values(usageByFeature).reduce((sum, value) => sum + value, 0);
  const activeRows = professorRows.filter((row) => row.status === "active");
  const unresolvedRows = professorRows.filter((row) => row.status === "unresolved");
  const activeReservationUsd = activeRows.reduce((sum, row) => sum + Number(row.reserved_usd ?? 0), 0);
  const unresolvedReservationUsd = unresolvedRows.reduce((sum, row) => sum + Number(row.reserved_usd ?? 0), 0);
  const protectedReservationUsd = activeReservationUsd + unresolvedReservationUsd;

  const professorActualUsd = Number(usageByFeature.professor_livekit ?? 0);
  const professorCommittedUsd = professorActualUsd + protectedReservationUsd;
  const evaluationUsd = Number(usageByFeature.professor_evaluation ?? 0);
  const premiumAudioOnlyUsd = Number(usageByFeature.lesson_audio ?? 0) + Number(usageByFeature.lesson_tts ?? 0);
  const evaluationAndAudioUsd = evaluationUsd + premiumAudioOnlyUsd;
  const aiCommittedUsd = actualAiSpendUsd + protectedReservationUsd;

  const infrastructureReserveUsd = Number(settings.infrastructure_reserve_usd ?? 70);
  const absoluteBudgetUsd = Number(settings.absolute_total_budget_usd ?? 200);
  const aiHardCapUsd = Number(settings.ai_hard_cap_usd ?? 130);
  const professorCapUsd = Number(settings.professor_cap_usd ?? 110);
  const evaluationAudioCapUsd = Number(settings.premium_audio_cap_usd ?? 20);
  const totalCommittedWithReserveUsd = infrastructureReserveUsd + aiCommittedUsd;
  const safetyBufferUsd = Math.max(0, absoluteBudgetUsd - totalCommittedWithReserveUsd);
  const aiRemainingUsd = Math.max(0, aiHardCapUsd - aiCommittedUsd);

  const pct = (value: number, cap: number) => cap > 0 ? Number(((value / cap) * 100).toFixed(1)) : 0;
  const status = safetyBufferUsd >= 20 && aiRemainingUsd >= 15
    ? "safe"
    : safetyBufferUsd >= 10 && aiRemainingUsd >= 5
      ? "watch"
      : "guarded";

  return json({
    month: monthStartDay,
    status,
    budget: {
      absoluteTotalUsd: absoluteBudgetUsd,
      infrastructureReserveUsd,
      aiHardCapUsd,
      professorCapUsd,
      premiumAudioCapUsd: evaluationAudioCapUsd,
    },
    usage: {
      actualAiSpendUsd: Number(actualAiSpendUsd.toFixed(6)),
      loggedAiUsd: Number(actualAiSpendUsd.toFixed(6)),
      professorReservedUsd: Number(protectedReservationUsd.toFixed(6)),
      professorActiveReservedUsd: Number(activeReservationUsd.toFixed(6)),
      professorUnresolvedReservedUsd: Number(unresolvedReservationUsd.toFixed(6)),
      professorActualUsd: Number(professorActualUsd.toFixed(6)),
      professorCommittedUsd: Number(professorCommittedUsd.toFixed(6)),
      professorEvaluationUsd: Number(evaluationUsd.toFixed(6)),
      premiumAudioOnlyUsd: Number(premiumAudioOnlyUsd.toFixed(6)),
      premiumAudioUsd: Number(evaluationAndAudioUsd.toFixed(6)),
      aiCommittedUsd: Number(aiCommittedUsd.toFixed(6)),
      totalCommittedWithReserveUsd: Number(totalCommittedWithReserveUsd.toFixed(6)),
      aiRemainingUsd: Number(aiRemainingUsd.toFixed(6)),
      safetyBufferUsd: Number(safetyBufferUsd.toFixed(6)),
    },
    utilizationPct: {
      total: pct(totalCommittedWithReserveUsd, absoluteBudgetUsd),
      ai: pct(aiCommittedUsd, aiHardCapUsd),
      professor: pct(professorCommittedUsd, professorCapUsd),
      premiumAudio: pct(evaluationAndAudioUsd, evaluationAudioCapUsd),
    },
    features: usageByFeature,
    professorSessions: sessionRows.length,
    professorCompletedSessions: sessionRows.filter((row) => row.status === "completed").length,
    professorActiveReservations: activeRows.length,
    professorUnresolvedReservations: unresolvedRows.length,
    generatedAt: new Date().toISOString(),
  });
});
