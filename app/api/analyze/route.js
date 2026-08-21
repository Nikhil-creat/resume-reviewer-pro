// Converts our Anthropic-style content blocks (text/document/image) into
// Gemini's "parts" format, so the frontend didn't need to change at all.
function toGeminiParts(userContent) {
  return userContent.map((block) => {
    if (block.type === "text") {
      return { text: block.text };
    }
    if (block.type === "document" || block.type === "image") {
      return {
        inline_data: {
          mime_type: block.source.media_type,
          data: block.source.data,
        },
      };
    }
    return { text: "" };
  });
}

export async function POST(req) {
  try {
    const { systemPrompt, userContent } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return Response.json(
        { error: "Server is missing GOOGLE_API_KEY. Set it in your Vercel project's environment variables." },
        { status: 500 }
      );
    }

    const parts = toGeminiParts(userContent);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GOOGLE_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data?.error?.message || "Google Gemini API error" }, { status: response.status });
    }

    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";

    if (!text) {
      const reason = candidate?.finishReason;
      const msg =
        reason === "MAX_TOKENS"
          ? "The response was cut off (too long). Try again — this is usually a one-off."
          : reason === "SAFETY" || reason === "RECITATION"
          ? "The response was blocked by a content filter. Try rephrasing the job description or resume slightly."
          : "Gemini returned an empty response. Try again.";
      return Response.json({ error: msg }, { status: 500 });
    }

    if (candidate?.finishReason === "MAX_TOKENS") {
      return Response.json({ error: "The response was cut off (too long) before finishing. Try again." }, { status: 500 });
    }

    // Reshape into the same { content: [{type:'text', text}] } shape the frontend already expects.
    return Response.json({ content: [{ type: "text", text }] });
  } catch (err) {
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
