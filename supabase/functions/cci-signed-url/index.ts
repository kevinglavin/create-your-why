// Mints a short-lived ElevenLabs signed URL so the browser can start a voice
// conversation without ever seeing the ElevenLabs API key.
//
// Secrets (set via: supabase secrets set ...):
//   ELEVENLABS_API_KEY    - your ElevenLabs API key
//   ELEVENLABS_AGENT_ID   - the CCI agent id
//   ALLOWED_ORIGINS       - comma-separated list, e.g.
//                           https://createyourwhy.com,http://localhost:8000

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (!origin || !ALLOWED.includes(origin)) {
    return new Response(JSON.stringify({ error: "origin not allowed" }), {
      status: 403,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");
  if (!apiKey || !agentId) {
    return new Response(JSON.stringify({ error: "server not configured" }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    { headers: { "xi-api-key": apiKey } },
  );

  if (!r.ok) {
    const detail = await r.text();
    return new Response(
      JSON.stringify({ error: "elevenlabs error", status: r.status, detail }),
      { status: 502, headers: { ...cors, "content-type": "application/json" } },
    );
  }

  const data = await r.json(); // { signed_url: "wss://..." }
  return new Response(JSON.stringify({ signed_url: data.signed_url }), {
    status: 200,
    headers: { ...cors, "content-type": "application/json" },
  });
});
