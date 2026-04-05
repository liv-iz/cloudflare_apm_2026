# FeedPulse — PM Intern Assignment Submission

## Project Links

- **Live Prototype**: [feedpulse.oliviaissler.workers.dev](https://feedpulse.oliviaissler.workers.dev)
- **GitHub Repository**: [github.com/liv-iz/cloudflare_apm_2026](https://github.com/liv-iz/cloudflare_apm_2026)

## Architecture Overview

FeedPulse is a feedback intelligence dashboard that ingests dummy product feedback labelled as if it came from multiple sources (GitHub, Discord, Support), runs each entry through Workers AI for sentiment analysis, theme extraction, and language detection, stores the structured results in D1, caches with KV, and serves a single-page analytics dashboard from a single Cloudflare Worker.

### Cloudflare Products Used

| Product | Binding | Role |
|---------|---------|------|
| **Cloudflare Workers** | — | Entry point. Serves HTML dashboard, REST API, and routes all requests. Single Worker = no CORS issues, one `wrangler deploy`. |
| **Workers AI** | `AI` | Runs `@cf/meta/llama-3.1-8b-instruct-fp8` (Llama 3.1 8B). Extracts sentiment, theme, one-sentence summary, and detected language from each feedback entry. Handles input in any language. Outputs are normalized to English. |
| **D1 Database** | `DB` | Stores all feedback with structured fields: source, region, raw text, sentiment, theme, summary, language, timestamp. Powers all dashboard queries. |
| **KV Storage** | `CACHE` | Caches AI analysis results keyed by SHA-256 hash of input text, with 1-hour TTL. Prevents redundant AI inference on duplicate submissions. Cache hit/miss stats are shown in the UI. |

### Bindings Screenshot

![alt text](image-1.png)

Figure 1: Cloudflare Dashboard, Workers Bindings page

Everything is served from a single Worker (HTML, API, static assets) to avoid unnecessary complexity. The AI prompt handles input in any language (seed data includes French, Japanese, Chinese, Spanish, German, Portuguese, and Korean) and always returns English summaries for consistent filtering and analysis.

---

## Cloudflare Product Insights (Friction Log)

### 1. Workers AI Model Name Mismatch Between Docs and TypeScript Types

* **Title**: Workers AI model identifier doesn't match TypeScript type definitions
* **Problem**: The official `llama-3.1-8b-instruct` documentation page uses `@cf/meta/llama-3.1-8b-instruct` as the model identifier across every code example — the TypeScript Worker example, the streaming TypeScript example, the Python example, and the curl example. However, this identifier is not recognized by the Workers TypeScript type system. Running `npx tsc --noEmit` produces: `error TS2345: Argument of type '"@cf/meta/llama-3.1-8b-instruct"' is not assignable to parameter of type 'keyof AiModels'`. The TypeScript types only recognize `@cf/meta/llama-3.1-8b-instruct-fp8`, which is documented as a completely separate model with its own page — not as an alias or variant. The error message gives no hint about what the correct identifier should be, and the base model's page contains no cross-reference to the `fp8` variant as the TypeScript-compatible alternative. This means a developer following Cloudflare's own TypeScript examples will hit a type error immediately, with no indication of the fix. Resolving this required trial and error and cost approximately 5 minutes of debugging.

* **Suggestion**: The `@cf/meta/llama-3.1-8b-instruct` model page should explicitly note that the TypeScript-compatible identifier is `@cf/meta/llama-3.1-8b-instruct-fp8`, with a clear explanation of the relationship between the two. More broadly, every model identifier used in official documentation code examples should be present in the `AiModels` TypeScript type definitions shipped with `@cloudflare/workers-types`. Alternatively, the type should accept both the base name and quantized variants so that docs examples compile without modification.

### 2. D1 Binding Naming Conventions Vary Across Touchpoints

* **Title**: Wrangler CLI and docs suggest different binding name styles
* **Problem**: When creating a D1 database with `npx wrangler d1 create feedpulse-db`, the CLI suggests `feedpulse_db` as the binding name — derived from the database name. However, the official D1 getting-started tutorial uses `DB` as the binding name, Cloudflare's own example repositories use `DB`, and the Wrangler configuration docs show `MY_DB` and `productionDB` as illustrative examples. A new developer encounters three different conventions across three touchpoints with no guidance on which to prefer or why. I accepted the CLI's suggestion of `feedpulse_db`, then switched to `DB` after finding that all reference code used that style. It is a small but unnecessary back-and-forth.
* **Suggestion**: The Wrangler prompt is the right place to resolve this. It could include a one-line note: "Any valid JS variable name works — `DB` is the Cloudflare convention for single-database projects; use a descriptive name like `FEEDBACK_DB` if you have multiple databases." Meeting developers at the moment of decision rather than expecting them to cross-reference docs would eliminate the confusion entirely.

### 3. Interactive CLI Commands Block Agent-Assisted Development

* **Title**: Scaffolding and resource creation require interactive prompts
* **Problem**: Both `npm create cloudflare@latest` (project scaffold) and `npx wrangler d1 create` require interactive terminal input — selecting templates, confirming options, choosing binding names. When a coding agent like Claude Code tries to run the scaffold command, it crashes immediately with `SystemError [ERR_TTY_INIT_FAILED]: TTY initialization failed: uv_tty_init returned EBADF (bad file descriptor)` because there is no interactive terminal available. The recommended workflow from the assignment (AI agent builds your project) breaks at the very first step (scaffolding). I had to manually run these commands, then hand back to the agent for code work.
* **Suggestion**: Support fully non-interactive modes for all `wrangler` resource creation commands. For example: `npx wrangler d1 create feedpulse-db --binding DB --yes` should work without any prompts. The scaffold tool (`npm create cloudflare@latest`) should support a `--template hello-world --ts --no-deploy` flag set. This would make Cloudflare the best platform for AI-assisted development and a real differentiator given how many developers use coding agents.

### 4. OAuth Login Races Ahead of Account Provisioning

* **Title**: First Wrangler command fails with auth error after fresh account signup
* **Problem**: Running `npx wrangler d1 create` for the first time triggered an OAuth login flow in the browser. Since I didn't have a Cloudflare account yet, I signed up mid-flow — but Wrangler didn't wait. It attempted the API call before my new account was fully provisioned, throwing `Authentication error [code: 10000]`. The error message gave no indication that the fix was simply to re-run the exact same command. A new user would reasonably assume something is broken with their credentials or token permissions.
* **Suggestion**: Wrangler should detect a `code: 10000` error immediately after a fresh OAuth login and automatically retry the original command once, with a message like "New account detected — retrying..." At minimum, the error output should include a note: "If you just created your account, try running this command again." This is a trivially fixable onboarding cliff that will affect every net-new Cloudflare user.

### 5. Wrangler Generates a Broken Onboarding URL and Hides Existing Subdomain

* **Title**: `wrangler deploy` outputs a 404 onboarding link and hides the actual fix
* **Problem**: When deploying a Worker for the first time, Wrangler halted and output a URL to `dash.cloudflare.com/.../workers/onboarding` to register a `workers.dev` subdomain. That URL returned a 404. Deployment was blocked, the suggested fix was broken, and there was no fallback instruction in the error message. Worse, the subdomain had already been created by the deploy process — it just wasn't enabled. The actual fix was buried in the Worker's Settings tab in the Cloudflare dashboard, which Wrangler never mentions. This cost ~10 minutes of confusion.
* **Suggestion**: Three fixes: (1) Fix or remove the broken onboarding URL entirely. (2) If a `workers.dev` subdomain already exists but is disabled, Wrangler should detect this and output: "Your workers.dev subdomain exists but is disabled. Enable it at: [correct settings URL]." (3) The deploy success message should always print the live URL when one is available, so users don't have to hunt for it in the dashboard.

### 6. Serving HTML from Template Literals Causes Silent JS Breakage

* **Title**: HTML-in-JS template literal pattern makes quote escaping a minefield
* **Problem:** The Workers "Hello World" scaffold and official examples page actively encourage returning HTML via JavaScript template literals. However, when building anything interactive with inline `onclick` handlers, the instinct to use `\'` for quote escaping backfires — it outputs a literal backslash into the generated HTML, causing a silent `SyntaxError` in the browser that kills the entire `<script>` block. The failure is especially insidious because the Worker deploys cleanly, `tsc` compiles without errors, and the page loads normally — nothing indicates a problem until you notice every interactive element is dead. Discovering the root cause requires manually inspecting View Source.

A search of the official Workers docs, Best Practices page, and HTML examples confirmed this pitfall is entirely undocumented. That same search surfaced `@worker-tools/html`, a third-party library built specifically to solve safe HTML templating in Workers — a clear signal this is a known community pain point that Cloudflare has not addressed first-party.

* **Suggestion**: The "Return an HTML page" example should warn that `\'` does not work inside template literals and that `&#39;` HTML entities must be used instead. The Best Practices page should recommend static assets over template literals for any interactive HTML. Longer term, Cloudflare should either officially endorse `@worker-tools/html` or ship a first-party templating helper that handles escaping automatically.

---

## Dashboard Screenshot

| ![alt text](image.png) | ![alt text](image-2.png) |
|:---:|:---:|
| Figure 2: FeedPulse dashboard with demo data loaded | Figure 3: FeedPulse dashboard with filter |
---

## Vibe-Coding Context

**Tool used**: Claude Code (Anthropic's CLI agent for software engineering)

**How it was used**: Claude Code handled the majority of the implementation — writing the Worker routes, AI prompt engineering, D1 schema, KV caching logic, and the full dashboard HTML/CSS/JS. Interactive commands that required terminal input (project scaffolding, D1/KV resource creation, first deploy troubleshooting) had to be run manually, which became friction log entry #3.

**Example prompts used during the build**:
- "None of the buttons are working. The load data button is not doing anything. Here are the errors thrown by the console when clicking buttons: SyntaxError: Unexpected identifier 'positive'" — *this led to discovering the template literal escaping issue (friction log #6)*
- "Every time I load the demo data, the number of entries increases but it's just duplicates. Can we clear before loading and ensure we are using kv caching to avoid rerunning the AI pipeline?" — *led to adding the DELETE endpoint and clear-before-seed flow*
- "The filters only affect the table, not the charts. Make them global" — *prompted rearchitecting filters from table-only to dashboard-wide*
- "Consider filtering by zone (Cloudflare is a global product). We have to handle multiple languages entries. Ensure our demo data reflects this." — *led to adding region field, multi-language AI detection, and demo data in over 4 languages*
- "Add KV caching for AI results, use a hash map. Make cache usage visible in the UI to show user no inference costs were incurred."

**Cloudflare Docs MCP**: Connected via `claude mcp add cloudflare-docs` to give the agent live access to Cloudflare documentation. This helped with binding syntax and Workers AI model parameters.
