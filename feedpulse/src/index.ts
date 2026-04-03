import { getDashboardHtml } from "./dashboard";

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
  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

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

    if (url.pathname === "/test-ai" && request.method === "GET") {
      const testText = "The billing page doesn't show invoice history for the last 3 months.";
      const result = await analyzeFeedback(env.AI, testText);
      return Response.json({ input: testText, ...result });
    }

    if (url.pathname === "/results" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC").all();
      return Response.json(results);
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(getDashboardHtml(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
