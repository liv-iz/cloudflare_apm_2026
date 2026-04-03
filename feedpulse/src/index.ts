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
