export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return response.status(503).json({
      error: "AI is not configured yet. Add OPENROUTER_API_KEY in the deployment environment."
    });
  }

  const body = request.body || {};
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1200) : "";
  const page = typeof body.page === "string" ? body.page.slice(0, 80) : "Trend Detective";
  if (!message) {
    return response.status(400).json({ error: "Please enter a question." });
  }

  const systemPrompt =
    "You are Trend Detective, a concise Earth-trend analyst for this dashboard. " +
    "Answer accurately, explain uncertainty, and distinguish observed data from interpretation. " +
    "Use 2-4 short sentences or 3 short bullets. Never invent measurements or sources. " +
    "Use the page context supplied by the user. " +
    "When a trend can be shown clearly, append exactly one fenced JSON block tagged chart " +
    "with keys title, labels, values, unit. Do not include any text after the chart block.";

  try {
    const result = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Trend Detective"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4.1-flash-1017",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Page: ${page}\n\nQuestion: ${message}` }
        ],
        temperature: 0.2,
        max_tokens: 220
      })
    });

    if (!result.ok) {
      const details = await result.text();
      console.error("OpenRouter error:", result.status, details.slice(0, 500));
      return response.status(502).json({ error: "The AI service is temporarily unavailable." });
    }

    const payload = await result.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return response.status(502).json({ error: "The AI returned no answer." });
    }

    return response.status(200).json({ answer: text.trim() });
  } catch (error) {
    console.error("Trend Detective chat proxy failed:", error);
    return response.status(502).json({ error: "The AI service could not be reached." });
  }
}
