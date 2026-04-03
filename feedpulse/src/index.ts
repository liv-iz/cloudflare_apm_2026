import { getDashboardHtml } from "./dashboard";

interface AnalysisResult {
  sentiment: string;
  theme: string;
  summary: string;
  language: string;
}

const FALLBACK_RESULT: AnalysisResult = {
  sentiment: "neutral",
  theme: "unknown",
  summary: "Analysis failed",
  language: "en",
};

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function analyzeFeedback(ai: Ai, text: string, cache?: KVNamespace): Promise<{ result: AnalysisResult; cached: boolean }> {
  if (cache) {
    const key = await hashText(text);
    const cached = await cache.get(key);
    if (cached) {
      return { result: JSON.parse(cached), cached: true };
    }
  }

  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    messages: [
      {
        role: "system",
        content: 'You are a feedback analysis engine. You handle feedback in any language. Respond with ONLY valid JSON in this exact format, no other text:\n\n{"sentiment": "positive|neutral|negative", "theme": "one or two word theme in English", "summary": "one sentence summary in English", "language": "ISO 639-1 two-letter code of the input language"}\n\nExample:\nInput: "The dashboard loads too slowly on mobile devices"\nOutput: {"sentiment": "negative", "theme": "performance", "summary": "User reports slow dashboard loading times on mobile.", "language": "en"}\n\nExample:\nInput: "Le tableau de bord est trop lent sur mobile"\nOutput: {"sentiment": "negative", "theme": "performance", "summary": "User reports slow dashboard loading on mobile.", "language": "fr"}'
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
      result = { sentiment: parsed.sentiment, theme: parsed.theme, summary: parsed.summary, language: parsed.language || "en" };
    } else {
      result = FALLBACK_RESULT;
    }
  } catch {
    console.error("AI returned unparseable response:", rawText);
    result = FALLBACK_RESULT;
  }

  if (cache) {
    const key = await hashText(text);
    await cache.put(key, JSON.stringify(result), { expirationTtl: 3600 });
  }

  return { result, cached: false };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/analyze" && request.method === "POST") {
      const body = await request.json<{ source: string; text: string; region?: string }>();

      if (!body.source || !body.text) {
        return Response.json({ error: "source and text are required" }, { status: 400 });
      }

      const region = body.region || "AMER";
      const { result: analysis, cached } = await analyzeFeedback(env.AI, body.text, env.CACHE);

      await env.DB.prepare(
        "INSERT INTO feedback (source, region, raw_text, sentiment, theme, summary, language) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(body.source, region, body.text, analysis.sentiment, analysis.theme, analysis.summary, analysis.language).run();

      return Response.json({
        source: body.source,
        raw_text: body.text,
        ...analysis,
        cached,
      });
    }

    if (url.pathname === "/test-ai" && request.method === "GET") {
      const testText = "The billing page doesn't show invoice history for the last 3 months.";
      const { result, cached } = await analyzeFeedback(env.AI, testText, env.CACHE);
      return Response.json({ input: testText, ...result, cached });
    }

    if (url.pathname === "/results" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all();
      return Response.json(results);
    }

    if (url.pathname === "/results" && request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM feedback").run();
      return Response.json({ success: true });
    }

    if (url.pathname === "/seed-historical" && request.method === "POST") {
      // Insert pre-analyzed historical data with timestamps spread over 60 days.
      // No AI calls — data is already analyzed. This populates the time-series charts.
      const now = Date.now();
      const DAY = 86400000;
      const entries: { source: string; region: string; raw_text: string; sentiment: string; theme: string; summary: string; language: string; days_ago: number }[] = [
        // --- 0-7 days ago (recent burst — 12 entries) ---
        { source: "github", region: "AMER", raw_text: "Billing page doesn't show invoice history for the last 3 months.", sentiment: "negative", theme: "billing", summary: "Missing invoice history on billing page.", language: "en", days_ago: 0 },
        { source: "discord", region: "APAC", raw_text: "Workers AI response times are great for real-time analysis.", sentiment: "positive", theme: "performance", summary: "Positive feedback on Workers AI latency.", language: "en", days_ago: 0 },
        { source: "support", region: "EMEA", raw_text: "Impossible de trouver la documentation D1 pour les migrations.", sentiment: "negative", theme: "documentation", summary: "D1 migration docs are hard to find.", language: "fr", days_ago: 1 },
        { source: "github", region: "AMER", raw_text: "Love the new Wrangler CLI improvements. Deploy times went from 30s to under 5s.", sentiment: "positive", theme: "developer experience", summary: "Praise for Wrangler deploy speed improvements.", language: "en", days_ago: 1 },
        { source: "discord", region: "EMEA", raw_text: "KV eventual consistency confused our team.", sentiment: "neutral", theme: "consistency", summary: "Team confused by KV eventual consistency model.", language: "en", days_ago: 2 },
        { source: "support", region: "APAC", raw_text: "ダッシュボードのモバイル表示が遅い。レンダリングに4〜5秒かかります。", sentiment: "negative", theme: "performance", summary: "Mobile dashboard renders slowly.", language: "ja", days_ago: 2 },
        { source: "github", region: "AMER", raw_text: "Workflows retry logic saved our pipeline.", sentiment: "positive", theme: "reliability", summary: "Workflows automatic retry prevented pipeline failure.", language: "en", days_ago: 3 },
        { source: "discord", region: "EMEA", raw_text: "Confused about Workers vs Pages pricing.", sentiment: "neutral", theme: "pricing", summary: "Pricing differences between Workers and Pages unclear.", language: "en", days_ago: 4 },
        { source: "support", region: "AMER", raw_text: "R2 upload works perfectly. Great S3 compatibility.", sentiment: "positive", theme: "compatibility", summary: "R2 S3 compatibility praised for easy migration.", language: "en", days_ago: 5 },
        { source: "github", region: "APAC", raw_text: "D1的错误消息太模糊了，只显示SQLITE_ERROR没有详细信息。", sentiment: "negative", theme: "error handling", summary: "D1 error messages lack helpful detail.", language: "zh", days_ago: 5 },
        { source: "discord", region: "AMER", raw_text: "The new AI Gateway logging is super helpful for debugging prompts.", sentiment: "positive", theme: "observability", summary: "AI Gateway logging praised for debugging.", language: "en", days_ago: 6 },
        { source: "support", region: "EMEA", raw_text: "El comando wrangler tail se desconecta después de 10 minutos.", sentiment: "negative", theme: "developer experience", summary: "Wrangler tail is unreliable for long debugging sessions.", language: "es", days_ago: 6 },
        // --- 8-14 days ago (7 entries) ---
        { source: "github", region: "EMEA", raw_text: "The Cloudflare dashboard takes 8+ seconds to load the Workers list.", sentiment: "negative", theme: "performance", summary: "Dashboard Workers list loads slowly.", language: "en", days_ago: 8 },
        { source: "discord", region: "APAC", raw_text: "Durable Objects are perfect for our real-time collaboration feature.", sentiment: "positive", theme: "real-time", summary: "Durable Objects praised for collaboration use case.", language: "en", days_ago: 9 },
        { source: "support", region: "EMEA", raw_text: "Ich kann nicht herausfinden, wie man benutzerdefinierte Domains für Workers einrichtet.", sentiment: "negative", theme: "documentation", summary: "Custom domain setup for Workers is unclear.", language: "de", days_ago: 10 },
        { source: "github", region: "AMER", raw_text: "Pages build times improved significantly in the last update.", sentiment: "positive", theme: "performance", summary: "Pages build times praised after recent update.", language: "en", days_ago: 11 },
        { source: "discord", region: "APAC", raw_text: "Is there a way to share KV namespaces between Workers?", sentiment: "neutral", theme: "architecture", summary: "Question about sharing KV between Workers.", language: "en", days_ago: 12 },
        { source: "support", region: "EMEA", raw_text: "Our R2 bucket got throttled with no warning. Need better rate limit docs.", sentiment: "negative", theme: "documentation", summary: "R2 rate limiting documentation is insufficient.", language: "en", days_ago: 13 },
        { source: "github", region: "AMER", raw_text: "Hyperdrive reduced our database query latency by 60%.", sentiment: "positive", theme: "performance", summary: "Hyperdrive significantly reduced query latency.", language: "en", days_ago: 14 },
        // --- 15-30 days ago (8 entries) ---
        { source: "discord", region: "APAC", raw_text: "Workers Analytics Engine is underrated. Love the SQL API.", sentiment: "positive", theme: "analytics", summary: "Analytics Engine SQL API praised.", language: "en", days_ago: 16 },
        { source: "support", region: "AMER", raw_text: "Migrating from AWS Lambda to Workers was smoother than expected.", sentiment: "positive", theme: "migration", summary: "Lambda to Workers migration went well.", language: "en", days_ago: 18 },
        { source: "github", region: "EMEA", raw_text: "A limitação de 128MB de memória em Workers é muito restritiva para processamento de imagens.", sentiment: "negative", theme: "limits", summary: "Workers memory limit blocks image processing use case.", language: "pt", days_ago: 20 },
        { source: "discord", region: "AMER", raw_text: "Stream support in Workers makes SSE trivial. Nice DX.", sentiment: "positive", theme: "developer experience", summary: "Workers stream support praised for SSE.", language: "en", days_ago: 22 },
        { source: "support", region: "APAC", raw_text: "D1にポイントインタイムリカバリがない。マイグレーション失敗後にデータを失った。", sentiment: "negative", theme: "reliability", summary: "Missing D1 point-in-time recovery caused data loss.", language: "ja", days_ago: 24 },
        { source: "github", region: "EMEA", raw_text: "Queues integration with Workers is clean. Easy producer/consumer setup.", sentiment: "positive", theme: "architecture", summary: "Queues praised for clean Workers integration.", language: "en", days_ago: 26 },
        { source: "discord", region: "APAC", raw_text: "무료 플랜의 일일 10만 요청 제한은 경쟁사에 비해 부족합니다.", sentiment: "negative", theme: "pricing", summary: "Free plan request limit seen as uncompetitive.", language: "ko", days_ago: 28 },
        { source: "support", region: "EMEA", raw_text: "The Cloudflare status page doesn't reflect regional outages accurately.", sentiment: "negative", theme: "observability", summary: "Status page misses regional outage details.", language: "en", days_ago: 30 },
        // --- 31-60 days ago (8 entries) ---
        { source: "github", region: "AMER", raw_text: "Wrangler 4 release is a huge improvement over v3. Much faster.", sentiment: "positive", theme: "developer experience", summary: "Wrangler 4 praised as major improvement.", language: "en", days_ago: 33 },
        { source: "discord", region: "APAC", raw_text: "D1の5GBストレージ制限に予想より早く到達してしまった。", sentiment: "negative", theme: "limits", summary: "D1 storage limit reached unexpectedly.", language: "ja", days_ago: 36 },
        { source: "support", region: "EMEA", raw_text: "Les coûts d'inférence Workers AI sont très compétitifs par rapport à OpenAI.", sentiment: "positive", theme: "pricing", summary: "Workers AI pricing praised vs competitors.", language: "fr", days_ago: 39 },
        { source: "github", region: "AMER", raw_text: "No built-in cron monitoring. We had to build our own alerting.", sentiment: "negative", theme: "observability", summary: "Missing cron trigger monitoring.", language: "en", days_ago: 42 },
        { source: "discord", region: "EMEA", raw_text: "The miniflare local dev experience is excellent.", sentiment: "positive", theme: "developer experience", summary: "Miniflare local development praised.", language: "en", days_ago: 45 },
        { source: "support", region: "APAC", raw_text: "Workers Logs are missing request body in error traces.", sentiment: "negative", theme: "observability", summary: "Error traces lack request body details.", language: "en", days_ago: 48 },
        { source: "github", region: "AMER", raw_text: "Cloudflare Tunnel makes exposing local services dead simple.", sentiment: "positive", theme: "developer experience", summary: "Tunnel praised for local service exposure.", language: "en", days_ago: 52 },
        { source: "discord", region: "EMEA", raw_text: "Email Workers são ótimos mas a documentação de regras de roteamento precisa melhorar.", sentiment: "neutral", theme: "documentation", summary: "Email Workers routing docs need improvement.", language: "pt", days_ago: 57 },
      ];

      const stmt = env.DB.prepare(
        "INSERT INTO feedback (source, region, raw_text, sentiment, theme, summary, language, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );

      const batch = entries.map(e => {
        const ts = new Date(now - e.days_ago * DAY).toISOString().replace("T", " ").substring(0, 19);
        return stmt.bind(e.source, e.region, e.raw_text, e.sentiment, e.theme, e.summary, e.language, ts);
      });

      await env.DB.batch(batch);
      return Response.json({ success: true, inserted: entries.length });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(getDashboardHtml(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
