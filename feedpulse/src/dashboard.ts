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
