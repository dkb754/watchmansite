import { getStore } from "@netlify/blobs";

export default async function handler(req, context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  const today = new Date().toISOString().slice(0, 10);
  const store = getStore("tracker");

  try {
    let tracker = null;
    try {
      tracker = await store.get(`tracker-${today}`, { type: "json" });
    } catch (e) { tracker = null; }

    if (!tracker) {
      const dateLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'America/New_York'
      });

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
          system: `You are a Spirit-filled prophetic analyst connecting current global events to Bible prophecy, in the tradition of Amir Sarfati, Perry Stone, and Jack Van Impe. 
Respond with ONLY valid JSON — no markdown:
{"summary":"2-3 sentence Spirit-led commentary","events":[{"headline":"...","scripture":"Book Chapter:Verse","category":"Israel|Global|Celestial|Apostasy","urgency":"urgent|watch|sign"}],"percentage":82}
Include 4-6 current events.`,
          messages: [{
            role: "user",
            content: `Today is ${dateLabel}. Generate a current end-times prophetic tracker update connecting real-world events to Bible prophecy scriptures.`
          }]
        })
      });

      const data = await res.json();
      const raw = data.content[0].text.replace(/```json|```/g, '').trim();
      tracker = JSON.parse(raw);
      tracker.date = today;
      await store.setJSON(`tracker-${today}`, tracker);
    }

    return new Response(JSON.stringify(tracker), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/tracker" };
