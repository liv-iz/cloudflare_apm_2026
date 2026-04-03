export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FeedPulse</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📊</text></svg>">
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
      background: var(--bg); color: var(--text);
      font-size: 0.875rem; line-height: 1.5;
    }
    .container { max-width: 1080px; margin: 0 auto; padding: 2rem 1rem; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem; }
    .header h1 { font-size: 1.5rem; font-weight: 700; }
    .btn {
      font-family: inherit; font-size: 0.8rem; font-weight: 600;
      padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; transition: all 0.15s;
      background: var(--accent); color: white;
    }
    .btn:hover { background: var(--accent-hover); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.loading { opacity: 0.7; cursor: wait; }

    /* Filter bar */
    .filter-bar { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .global-filters { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .global-filters select {
      background: var(--surface); color: var(--text); border: 1px solid var(--border);
      border-radius: 0.375rem; padding: 0.375rem 0.5rem; font-size: 0.75rem; font-family: inherit; cursor: pointer;
    }
    .global-filters select:hover { border-color: var(--text-muted); }

    /* Time range */
    .time-range { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .time-pill {
      padding: 0.375rem 0.875rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;
      border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);
      cursor: pointer; transition: all 0.15s;
    }
    .time-pill:hover { border-color: var(--text-muted); }
    .time-pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }

    /* Section header */
    .section-hdr {
      font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
      color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.75rem;
    }

    /* Metrics bar */
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .metric-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 0.75rem;
      padding: 1.25rem; transition: border-color 0.15s;
    }
    .metric-card.clickable { cursor: pointer; }
    .metric-card.clickable:hover { border-color: var(--accent); }
    .metric-card .metric-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .metric-card .metric-value { font-size: 1.75rem; font-weight: 700; }
    .metric-card .metric-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }
    .sentiment-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.375rem; }
    .sentiment-item { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; cursor: pointer; padding: 0.125rem 0.375rem; border-radius: 4px; transition: background 0.15s; }
    .sentiment-item:hover { background: var(--surface-hover); }
    .sentiment-item .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
    .dot-positive { background: var(--positive); }
    .dot-neutral { background: var(--neutral); }
    .dot-negative { background: var(--negative); }
    .change-up { color: var(--positive); }
    .change-down { color: var(--negative); }
    .change-none { color: var(--text-muted); }

    /* Charts row */
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
    .chart-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 0.75rem;
      padding: 1.25rem; overflow: hidden;
    }
    .chart-card .section-hdr { margin-bottom: 0.75rem; }
    .chart-container { width: 100%; }
    .chart-container svg { width: 100%; display: block; }
    .chart-legend { display: flex; gap: 1rem; margin-top: 0.75rem; justify-content: center; }
    .legend-item { display: flex; align-items: center; gap: 0.375rem; font-size: 0.7rem; color: var(--text-muted); }
    .legend-item .swatch { width: 10px; height: 10px; border-radius: 2px; }

    /* Theme bars */
    .theme-chart { background: var(--surface); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; }
    .theme-bar-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; cursor: pointer; padding: 0.25rem 0; border-radius: 4px; transition: background 0.15s; }
    .theme-bar-row:hover { background: var(--surface-hover); }
    .theme-bar-label { width: 130px; font-size: 0.75rem; text-align: right; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
    .theme-bar-track { flex: 1; height: 22px; background: var(--surface-hover); border-radius: 4px; overflow: hidden; position: relative; }
    .theme-bar-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s; min-width: 2px; }
    .theme-bar-count { width: 50px; font-size: 0.75rem; color: var(--text-muted); }

    /* Table section */
    .table-section { background: var(--surface); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.25rem; }
    .table-header { margin-bottom: 0.75rem; }
    .active-filter-tag { font-size: 0.7rem; background: var(--accent); color: white; padding: 0.2rem 0.5rem; border-radius: 9999px; cursor: pointer; display: none; }
    .active-filter-tag:hover { background: var(--accent-hover); }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
      color: var(--text-muted); letter-spacing: 0.05em; padding: 0.625rem 0.75rem;
      border-bottom: 1px solid var(--border); cursor: pointer; user-select: none; white-space: nowrap;
    }
    th:hover { color: var(--text); }
    th .sort-arrow { margin-left: 0.25rem; font-size: 0.65rem; }
    td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); font-size: 0.8rem; vertical-align: top; }
    tr:hover td { background: var(--surface-hover); }
    tr.expanded td { border-bottom: none; }
    .expand-row td { padding: 0 0.75rem 0.75rem 0.75rem; border-bottom: 1px solid var(--border); }
    .expand-content { background: var(--bg); border-radius: 0.5rem; padding: 0.75rem 1rem; font-size: 0.8rem; line-height: 1.6; }
    .expand-content .expand-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .expand-content .expand-text { color: var(--text); margin-bottom: 0.5rem; }
    .expand-content .expand-summary { color: var(--accent); font-style: italic; }
    .pill {
      display: inline-block; font-size: 0.7rem; padding: 0.125rem 0.5rem;
      border-radius: 9999px; font-weight: 600;
    }
    .pill-github { background: var(--source-github); color: #fff; }
    .pill-discord { background: var(--source-discord); color: #fff; }
    .pill-support { background: var(--source-support); color: #fff; }
    .pill-positive { background: var(--positive); color: #000; }
    .pill-neutral { background: var(--neutral); color: #000; }
    .pill-negative { background: var(--negative); color: #fff; }
    .text-preview { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); cursor: pointer; }
    .text-preview:hover { color: var(--text); }
    .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-muted); }
    .pagination button {
      background: var(--surface-hover); color: var(--text); border: 1px solid var(--border);
      border-radius: 0.375rem; padding: 0.375rem 0.75rem; font-size: 0.75rem; cursor: pointer; font-family: inherit;
    }
    .pagination button:hover { border-color: var(--text-muted); }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-btns { display: flex; gap: 0.375rem; }

    /* FAB */
    .fab {
      position: fixed !important; bottom: 2rem !important; right: 2rem !important; left: auto !important;
      z-index: 9999; width: 56px; height: 56px; border-radius: 50%; border: none;
      background: var(--accent); color: white; font-size: 1.75rem; line-height: 1;
      cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.5);
      transition: background 0.15s, transform 0.15s;
      display: flex; align-items: center; justify-content: center;
    }
    .fab:hover { background: var(--accent-hover); transform: scale(1.08); }

    /* Modal overlay */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 1001;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: none; align-items: center; justify-content: center;
    }
    .modal-backdrop.open { display: flex; }
    .modal {
      background: var(--surface); border: 1px solid var(--border); border-radius: 0.75rem;
      padding: 1.5rem; width: 90%; max-width: 560px; position: relative;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .modal-close {
      position: absolute; top: 0.75rem; right: 0.875rem;
      background: none; border: none; color: var(--text-muted); font-size: 1.25rem;
      cursor: pointer; line-height: 1; padding: 0.25rem;
    }
    .modal-close:hover { color: var(--text); }

    /* Form inside modal */
    .input-row { display: flex; gap: 0.75rem; align-items: flex-start; }
    .input-row select {
      background: var(--surface-hover); color: var(--text); border: 1px solid var(--border);
      border-radius: 0.375rem; padding: 0.5rem 0.625rem; font-size: 0.8rem; font-family: inherit;
      cursor: pointer; flex-shrink: 0;
    }
    .input-row textarea {
      flex: 1; background: var(--bg); color: var(--text); border: 1px solid var(--border);
      border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.8rem; font-family: inherit;
      resize: vertical; min-height: 2.5rem; max-height: 8rem; line-height: 1.5;
    }
    .input-row textarea::placeholder { color: var(--text-muted); }
    .input-row textarea:focus { outline: none; border-color: var(--accent); }
    .input-result {
      margin-top: 0.75rem; padding: 0.75rem 1rem; background: var(--bg); border-radius: 0.5rem;
      font-size: 0.8rem; line-height: 1.6; display: none;
    }
    .input-result .result-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
    .input-result .result-row { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.375rem; flex-wrap: wrap; }

    /* Cache stats */
    .cache-stats {
      font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; display: none;
    }
    .cache-stats .cache-hit { color: var(--positive); font-weight: 600; }
    .cache-stats .cache-miss { color: var(--accent); font-weight: 600; }

    /* Empty state */
    .empty-hero { text-align: center; padding: 4rem 2rem; }
    .empty-hero h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    .empty-hero p { color: var(--text-muted); margin-bottom: 1.5rem; max-width: 460px; margin-left: auto; margin-right: auto; }
    .empty-hero .btn { margin: 0 0.375rem; }

    /* Mobile table scroll */
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

    /* Clickable hints */
    [title] { position: relative; }
    .theme-bar-row::after, .sentiment-item::after { content: ''; }
    .clickable-hint { font-size: 0.65rem; color: var(--text-muted); font-style: italic; margin-top: 0.25rem; }

    @media (max-width: 768px) {
      .metrics { grid-template-columns: repeat(2, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
      .input-row { flex-direction: column; }
      .input-row select, .input-row .btn { width: 100%; }
      .fab { bottom: 1.25rem; right: 1.25rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FeedPulse</h1>
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
        <button class="btn" id="demoBtn" onclick="loadDemoData()">Load Demo Data</button>
        <div class="cache-stats" id="cacheStats"></div>
      </div>
    </div>

    <div id="emptyHero" class="empty-hero" style="display:none">
      <h2>No feedback data yet</h2>
      <p>Load 60 days of sample feedback data and watch AI analyze 10 new entries in real time.</p>
      <button class="btn" onclick="loadDemoData()">Load Demo Data</button>
    </div>

    <div id="dashboardContent">
      <div class="filter-bar">
        <div class="time-range" id="timeRange">
          <span class="time-pill" data-range="24h" onclick="setTimeRange('24h')">Last 24 hours</span>
          <span class="time-pill" data-range="7d" onclick="setTimeRange('7d')">Last 7 days</span>
          <span class="time-pill active" data-range="30d" onclick="setTimeRange('30d')">Last 30 days</span>
          <span class="time-pill" data-range="12m" onclick="setTimeRange('12m')">Last 12 months</span>
          <span class="time-pill" data-range="all" onclick="setTimeRange('all')">All time</span>
        </div>
        <div class="global-filters">
          <select id="filterSource" onchange="applyFilters()">
            <option value="all">All Sources</option>
            <option value="github">GitHub</option>
            <option value="discord">Discord</option>
            <option value="support">Support</option>
          </select>
          <select id="filterSentiment" onchange="applyFilters()">
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
          <select id="filterRegion" onchange="applyFilters()">
            <option value="all">All Regions</option>
            <option value="AMER">Americas</option>
            <option value="EMEA">EMEA</option>
            <option value="APAC">APAC</option>
          </select>
          <span class="active-filter-tag" id="clearFilter" onclick="clearAllFilters()">Clear filters &times;</span>
        </div>
      </div>

      <div class="metrics">
        <div class="metric-card">
          <div class="metric-label">Total Volume</div>
          <div class="metric-value" id="metricVolume">0</div>
          <div class="metric-sub" id="metricVolumeSub">&nbsp;</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Sentiment Breakdown</div>
          <div id="metricSentiment" class="sentiment-row"></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Top Theme</div>
          <div class="metric-value" id="metricTheme" style="font-size:1.1rem">&mdash;</div>
          <div class="metric-sub" id="metricThemeSub">&nbsp;</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">vs Previous Period</div>
          <div class="metric-value" id="metricChange">&mdash;</div>
          <div class="metric-sub" id="metricChangeSub">&nbsp;</div>
        </div>
      </div>

      <div class="charts-row">
        <div class="chart-card">
          <div class="section-hdr">Volume Over Time</div>
          <div class="chart-container" id="lineChart"></div>
        </div>
        <div class="chart-card">
          <div class="section-hdr">Sentiment by Source</div>
          <div class="chart-container" id="barChart"></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="swatch" style="background:var(--positive)"></span>Positive</span>
            <span class="legend-item"><span class="swatch" style="background:var(--neutral)"></span>Neutral</span>
            <span class="legend-item"><span class="swatch" style="background:var(--negative)"></span>Negative</span>
          </div>
        </div>
      </div>

      <div class="theme-chart">
        <div class="section-hdr">Theme Distribution</div>
        <div id="themeChart"></div>
        <div class="clickable-hint">Click a theme to filter the entire dashboard</div>
      </div>

      <div class="table-section">
        <div class="table-header">
          <div class="section-hdr" style="margin-bottom:0">Feedback Entries</div>
        </div>
        <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th onclick="sortBy(&#39;created_at&#39;)" title="Click to sort">Timestamp <span class="sort-arrow" id="sort-created_at"></span></th>
              <th onclick="sortBy(&#39;source&#39;)" title="Click to sort">Source <span class="sort-arrow" id="sort-source"></span></th>
              <th onclick="sortBy(&#39;region&#39;)" title="Click to sort">Region <span class="sort-arrow" id="sort-region"></span></th>
              <th onclick="sortBy(&#39;theme&#39;)" title="Click to sort">Theme <span class="sort-arrow" id="sort-theme"></span></th>
              <th onclick="sortBy(&#39;sentiment&#39;)" title="Click to sort">Sentiment <span class="sort-arrow" id="sort-sentiment"></span></th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody id="tableBody"></tbody>
        </table>
        </div>
        <div class="pagination">
          <span id="pageInfo">No entries</span>
          <div class="page-btns">
            <button id="prevBtn" onclick="changePage(-1)" disabled>Previous</button>
            <button id="nextBtn" onclick="changePage(1)" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <button class="fab" onclick="openModal()" title="Analyze feedback">+</button>

  <div class="modal-backdrop" id="modalBackdrop" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <button class="modal-close" onclick="closeModal()">&times;</button>
      <div class="section-hdr" style="margin-bottom:1rem">Analyze Custom Feedback</div>
      <div class="input-row">
        <select id="inputSource">
          <option value="github">GitHub</option>
          <option value="discord">Discord</option>
          <option value="support">Support</option>
        </select>
        <select id="inputRegion">
          <option value="AMER">Americas</option>
          <option value="EMEA">EMEA</option>
          <option value="APAC">APAC</option>
        </select>
        <textarea id="inputText" placeholder="Paste or type feedback in any language..." rows="3"></textarea>
        <button class="btn" id="analyzeBtn" onclick="analyzeCustom()">Analyze</button>
      </div>
      <div class="input-result" id="inputResult"></div>
    </div>
  </div>

  <script>
    var MOCK_DATA = [
      { source: 'github', text: "Billing page doesn't show invoice history for the last 3 months. I had to contact support to get a PDF." },
      { source: 'discord', text: 'Workers AI response times are great for real-time analysis. Impressed with the latency.' },
      { source: 'support', text: "Can't find D1 docs for migrations. Had to guess the CLI commands from error messages." },
      { source: 'github', text: 'Love the new Wrangler CLI improvements. Deploy times went from 30s to under 5s.' },
      { source: 'discord', text: 'KV eventual consistency confused our team. We wrote a value and read it back immediately but got stale data.' },
      { source: 'support', text: 'Dashboard UI is slow on mobile. Pages take 4-5 seconds to render on my phone.' },
      { source: 'github', text: 'Workflows retry logic saved our pipeline. A transient API failure recovered automatically.' },
      { source: 'discord', text: "Confused about Workers vs Pages pricing. The docs show different rate structures but don't explain when to pick which." },
      { source: 'support', text: 'R2 upload works perfectly. Great S3 compatibility, migrated our assets in an afternoon.' },
      { source: 'github', text: "Error messages in D1 are cryptic. Got 'SQLITE_ERROR' with no indication which column or constraint failed." }
    ];

    var allData = [];
    var currentRange = '30d';
    var sortCol = 'created_at';
    var sortDir = 'desc';
    var currentPage = 0;
    var PAGE_SIZE = 20;
    var filterSource = 'all';
    var filterSentiment = 'all';
    var filterRegion = 'all';
    var expandedRow = -1;

    function getRangeMs(range) {
      var now = Date.now();
      if (range === '24h') return now - 86400000;
      if (range === '7d') return now - 604800000;
      if (range === '30d') return now - 2592000000;
      if (range === '12m') return now - 31536000000;
      return 0;
    }

    function getTimeFiltered(data, range) {
      if (range === 'all') return data;
      var cutoff = getRangeMs(range);
      return data.filter(function(d) { return new Date(d.created_at + 'Z').getTime() >= cutoff; });
    }

    function getPreviousPeriodData(data, range) {
      if (range === 'all') return [];
      var now = Date.now();
      var cutoff = getRangeMs(range);
      var duration = now - cutoff;
      var prevStart = cutoff - duration;
      return data.filter(function(d) {
        var t = new Date(d.created_at + 'Z').getTime();
        return t >= prevStart && t < cutoff;
      });
    }

    function setTimeRange(range) {
      currentRange = range;
      document.querySelectorAll('.time-pill').forEach(function(p) {
        p.classList.toggle('active', p.dataset.range === range);
      });
      currentPage = 0;
      renderAll();
    }

    function applyFilters() {
      filterSource = document.getElementById('filterSource').value;
      filterSentiment = document.getElementById('filterSentiment').value;
      filterRegion = document.getElementById('filterRegion').value;
      currentPage = 0;
      updateFilterTag();
      renderAll();
    }

    function filterBySentiment(sentiment) {
      document.getElementById('filterSentiment').value = sentiment;
      applyFilters();
      document.getElementById('tableBody').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function filterByTheme(theme) {
      // Theme filter uses a custom approach since there's no dropdown for it
      // We'll filter the table data directly
      filterSource = 'all';
      filterSentiment = 'all';
      document.getElementById('filterSource').value = 'all';
      document.getElementById('filterSentiment').value = 'all';
      currentPage = 0;
      // Store theme filter in a global
      window._themeFilter = theme;
      updateFilterTag();
      renderAll();
      document.getElementById('tableBody').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function clearAllFilters() {
      filterSource = 'all';
      filterSentiment = 'all';
      filterRegion = 'all';
      window._themeFilter = null;
      document.getElementById('filterSource').value = 'all';
      document.getElementById('filterSentiment').value = 'all';
      document.getElementById('filterRegion').value = 'all';
      currentPage = 0;
      updateFilterTag();
      renderAll();
    }

    function updateFilterTag() {
      var tag = document.getElementById('clearFilter');
      var active = filterSource !== 'all' || filterSentiment !== 'all' || filterRegion !== 'all' || window._themeFilter;
      tag.style.display = active ? 'inline-block' : 'none';
    }

    function sortBy(col) {
      if (sortCol === col) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
      else { sortCol = col; sortDir = col === 'created_at' ? 'desc' : 'asc'; }
      renderTable();
    }

    function changePage(delta) {
      currentPage += delta;
      renderTable();
    }

    function toggleRow(id) {
      expandedRow = expandedRow === id ? -1 : id;
      renderTable();
    }

    function getTableData(timeData) {
      var d = timeData.slice();
      if (filterSource !== 'all') d = d.filter(function(e) { return e.source === filterSource; });
      if (filterSentiment !== 'all') d = d.filter(function(e) { return e.sentiment === filterSentiment; });
      if (filterRegion !== 'all') d = d.filter(function(e) { return e.region === filterRegion; });
      if (window._themeFilter) d = d.filter(function(e) { return e.theme === window._themeFilter; });
      d.sort(function(a, b) {
        var va = a[sortCol] || '', vb = b[sortCol] || '';
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
      return d;
    }

    function escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function updateVisibility() {
      var hasData = allData.length > 0;
      document.getElementById('emptyHero').style.display = hasData ? 'none' : 'block';
      document.getElementById('dashboardContent').style.display = hasData ? 'block' : 'none';
    }

    function applyGlobalFilters(data) {
      var d = data;
      if (filterSource !== 'all') d = d.filter(function(e) { return e.source === filterSource; });
      if (filterSentiment !== 'all') d = d.filter(function(e) { return e.sentiment === filterSentiment; });
      if (filterRegion !== 'all') d = d.filter(function(e) { return e.region === filterRegion; });
      if (window._themeFilter) d = d.filter(function(e) { return e.theme === window._themeFilter; });
      return d;
    }

    function renderAll() {
      updateVisibility();
      var timeData = getTimeFiltered(allData, currentRange);
      var filtered = applyGlobalFilters(timeData);
      renderMetrics(filtered);
      renderLineChart(filtered);
      renderBarChart(filtered);
      renderThemeChart(filtered);
      renderTable();
    }

    function renderMetrics(data) {
      var total = data.length;
      document.getElementById('metricVolume').textContent = total;

      // Sources subtitle
      var srcCounts = {};
      data.forEach(function(d) { srcCounts[d.source] = (srcCounts[d.source] || 0) + 1; });
      var srcList = Object.keys(srcCounts);
      document.getElementById('metricVolumeSub').textContent = total > 0 ? 'from ' + srcList.length + ' source' + (srcList.length !== 1 ? 's' : '') : '';

      var counts = { positive: 0, neutral: 0, negative: 0 };
      data.forEach(function(d) { if (counts.hasOwnProperty(d.sentiment)) counts[d.sentiment]++; });

      var sentEl = document.getElementById('metricSentiment');
      if (total === 0) {
        sentEl.innerHTML = '<span style="font-size:0.8rem;color:var(--text-muted)">No data</span>';
      } else {
        sentEl.innerHTML =
          '<span class="sentiment-item" onclick="filterBySentiment(&#39;positive&#39;)"><span class="dot dot-positive"></span>' + counts.positive + ' (' + Math.round(100 * counts.positive / total) + '%)</span>' +
          '<span class="sentiment-item" onclick="filterBySentiment(&#39;neutral&#39;)"><span class="dot dot-neutral"></span>' + counts.neutral + ' (' + Math.round(100 * counts.neutral / total) + '%)</span>' +
          '<span class="sentiment-item" onclick="filterBySentiment(&#39;negative&#39;)"><span class="dot dot-negative"></span>' + counts.negative + ' (' + Math.round(100 * counts.negative / total) + '%)</span>';
      }

      var themes = {};
      data.forEach(function(d) { themes[d.theme] = (themes[d.theme] || 0) + 1; });
      var sorted = Object.entries(themes).sort(function(a, b) { return b[1] - a[1]; });
      if (sorted.length > 0) {
        document.getElementById('metricTheme').textContent = sorted[0][0];
        document.getElementById('metricThemeSub').textContent = sorted[0][1] + ' of ' + total + ' entries (' + Math.round(100 * sorted[0][1] / total) + '%)';
      } else {
        document.getElementById('metricTheme').innerHTML = '&mdash;';
        document.getElementById('metricThemeSub').innerHTML = '&nbsp;';
      }

      var prev = applyGlobalFilters(getPreviousPeriodData(allData, currentRange));
      var changeEl = document.getElementById('metricChange');
      var changeSubEl = document.getElementById('metricChangeSub');
      if (currentRange === 'all' || (prev.length === 0 && total === 0)) {
        changeEl.innerHTML = '&mdash;';
        changeEl.className = 'metric-value change-none';
        changeSubEl.textContent = currentRange === 'all' ? 'Select a time range to compare' : 'No comparison available';
      } else if (prev.length === 0) {
        changeEl.textContent = '+ new';
        changeEl.className = 'metric-value change-up';
        changeSubEl.textContent = 'No data in previous period';
      } else {
        var pct = Math.round(((total - prev.length) / prev.length) * 100);
        if (pct > 0) {
          changeEl.innerHTML = '&#8593; ' + pct + '%';
          changeEl.className = 'metric-value change-up';
        } else if (pct < 0) {
          changeEl.innerHTML = '&#8595; ' + Math.abs(pct) + '%';
          changeEl.className = 'metric-value change-down';
        } else {
          changeEl.textContent = '0%';
          changeEl.className = 'metric-value change-none';
        }
        changeSubEl.textContent = prev.length + ' in previous period';
      }
    }

    function renderLineChart(data) {
      var container = document.getElementById('lineChart');
      if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:2rem">No data in this period</div>';
        return;
      }

      var buckets = {};
      data.forEach(function(d) {
        var dt = new Date(d.created_at + 'Z');
        var key;
        if (currentRange === '24h') {
          key = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0') + ' ' + String(dt.getHours()).padStart(2,'0') + ':00';
        } else {
          key = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
        }
        buckets[key] = (buckets[key] || 0) + 1;
      });

      var keys = Object.keys(buckets).sort();
      var values = keys.map(function(k) { return buckets[k]; });
      var maxVal = Math.max.apply(null, values);
      if (maxVal === 0) maxVal = 1;

      var W = 460, H = 180, padL = 35, padR = 10, padT = 15, padB = 30;
      var chartW = W - padL - padR, chartH = H - padT - padB;

      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';

      var gridSteps = 4;
      for (var g = 0; g <= gridSteps; g++) {
        var gy = padT + chartH - (g / gridSteps) * chartH;
        var gv = Math.round((g / gridSteps) * maxVal);
        svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#334155" stroke-width="0.5"/>';
        svg += '<text x="' + (padL - 5) + '" y="' + (gy + 3) + '" text-anchor="end" fill="#94a3b8" font-size="9">' + gv + '</text>';
      }

      if (keys.length === 1) {
        var barW2 = Math.min(60, chartW * 0.4);
        var bh2 = chartH;
        var bx2 = padL + chartW / 2 - barW2 / 2;
        svg += '<rect x="' + bx2 + '" y="' + padT + '" width="' + barW2 + '" height="' + bh2 + '" fill="#f97316" opacity="0.2" rx="4"/>';
        svg += '<rect x="' + bx2 + '" y="' + padT + '" width="' + barW2 + '" height="' + bh2 + '" fill="none" stroke="#f97316" stroke-width="2" rx="4"/>';
        svg += '<text x="' + (padL + chartW / 2) + '" y="' + (padT + bh2 / 2 + 5) + '" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="700">' + values[0] + '</text>';
        var lbl2 = keys[0].length > 10 ? keys[0].substring(5) : keys[0];
        svg += '<text x="' + (padL + chartW / 2) + '" y="' + (H - 5) + '" text-anchor="middle" fill="#94a3b8" font-size="9">' + escapeHtml(lbl2) + '</text>';
      } else {
        var points = [];
        for (var i = 0; i < keys.length; i++) {
          var px = padL + (i / (keys.length - 1)) * chartW;
          var py = padT + chartH - (values[i] / maxVal) * chartH;
          points.push({ x: px, y: py, v: values[i] });
        }

        var areaPath = 'M' + points[0].x + ',' + points[0].y;
        for (var j = 1; j < points.length; j++) areaPath += ' L' + points[j].x + ',' + points[j].y;
        areaPath += ' L' + points[points.length - 1].x + ',' + (padT + chartH) + ' L' + points[0].x + ',' + (padT + chartH) + ' Z';
        svg += '<path d="' + areaPath + '" fill="#f97316" opacity="0.12"/>';

        var linePath = 'M' + points[0].x + ',' + points[0].y;
        for (var j = 1; j < points.length; j++) linePath += ' L' + points[j].x + ',' + points[j].y;
        svg += '<path d="' + linePath + '" fill="none" stroke="#f97316" stroke-width="2" stroke-linejoin="round"/>';

        points.forEach(function(p) {
          svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="#f97316"/>';
          svg += '<text x="' + p.x + '" y="' + (p.y - 8) + '" text-anchor="middle" fill="#94a3b8" font-size="8">' + p.v + '</text>';
        });

        var labelCount = Math.min(keys.length, 5);
        for (var li = 0; li < labelCount; li++) {
          var idx = Math.round(li * (keys.length - 1) / (labelCount - 1));
          var lbl = keys[idx].substring(5, 10);
          svg += '<text x="' + points[idx].x + '" y="' + (H - 5) + '" text-anchor="middle" fill="#94a3b8" font-size="8">' + lbl + '</text>';
        }
      }

      svg += '</svg>';
      container.innerHTML = svg;
    }

    function renderBarChart(data) {
      var container = document.getElementById('barChart');
      if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:2rem">No data in this period</div>';
        return;
      }

      var sources = ['github', 'discord', 'support'];
      var sentiments = ['positive', 'neutral', 'negative'];
      var colors = { positive: '#22c55e', neutral: '#eab308', negative: '#ef4444' };

      var grouped = {};
      sources.forEach(function(s) { grouped[s] = { positive: 0, neutral: 0, negative: 0 }; });
      data.forEach(function(d) { if (grouped[d.source]) grouped[d.source][d.sentiment]++; });

      var maxVal = 0;
      sources.forEach(function(s) {
        sentiments.forEach(function(sent) { if (grouped[s][sent] > maxVal) maxVal = grouped[s][sent]; });
      });
      if (maxVal === 0) maxVal = 1;

      var W = 460, H = 180, padL = 30, padR = 10, padT = 15, padB = 30;
      var chartW = W - padL - padR, chartH = H - padT - padB;
      var groupW = chartW / sources.length;
      var barW = groupW * 0.22;
      var barGap = groupW * 0.04;

      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';

      for (var g = 0; g <= 4; g++) {
        var gy = padT + chartH - (g / 4) * chartH;
        var gv = Math.round((g / 4) * maxVal);
        svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#334155" stroke-width="0.5"/>';
        svg += '<text x="' + (padL - 5) + '" y="' + (gy + 3) + '" text-anchor="end" fill="#94a3b8" font-size="9">' + gv + '</text>';
      }

      sources.forEach(function(src, si) {
        var groupX = padL + si * groupW + groupW / 2 - (barW * 3 + barGap * 2) / 2;
        sentiments.forEach(function(sent, senti) {
          var val = grouped[src][sent];
          var bh = (val / maxVal) * chartH;
          var bx = groupX + senti * (barW + barGap);
          var by = padT + chartH - bh;
          svg += '<rect x="' + bx + '" y="' + by + '" width="' + barW + '" height="' + Math.max(bh, 1) + '" fill="' + colors[sent] + '" rx="2" opacity="0.85"/>';
          if (val > 0) {
            svg += '<text x="' + (bx + barW / 2) + '" y="' + (by - 4) + '" text-anchor="middle" fill="#94a3b8" font-size="8">' + val + '</text>';
          }
        });
        var lblX = padL + si * groupW + groupW / 2;
        svg += '<text x="' + lblX + '" y="' + (H - 5) + '" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="600">' + src + '</text>';
      });

      svg += '</svg>';
      container.innerHTML = svg;
    }

    function renderThemeChart(data) {
      var container = document.getElementById('themeChart');
      var themes = {};
      data.forEach(function(d) { themes[d.theme] = (themes[d.theme] || 0) + 1; });
      var sorted = Object.entries(themes).sort(function(a, b) { return b[1] - a[1]; });

      if (sorted.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1rem">No data in this period</div>';
        return;
      }

      var total = data.length;
      var maxCount = sorted[0][1];
      container.innerHTML = sorted.map(function(entry) {
        var pct = Math.round((entry[1] / maxCount) * 100);
        var pctOfTotal = Math.round((entry[1] / total) * 100);
        return '<div class="theme-bar-row" onclick="filterByTheme(&#39;' + escapeHtml(entry[0]).replace(/'/g, '&#39;') + '&#39;)">' +
          '<span class="theme-bar-label" title="' + escapeHtml(entry[0]) + '">' + escapeHtml(entry[0]) + '</span>' +
          '<div class="theme-bar-track"><div class="theme-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="theme-bar-count">' + entry[1] + ' (' + pctOfTotal + '%)</span>' +
          '</div>';
      }).join('');
    }

    function renderTable() {
      var timeData = getTimeFiltered(allData, currentRange);
      var tableData = getTableData(timeData);
      var totalRows = tableData.length;
      var totalPages = Math.ceil(totalRows / PAGE_SIZE) || 1;
      if (currentPage >= totalPages) currentPage = totalPages - 1;
      if (currentPage < 0) currentPage = 0;
      var start = currentPage * PAGE_SIZE;
      var pageData = tableData.slice(start, start + PAGE_SIZE);

      ['created_at', 'source', 'region', 'theme', 'sentiment'].forEach(function(col) {
        var el = document.getElementById('sort-' + col);
        if (el) el.textContent = sortCol === col ? (sortDir === 'asc' ? '\\u25B2' : '\\u25BC') : '';
      });

      var tbody = document.getElementById('tableBody');
      if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">No entries match current filters</td></tr>';
      } else {
        tbody.innerHTML = pageData.map(function(e) {
          var dt = new Date(e.created_at + 'Z');
          var ts = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          var preview = e.raw_text.length > 80 ? e.raw_text.substring(0, 80) + '...' : e.raw_text;
          var isExpanded = expandedRow === e.id;
          var rowClass = isExpanded ? ' class="expanded"' : '';
          var lang = e.language || 'en';
          var langLabel = lang !== 'en' ? ' <span style="font-size:0.65rem;color:var(--text-muted);margin-left:0.25rem" title="' + lang + '">(' + lang.toUpperCase() + ')</span>' : '';
          var row = '<tr' + rowClass + ' onclick="toggleRow(' + e.id + ')" style="cursor:pointer">' +
            '<td style="white-space:nowrap;color:var(--text-muted)">' + escapeHtml(ts) + '</td>' +
            '<td><span class="pill pill-' + e.source + '">' + e.source + '</span></td>' +
            '<td style="font-size:0.75rem;color:var(--text-muted)">' + (e.region || 'AMER') + '</td>' +
            '<td>' + escapeHtml(e.theme) + '</td>' +
            '<td><span class="pill pill-' + e.sentiment + '">' + e.sentiment + '</span></td>' +
            '<td class="text-preview">' + escapeHtml(preview) + langLabel + '</td>' +
            '</tr>';
          if (isExpanded) {
            row += '<tr class="expand-row"><td colspan="6"><div class="expand-content">' +
              '<div class="expand-label">Full Feedback' + (lang !== 'en' ? ' <span style="text-transform:none;font-weight:400">(' + lang.toUpperCase() + ')</span>' : '') + '</div>' +
              '<div class="expand-text">' + escapeHtml(e.raw_text) + '</div>' +
              '<div class="expand-label">AI Summary (English)</div>' +
              '<div class="expand-summary">' + escapeHtml(e.summary) + '</div>' +
              '</div></td></tr>';
          }
          return row;
        }).join('');
      }

      var info = document.getElementById('pageInfo');
      if (totalRows === 0) {
        info.textContent = 'No entries';
      } else {
        info.textContent = 'Showing ' + (start + 1) + '-' + Math.min(start + PAGE_SIZE, totalRows) + ' of ' + totalRows;
      }
      document.getElementById('prevBtn').disabled = currentPage <= 0;
      document.getElementById('nextBtn').disabled = currentPage >= totalPages - 1;
    }

    function openModal() {
      document.getElementById('modalBackdrop').classList.add('open');
      document.getElementById('inputText').focus();
    }
    function closeModal() {
      document.getElementById('modalBackdrop').classList.remove('open');
    }

    async function analyzeCustom() {
      var source = document.getElementById('inputSource').value;
      var region = document.getElementById('inputRegion').value;
      var text = document.getElementById('inputText').value.trim();
      if (!text) return;

      var btn = document.getElementById('analyzeBtn');
      var resultEl = document.getElementById('inputResult');
      btn.disabled = true;
      btn.textContent = 'Analyzing...';
      btn.classList.add('loading');
      resultEl.style.display = 'none';

      try {
        var res = await fetch('/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: source, region: region, text: text })
        });
        var data = await res.json();

        var langInfo = data.language && data.language !== 'en' ? ' <span style="font-size:0.7rem;color:var(--text-muted)">Detected: ' + data.language.toUpperCase() + '</span>' : '';
        resultEl.innerHTML =
          '<div class="result-label">Analysis Result' + (data.cached ? ' <span style="color:var(--positive)">(from KV cache)</span>' : ' <span style="color:var(--accent)">(Workers AI)</span>') + langInfo + '</div>' +
          '<div class="result-row">' +
            '<span class="pill pill-' + data.sentiment + '">' + data.sentiment + '</span>' +
            '<span style="color:var(--text-muted)">' + escapeHtml(data.theme) + '</span>' +
          '</div>' +
          '<div style="margin-top:0.375rem;color:var(--accent);font-style:italic">' + escapeHtml(data.summary) + '</div>';
        resultEl.style.display = 'block';
        document.getElementById('inputText').value = '';
        await refreshDashboard();
      } catch (err) {
        resultEl.innerHTML = '<span style="color:var(--negative)">Analysis failed. Try again.</span>';
        resultEl.style.display = 'block';
      }

      btn.disabled = false;
      btn.textContent = 'Analyze';
      btn.classList.remove('loading');
    }

    async function loadDemoData() {
      var btn = document.getElementById('demoBtn');
      btn.disabled = true;
      btn.classList.add('loading');
      var cacheHits = 0;
      var cacheMisses = 0;

      try {
        // Step 1: Clear old data
        btn.textContent = 'Clearing old data...';
        await fetch('/results', { method: 'DELETE' });
        allData = [];
        renderAll();

        // Step 2: Load 60 days of historical data (instant, no AI calls)
        btn.textContent = 'Loading historical data...';
        await fetch('/seed-historical', { method: 'POST' });
        await refreshDashboard();

        // Step 3: Run 10 live AI analyses in parallel batches of 3
        var completed = 0;
        for (var i = 0; i < MOCK_DATA.length; i += 3) {
          var batch = MOCK_DATA.slice(i, Math.min(i + 3, MOCK_DATA.length));
          var results = await Promise.all(batch.map(function(item) {
            return fetch('/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item)
            }).then(function(r) { return r.json(); });
          }));
          results.forEach(function(r) {
            if (r.cached) cacheHits++;
            else cacheMisses++;
          });
          completed += batch.length;
          btn.textContent = 'AI analyzing... (' + completed + '/' + MOCK_DATA.length + ')';
          await refreshDashboard();
        }

        btn.textContent = 'Reload Demo Data';

        // Show cache stats
        var statsEl = document.getElementById('cacheStats');
        statsEl.innerHTML = '<span class="cache-hit">' + cacheHits + ' KV cache hit' + (cacheHits !== 1 ? 's' : '') + '</span> · <span class="cache-miss">' + cacheMisses + ' AI call' + (cacheMisses !== 1 ? 's' : '') + '</span>';
        statsEl.style.display = 'block';
      } catch (err) {
        console.error('Demo data load failed:', err);
        btn.textContent = 'Retry Demo Data';
      }

      btn.classList.remove('loading');
      btn.disabled = false;
    }

    async function refreshDashboard() {
      var res = await fetch('/results');
      allData = await res.json();
      renderAll();
    }

    // Allow Ctrl+Enter / Cmd+Enter to submit, Escape to close modal
    document.getElementById('inputText').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        analyzeCustom();
      }
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });

    refreshDashboard();
  </script>
</body>
</html>`;
}
