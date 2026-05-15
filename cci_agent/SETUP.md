# FYiT / CCI Voice Chatbot — Setup Runbook

End-to-end wiring. Components: a static page on the site, an ElevenLabs voice
agent (Claude Sonnet 4.5 + the CCI prompt), and two Supabase Edge Functions
backed by a Postgres table.

```
cci.html ──signed url──► cci-signed-url ──► ElevenLabs (agent, Claude)
   │                                            │ save_cci_data webhook
   └──Realtime◄── cci_sessions ◄── cci-save ◄────┘
```

## 1. Supabase

The project `CCI_2` (ref `nfcylkqbmgtjuqlhznhx`) is currently **paused** —
restore it (Supabase dashboard → project → Restore), or pick another project
and use its ref everywhere below.

Apply the migration and deploy the functions:

```bash
supabase link --project-ref <project-ref>
supabase db push                       # applies supabase/migrations/0001_cci_sessions.sql
supabase functions deploy cci-signed-url
supabase functions deploy cci-save
```

Set secrets:

```bash
supabase secrets set ELEVENLABS_API_KEY=<your-elevenlabs-api-key>
supabase secrets set ELEVENLABS_AGENT_ID=<created-in-step-2>
supabase secrets set ALLOWED_ORIGINS="https://createyourwhy.com,http://localhost:8000"
supabase secrets set CCI_SHARED_SECRET=<random-long-string>
```

(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

> The agent ID isn't known until step 2 — set `ELEVENLABS_AGENT_ID` after.
> Re-deploy `cci-signed-url` is not needed; secrets update live.

## 2. ElevenLabs agent

Follow `agent_config.md`:
- Create the agent, LLM = **Claude Sonnet 4.5**, paste `system_prompt.md`.
- Pick a warm voice. Declare dynamic variable `session_id`.
- Add a **webhook tool** `save_cci_data` per `server_tool_save_cci.json`:
  - URL: `https://<project-ref>.supabase.co/functions/v1/cci-save`
  - Header `x-cci-secret` = the `CCI_SHARED_SECRET` value.
- Enable authentication; allowlist `https://createyourwhy.com` (and your test
  origin).
- Copy the **Agent ID** → `supabase secrets set ELEVENLABS_AGENT_ID=...`.

## 3. Front-end config

Edit the `CONFIG` block at the top of `js/cci.js`:
- `SUPABASE_URL` = `https://<project-ref>.supabase.co`
- `SUPABASE_ANON_KEY` = the project's anon/publishable key
- `FUNCTIONS_BASE` = `https://<project-ref>.supabase.co/functions/v1`

The "Try FYiT Now" button on `index.html` already points to `cci.html`.

## 4. Test (verification)

```bash
# DB exists
#   Supabase → Table editor → cci_sessions

# signed url (from an allowed origin)
curl -s -H "Origin: http://localhost:8000" \
  https://<project-ref>.supabase.co/functions/v1/cci-signed-url
# → {"signed_url":"wss://..."}   (403 from a disallowed origin)

# save (partial upsert)
curl -s -X POST https://<project-ref>.supabase.co/functions/v1/cci-save \
  -H "content-type: application/json" -H "x-cci-secret: <CCI_SHARED_SECRET>" \
  -d '{"session_id":"test-1","challenge":"figuring out my next move"}'
# → {"ok":true}     (401 with a wrong/missing secret)

# full page
python3 -m http.server 8000   # then open http://localhost:8000/cci.html
```

Then run a short live interview: click **Begin the Interview**, grant the mic,
answer the contract question and one role model. Confirm the agent speaks in
Kevin's warm style, the `cci_sessions` row fills in section-by-section, and the
"Your Story So Far" sidebar updates live.

## Notes & next steps
- V1 is one agent + one save tool, to validate interview quality first.
- V2: split `system_prompt.md` sections into ElevenLabs subagent/workflow nodes
  (the "specialized Kevins"); reuse the same `cci-save`.
- Later: sync `cci_sessions` rows to the FYiT `tblCSI` (column names already
  match) and generate the 32-page PDF report from a row.
- RLS currently allows anon `select` (rows guarded by unguessable UUID). For
  stricter isolation, issue a per-session JWT and filter by a claim.
