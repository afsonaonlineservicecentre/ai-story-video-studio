export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method === "GET") {
      return new Response("Story AI Backend is running", {
        headers: cors
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: cors
      });
    }

    try {
      const { prompt } = await request.json();

      if (!prompt) {
        return Response.json(
          { error: "Prompt is required" },
          { status: 400, headers: cors }
        );
      }

      const result = await env.AI.run(
        "@cf/black-forest-labs/flux-1-schnell",
        { prompt }
      );

      if (!result || !result.image) {
        return Response.json(
          { error: "AI image data not found", result },
          { status: 500, headers: cors }
        );
      }

      const binary = Uint8Array.from(
        atob(result.image),
        c => c.charCodeAt(0)
      );

      return new Response(binary, {
        headers: {
          ...cors,
          "Content-Type": "image/png",
          "Cache-Control": "no-store"
        }
      });

    } catch (error) {
      return Response.json(
        { error: error.message },
        { status: 500, headers: cors }
      );
    }
  }
};
