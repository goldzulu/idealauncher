# IdeaLauncher — PRD (MVP → Phases 2–3)
**Domain:** https://idealauncher.xyz  
**Track:** Productivity & Workflow Tools (Devpost)  
**Audience:** Startup founders, indie hackers, product-minded developers at the *earliest* stage (pre-product).

---

## 0) Purpose & One‑liner
**IdeaLauncher** turns raw ideas into **validated, prioritized, and build‑ready specs**. It’s a chat‑plus‑canvas workspace that helps you **capture multiple ideas**, **research viability** (competition, monetization), **score & rank** them (ICE/RICE), generate a **lean MVP feature set**, recommend a **tech stack**, and export a **Kiro‑ready spec** for immediate implementation.

**Why now?** AI coding tools (Kiro, Cursor, Claude Code, etc.) make building fast, but founders struggle with **too many ideas** and no structured way to **validate, prioritize, and spec** quickly. IdeaLauncher fills that gap and hands off to Kiro for build.

---

## 1) Goals, Non‑Goals, Success
### 1.1 Goals
- **Single source of truth** for each idea that **evolves** across phases (ideation → validation → planning → dev handoff).
- **Generate & manage multiple ideas** in parallel; keep AI‑assisted notes and decisions per idea.
- **Web research** (competitors, similar apps, differentiation), **monetization options**, and **domain name suggestions/check**.
- **Scoring & ranking** across monetization potential, competition intensity, build effort (ICE/RICE).
- **MVP feature set** with “Must/Should/Could” and **time‑to‑first‑MVP estimate**.
- **Spec export**: one‑click **Kiro‑ready prompt/spec**.
- **Build fast** using Next.js 15, Vercel, Vercel AI SDK v5, AI Elements, shadcn/ui, Postgres, Prisma, NextAuth.

### 1.2 Non‑Goals (MVP)
- Not a full product management suite (post‑MVP roadmaps, OKRs, analytics).  
- Not a replacement for Linear/Jira during delivery.  
- No team collaboration or real‑time co‑editing in MVP (Phase 2).  
- No deep financial modeling or detailed TAM/SAM/SOM (Phase 3).

### 1.3 Success Criteria (MVP)
- A founder can start with 1‑line idea → **export a Kiro‑ready spec in ≤ 30 minutes**.
- **≥ 3 ideas** managed in parallel with scores and a sortable comparison list.
- **Spec quality**: When pasted into Kiro, Kiro can create tasks and start implementation **without major re‑work**.
- **Latency**: Research + generation steps feel interactive (streaming responses).

---

## 2) User Personas & Jobs‑to‑be‑Done
- **Indie Founder/Engineer**: “I have 10 ideas. Help me pick one to build this weekend and hand me a spec.”  
- **Startup Co‑founder**: “I need to validate new concepts and brief my team with clear MVP scope.”  
- **Hackathon Participant**: “Turn a prompt into a market‑aware MVP plan and code quickly.”

**JTBD:** Capture → Validate → Compare → Plan MVP → Tech Stack → Spec → Handoff to Kiro.

---

## 3) Phases (Minimal but Distinct)
> UI uses a **chat + canvas** pattern: chat (left) drives AI actions; canvas (right) is the **living document**. Each phase updates sections in the same document (single source of truth).

### Phase A — **Ideation (Capture & Flesh‑out)**
- Quick idea capture (title + 1‑liner).  
- Brainstorm via chat → auto‑populate canvas sections: **Problem, Users, Solution, Key Features, Risks**.  
- Inline **AI note insert** (select message → “Insert to Document”).

### Phase B — **Validation (Research & Naming)**
- **Competitor scan** (top 5 similar tools): names, feature highlights, pricing notes (lightweight), rough positioning.  
- **Gap/Differentiators**: what’s missing or underserved.  
- **Monetization modes**: subscription, usage‑based, freemium, marketplace, etc.  
- **Name generator** + **domain check** (e.g., *idealauncher.xyz* fixed for app brand; per‑idea project names also checked).

### Phase C — **Prioritization (Scoring & Ranking)**
- **ICE** (Impact, Confidence, Ease) or **RICE** (Reach, Impact, Confidence, Effort).  
- Sliders + rationale notes; **Composite score** → idea ranking view.

### Phase D — **MVP Planning (Feature Set & Estimates)**
- Generate **Must/Should/Could** (MoSCoW).  
- Add **rough estimates** (e.g., S/M/L or weeks).  
- Summarize **first build plan** + risks/assumptions.

### Phase E — **Tech Stack & Handoff**
- Recommend **stack** (defaults: Next.js 15, Vercel, Postgres, Prisma, NextAuth, Vercel AI SDK v5, shadcn/ui, AI Elements).  
- Generate **Kiro‑ready spec** + copy/export.

---

## 4) MVP Scope (Build the fastest path end‑to‑end)
### 4.1 Pages & Navigation
- **/login** (NextAuth: GitHub/Google)  
- **/dashboard** (list of ideas w/ score chips, sort by score/date)  
- **/ideas/new** (create idea modal: title, 1‑liner)  
- **/ideas/[id]** (two‑pane **Chat** ←→ **Document** + tabs: *Research*, *Score*, *MVP*, *Export*)  
- **/settings** (profile, API keys if needed)

### 4.2 Core Components (reuse from shadcn/ui & AI Elements)
- **Chat**: Conversation, MessageList, PromptInput (AI Elements).  
- **Document editor**: Rich‑text/Markdown (TipTap or Lexical) with “Insert from AI”.  
- **Research panel**: list of findings (title, url, notes); add to document.  
- **Scoring panel**: sliders for ICE/RICE; computed score; save rationale.  
- **MVP panel**: feature list (Must/Should/Could), estimates, dependencies.  
- **Export panel**: Kiro spec preview + “Copy/Download .md”.  
- **Sidebar**: idea switcher, quick create.  
- **Toasts/Dialogs**: confirm destructive actions, share (Phase 2).

### 4.3 Data Model (Prisma — MVP)
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  image         String?
  ideas         Idea[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Idea {
  id            String   @id @default(cuid())
  ownerId       String
  owner         User     @relation(fields: [ownerId], references: [id])
  title         String
  oneLiner      String?
  // Canonical living document (Markdown)
  documentMd    String   @default("")
  // Scores (denormalized for sort), 0-100
  iceScore      Int?     
  riceScore     Int?
  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  // Relations
  research      ResearchFinding[]
  features      Feature[]
  scores        Score[]
  exports       SpecExport[]
}

model ResearchFinding {
  id        String   @id @default(cuid())
  ideaId    String
  idea      Idea     @relation(fields: [ideaId], references: [id])
  title     String
  url       String?
  summary   String
  source    String?  // provider or domain
  createdAt DateTime @default(now())
}

model Feature {
  id        String   @id @default(cuid())
  ideaId    String
  idea      Idea     @relation(fields: [ideaId], references: [id])
  title     String
  details   String?
  priority  String   // "MUST" | "SHOULD" | "COULD"
  estimate  String?  // "S" | "M" | "L" or "1-2w", etc.
  createdAt DateTime @default(now())
}

model Score {
  id         String   @id @default(cuid())
  ideaId     String
  idea       Idea     @relation(fields: [ideaId], references: [id])
  // ICE / RICE components (0-10)
  reach      Int?     // for RICE
  impact     Int?
  confidence Int?
  effort     Int?
  framework  String   // "ICE" | "RICE"
  notes      String?
  total      Int?
  createdAt  DateTime @default(now())
}

model SpecExport {
  id        String   @id @default(cuid())
  ideaId    String
  idea      Idea     @relation(fields: [ideaId], references: [id])
  contentMd String   // exported Kiro prompt/spec
  createdAt DateTime @default(now())
}
```

### 4.4 API (Next.js Route Handlers — MVP)
- `POST /api/ideas` — create idea (title, oneLiner)  
- `GET /api/ideas` — list (owner’s) ideas  
- `GET /api/ideas/:id` — fetch idea (document, panels data)  
- `PATCH /api/ideas/:id` — update fields (documentMd, title, oneLiner)  
- `POST /api/ideas/:id/chat` — AI chat (brainstorm/enrich) → streaming  
- `POST /api/ideas/:id/research` — run competitor/name/domain scan (server)  
- `POST /api/ideas/:id/score` — save ICE/RICE sliders → compute composite  
- `POST /api/ideas/:id/mvp` — generate features (MoSCoW + estimates)  
- `POST /api/ideas/:id/export` — build Kiro spec → persist/download  
- `POST /api/domain-check` — check availability for proposed names

> **Note:** In MVP, research can be a best‑effort AI summary + optional manual links. Phase 2 adds live search/provider(s).

### 4.5 Security & Auth
- **NextAuth** (GitHub/Google) with Prisma adapter.  
- Row‑level ownership on all Idea/child tables.  
- Server‑side AI calls (no API keys on client).

### 4.6 UX Principles (MVP)
- Fast, uncluttered, **Linear‑like** keyboard-first feel.  
- Two‑pane **Chat ↔ Document** as the core.  
- Make AI output **selectively insertable** into the document (user stays in control).  
- Clear steps (tabs) but everything stored in **one evolving doc**.

---

## 5) Competitive Landscape (At a glance)
| Tool | Strengths | Gaps vs **IdeaLauncher** |
|---|---|---|
| **Linear** | World‑class issue/project tracking; speed; beautiful UX. | Not designed for *pre‑product* ideation; no AI competitor research; no auto MVP/spec export to Kiro. |
| **Notion** | Flexible docs; templates; Notion AI for writing. | General‑purpose; no structured scoring; no focused competitor scan/domain check; no dev handoff. |
| **Coda/Airtable** | Powerful tables/automations. | Requires heavy DIY to match this workflow; no turnkey spec export. |
| **Productboard** | Strong feedback→prioritization for existing products. | Overkill pre‑product; oriented to product teams, not solo founder MVP. |
| **Canny/Frill** | Idea capture/voting portals. | Crowd feedback vs founder ideation; no research/scoring/spec generation. |
| **AI idea tools** (e.g., idea generators) | Fast idea drafts, some market hints. | Often not built around *your* idea lifecycle; rarely produce dev‑ready specs or Kiro integration. |

**Differentiator:** **From idea → validated plan → Kiro‑ready spec** in one flow, optimized for solo founders/early teams.

---

## 6) MVP Detailed Requirements & Acceptance Criteria
### 6.1 Idea Capture & Chat
- **Req:** Create idea with title + 1‑liner.  
- **Req:** Chat streams with AI; messages persist per idea.  
- **Req:** “Insert to Document” adds selected AI text into canonical doc.  
- **AC:** Refresh preserves chat/document state.  
- **AC:** Creating ≥ 3 ideas shows them on dashboard; switching is instant.

### 6.2 Document (Single Source of Truth)
- **Req:** Rich‑text/Markdown editor; sections auto‑templated: *Problem, Users, Solution, Features, Research, MVP, Tech, Spec.*  
- **Req:** AI can append to specific sections (via slash/commands or buttons).  
- **AC:** Edits autosave; version timestamp visible.

### 6.3 Research & Naming
- **Req:** Trigger “Research competitors” → list 3–5 similar tools (name + short note + link).  
- **Req:** “Monetization ideas” → 3–5 viable options.  
- **Req:** “Name ideas” (5–10) + **domain check** (e.g., Domainr API) with availability flag.  
- **AC:** User can one‑click insert findings into document.

### 6.4 Scoring (ICE/RICE)
- **Req:** Sliders with numeric display; computed **ICE** = (Impact+Confidence+Ease), **RICE** = (Reach×Impact×Confidence)/Effort.  
- **Req:** Save one active score per idea (store history optionally).  
- **AC:** Dashboard sorts by chosen composite score.

### 6.5 MVP Generator
- **Req:** Produce **Must/Should/Could** list (≤ 10 items total for MVP).  
- **Req:** Add rough estimates (S/M/L).  
- **AC:** Inserting into document formats as a checklist table.

### 6.6 Tech Stack Suggestion
- **Req:** Propose stack; list key libs/integrations for this idea.  
- **AC:** Inserting into document updates *Tech* section.

### 6.7 Kiro Spec Export
- **Req:** Build **spec.md** preview from document (overview, user stories, acceptance criteria, non‑functionals, stack).  
- **Req:** **Copy** to clipboard and **Download .md**.  
- **AC:** Export contains all essential sections; no placeholder text.

---

## 7) Prompt Blueprints (for quick implementation)
> Use **Vercel AI SDK v5** server routes. Keep prompts **short, structured**, ask for **JSON when needed**.

### 7.1 Brainstorm / Flesh‑out
**System:** “You are a product manager helping a founder turn a raw idea into a concise problem, solution, users, and 6–8 key features. Keep lists crisp.”  
**User:** “Idea: {oneLiner}. Context: {optional_notes}. Output sections: Problem, Users, Solution, Key Features (bulleted).”

### 7.2 Competitor Scan (best‑effort, Phase 1)
**System:** “List 3–5 likely competing tools or close substitutes. For each: name, what it does (1 sentence), notable feature/differentiator, URL if known.”  
**User:** “Product idea: {description}. Return JSON array.”

### 7.3 Monetization Suggestions
**User:** “Suggest 3–5 monetization models for {idea}. Include pricing starting points and risks.”

### 7.4 Naming + Domain Check
**User:** “Propose 8–12 brandable names for {idea} (≤10 chars if possible).”  
**Server:** call `/api/domain-check` (Domainr) for `{name}.com` and `{name}.dev`, keep a **green/red** flag.

### 7.5 Scoring
**User:** “Given this context {summary}, propose default ICE (0–10 each) with one‑line rationale per dimension. Return JSON.”

### 7.6 MVP Plan (MoSCoW + Estimates)
**User:** “Derive a lean MVP (≤6 Must, ≤3 Should, ≤2 Could). Estimate each (S/M/L) and note dependencies. Return Markdown table.”

### 7.7 Tech Stack
**User:** “For a web MVP, suggest concrete stack & libs (frontend, backend, DB, auth, AI, hosting). Keep to Next.js 15 + Postgres + Prisma + NextAuth + Vercel AI SDK v5. Add 3–5 key implementation tips.”

### 7.8 Kiro Spec Export
**User:** “Transform this document into a Kiro‑ready spec. Sections: Overview, Goals, Users, Scope (MVP Must/Should), Out‑of‑Scope, User Stories with acceptance criteria, Non‑Functional, Tech Stack, Open Questions, Milestones. Tight, actionable.”

---

## 8) Tech Stack & Links (copy‑paste friendly)
- **Next.js 15** — https://nextjs.org/docs  
- **Vercel AI SDK v5** — https://ai-sdk.dev  
- **AI Elements** — https://ai-sdk.dev/elements/overview  
- **shadcn/ui** — https://ui.shadcn.com  
- **Prisma** — https://www.prisma.io/docs  
- **NextAuth (Auth.js)** — https://authjs.dev  
- **PostgreSQL (Neon or Supabase)** — https://neon.tech / https://supabase.com  
- **TipTap editor** — https://tiptap.dev  
- **Yjs (Phase 2 collab)** — https://yjs.dev  
- **Domainr API (domain check)** — https://domainr.com/docs  
- **SerpAPI / search provider (Phase 2)** — https://serpapi.com

---

## 9) Implementation Plan (MVP in hours, not weeks)
### 9.1 Project Setup
```bash
# Create app
npx create-next-app@latest idealauncher --ts --eslint --src-dir --app

# Into project
cd idealauncher

# UI + Editor
pnpm add tailwindcss @radix-ui/react-icons @tanstack/react-query
pnpm dlx shadcn-ui@latest init
# Install components as needed, e.g. button, input, dialog, sheet, textarea
pnpm dlx shadcn-ui@latest add button input textarea dialog sheet slider toast

# Auth + DB
pnpm add next-auth @prisma/client
pnpm add -D prisma
npx prisma init

# AI
pnpm add ai openai  # Vercel AI SDK + provider
pnpm add @ai-sdk/ui  # AI Elements (if published as package) OR copy templates

# Editor
pnpm add @tiptap/react @tiptap/starter-kit

# Hosting
# Configure Vercel project; set env vars
```

### 9.2 Environment Variables
```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://idealauncher.xyz
NEXTAUTH_SECRET=...
GITHUB_ID=... (optional)
GITHUB_SECRET=...
GOOGLE_ID=... (optional)
GOOGLE_SECRET=...
OPENAI_API_KEY=...
DOMAINR_API_KEY=...  # Phase 1 optional, Phase 2 recommended
```

### 9.3 Prisma Schema & Migration
- Paste schema (Section 4.3), run `npx prisma migrate dev` and `npx prisma generate`.

### 9.4 Auth
- Configure **NextAuth** with Prisma adapter; add `/api/auth/[...nextauth]` route.

### 9.5 Core Routes (Server)
- `/api/ideas` (GET/POST), `/api/ideas/[id]` (GET/PATCH/DELETE).  
- `/api/ideas/[id]/chat` — handler using **Vercel AI SDK** streaming.  
- `/api/ideas/[id]/research` — scaffold provider call (Phase 1: LLM summary; Phase 2: search API).  
- `/api/ideas/[id]/mvp`, `/api/ideas/[id]/score`, `/api/ideas/[id]/export`.  
- `/api/domain-check` — Domainr lookup.

### 9.6 UI Wiring
- **/dashboard**: list ideas with title, score, updatedAt; sort & search.  
- **/ideas/[id]**: two‑pane layout; left chat (AI Elements), right document (TipTap).  
- Tabs (Research/Score/MVP/Export) render panels that **write back** into `documentMd`.

### 9.7 Testing & Demo
- Seed 2–3 sample ideas.  
- Run through: **capture → research → score → MVP → export**.  
- Paste **exported spec.md** into **Kiro** and confirm it produces tasks/plan.

---

## 10) Phase 2 (2–4 weeks)
- **Live Competitor Research**: integrate SerpAPI/Bing; show sources & quick compare.  
- **Reliable Domain Check**: sync name generator + Domainr with TLD filters.  
- **Multi‑idea Compare**: matrix view, duplicate detection, merge ideas.  
- **Collaboration**: invite users; **Yjs** real‑time co‑editing; comments.  
- **Custom Scoring**: weights per criterion; exportable scoring presets.  
- **Linear Integration**: push MVP user stories to Linear as issues.  
- **“Send to Kiro”**: deep‑link/open with prefilled spec.

## 11) Phase 3 (4–8 weeks)
- **Lean/Business Model Canvas** auto‑fill; **Pitch Deck** draft.  
- **Financial rough‑cuts**: pricing scenarios, breakeven estimates.  
- **Repo/CI bootstrap**: generate README, env templates, GitHub Actions.  
- **Templates marketplace**: domain‑specific prompts (SaaS, mobile, devtools).  
- **Privacy modes**: local‑only ideas; encrypted at rest.  
- **Insights**: which suggestions users keep; prompt optimization loop.

---

## 12) Risks & Mitigations
- **Research accuracy**: show sources; let user confirm before insert.  
- **Hallucinations**: constrain prompts; request JSON; keep outputs short.  
- **Scope creep**: tabs/steps keep MVP tight; everything rolls into one doc.  
- **Vendor costs**: cache results; batch domain checks; gateway for AI keys.

---

## 13) Kiro‑Ready Spec Template (Export)
> The export action builds a `.md` using the live document + panels. Example structure:

```markdown
# {Idea Title} — MVP Spec

## 1. Overview
{Problem} → {Solution}. Target users: {Users}. Differentiators: {Gaps}.

## 2. Goals & Non‑Goals
- Goals: {Top 3}
- Non‑Goals: {Top 3}

## 3. User Stories (MVP)
- As a {user}, I can {action} so that {outcome}.  ✅ Acceptance: {criteria}
- ... (≤ 8 total)

## 4. Scope (MoSCoW)
- **Must:** {Feature A}, {Feature B}, ...
- **Should:** ...
- **Could:** ...

## 5. Non‑Functional
Perf, security, privacy, accessibility (brief).

## 6. Tech Stack
Next.js 15, Vercel, Postgres + Prisma, NextAuth, Vercel AI SDK v5, shadcn/ui, TipTap.

## 7. Open Questions
{List of 3–5}.

## 8. Milestones
M0: Setup → M1: MVP features → M2: Export & Kiro handoff.
```

---

## 14) Branding Notes
- **Product name:** **IdeaLauncher**  
- **Domain:** **idealauncher.xyz** (app + marketing site)  
- Keep naming for per‑idea projects distinct (use internal project names; optional domain checks for those).

---

## 15) License & Attribution
- Internal hackathon MVP; default license **MIT** for app scaffolding.  
- Third‑party libs per their licenses.

---

### Appendix — Quick Links
- Next.js 15 — https://nextjs.org/docs  
- Vercel AI SDK v5 — https://ai-sdk.dev  
- AI Elements — https://ai-sdk.dev/elements/overview  
- shadcn/ui — https://ui.shadcn.com  
- Prisma — https://www.prisma.io/docs  
- NextAuth (Auth.js) — https://authjs.dev  
- TipTap — https://tiptap.dev  
- Yjs — https://yjs.dev  
- Domainr API — https://domainr.com/docs  
- SerpAPI — https://serpapi.com
```

