export default async function handler(req, context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (req.method === "OPTIONS") return new Response("", { status: 200, headers });

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/New_York'
  });
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a Spirit-filled Christian devotional writer in the tradition of Jack Van Impe, Perry Stone, and Amanda Grace. Write for an end-times focused intercessory Charismatic community. Respond with ONLY valid JSON, no markdown, no code blocks: {"title":"...","verse":"...","reference":"...","body":"<p>...</p><p>...</p><p>...</p>","prayer":"..."}`,
        messages: [{ role: "user", content: `Write a fresh daily devotional for ${dateLabel}. Focus on end-times readiness, watchfulness, intercession, or signs of Christ's return. Use KJV Scripture.` }]
      })
    });

    const data = await res.json();
    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const devotion = JSON.parse(raw);
    devotion.date = today;
    devotion.dateLabel = dateLabel;
    return new Response(JSON.stringify(devotion), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/devotion" };
