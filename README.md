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

## Dashboard Screenshot

| ![alt text](image.png) | ![alt text](image-2.png) |
|:---:|:---:|
| Figure 2: FeedPulse dashboard with demo data loaded | Figure 3: FeedPulse dashboard with filter |
---

## Vibe-Coding Context

**Tool used**: Claude Code (Anthropic's CLI agent for software engineering)

**How it was used**: Claude Code handled the majority of the implementation — writing the Worker routes, AI prompt engineering, D1 schema, KV caching logic, and the full dashboard HTML/CSS/JS. Interactive commands that required terminal input (project scaffolding, D1/KV resource creation, first deploy troubleshooting) had to be run manually, which became friction log entry #3.