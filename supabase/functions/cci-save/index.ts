// Webhook target for the ElevenLabs agent's `save_cci_data` server tool.
// Verifies a shared secret, then upserts the (partial) CCI payload into
// public.cci_sessions, merging with whatever was saved earlier in the session.
//
// Secrets:
//   CCI_SHARED_SECRET   - must match the x-cci-secret header the agent sends
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)

const ALLOWED_COLUMNS = new Set([
  "session_id", "email", "client_name", "challenge",
  "rm_1_name", "rm_1_adjective", "rm_1_describe", "rm_1_advice",
  "rm_2_name", "rm_2_adjective", "rm_2_describe", "rm_2_advice",
  "rm_3_name", "rm_3_adjective", "rm_3_describe", "rm_3_advice",
  "tv_1_name", "tv_1_verb", "tv_1_describe",
  "tv_2_name", "tv_2_verb", "tv_2_describe",
  "tv_3_name", "tv_3_verb", "tv_3_describe",
  "fav_story_title", "fav_story_character", "fav_story_plot", "fav_character_describe",
  "fav_saying", "fav_saying_describe",
  "em_1_title", "em_1_describe", "em_1_feeling", "em_1_feeling_positive",
  "em_2_title", "em_2_describe", "em_2_feeling", "em_2_feeling_positive",
  "em_3_title", "em_3_describe", "em_3_feeling", "em_3_feeling_positive",
  "combined_holland_code", "cci_summary",
]);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const expected = Deno.env.get("CCI_SHARED_SECRET");
  if (!expected || req.headers.get("x-cci-secret") !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!body.session_id || typeof body.session_id !== "string") {
    return new Response(JSON.stringify({ error: "session_id required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Keep only known columns with non-empty values.
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_COLUMNS.has(k) && v !== null && v !== undefined && v !== "") {
      row[k] = v;
    }
  }
  row.session_id = body.session_id;

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // PostgREST upsert with merge-duplicates: columns absent from the payload
  // keep their existing values, so section-by-section partial saves accumulate.
  const r = await fetch(`${url}/rest/v1/cci_sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "apikey": key!,
      "authorization": `Bearer ${key}`,
      "Prefer": "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!r.ok) {
    const detail = await r.text();
    return new Response(JSON.stringify({ error: "db error", detail }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
