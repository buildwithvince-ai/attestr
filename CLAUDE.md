# CLAUDE.md — Attestr

> Read this file completely before doing anything. This is the single source of truth for the Attestr project.

---

## What Is Attestr

Attestr is an AI clinical documentation agent for solo physicians. A doctor speaks or types a free-form patient encounter summary. Attestr produces a structured, FHIR R4-compliant SOAP note in seconds — broken into four sections (Subjective, Objective, Assessment, Plan), each with a confidence score, requiring explicit physician approval before the note is finalized.

**Tagline:** AI-drafted. Physician-approved.

**Core differentiator:** Section-by-section approval workflow with confidence indicators. Nothing reaches the EHR without the physician explicitly signing off on every section. This directly addresses the "what if AI gets it wrong" concern.

**Built for:** Agents Assemble Hackathon by Prompt Opinion (Darena Health)
- Devpost: https://agents-assemble.devpost.com
- Deadline: May 11, 2026 @ 11:00pm EDT
- Prize pool: $25,000
- Requirement: Must integrate with Prompt Opinion platform via A2A agent

**Live URL:** https://attestr-ai.vercel.app

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 | App Router only — no Pages Router |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS + inline styles | Liquid glass uses inline styles — see design system below |
| AI | Google Gemini 1.5 Flash | Via `@google/generative-ai` SDK |
| Voice | Web Speech API | Chrome/Edge only — graceful fallback for other browsers |
| A2A Agent | Next.js API routes | No separate server needed |
| Deployment | Vercel | Auto-deploy from GitHub |
| Package manager | pnpm | Never use npm or yarn |

---

## Project File Structure

```
attestr/
├── app/
│   ├── page.tsx                              ← Entire frontend (input + review screens)
│   ├── layout.tsx                            ← Root layout
│   ├── globals.css                           ← Minimal global styles
│   ├── api/
│   │   ├── generate-soap/
│   │   │   └── route.ts                      ← Gemini SOAP generation endpoint
│   │   └── a2a/
│   │       └── route.ts                      ← Prompt Opinion A2A message handler
│   └── .well-known/
│       └── agent-card.json/
│           └── route.ts                      ← A2A agent discovery endpoint
├── .env.local                                ← GEMINI_API_KEY (never commit)
├── CLAUDE.md                                 ← This file
├── package.json
├── next.config.ts
└── tsconfig.json
```

**Rule:** Do not create additional files unless explicitly asked. All frontend lives in `page.tsx`. All backend logic lives in the API routes listed above.

---

## Environment Variables

```
GEMINI_API_KEY=your_key_here
```

Set in `.env.local` locally and in Vercel → Project → Settings → Environment Variables for production.

---

## Design System — Liquid Glass

Attestr uses a true iOS 26-style liquid glass design system. This is non-negotiable — do not replace with Tailwind utility classes or shadcn components.

**Fonts:** Sora (display/UI) + JetBrains Mono (clinical data/code)
Import: `https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap`

**Color palette:**
- Background: `#060a14`
- Primary accent: `#6366f1` / `#8b5cf6` (indigo-violet)
- Success/approved: `#4ade80` (green)
- Warning: `#fbbf24` (amber)
- Danger: `#f87171` (red)
- Text primary: `#f1f5f9`
- Text secondary: `rgba(255,255,255,0.35)`
- Text muted: `rgba(255,255,255,0.2)`

**5 glass layers — use exactly these, do not invent new ones:**

```css
/* lg-base: secondary elements — badges, hints, voice bar */
background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
backdrop-filter: blur(20px) saturate(150%) brightness(1.05);
border: 1px solid rgba(255,255,255,0.07);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.35);

/* lg-panel: main cards and panels */
background: linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02) 60%, rgba(139,92,246,0.015));
backdrop-filter: blur(32px) saturate(180%) brightness(1.08);
border: 1px solid rgba(255,255,255,0.09);
box-shadow: inset 0 1.5px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.18), 0 12px 40px rgba(0,0,0,0.4);

/* lg-strong: header and overlays */
background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
backdrop-filter: blur(48px) saturate(200%) brightness(1.1);
border-bottom: 1px solid rgba(255,255,255,0.1);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 16px 48px rgba(0,0,0,0.5);

/* lg-active: recording/editing state */
background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.04));
backdrop-filter: blur(32px) saturate(180%);
border: 1px solid rgba(139,92,246,0.28);
box-shadow: inset 0 1.5px 0 rgba(167,139,250,0.2), 0 0 32px rgba(139,92,246,0.08);

/* lg-approved: approved SOAP sections */
background: linear-gradient(135deg, rgba(74,222,128,0.06), rgba(16,185,129,0.03));
backdrop-filter: blur(32px) saturate(160%);
border: 1px solid rgba(74,222,128,0.22);
box-shadow: inset 0 1.5px 0 rgba(74,222,128,0.15), 0 0 20px rgba(74,222,128,0.04);
```

**Every glass surface must have:**
- Top specular highlight: `inset 0 1px 0 rgba(255,255,255,0.X)`
- Bottom shadow: `inset 0 -1px 0 rgba(0,0,0,0.X)`
- Depth shadow: `0 Xpx Xpx rgba(0,0,0,0.X)`
- A gradient background (never flat color)

**Background scene — always present:**
Three floating ambient orbs that slowly drift to give glass something to refract:
- Indigo orb: top-left, `rgba(99,102,241,0.09)`, `blur(100px)`
- Emerald orb: bottom-right, `rgba(16,185,129,0.07)`, `blur(90px)`
- Violet orb: center-right, `rgba(139,92,246,0.06)`, `blur(70px)`
All three use slow float animations (14s, 18s, 22s).

---

## Loading / Generating State

When Gemini is generating the SOAP note, show a full-screen glass overlay with:
- Animated **pen writing on paper** SVG icon (pen nib travels across lines, ink strokes draw sequentially using `stroke-dasharray` animation)
- Text: "Generating SOAP Note"
- Subtext: "Structuring your encounter narrative with Gemini 1.5 Flash…"
- Shimmer progress bar (traveling highlight, not a spinner)
- Status row: `FHIR · SOAP · CONFIDENCE SCORING`

This same pen animation should be used for any loading/thinking/generating state throughout the app.

---

## Application Screens

### Screen 1: Input Screen (`screen === "input"`)

**Fields:**
- Patient Name (text, placeholder: "Last, First")
- Chief Complaint (text, placeholder: "e.g. Chest pain, 3 days")
- Date of Service (date, defaults to today)
- Encounter Narrative (textarea, 9 rows)

**Voice input:**
- Web Speech API, continuous + interim results
- Mic button toggles recording — shows animated waveform (28 bars) while active
- Interim text appends to textarea in real time
- Final text appends permanently on each result

**Try Demo button** (header):
- Pre-fills all fields with Marco Reyes synthetic encounter
- Typewriter effect on narrative text (7 chars per 16ms tick)

**Validation:**
- Generate button disabled until: `patientName.trim().length > 0` AND `transcript.trim().length > 20`
- Contextual hint message explains what's missing

**Demo patient data (synthetic — never change this):**
```
patientName: "Reyes, Marco"
chiefComplaint: "Chest pain, 3 days"
transcript: "35-year-old male presents with a 3-day history of sharp chest pain radiating to the left arm. Pain is 6 out of 10, worse on exertion, relieved by rest. No fever, no cough. Patient has a history of hypertension managed with lisinopril 10mg daily. Vitals: BP 138 over 84, HR 91, RR 16, Temp 98.6, O2 sat 97% on room air. EKG shows normal sinus rhythm, no ST changes. Lungs clear to auscultation bilaterally. Heart sounds regular, no murmurs. Plan to order troponin, BMP, chest X-ray, and cardiology consult. Advised patient to avoid strenuous activity pending results."
```

---

### Screen 2: SOAP Review Screen (`screen === "review"`)

Four SOAP sections rendered in order: Subjective → Objective → Assessment → Plan

**Each section shows:**
- Section badge (S/O/A/P) with color state (indigo = pending, green = approved)
- Section label + description
- Confidence percentage + label (High/Review/Verify)
- Vertical color bar (green ≥ 0.8, amber ≥ 0.6, red < 0.6)
- Confidence track (animates to width on mount)
- Content text (JetBrains Mono, pre-wrap)
- Approve ✓ and Edit buttons

**Approval states:** `pending` → `approved` or `edited`

**Edit flow:** Click Edit → textarea replaces content → Save & Approve sets state to `edited`

**Progress bar:** Shows X/4 approved with gradient fill

**Copy to EHR button:**
- Locked (disabled, btn-primary style) until all 4 sections approved
- Unlocked (btn-success style, green) when all approved
- On click: copies formatted plain-text note to clipboard
- Shows "✓ Copied" confirmation for 2.5s

**FHIR toggle:** Collapsible section showing raw FHIR R4 DocumentReference JSON

---

## API Routes

### POST `/api/generate-soap`

**Input:**
```json
{
  "narrative": "string",
  "patientName": "string",
  "chiefComplaint": "string",
  "encounterDate": "string"
}
```

**Output:**
```json
{
  "subjective": { "content": "string", "confidence": 0.0 },
  "objective":  { "content": "string", "confidence": 0.0 },
  "assessment": { "content": "string", "confidence": 0.0 },
  "plan":       { "content": "string", "confidence": 0.0 },
  "fhir": {
    "resourceType": "DocumentReference",
    "status": "current",
    "type": { "coding": [{ "system": "http://loinc.org", "code": "11488-4", "display": "Consult note" }] },
    "subject": { "display": "patientName" },
    "date": "encounterDate",
    "description": "chiefComplaint"
  }
}
```

**Rules:**
- Model: `gemini-1.5-flash` only
- Prompt must instruct model to return ONLY valid JSON — no markdown, no backticks
- Strip accidental markdown fences before parsing: `.replace(/```json|```/g, "").trim()`
- Validate narrative length ≥ 20 chars before calling Gemini
- Return 400 on short narrative, 500 on Gemini error

---

### GET `/app/.well-known/agent-card.json`

Returns the A2A agent card for Prompt Opinion discovery.

**Base URL:** `https://attestr-ai.vercel.app`

**Skills exposed:**
1. `generate_soap_note` — converts narrative to SOAP + FHIR
2. `validate_encounter` — checks if narrative has enough detail

**Must include CORS header:** `Access-Control-Allow-Origin: *`

---

### POST `/api/a2a`

Handles A2A task messages from Prompt Opinion.

**Input:** Standard A2A task object with `id`, `message.parts[].text`, optional `metadata`

**Routing logic:**
- If message contains `/valid|enough|ready|check|sufficient/i` → run `validateEncounter()`
- Otherwise → run `generateSOAP()`

**Output:** A2A response object with `id`, `status.state`, `artifacts[]`

**Must include OPTIONS handler** for CORS preflight.

---

## Prompt Opinion Integration

- **Path:** A2A (Agent-to-Agent) — Path B of the hackathon requirements
- **Connection method:** Prompt Opinion fetches `/.well-known/agent-card.json` from our Vercel URL
- **Connection URL to paste:** `https://attestr-ai.vercel.app/.well-known/agent-card.json`
- **Dashboard location:** External Agents → Add Connection
- **Publishing:** Marketplace Studio in Prompt Opinion sidebar

---

## Critical Rules

**PHI / Data safety:**
- NEVER use real patient data anywhere — not in code, not in comments, not in tests
- All demo/test data must be clearly synthetic (use Marco Reyes or similar fictional names)
- Real PHI = immediate hackathon disqualification

**Package manager:**
- Always `pnpm` — never `npm install` or `yarn`

**AI model:**
- Always `gemini-1.5-flash` — do not upgrade or swap models without asking

**Design:**
- Never replace liquid glass with Tailwind utility classes
- Never use Inter, Roboto, Arial, or system-ui as primary fonts
- Never use shadcn/ui components — they break the glass aesthetic

**File discipline:**
- Do not create new files without being asked
- Do not split `page.tsx` into multiple components unless asked
- Do not add a database — this is stateless by design

---

## Build Status

### ✅ Complete
- Full UI — input screen, review screen, liquid glass design
- Pen writing animation for loading state
- Gemini API route (`/api/generate-soap/route.ts`)
- A2A agent card (`/.well-known/agent-card.json/route.ts`)
- A2A message handler (`/api/a2a/route.ts`)
- Devpost submission story (`attestr-devpost-story.md`)
- Prompt Opinion account created

### 🔴 Remaining
- [ ] All 4 files placed in correct paths in project
- [ ] `pnpm add @google/generative-ai`
- [ ] `GEMINI_API_KEY` added to Vercel environment variables
- [ ] Deploy to Vercel and verify live
- [ ] Verify agent card at `https://attestr-ai.vercel.app/.well-known/agent-card.json`
- [ ] Connect Attestr to Prompt Opinion (External Agents → Add Connection)
- [ ] Publish to Prompt Opinion Marketplace Studio
- [ ] Record demo video (max 3 min, must show Prompt Opinion invoking Attestr)
- [ ] Submit on Devpost before May 11, 2026 @ 11:00pm EDT

---

## Skills Active in This Project

The following skill files are available in this project. Read the relevant one before working on that area:

| Skill | When to Use |
|-------|-------------|
| `liquid-glass-design.md` | Any UI work — always read before touching styles |
| `frontend-patterns.md` | Component structure, state management, React patterns |
| `swiftui-patterns.md` | Not applicable unless building a native iOS version |
| `continuous-learning.md` | Session hooks — apply instinct tracking per instructions |

---

## Hackathon Submission Checklist

- [ ] Project live at `https://attestr-ai.vercel.app`
- [ ] Agent card live at `https://attestr-ai.vercel.app/.well-known/agent-card.json`
- [ ] Attestr connected and visible in Prompt Opinion platform
- [ ] Demo video recorded (< 3 min, shows Prompt Opinion → Attestr → SOAP note)
- [ ] Devpost story pasted from `attestr-devpost-story.md`
- [ ] GitHub repo linked in Devpost submission
- [ ] Submitted before **May 11, 2026 @ 11:00pm EDT**
