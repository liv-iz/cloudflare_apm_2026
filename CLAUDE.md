# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FeedPulse** — a Cloudflare Workers feedback intelligence dashboard. It ingests mock product feedback (GitHub issues, Discord messages, support tickets), runs each through Workers AI for sentiment + theme extraction, stores structured results in D1, caches with KV, and serves a single-page HTML dashboard.

This is a PM intern assignment. The prototype matters less than the friction log — real, specific issues encountered while building (not researched). The assignment brief is in `Product_Manager_Intern_Assignment_Lisbon_2026.md`.

## Architecture & Stack

4 Cloudflare products (requirement is 2-3, this exceeds it):

- **Cloudflare Workers** — entry point, API routes, serves HTML dashboard
- **Workers AI** (Llama 3.1 8B) — sentiment analysis + theme extraction, returns structured JSON
- **D1 Database** — stores feedback entries with source, text, sentiment, theme, timestamp
- **KV** — caches AI analysis results (1-hour TTL) so reloads don't re-run inference

Bindings are configured in `wrangler.jsonc`.

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Serve single-page HTML dashboard |
| `/analyze` | POST | Accept `{source, text}`, run Workers AI, store in D1, cache in KV |
| `/results` | GET | Query D1, return all feedback as JSON |
| `/test-ai` | GET | Dev-only: send hardcoded text to Llama, return raw response (remove before final deploy) |

### D1 Schema

Feedback table: `id`, `source` (github/discord/support), `raw_text`, `sentiment` (positive/negative/neutral), `theme` (string), `summary`, `created_at`.

### Dashboard

Single-page HTML served from the Worker. One external dependency: Inter font from Google Fonts CDN. Everything else is vanilla HTML/CSS/JS.

#### Design Tokens

```css
:root {
  /* Backgrounds */
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-hover: #334155;
  --border: #334155;

  /* Text */
  --text: #f1f5f9;
  --text-muted: #94a3b8;

  /* Accent (Cloudflare orange) */
  --accent: #f97316;
  --accent-hover: #ea580c;

  /* Sentiment */
  --positive: #22c55e;
  --neutral: #eab308;
  --negative: #ef4444;

  /* Source pills */
  --source-github: #8b5cf6;
  --source-discord: #5865f2;
  --source-support: #06b6d4;
}
```

#### Typography

- Font: `'Inter', system-ui, -apple-system, sans-serif` (Google Fonts CDN)
- Page title: `1.5rem`, weight `700`
- Card headers: `0.875rem`, weight `600`, uppercase, `--text-muted`, letter-spacing `0.05em`
- Body text: `0.875rem`, weight `400`
- Stat numbers: `2rem`, weight `700`

#### Layout

- Page max-width: `1080px`, centered
- Grid: `repeat(auto-fit, minmax(300px, 1fr))`, gap `1rem`
- Card padding: `1.5rem`, border-radius `0.75rem`, border `1px solid var(--border)`

#### Components

| Component | Style |
|-----------|-------|
| **Stat card** | Surface bg, large number (colored by sentiment token) + label beneath. Three in a row: positive / neutral / negative. |
| **Theme pill** | `--surface-hover` bg, `0.75rem` font, `0.25rem 0.75rem` padding, border-radius `9999px` |
| **Feedback entry** | Surface card. Top: source pill + timestamp (right-aligned). Middle: raw text. Bottom: sentiment pill + theme pill. |
| **Source pill** | Colored by source (`--source-github`, `--source-discord`, `--source-support`). Same pill shape as theme. |
| **Button (primary)** | `--accent` bg, white text, `0.875rem` weight `600`, `0.625rem 1.25rem` padding, border-radius `0.5rem`. Hover: `--accent-hover`. Disabled: `opacity 0.5`. |
| **Loading state** | Button text → "Analyzing...", `opacity 0.7`, cursor `wait`. |

#### Dashboard Sections (top to bottom)

1. **Header** — "FeedPulse" title + "Load Demo Data" button
2. **Stat cards row** — Three cards: positive count, neutral count, negative count
3. **Theme distribution** — Row of theme pills with counts
4. **Feedback feed** — Scrollable list of individual feedback entry cards, newest first

#### Dashboard Interaction Flow

1. Reviewer opens URL → empty dashboard with header and "Load Demo Data" button only
2. Clicks "Load Demo Data" → button changes to "Analyzing... (0/10)", updates count per entry
3. Frontend sends 10 sequential `POST /analyze` calls (one per mock entry). After each resolves, re-fetches `GET /results` and re-renders — stat cards, theme pills, and feed populate in real-time
4. Once complete → button changes to "Demo Data Loaded" (disabled)

This is simpler than WebSockets and the "watch it populate" effect is more impressive than a pre-filled page.

#### Mock Data (hardcoded in frontend JS)

| # | Source | Text | Expected Sentiment |
|---|--------|------|--------------------|
| 1 | github | Billing page doesn't show invoice history | negative |
| 2 | discord | Workers AI response times are great | positive |
| 3 | support | Can't find D1 docs for migrations | negative |
| 4 | github | Love the new Wrangler CLI improvements | positive |
| 5 | discord | KV eventual consistency confused our team | neutral |
| 6 | support | Dashboard UI is slow on mobile | negative |
| 7 | github | Workflows retry logic saved our pipeline | positive |
| 8 | discord | Confused about Workers vs Pages pricing | neutral |
| 9 | support | R2 upload works perfectly, great S3 compat | positive |
| 10 | github | Error messages in D1 are cryptic | negative |

Mock data mixes sources, topics, and sentiments. Topics are Cloudflare-relevant — a meta touch for reviewers.

## Common Commands

```bash
# Install dependencies
npm install

# Local development
npx wrangler dev

# Deploy to Cloudflare
npx wrangler deploy

# Create D1 database (first time only)
npx wrangler d1 create feedpulse-db

# Run D1 migrations locally
npx wrangler d1 execute feedpulse-db --local --file=./schema.sql

# Run D1 migrations in production
npx wrangler d1 execute feedpulse-db --file=./schema.sql

# Seed mock data — use the dashboard's "Load Demo Data" button instead of SQL
```

## MCP Server

Cloudflare Docs MCP is connected for live documentation access. Always verify binding syntax and Workers AI usage against MCP docs before writing config — training data may be outdated.

```bash
# Already added via:
claude mcp add --transport http cloudflare-docs https://docs.mcp.cloudflare.com/mcp
```

## Known Gotchas

- **Workers AI JSON output**: Llama won't return clean JSON unless you prompt explicitly for it. Enforce the schema in the prompt and add parse error handling. This will take multiple iterations.
- **D1 local vs deployed**: `wrangler dev` uses local SQLite that behaves slightly differently than deployed D1. Test both.
- **Wrangler config format**: `.toml` vs `.jsonc` syntax can cause cryptic errors. Binding names in config must match code exactly.
- **Workers AI cold starts**: First inference call on 8B model will be slow. Note exact latency for the friction log.
- **Dashboard CORS**: If the Worker splits API + static assets, CORS will bite. Serving everything from one Worker avoids this.

## Friction Log Guidance

Log issues **as they happen** with exact error messages and what caused them. Cloudflare reviewers will spot theoretical vs. experienced friction. Format per entry:

- **Title**: Concise name
- **Problem**: What happened, exact error, how it slowed you down
- **Suggestion**: How you'd fix it as a PM (UI change, better error message, new docs section, etc.)

## Build Order (Incremental — verify each step before moving on)

1. **Bare Worker deploys and serves HTML** — Scaffold project, deploy a minimal Worker that returns a placeholder page. Done when `.workers.dev` URL loads.
2. **D1 database created and schema applied** — Create DB, write and run schema migration. Done when `SELECT * FROM feedback` returns empty result (no error).
3. **Worker reads from D1** — Add D1 binding, add GET `/results` returning JSON. Done when the endpoint returns `[]`.
4. **Workers AI analyzes hardcoded text** — Add AI binding, add GET `/test-ai` that sends one string to Llama and returns raw output. Iterate prompt until it returns valid JSON with sentiment, theme, summary. Done when `/test-ai` returns parseable structured JSON.
5. **Wire AI into D1 via /analyze** — POST `/analyze` accepts `{source, text}`, calls AI, parses result, inserts into D1. Done when posting creates a row visible in GET `/results`.
6. **Build the dashboard** — Replace placeholder HTML with the full dashboard (design system, stat cards, theme pills, feedback feed). Wire to fetch `/results`. Add "Load Demo Data" button that sends 10 sequential `/analyze` calls with real-time progress. Done when clicking the button populates the dashboard live.
7. **Add KV caching (stretch goal)** — Wrap AI call with KV check (hash input as key, 1hr TTL). Done when same text twice doesn't trigger a second AI call. Skip this if behind schedule — the dashboard is the demo, not the cache.

## Time Plan

| Time | Task |
|------|------|
| 0:00–0:45 | Cloudflare account setup, scaffold project, connect MCP server (Steps 1-2) |
| 0:45–1:30 | D1 reads + Workers AI integration + `/analyze` endpoint (Steps 3-5) |
| 1:30–2:15 | Build dashboard with "Load Demo Data" real-time flow (Step 6) |
| 2:15–2:45 | Deploy, verify live, KV caching if time permits (Step 7), screenshot Bindings |
| 2:45–4:00 | Write friction log from real breakage |

## Deliverables

1. Live deployed prototype on `*.workers.dev`
2. GitHub repo with source code
3. Architecture overview (screenshot of Workers Binding page from dashboard)
4. Friction log with 3-5 product insights
5. PDF combining all of the above
