
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: corsHeaders }
      );
    }

    try {
      const body = await request.json();
      const message = body.message;
      const history = Array.isArray(body.history)
        ? body.history.slice(-10)
        : [];

      if (typeof message !== "string" ||
          !message.trim() || message.length > 8000) {
        return Response.json(
          { error: "Enter a valid question." },
          { status: 400, headers: corsHeaders }
        );
      }

      const messages = [
        {
          role: "system",
          content: `You are StudyTrack AI, a helpful and friendly
educational and general-purpose assistant.
Welcome users politely. When asked about yourself,
explain your name, purpose, and capabilities honestly.
Answer clearly and accurately, explaining step by step
when useful. Support maths, science, coding and general
knowledge. If you are unsure, say so. Never claim to know
everything or invent facts. Adapt to the user's language.`
        },
        ...history.filter(m =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string"
        ).map(m => ({
          role: m.role,
          content: m.content.slice(0, 8000)
        })),
        { role: "user", content: message.trim() }
      ];

      const result = await fetch(env.AI_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.AI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.AI_MODEL,
          messages,
          temperature: 0.5
        })
      });

      if (!result.ok) {
        return Response.json(
          { error: "AI provider error" },
          { status: 502, headers: corsHeaders }
        );
      }

      const data = await result.json();
      const reply = data.choices?.[0]?.message?.content;

      if (typeof reply !== "string") {
        return Response.json(
          { error: "Invalid AI provider response" },
          { status: 502, headers: corsHeaders }
        );
      }

      return Response.json(
        { reply },
        { headers: corsHeaders }
      );
    } catch {
      return Response.json(
        { error: "Could not process your request." },
        { status: 400, headers: corsHeaders }
      );
    }
  }
};
                          
