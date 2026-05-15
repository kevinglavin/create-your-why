// FYiT / CCI interview page logic.
//
// CONFIG: fill these in (see cci_agent/SETUP.md). The anon key is a publishable
// key and is safe in client code; RLS protects the table.
const CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-SUPABASE-ANON-PUBLISHABLE-KEY",
  // Base URL for the deployed Edge Functions:
  FUNCTIONS_BASE: "https://YOUR-PROJECT-REF.supabase.co/functions/v1",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const els = {
  intro: document.getElementById("cciIntro"),
  start: document.getElementById("cciStart"),
  status: document.getElementById("cciStatus"),
  widgetWrap: document.getElementById("cciWidgetWrap"),
  notebook: document.getElementById("cciNotebook"),
  download: document.getElementById("cciDownload"),
};

let sessionId = null;
let latestRow = {};

function setStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.classList.toggle("error", isError);
}

const SECTIONS = [
  { title: "What Brought You Here", fields: [["challenge", "Your words"]] },
  ...[1, 2, 3].map((i) => ({
    title: `Role Model ${i}`,
    fields: [
      [`rm_${i}_name`, "Who"],
      [`rm_${i}_adjective`, "Three words"],
      [`rm_${i}_describe`, "Why"],
      [`rm_${i}_advice`, "Their advice"],
    ],
  })),
  ...[1, 2, 3].map((i) => ({
    title: `Show / Media ${i}`,
    fields: [
      [`tv_${i}_name`, "What"],
      [`tv_${i}_verb`, "Three verbs"],
      [`tv_${i}_describe`, "About it"],
    ],
  })),
  {
    title: "Favourite Story",
    fields: [
      ["fav_story_title", "Title"],
      ["fav_story_character", "Character"],
      ["fav_character_describe", "That character"],
      ["fav_story_plot", "The story"],
    ],
  },
  { title: "Favourite Saying", fields: [["fav_saying", "Saying"], ["fav_saying_describe", "What it means"]] },
  ...[1, 2, 3].map((i) => ({
    title: `Early Memory ${i}`,
    fields: [
      [`em_${i}_title`, "Title"],
      [`em_${i}_describe`, "What happened"],
      [`em_${i}_feeling`, "Felt"],
      [`em_${i}_feeling_positive`, "Opposite"],
    ],
  })),
  { title: "Holland Code", fields: [["combined_holland_code", "Code"]] },
  { title: "The Thread", fields: [["cci_summary", "Summary"]] },
];

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function renderNotebook(row, prev) {
  const blocks = [];
  for (const section of SECTIONS) {
    const present = section.fields.filter(([k]) => row[k]);
    if (present.length === 0) continue;
    const rows = present.map(([k, label]) => {
      const changed = prev && prev[k] !== row[k];
      return `<p class="${changed ? "cci-fresh" : ""}">
        <span class="cci-label">${label}:</span> ${escapeHtml(row[k])}</p>`;
    }).join("");
    blocks.push(`<div class="cci-section"><h3>${section.title}</h3>${rows}</div>`);
  }
  els.notebook.innerHTML = blocks.length
    ? blocks.join("")
    : '<p class="cci-empty">Nothing yet. We\'ll start with what brought you here.</p>';
  els.download.hidden = blocks.length === 0;
}

function downloadAnswers() {
  const lines = ["Your Career Construction Interview\n"];
  for (const section of SECTIONS) {
    const present = section.fields.filter(([k]) => latestRow[k]);
    if (!present.length) continue;
    lines.push(`\n## ${section.title}`);
    for (const [k, label] of present) lines.push(`${label}: ${latestRow[k]}`);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "my-cci-answers.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadWidgetScript() {
  if (document.getElementById("elevenlabs-convai-embed")) return;
  const s = document.createElement("script");
  s.id = "elevenlabs-convai-embed";
  s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
  s.async = true;
  document.body.appendChild(s);
}

function mountWidget(signedUrl) {
  const w = document.createElement("elevenlabs-convai");
  w.setAttribute("signed-url", signedUrl);
  w.setAttribute("variant", "expanded");
  w.setAttribute("dynamic-variables", JSON.stringify({ session_id: sessionId }));
  w.setAttribute("avatar-orb-color-1", "#16425b");
  w.setAttribute("avatar-orb-color-2", "#44797B");
  els.widgetWrap.appendChild(w);
  els.widgetWrap.hidden = false;
  loadWidgetScript();
}

async function start() {
  els.start.disabled = true;
  setStatus("Connecting…");
  sessionId = crypto.randomUUID();

  let signedUrl;
  try {
    const r = await fetch(`${CONFIG.FUNCTIONS_BASE}/cci-signed-url`);
    if (!r.ok) throw new Error(`signed-url ${r.status}`);
    signedUrl = (await r.json()).signed_url;
    if (!signedUrl) throw new Error("no signed url returned");
  } catch (e) {
    setStatus("Couldn't connect to the interview service. Please try again.", true);
    els.start.disabled = false;
    console.error(e);
    return;
  }

  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  supabase
    .channel(`cci:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cci_sessions", filter: `session_id=eq.${sessionId}` },
      (payload) => {
        const prev = latestRow;
        latestRow = payload.new || {};
        renderNotebook(latestRow, prev);
      },
    )
    .subscribe();

  els.intro.hidden = true;
  mountWidget(signedUrl);
}

els.start.addEventListener("click", start);
els.download.addEventListener("click", downloadAnswers);
