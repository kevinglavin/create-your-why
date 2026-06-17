# FYiT — Technical Summary

**Product:** FYiT (Finding Yourself in Transition)
**Operated by:** Create Your Why (Dr. Kevin Glavin, PhD, LPC — Founder & CEO)
**Document date:** 2026-06-17
**Status:** Living document — see [§9 Confirmation Needed](#9-confirmation-needed-coldfusion-backend) for items only the product owner can verify.

> **Scope note.** This summary is written from two sources: (1) the contents of the
> `create-your-why` repository, which contains **only the public marketing website**, and
> (2) the published Career Construction Interview (CCI) methodology and FYiT's own product
> description. The repository contains **no ColdFusion code** (no `.cfm`, `.cfc`, or `.cfml`
> files). Sections describing the FYiT application and its ColdFusion backend are therefore
> presented as a **reference architecture** and are clearly marked where they require the
> owner's confirmation rather than being verified facts about the running system.

---

## 1. Executive Summary

**FYiT (Finding Yourself in Transition)** is a web-based, AI-assisted career and life
self-discovery platform. It delivers what it markets as the **first and only online version
of the Career Construction Interview (CCI)** — a qualitative, narrative-based assessment
developed by vocational psychologist **Professor Mark Savickas**.

A user works through the CCI's structured prompts guided by an **AI "ChatBot" coach**, and the
platform generates a **personalized ~32-page PDF report** that synthesizes the user's answers
into life themes, a career narrative, and actionable direction. Access is sold as an annual
subscription (**$200 / year**), is usable across devices (iPhone, Android, iPad, laptop), and
lets users return to revise their answers over time.

FYiT is the flagship product of **Create Your Why**, a career-coaching and training practice
that also offers one-on-one coaching, a Career Construction Masterclass, and workshops/speaking.

The system splits into two tiers:

| Tier | What it is | Where it lives | In this repo? |
|------|------------|----------------|:---:|
| **Marketing website** | Static brochure site + lead-gen chatbot | `createyourwhy.com` (this repository) | ✅ Yes |
| **FYiT application** | The interactive CCI tool, account system, AI interview flow, and PDF report engine | Separate application (per owner, **ColdFusion**) | ❌ No |

---

## 2. What FYiT Does (Product View)

### 2.1 Core value proposition
Traditional career assessments (e.g., trait-and-factor inventories) match people to jobs by
measuring interests and aptitudes. FYiT instead applies **narrative / "post-modern" career
construction**: it helps a person *author* a coherent story of who they are and where they are
going, which is better suited to navigating uncertain, non-linear 21st-century careers and
life transitions.

### 2.2 Headline features (from the product description)
- **AI-Enhanced Experience.** An intelligent ChatBot acts as a personal coach, guiding the user
  through the CCI prompts and surfacing insights as they answer.
- **Personalized Report.** A comprehensive **~32-page PDF**, generated uniquely from the user's
  responses, providing clarity and direction.
- **Accessible Anywhere.** Cross-device web access; users can update and edit answers at their
  own pace over the subscription period.
- **Commercial model.** ~$200 for a full year of access (one-on-one coaching and a Masterclass
  are sold separately; an initial 15-minute consultation is free).

### 2.3 The underlying method — the Career Construction Interview (CCI)
The CCI is a short, structured interview whose answers are interpreted as raw material for a
life story. The standard Savickas protocol uses five prompts, each serving a distinct purpose:

| # | CCI prompt | What it elicits |
|---|------------|-----------------|
| 1 | **Role models** — three people you admired growing up | The blueprint of the self / the *solution* the person is building toward |
| 2 | **Favorite magazines / TV shows / websites** | Preferred environments and manifest interests |
| 3 | **Favorite story** (book/movie) | A script for how to use the self in a chosen setting |
| 4 | **Favorite saying or motto** | The best advice the person gives themselves |
| 5 | **Earliest recollections** (three early memories, each given a "headline") | The central *preoccupation* / problem the person is working to master |

The interpretive arc moves a client **from preoccupation to occupation** — reframing an early
problem (the early recollections) into a purpose, using the self-portrait (role models),
preferred settings (interests), a guiding script (favorite story), and self-counsel (motto).
FYiT operationalizes this flow digitally: the chatbot administers the prompts, and the report
engine assembles the answers into the narrative deliverable.

---

## 3. Business & Domain Context

- **Create Your Why** — "Life Designing for Career Construction." Helps clients address complex
  career/life transitions using narrative psychology and storytelling. Tagline themes: *clarity,
  control, direction, and purpose.*
- **Dr. Kevin Glavin, PhD, LPC** — Founder & CEO; Licensed Professional Counselor; ~20 years in
  career counseling/development; mentored by Prof. Mark Savickas. Recognition includes the 2024
  APCDA Outstanding Educator of Career Professionals Award; engagements with organizations such
  as Saudi Aramco, NASA, and the Singapore Ministry of Manpower / Workforce Singapore.
- **Methodology lineage** — Career Construction Theory & the CCI (Savickas); Life Design.

---

## 4. System Landscape & Architecture

```
                ┌─────────────────────────────────────────────────────────┐
   Visitor ────►│  MARKETING WEBSITE  (this repository)                    │
   (browser)    │  Static HTML5 / CSS3 / vanilla JS                        │
                │  • Single-page section navigation                        │
                │  • Lead-gen AI chatbot ──────────────► OpenAI API        │
                │  • "Try FYiT" call-to-action ─────────┐  (gpt-3.5-turbo) │
                └───────────────────────────────────────┼──────────────────┘
                                                         │  (hand-off)
                                                         ▼
                ┌─────────────────────────────────────────────────────────┐
   Subscriber ─►│  FYiT APPLICATION  (separate; ColdFusion — NOT in repo)  │
   (account)    │  • Account / subscription / payment                      │
                │  • AI-guided CCI interview flow                          │
                │  • Response persistence (editable over time)             │
                │  • ~32-page PDF report generation                        │
                │  • Email delivery / notifications                        │
                │           │              │                │              │
                │           ▼              ▼                ▼              │
                │      LLM provider    Database        PDF + Mail engine   │
                └─────────────────────────────────────────────────────────┘
```

The marketing site and the FYiT application are **separately deployed**. The site's role is
brand presence, education, lead capture (chatbot + "Schedule a call"), and routing interested
visitors into FYiT via the **"Try FYiT Now"** call-to-action.

---

## 5. The Marketing Website (This Repository) — Verified Detail

### 5.1 Technology stack
- **Pure static front-end:** one `index.html`, one stylesheet, one script. No build step, no
  framework, no package manager in use (the `.gitignore` is the stock GitHub Node template, but
  no `package.json`/`node_modules` are present).
- **Styling:** hand-written `css/styles.css` (~960+ lines) with responsive `@media`
  breakpoints; **Open Sans** loaded from Google Fonts. Icon glyphs are emoji/text fallbacks
  placed inside FontAwesome-style `<i>` tags (FontAwesome itself is not loaded).
- **Behavior:** vanilla JavaScript (`js/script.js`), no dependencies.

### 5.2 Repository layout
```
create-your-why/
├── index.html                     # Entire marketing site (all sections in one page)
├── css/styles.css                 # All styling
├── js/script.js                   # Navigation + chatbot logic
├── README.md                      # Minimal ("website")
├── .gitignore                     # Stock Node template
└── src/documents/
    └── testimonials/              # Testimonial source assets
        ├── *.jpg                  # Savickas, Pennington, Brandt, Mizuno, Workforce Singapore
        ├── testimonials.docx      # Testimonial copy
        └── new                    # Empty placeholder file (leftover)
```

### 5.3 Page structure & navigation
`index.html` is a **single page** presenting six sections — **Home, About ("What We Do"),
Services ("How We Do It"), FYiT, Founder ("Who We Are"), Contact** — plus header, footer, a
back-to-top control, and the chatbot widget.

Navigation is an **SPA-style show/hide**, not multi-page routing: `setActiveSection()` toggles
an `.active` class so only one `.section-content` is visible at a time, updates the nav
highlight, syncs `window.location.hash`, and scrolls to top. On load, `checkHash()` opens the
section named in the URL hash (defaulting to `home`), so deep links like `#fyit` work.

### 5.4 Chatbot subsystem (the only "dynamic" piece in this repo)
A floating chat widget provides career-counseling Q&A and FYiT lead-gen. Logic in
`js/script.js`:

- **Primary path — OpenAI.** `callOpenAI()` POSTs to
  `https://api.openai.com/v1/chat/completions` using model **`gpt-3.5-turbo`**
  (`max_tokens: 250`, `temperature: 0.7`). A system prompt frames the bot as a Create Your Why
  career-counseling assistant and instructs it to suggest 2–3 follow-up questions. Conversation
  state is held client-side in a `chatHistory` array.
- **Fallback path.** If no key is set or the API call fails, `getFallbackResponse()` returns
  keyword-matched canned answers (services, pricing, FYiT, CCI, Savickas, founder, scheduling,
  etc.) so the widget degrades gracefully.
- **Quick questions.** Preset buttons (About Us / FAQs / Our Services) return curated copy via
  `getQuickQuestionResponse()`.
- **Follow-up extraction.** `extractFollowUpQuestions()` parses the model's reply, splits off a
  "Some follow-up questions" block, and renders up to three clickable follow-up buttons.
- **Sharing.** The conversation can be copied or shared to WhatsApp, Email, LinkedIn, X/Twitter,
  and Facebook via standard share URLs.

> **Note:** This website chatbot is a **marketing/FAQ assistant**. It is *not* the FYiT
> interview ChatBot that administers the CCI — that lives in the separate FYiT application.

### 5.5 Hosting
Consistent with a static site (canonical `https://www.createyourwhy.com`). Suitable for any
static host / CDN (e.g., GitHub Pages, Netlify, Vercel, S3+CloudFront). No server runtime is
required for the marketing site itself.

---

## 6. The FYiT Application & Processes (Reference Architecture)

> **Important:** The FYiT application is **not in this repository**, so the following describes
> the **process flow** the product implies and a **typical ColdFusion realization** of it.
> Treat implementation specifics as *to-be-confirmed* (see §9), not as verified facts.

### 6.1 End-to-end user process
1. **Acquisition / hand-off.** Visitor clicks **"Try FYiT Now"** on the marketing site.
2. **Account & subscription.** User registers and purchases annual access (~$200/yr) via a
   payment provider; an account and entitlement are created.
3. **Guided CCI interview.** The AI ChatBot administers the CCI prompts (role models, interests,
   favorite story, motto, early recollections — see §2.3), coaching and prompting for depth.
4. **Response persistence.** Answers are saved against the user's account and remain **editable**
   throughout the subscription, across devices.
5. **Report generation.** On completion, the platform synthesizes responses into a
   **~32-page PDF** report (life themes, narrative, direction).
6. **Delivery & iteration.** The report is delivered (download/email); the user can revisit,
   revise answers, and regenerate insights over the year.

### 6.2 How this typically maps onto ColdFusion
ColdFusion (CFML — Adobe ColdFusion or the open-source Lucee engine) is a tag/script server
language well-suited to exactly this kind of form-driven, database-backed, document-producing
web app. A conventional implementation would use:

| FYiT capability | Typical ColdFusion mechanism |
|-----------------|------------------------------|
| App lifecycle, session & request scope | `Application.cfc` (`onApplicationStart`, `onSessionStart`, `onRequest`) |
| Pages & UI | `.cfm` templates |
| Business logic / services | `.cfc` components (CFCs), often as singletons via a DI framework (ColdSpring/DI1/WireBox) |
| Data access | `<cfquery>` / queryExecute with parameterized `<cfqueryparam>`, or CF ORM (Hibernate) |
| Authentication / access control | `<cflogin>` / `<cfloginuser>` or framework-managed sessions; subscription entitlement checks |
| **~32-page PDF report** | **`<cfdocument format="pdf">`** (HTML→PDF), or `<cfpdf>` for assembly/merge/secure |
| Email (report delivery, notifications) | `<cfmail>` |
| AI / LLM calls | `<cfhttp>` to the LLM provider's REST API (server-side, with the key kept secret) |
| Payments | `<cfhttp>` to a payment gateway (Stripe/PayPal/etc.) + webhook handler |
| Scheduled jobs (e.g., renewal reminders) | ColdFusion Scheduled Tasks / `<cfschedule>` |
| Frameworks (common in CF apps) | FW/1, ColdBox, or similar MVC conventions |

### 6.3 Conceptual data model (illustrative)
A minimal schema supporting the flow above:

- **users** — identity, auth, profile.
- **subscriptions** — plan, start/end dates, status, payment references (entitlement to FYiT).
- **interviews** — one per user attempt/cycle; status (in-progress/complete); timestamps.
- **responses** — per-prompt answers (role models, interests, story, motto, recollections),
  editable and versionable.
- **reports** — generated PDF artifacts/metadata, generation timestamp, version.
- *(supporting)* **payments / transactions**, **audit/event log**.

### 6.4 External integrations (implied)
- **LLM provider** — powers the in-app interview ChatBot (should be called server-side).
- **Payment gateway** — subscription billing.
- **Email/SMTP service** — report delivery and lifecycle email.
- **PDF rendering** — native ColdFusion (`cfdocument`/`cfpdf`) or an external rendering service.

---

## 7. Security & Technical Findings (Marketing Repo)

| # | Severity | Finding | Recommendation |
|---|:--------:|---------|----------------|
| 1 | 🔴 **Critical** | A live-looking **OpenAI API key is hard-coded in `js/script.js`** (line 26) and committed to the repository. Because the chatbot calls OpenAI **directly from the browser**, the key is shipped to every visitor and is also exposed in public git history — anyone can extract and abuse it (financial and quota risk). | **Revoke/rotate the key immediately** in the OpenAI dashboard. Move all LLM calls to a **server-side proxy** (or serverless function) that holds the key as an environment secret. Purge the key from git history (e.g., `git filter-repo`/BFG) and set per-key usage limits. |
| 2 | 🟠 Medium | No backend means the chatbot **cannot keep any secret**; rate-limiting/abuse controls are absent. | Front the LLM with your own endpoint that adds auth, rate limiting, and logging. |
| 3 | 🟡 Low | **Placeholder contact details** remain in the footer (phone `(123) 456-7890`). | Replace with real contact info before/while live. |
| 4 | 🟡 Low | **Pricing is duplicated** across hard-coded chatbot strings (e.g., "$200/yr", "$129.99"). Easy to drift. | Centralize pricing copy; ideally fetch from a single source. |
| 5 | ⚪ Info | Stylesheet is linked as `styles.css` and script as `script.js`, but they live in `css/` and `js/`. This resolves only if the host rewrites paths or files are flattened on deploy. | Confirm deploy layout; use correct relative paths (`css/styles.css`, `js/script.js`) or move files to root. |
| 6 | ⚪ Info | Leftover empty `src/documents/testimonials/new` file; testimonial images exist but aren't yet wired into the page. | Remove the placeholder; render testimonials in the UI. |

> The OpenAI key value is intentionally **not reproduced** in this document. Item #1 should be
> treated as time-sensitive.

---

## 8. Concise Technical Summary

> **FYiT (Finding Yourself in Transition)** is an AI-assisted web platform that delivers the
> **first online version of Savickas's Career Construction Interview**. A subscriber
> (~$200/yr) is guided by an AI ChatBot coach through the CCI's narrative prompts; their
> editable, cross-device responses are synthesized into a personalized **~32-page PDF report**
> giving career/life clarity and direction. It is the flagship product of **Create Your Why**
> (Dr. Kevin Glavin). Architecturally the product is **two tiers**: (1) a **static
> HTML/CSS/vanilla-JS marketing site** — *this repository* — featuring SPA-style section
> navigation and an OpenAI `gpt-3.5-turbo` lead-gen chatbot with graceful keyword fallbacks;
> and (2) the **FYiT application** — a separate, account-based, database-backed system (per the
> owner, built on **ColdFusion/CFML**) that handles subscriptions/payments, the AI-guided
> interview, response persistence, and PDF report generation (naturally realized in ColdFusion
> via `Application.cfc`, CFCs, `<cfquery>`/ORM, `<cfdocument>` for PDFs, `<cfmail>`, and
> `<cfhttp>` to the LLM and payment APIs). **The ColdFusion backend is not present in this
> repo**, so its specifics are documented as a reference architecture pending confirmation. The
> most urgent technical issue is a **hard-coded OpenAI API key committed in client-side JS**,
> which should be revoked and moved server-side immediately.

---

## 9. Confirmation Needed (ColdFusion Backend)

To replace the §6 reference architecture with verified facts, the following details from the
FYiT application owner would let this document be made precise:

- **Engine & version:** Adobe ColdFusion or Lucee? Which version?
- **Framework/structure:** FW/1, ColdBox, plain CFML, MVC conventions?
- **Database:** which RDBMS, and access via `<cfquery>` vs CF ORM (Hibernate)?
- **PDF generation:** native `<cfdocument>`/`<cfpdf>` or an external renderer?
- **LLM provider/model** used inside the FYiT interview ChatBot (and whether keys are
  server-side).
- **Payment provider** and subscription/entitlement handling.
- **Hosting/runtime** for the ColdFusion app and where the codebase lives (so it can be
  documented directly).

---

*Prepared from the `create-your-why` repository and FYiT's published product description.
Sections covering the FYiT application's ColdFusion backend are a reference architecture and
require owner confirmation; they are not verified statements about the running system.*
