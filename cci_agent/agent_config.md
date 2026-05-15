# ElevenLabs Agent — Dashboard Configuration

Create one agent in the ElevenLabs dashboard (Agents → Create agent).

## Core
- **Name:** FYiT — CCI Interviewer
- **LLM:** Anthropic **Claude Sonnet 4.5**
- **System prompt:** paste the body of `cci_agent/system_prompt.md`
- **First message:** leave empty (the prompt tells the agent to open with the
  contract question) — or set: "Hi, I'm really glad you're here. Whenever
  you're ready — how can I be useful to you today?"
- **Voice:** any warm, unhurried voice (e.g. a calm mid-range narrator voice).
  Kevin's own voice is *not* required.
- **Language:** English (add others later if needed).

## Conversation settings
- Turn timeout / silence: generous (this is a reflective interview — do not
  rush the client).
- Max conversation duration: raise to at least 60 minutes.
- Enable interruptions: on.

## Dynamic variables
- Declare `session_id` (string). The web page passes it via the widget's
  `dynamic-variables` attribute and the prompt instructs the agent to send it
  to `save_cci_data`.

## Tools
- Add one **webhook (server) tool** named `save_cci_data` using
  `cci_agent/server_tool_save_cci.json` as the reference.
  - URL: `https://<project-ref>.supabase.co/functions/v1/cci-save`
  - Header `x-cci-secret`: the value of the `CCI_SHARED_SECRET` you set in
    Supabase (store it as an ElevenLabs secret and reference it).

## Security / Auth
- **Enable authentication** (require signed URLs).
- **Allowlist** the site origin(s) that may start conversations, e.g.
  `https://createyourwhy.com` and your staging/localhost origin for testing.
- This is what makes the `cci-signed-url` Supabase function the only way to
  start a session, so the agent can't be abused from arbitrary sites.

## After creating
Copy the **Agent ID**. You'll set it as the `ELEVENLABS_AGENT_ID` secret on the
`cci-signed-url` Supabase function (see `SETUP.md`).

## V2 (later, optional) — Subagent workflow
The prior project notes describe an 8-stage "specialized Kevins" workflow
(Contract, Role Models, TV Shows, Story, Saying, Early Memories, Advice,
Closing) using ElevenLabs' visual workflow builder with subagent/transfer
nodes, each with its own tightened prompt and its own save webhook. Keep V1 as
a single agent until the interview quality is validated; then split the
`system_prompt.md` sections into subagent nodes and reuse the same `cci-save`
function (one tool per node is optional — a single shared tool works).
