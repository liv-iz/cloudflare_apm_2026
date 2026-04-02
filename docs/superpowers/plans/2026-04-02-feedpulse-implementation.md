# FeedPulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a feedback intelligence dashboard on Cloudflare Workers that analyzes mock feedback with Workers AI and displays results in a live dashboard.

**Architecture:** A single Cloudflare Worker serves an HTML dashboard and exposes JSON API endpoints. POST `/analyze` calls Workers AI (Llama 3.1 8B) for sentiment/theme/summary, writes results to D1. The dashboard's "Load Demo Data" button sends 10 sequential `/analyze` calls and re-renders after each one completes.

**Tech Stack:** Cloudflare Workers (TypeScript), Workers AI (Llama 3.1 8B), D1 (SQLite), KV (stretch), Wrangler CLI, vanilla HTML/CSS/JS dashboard.

**Spec:** `docs/superpowers/specs/2026-04-02-feedpulse-design.md`

---

## File Structure

```
feedpulse/
├── wrangler.jsonc          # Bindings: D1, Workers AI, KV
├── package.json            # Dependencies (wrangler only)
├── tsconfig.json           # TypeScript config (from scaffold)
├── schema.sql              # D1 migration: CREATE TABLE feedback
├── src/
│   ├── index.ts            # Worker entry point: router + all route handlers
│   └── dashboard.ts        # Exports HTML string for the dashboard (keeps index.ts focused on routing)
```

Two source files. `index.ts` owns routing, D1 queries, and Workers AI calls. `dashboard.ts` exports a function that returns the full HTML/CSS/JS dashboard string. This split keeps the Worker logic readable and the 200+ lines of HTML out of the router.

---

## Task 1: Scaffold project and deploy bare Worker

**Files:**
- Create: `feedpulse/` (via scaffold)
- Modify: `feedpulse/src/index.ts`
- Modify: `feedpulse/wrangler.jsonc`

- [ ] **Step 1: Scaffold the project**

Run from the repo root:

```bash
npm create cloudflare@latest feedpulse
```

When prompted:
- Template: "Hello World" Worker
- TypeScript: Yes
- Deploy: No (we'll deploy manually)

- [ ] **Step 2: Install dependencies**

```bash
cd feedpulse
npm install
```

- [ ] **Step 3: Replace the default Worker with a placeholder HTML response**

Replace the contents of `src/index.ts` with:

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FeedPulse</title>
</head>
<body>
  <h1>FeedPulse</h1>
  <p>Feedback intelligence dashboard — coming soon.</p>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 4: Verify locally**

```bash
npx wrangler dev
```

Open `http://localhost:8787` in a browser. You should see the "FeedPulse" heading and placeholder text.

- [ ] **Step 5: Deploy**

```bash
npx wrangler deploy
```

Expected: Wrangler outputs a URL like `feedpulse.<account>.workers.dev`. Open it in a browser and confirm the placeholder page loads.

- [ ] **Step 6: Commit**

```bash
cd ..
git add feedpulse/
git commit -m "feat: scaffold FeedPulse Worker with placeholder HTML"
```

---

## Task 2: Create D1 database and apply schema

**Files:**
- Create: `feedpulse/schema.sql`
- Modify: `feedpulse/wrangler.jsonc` (add D1 binding)

- [ ] **Step 1: Create the D1 database**

```bash
cd feedpulse
npx wrangler d1 create feedpulse-db
```

Expected output includes a `database_id`. Copy it — you'll need it for the next step.

- [ ] **Step 2: Add the D1 binding to wrangler.jsonc**

Open `feedpulse/wrangler.jsonc`. Add the D1 binding. The file should look like (keep any existing fields from scaffold, just add the `d1_databases` array):

```jsonc
{
  "name": "feedpulse",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "feedpulse-db",
      "database_id": "<paste your database_id here>"
    }
  ]
}
```

Replace `<paste your database_id here>` with the actual ID from Step 1.

- [ ] **Step 3: Write the schema migration**

Create `feedpulse/schema.sql`:

```sql
DROP TABLE IF EXISTS feedback;

CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  theme TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 4: Run the migration locally**

```bash
npx wrangler d1 execute feedpulse-db --local --file=schema.sql
```

- [ ] **Step 5: Verify the table exists locally**

```bash
npx wrangler d1 execute feedpulse-db --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name='feedback';"
```

Expected: Returns one row with `name = feedback`.

- [ ] **Step 6: Run the migration on the remote database**

```bash
npx wrangler d1 execute feedpulse-db --file=schema.sql
```

- [ ] **Step 7: Verify the remote table**

```bash
npx wrangler d1 execute feedpulse-db --command="SELECT * FROM feedback;"
```

Expected: Returns an empty result set (columns but no rows), no errors.

- [ ] **Step 8: Update the Env type to include D1**

In `src/index.ts`, add the D1 binding type. Add this interface near the top of the file (or update the existing `Env` interface if the scaffold created one):

```typescript
interface Env {
  DB: D1Database;
}
```

- [ ] **Step 9: Commit**

```bash
git add schema.sql wrangler.jsonc src/index.ts
git commit -m "feat: create D1 database and feedback table schema"
```

---

## Task 3: Add GET /results endpoint

**Files:**
- Modify: `feedpulse/src/index.ts`

- [ ] **Step 1: Add a URL router and /results handler**

Replace `src/index.ts` with:

```typescript
interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/results" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all();
      return Response.json(results);
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FeedPulse</title>
</head>
<body>
  <h1>FeedPulse</h1>
  <p>Feedback intelligence dashboard — coming soon.</p>
</body>
</html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 2: Verify locally**

```bash
npx wrangler dev
```

Open `http://localhost:8787/results` in a browser. Expected: `[]` (empty JSON array).

Open `http://localhost:8787/` — placeholder page still loads.

Open `http://localhost:8787/anything-else` — returns "Not found" with 404.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add GET /results endpoint returning feedback from D1"
```

---

## Task 4: Add Workers AI integration with /test-ai endpoint

**Files:**
- Modify: `feedpulse/wrangler.jsonc` (add AI binding)
- Modify: `feedpulse/src/index.ts` (add /test-ai route + AI call)

- [ ] **Step 1: Add Workers AI binding to wrangler.jsonc**

Add the `ai` binding to your `wrangler.jsonc`:

```jsonc
{
  "name": "feedpulse",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-01",
  "ai": {
    "binding": "AI"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "feedpulse-db",
      "database_id": "<your database_id>"
    }
  ]
}
```

**Important:** Use the Cloudflare Docs MCP server to verify the exact binding syntax for Workers AI. The format above is the expected syntax as of early 2026, but it may have changed. Run `mcp cloudflare-docs` or check the MCP tool to confirm.

- [ ] **Step 2: Update the Env interface**

In `src/index.ts`, update the `Env` interface:

```typescript
interface Env {
  DB: D1Database;
  AI: Ai;
}
```

Note: The `Ai` type is globally available in Workers TypeScript — no import needed.

- [ ] **Step 3: Add the /test-ai route**

Add this route handler in `src/index.ts`, before the `/` route:

```typescript
    if (url.pathname === "/test-ai" && request.method === "GET") {
      const testText = "The billing page doesn't show invoice history for the last 3 months. I had to contact support to get a PDF.";

      const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          {
            role: "system",
            content: 'You are a feedback analysis engine. Respond with ONLY valid JSON in this exact format, no other text:\n\n{"sentiment": "positive|neutral|negative", "theme": "one or two word theme", "summary": "one sentence summary"}'
          },
          {
            role: "user",
            content: testText
          }
        ]
      });

      // Return raw AI response so we can inspect the format
      return Response.json({
        raw_response: response,
        input: testText
      });
    }
```

- [ ] **Step 4: Verify locally**

```bash
npx wrangler dev
```

Open `http://localhost:8787/test-ai`. Inspect the response:

- Does `raw_response` contain a `response` field with text?
- Is the text valid JSON with `sentiment`, `theme`, and `summary` keys?
- Are the values reasonable for the test input?

**If the response is not valid JSON:** This is expected. You'll need to iterate on the prompt. Try adding an example to the system message:

```
Example:
Input: "The dashboard loads too slowly on mobile devices"
Output: {"sentiment": "negative", "theme": "performance", "summary": "User reports slow dashboard loading times on mobile."}
```

**If you get an error about the AI binding:** Check `wrangler.jsonc` binding syntax against the MCP docs. This is a common friction point — log it.

- [ ] **Step 5: Once the AI returns parseable JSON, verify the structure**

Update the `/test-ai` handler to also parse and validate:

```typescript
    if (url.pathname === "/test-ai" && request.method === "GET") {
      const testText = "The billing page doesn't show invoice history for the last 3 months. I had to contact support to get a PDF.";

      const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          {
            role: "system",
            content: 'You are a feedback analysis engine. Respond with ONLY valid JSON in this exact format, no other text:\n\n{"sentiment": "positive|neutral|negative", "theme": "one or two word theme", "summary": "one sentence summary"}\n\nExample:\nInput: "The dashboard loads too slowly on mobile devices"\nOutput: {"sentiment": "negative", "theme": "performance", "summary": "User reports slow dashboard loading times on mobile."}'
          },
          {
            role: "user",
            content: testText
          }
        ]
      });

      const rawText = (response as { response?: string }).response ?? JSON.stringify(response);

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return Response.json({
          error: "AI response was not valid JSON",
          raw: rawText
        }, { status: 500 });
      }

      return Response.json({
        input: testText,
        parsed,
        valid: "sentiment" in parsed && "theme" in parsed && "summary" in parsed
      });
    }
```

Reload `http://localhost:8787/test-ai`. Expected: `valid: true` with reasonable `parsed` values.

- [ ] **Step 6: Commit**

```bash
git add wrangler.jsonc src/index.ts
git commit -m "feat: add Workers AI integration with /test-ai endpoint"
```

---

## Task 5: Wire POST /analyze to store AI results in D1

**Files:**
- Modify: `feedpulse/src/index.ts`

- [ ] **Step 1: Extract the AI analysis logic into a helper function**

Add this function above the `export default` block in `src/index.ts`:

```typescript
interface AnalysisResult {
  sentiment: string;
  theme: string;
  summary: string;
}

const FALLBACK_RESULT: AnalysisResult = {
  sentiment: "neutral",
  theme: "unknown",
  summary: "Analysis failed",
};

async function analyzeFeedback(ai: Ai, text: string): Promise<AnalysisResult> {
  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content: 'You are a feedback analysis engine. Respond with ONLY valid JSON in this exact format, no other text:\n\n{"sentiment": "positive|neutral|negative", "theme": "one or two word theme", "summary": "one sentence summary"}\n\nExample:\nInput: "The dashboard loads too slowly on mobile devices"\nOutput: {"sentiment": "negative", "theme": "performance", "summary": "User reports slow dashboard loading times on mobile."}'
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  const rawText = (response as { response?: string }).response ?? JSON.stringify(response);

  try {
    const parsed = JSON.parse(rawText);
    if ("sentiment" in parsed && "theme" in parsed && "summary" in parsed) {
      return parsed as AnalysisResult;
    }
  } catch {
    // Fall through to fallback
  }

  console.error("AI returned unparseable response:", rawText);
  return FALLBACK_RESULT;
}
```

- [ ] **Step 2: Add the POST /analyze route**

Add this route handler in `src/index.ts`, before the `/test-ai` route:

```typescript
    if (url.pathname === "/analyze" && request.method === "POST") {
      const body = await request.json<{ source: string; text: string }>();

      if (!body.source || !body.text) {
        return Response.json({ error: "source and text are required" }, { status: 400 });
      }

      const analysis = await analyzeFeedback(env.AI, body.text);

      await env.DB.prepare(
        "INSERT INTO feedback (source, raw_text, sentiment, theme, summary) VALUES (?, ?, ?, ?, ?)"
      ).bind(body.source, body.text, analysis.sentiment, analysis.theme, analysis.summary).run();

      return Response.json({
        source: body.source,
        raw_text: body.text,
        ...analysis,
      });
    }
```

- [ ] **Step 3: Update the /test-ai route to use the shared helper**

Replace the `/test-ai` handler with a simpler version that reuses `analyzeFeedback`:

```typescript
    if (url.pathname === "/test-ai" && request.method === "GET") {
      const testText = "The billing page doesn't show invoice history for the last 3 months.";
      const result = await analyzeFeedback(env.AI, testText);
      return Response.json({ input: testText, ...result });
    }
```

- [ ] **Step 4: Verify locally**

```bash
npx wrangler dev
```

Test with curl (or any HTTP client):

```bash
curl -X POST http://localhost:8787/analyze \
  -H "Content-Type: application/json" \
  -d '{"source": "github", "text": "The billing page doesn'\''t show invoice history"}'
```

Expected: JSON response with `source`, `raw_text`, `sentiment`, `theme`, `summary`.

Then verify it was stored:

```bash
curl http://localhost:8787/results
```

Expected: Array with one entry matching the data you just posted.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: add POST /analyze endpoint wiring Workers AI to D1"
```

---

## Task 6: Build the dashboard with "Load Demo Data"

**Files:**
- Create: `feedpulse/src/dashboard.ts`
- Modify: `feedpulse/src/index.ts` (import dashboard, update `/` route)

- [ ] **Step 1: Create the dashboard HTML module**

Create `feedpulse/src/dashboard.ts`:

```typescript
export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FeedPulse</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
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

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.5;
    }

    .container {
      max-width: 1080px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .btn {
      background: var(--accent);
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn:hover { background: var(--accent-hover); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.loading { opacity: 0.7; cursor: wait; }

    /* Section headers */
    .section-header {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }

    /* Stat cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
      text-align: center;
    }

    .stat-card .number {
      font-size: 2rem;
      font-weight: 700;
    }

    .stat-card .label {
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .stat-card.positive .number { color: var(--positive); }
    .stat-card.neutral .number { color: var(--neutral); }
    .stat-card.negative .number { color: var(--negative); }

    /* Theme pills */
    .themes {
      margin-bottom: 2rem;
    }

    .theme-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .pill {
      display: inline-block;
      background: var(--surface-hover);
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
    }

    .pill.source-github { background: var(--source-github); }
    .pill.source-discord { background: var(--source-discord); }
    .pill.source-support { background: var(--source-support); }

    .pill.sentiment-positive { background: var(--positive); color: #000; }
    .pill.sentiment-neutral { background: var(--neutral); color: #000; }
    .pill.sentiment-negative { background: var(--negative); color: #fff; }

    /* Feedback feed */
    .feed {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .feed-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .feed-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .feed-card-header .timestamp {
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .feed-card-text {
      margin-bottom: 0.75rem;
      line-height: 1.6;
    }

    .feed-card-footer {
      display: flex;
      gap: 0.5rem;
    }

    .empty-state {
      text-align: center;
      color: var(--text-muted);
      padding: 3rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FeedPulse</h1>
      <button class="btn" id="seedBtn" onclick="loadDemoData()">Load Demo Data</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card positive">
        <div class="number" id="positiveCount">0</div>
        <div class="label">Positive</div>
      </div>
      <div class="stat-card neutral">
        <div class="number" id="neutralCount">0</div>
        <div class="label">Neutral</div>
      </div>
      <div class="stat-card negative">
        <div class="number" id="negativeCount">0</div>
        <div class="label">Negative</div>
      </div>
    </div>

    <div class="themes">
      <div class="section-header">Themes</div>
      <div class="theme-pills" id="themePills">
        <span class="empty-state" style="width:100%">No data yet</span>
      </div>
    </div>

    <div>
      <div class="section-header">Feedback</div>
      <div class="feed" id="feed">
        <div class="empty-state">Click "Load Demo Data" to analyze feedback</div>
      </div>
    </div>
  </div>

  <script>
    const MOCK_DATA = [
      { source: "github", text: "Billing page doesn't show invoice history for the last 3 months. I had to contact support to get a PDF." },
      { source: "discord", text: "Workers AI response times are great for real-time analysis. Impressed with the latency." },
      { source: "support", text: "Can't find D1 docs for migrations. Had to guess the CLI commands from error messages." },
      { source: "github", text: "Love the new Wrangler CLI improvements. Deploy times went from 30s to under 5s." },
      { source: "discord", text: "KV eventual consistency confused our team. We wrote a value and read it back immediately but got stale data." },
      { source: "support", text: "Dashboard UI is slow on mobile. Pages take 4-5 seconds to render on my phone." },
      { source: "github", text: "Workflows retry logic saved our pipeline. A transient API failure recovered automatically." },
      { source: "discord", text: "Confused about Workers vs Pages pricing. The docs show different rate structures but don't explain when to pick which." },
      { source: "support", text: "R2 upload works perfectly. Great S3 compatibility, migrated our assets in an afternoon." },
      { source: "github", text: "Error messages in D1 are cryptic. Got 'SQLITE_ERROR' with no indication which column or constraint failed." }
    ];

    async function loadDemoData() {
      const btn = document.getElementById("seedBtn");
      btn.disabled = true;
      btn.classList.add("loading");

      for (let i = 0; i < MOCK_DATA.length; i++) {
        btn.textContent = "Analyzing... (" + (i) + "/" + MOCK_DATA.length + ")";

        try {
          await fetch("/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(MOCK_DATA[i])
          });
        } catch (err) {
          console.error("Failed to analyze entry " + i, err);
        }

        await refreshDashboard();
      }

      btn.textContent = "Demo Data Loaded";
      btn.classList.remove("loading");
    }

    async function refreshDashboard() {
      const res = await fetch("/results");
      const data = await res.json();
      renderStats(data);
      renderThemes(data);
      renderFeed(data);
    }

    function renderStats(data) {
      const counts = { positive: 0, neutral: 0, negative: 0 };
      data.forEach(d => { if (counts.hasOwnProperty(d.sentiment)) counts[d.sentiment]++; });
      document.getElementById("positiveCount").textContent = counts.positive;
      document.getElementById("neutralCount").textContent = counts.neutral;
      document.getElementById("negativeCount").textContent = counts.negative;
    }

    function renderThemes(data) {
      const themes = {};
      data.forEach(d => { themes[d.theme] = (themes[d.theme] || 0) + 1; });
      const container = document.getElementById("themePills");

      if (Object.keys(themes).length === 0) {
        container.innerHTML = '<span class="empty-state" style="width:100%">No data yet</span>';
        return;
      }

      container.innerHTML = Object.entries(themes)
        .sort((a, b) => b[1] - a[1])
        .map(([theme, count]) => '<span class="pill">' + theme + ' \\u00d7' + count + '</span>')
        .join("");
    }

    function renderFeed(data) {
      const container = document.getElementById("feed");

      if (data.length === 0) {
        container.innerHTML = '<div class="empty-state">Click "Load Demo Data" to analyze feedback</div>';
        return;
      }

      container.innerHTML = data.map(entry => {
        const date = new Date(entry.created_at).toLocaleDateString("en-US", {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        });
        return '<div class="feed-card">' +
          '<div class="feed-card-header">' +
            '<span class="pill source-' + entry.source + '">' + entry.source + '</span>' +
            '<span class="timestamp">' + date + '</span>' +
          '</div>' +
          '<div class="feed-card-text">' + escapeHtml(entry.raw_text) + '</div>' +
          '<div class="feed-card-footer">' +
            '<span class="pill sentiment-' + entry.sentiment + '">' + entry.sentiment + '</span>' +
            '<span class="pill">' + escapeHtml(entry.theme) + '</span>' +
          '</div>' +
        '</div>';
      }).join("");
    }

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    // Load existing data on page load
    refreshDashboard();
  </script>
</body>
</html>`;
}
```

- [ ] **Step 2: Update index.ts to import and serve the dashboard**

Add this import at the top of `src/index.ts`:

```typescript
import { getDashboardHtml } from "./dashboard";
```

Replace the existing `/` route handler:

```typescript
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(getDashboardHtml(), {
        headers: { "Content-Type": "text/html" },
      });
    }
```

- [ ] **Step 3: Verify locally**

```bash
npx wrangler dev
```

Open `http://localhost:8787/`. You should see:
- Dark background with "FeedPulse" header and orange "Load Demo Data" button
- Three stat cards showing 0 / 0 / 0
- "No data yet" in themes section
- "Click Load Demo Data" empty state in feed

Click "Load Demo Data":
- Button should show "Analyzing... (0/10)", then (1/10), etc.
- Cards, themes, and feed should populate as each entry completes
- Button should end as "Demo Data Loaded" (disabled)

**Note:** Each `/analyze` call hits Workers AI, so this will take 20-60 seconds total. First call may be slow (cold start). This is normal — note the latency for your friction log.

- [ ] **Step 4: Deploy and verify**

```bash
npx wrangler deploy
```

Open your `*.workers.dev` URL. Run "Load Demo Data" on the deployed version. Verify the full flow works end-to-end.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard.ts src/index.ts
git commit -m "feat: add dashboard with real-time Load Demo Data flow"
```

---

## Task 7: Add KV caching (stretch goal)

**Skip this task if behind schedule. The dashboard from Task 6 is a complete deliverable.**

**Files:**
- Modify: `feedpulse/wrangler.jsonc` (add KV binding)
- Modify: `feedpulse/src/index.ts` (add KV cache to analyzeFeedback)

- [ ] **Step 1: Create a KV namespace**

```bash
npx wrangler kv namespace create CACHE
```

Expected output includes a namespace `id`. Copy it.

- [ ] **Step 2: Add KV binding to wrangler.jsonc**

Add to your `wrangler.jsonc`:

```jsonc
{
  "name": "feedpulse",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-01",
  "ai": {
    "binding": "AI"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "feedpulse-db",
      "database_id": "<your database_id>"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "<paste your KV namespace id here>"
    }
  ]
}
```

- [ ] **Step 3: Update the Env interface**

In `src/index.ts`:

```typescript
interface Env {
  DB: D1Database;
  AI: Ai;
  CACHE: KVNamespace;
}
```

- [ ] **Step 4: Add caching to the analyzeFeedback function**

Replace the `analyzeFeedback` function with a cached version:

```typescript
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function analyzeFeedback(ai: Ai, text: string, cache?: KVNamespace): Promise<AnalysisResult> {
  // Check cache first
  if (cache) {
    const key = await hashText(text);
    const cached = await cache.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content: 'You are a feedback analysis engine. Respond with ONLY valid JSON in this exact format, no other text:\n\n{"sentiment": "positive|neutral|negative", "theme": "one or two word theme", "summary": "one sentence summary"}\n\nExample:\nInput: "The dashboard loads too slowly on mobile devices"\nOutput: {"sentiment": "negative", "theme": "performance", "summary": "User reports slow dashboard loading times on mobile."}'
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  const rawText = (response as { response?: string }).response ?? JSON.stringify(response);

  let result: AnalysisResult;
  try {
    const parsed = JSON.parse(rawText);
    if ("sentiment" in parsed && "theme" in parsed && "summary" in parsed) {
      result = parsed as AnalysisResult;
    } else {
      result = FALLBACK_RESULT;
    }
  } catch {
    console.error("AI returned unparseable response:", rawText);
    result = FALLBACK_RESULT;
  }

  // Store in cache with 1-hour TTL
  if (cache) {
    const key = await hashText(text);
    await cache.put(key, JSON.stringify(result), { expirationTtl: 3600 });
  }

  return result;
}
```

- [ ] **Step 5: Update the /analyze and /test-ai routes to pass the cache**

In the `/analyze` handler, change the `analyzeFeedback` call:

```typescript
      const analysis = await analyzeFeedback(env.AI, body.text, env.CACHE);
```

In the `/test-ai` handler:

```typescript
      const result = await analyzeFeedback(env.AI, testText, env.CACHE);
```

- [ ] **Step 6: Verify caching works**

```bash
npx wrangler dev
```

Run the same curl command twice:

```bash
curl -X POST http://localhost:8787/analyze \
  -H "Content-Type: application/json" \
  -d '{"source": "github", "text": "Test caching behavior"}'
```

The second call should be noticeably faster (cached). Both calls should insert a row into D1 (the cache is for AI results, not the DB write — the same text analyzed twice still creates two feedback rows, which is correct behavior for this prototype).

- [ ] **Step 7: Deploy and verify**

```bash
npx wrangler deploy
```

- [ ] **Step 8: Commit**

```bash
git add wrangler.jsonc src/index.ts
git commit -m "feat: add KV caching for Workers AI responses"
```

---

## Final: Deploy and screenshot

- [ ] **Step 1: Final deploy**

```bash
npx wrangler deploy
```

- [ ] **Step 2: Verify the full flow on the live URL**

Open your `*.workers.dev` URL. Click "Load Demo Data". Confirm all 10 entries appear with correct sentiment labels and themes.

- [ ] **Step 3: Screenshot the Bindings page**

Go to the Cloudflare dashboard → Workers & Pages → feedpulse → Settings → Bindings. Screenshot this page — it's a required deliverable showing which products are connected.

- [ ] **Step 4: Commit any final changes and push**

```bash
git add -A
git commit -m "chore: final deploy verification"
git push origin main
```
