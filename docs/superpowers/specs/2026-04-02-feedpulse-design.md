# FeedPulse Design Spec

## Overview

FeedPulse is a feedback intelligence dashboard deployed on Cloudflare Workers. It ingests mock product feedback from multiple sources, runs each through Workers AI for sentiment and theme extraction, stores structured results in D1, and serves a single-page HTML dashboard with a live "Load Demo Data" experience.

This is a Cloudflare PM intern assignment. The prototype matters less than the friction log — real, specific issues encountered while building.

## Architecture

### Cloudflare Products (4)

| Product | Role |
|---------|------|
| **Workers** | Entry point, API routes, serves HTML dashboard |
| **Workers AI** (Llama 3.1 8B) | Sentiment analysis + theme extraction, returns structured JSON |
| **D1 Database** | Stores feedback entries with source, text, sentiment, theme, summary, timestamp |
| **KV** (stretch goal) | Caches AI analysis results (1-hour TTL) to avoid re-running inference |

Bindings configured in `wrangler.jsonc`.

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Serve single-page HTML dashboard |
| `/analyze` | POST | Accept `{source, text}`, run Workers AI, store in D1 (+ KV cache if implemented) |
| `/results` | GET | Query D1, return all feedback as JSON |
| `/test-ai` | GET | Dev-only: send hardcoded text to Llama, return raw response (used during Step 4, can be removed before final deploy) |

### D1 Schema

```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,        -- 'github' | 'discord' | 'support'
  raw_text TEXT NOT NULL,
  sentiment TEXT NOT NULL,     -- 'positive' | 'neutral' | 'negative'
  theme TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Workers AI Prompt Strategy

The prompt to Llama 3.1 8B must enforce structured JSON output. Approach:

```
You are a feedback analysis engine. Analyze the following user feedback and respond with ONLY valid JSON in this exact format, no other text:

{"sentiment": "positive|neutral|negative", "theme": "one or two word theme", "summary": "one sentence summary"}

Feedback: "{input_text}"
```

If JSON parsing fails, retry once with a stricter prompt that includes an example response. If it still fails, fall back to a default: `{"sentiment": "neutral", "theme": "unknown", "summary": "Analysis failed"}` and log the raw response for debugging.

### Data Flow

```
"Load Demo Data" button click
  → Frontend sends 10 sequential POST /analyze calls (mock data in JS)
    → Worker receives {source, text}
      → (KV cache check — stretch goal)
      → Workers AI: sentiment + theme + summary extraction
      → Parse JSON response
      → INSERT INTO D1
      → Return result
  → After each /analyze resolves, frontend re-fetches GET /results
  → Dashboard re-renders with updated data
```

## Dashboard Design

### Design Tokens

```css
:root {
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-hover: #334155;
  --border: #334155;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --accent: #f97316;
  --accent-hover: #ea580c;
  --positive: #22c55e;
  --neutral: #eab308;
  --negative: #ef4444;
  --source-github: #8b5cf6;
  --source-discord: #5865f2;
  --source-support: #06b6d4;
}
```

### Typography

- Font: `'Inter', system-ui, -apple-system, sans-serif` (Google Fonts CDN — only external dependency)
- Page title: `1.5rem`, weight `700`
- Card headers: `0.875rem`, weight `600`, uppercase, `--text-muted`, letter-spacing `0.05em`
- Body text: `0.875rem`, weight `400`
- Stat numbers: `2rem`, weight `700`

### Layout

- Page max-width: `1080px`, centered
- Grid: `repeat(auto-fit, minmax(300px, 1fr))`, gap `1rem`
- Card padding: `1.5rem`, border-radius `0.75rem`, border `1px solid var(--border)`

### Components

| Component | Style |
|-----------|-------|
| **Stat card** | Surface bg, large number (colored by sentiment token) + label beneath. Three in a row: positive / neutral / negative. |
| **Theme pill** | `--surface-hover` bg, `0.75rem` font, `0.25rem 0.75rem` padding, border-radius `9999px` |
| **Feedback entry** | Surface card. Top: source pill + timestamp (right-aligned). Middle: raw text. Bottom: sentiment pill + theme pill. |
| **Source pill** | Colored by source (`--source-github`, `--source-discord`, `--source-support`). Same pill shape as theme. |
| **Button (primary)** | `--accent` bg, white text, `0.875rem` weight `600`, `0.625rem 1.25rem` padding, border-radius `0.5rem`. Hover: `--accent-hover`. Disabled: `opacity 0.5`. |
| **Loading state** | Button text → "Analyzing...", `opacity 0.7`, cursor `wait`. |

### Dashboard Sections (top to bottom)

1. **Header** — "FeedPulse" title + "Load Demo Data" button
2. **Stat cards row** — Three cards: positive count, neutral count, negative count
3. **Theme distribution** — Row of theme pills with occurrence counts
4. **Feedback feed** — Scrollable list of individual feedback entry cards, newest first

### Interaction Flow

1. Reviewer opens URL → empty dashboard with header and "Load Demo Data" button
2. Clicks button → text changes to "Analyzing... (0/10)", count updates per entry
3. Frontend sends 10 sequential `POST /analyze` calls. After each resolves, re-fetches `GET /results` and re-renders dashboard
4. Once complete → button text changes to "Demo Data Loaded" (disabled)

### Mock Data (hardcoded in frontend JS)

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

## Build Order

Each step is independently verifiable before moving on.

| Step | Task | Done When | Required? |
|------|------|-----------|-----------|
| 1 | Bare Worker deploys, serves placeholder HTML | `.workers.dev` loads a page | Yes |
| 2 | D1 created, schema applied | `SELECT * FROM feedback` returns empty, no error | Yes |
| 3 | GET `/results` returns JSON from D1 | Endpoint returns `[]` | Yes |
| 4 | GET `/test-ai` sends hardcoded text to Llama | Returns parseable JSON with sentiment/theme/summary | Yes |
| 5 | POST `/analyze` wires AI into D1 | Posting creates a row visible in `/results` | Yes |
| 6 | Full dashboard with "Load Demo Data" | Clicking button populates dashboard live | Yes |
| 7 | KV caching on `/analyze` | Same text twice skips AI call | Stretch goal |

### Fallback Points

- **After Step 5**: Working API, no UI. Not demo-ready but pipeline functional.
- **After Step 6**: Complete deliverable. Deploy this.
- **After Step 7**: Polish. Deploy this if time permits.

## Known Risks

- **Workers AI JSON output**: Llama won't return clean JSON unless prompted explicitly. Enforce schema in the prompt, add parse error handling. Budget extra time for Step 4.
- **D1 local vs deployed**: `wrangler dev` uses local SQLite that can behave differently than deployed D1.
- **Wrangler config format**: `.toml` vs `.jsonc` syntax causes cryptic errors. Binding names must match code exactly.
- **Workers AI cold starts**: First inference on 8B model will be slow. Note exact latency for friction log.

## Time Plan

| Time | Task |
|------|------|
| 0:00-0:45 | Cloudflare account setup, scaffold project, connect MCP server (Steps 1-2) |
| 0:45-1:30 | D1 reads + Workers AI integration + `/analyze` endpoint (Steps 3-5) |
| 1:30-2:15 | Build dashboard with "Load Demo Data" real-time flow (Step 6) |
| 2:15-2:45 | Deploy, verify live, KV caching if time permits (Step 7), screenshot Bindings |
| 2:45-4:00 | Write friction log from real breakage |
