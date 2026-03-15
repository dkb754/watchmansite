import { getStore } from "@netlify/blobs";

export default async function handler(req, context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  const today = new Date().toISOString().slice(0, 10);
  const store = getStore("devotionals");

  try {
    // Try today first
    let devotion = null;
    try {
      devotion = await store.get(`devotion-${today}`, { type: "json" });
    } catch (e) { devotion = null; }

    // If not ready yet, generate on-demand
    if (!devotion) {
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
          system: `You are a Spirit-filled Christian devotional writer in the tradition of Jack Van Impe, Perry Stone, and Amanda Grace. 
You write for an end-times focused, intercessory community of Charismatic believers who believe in the gifts of the Spirit including deliverance and intercession.
Always respond with ONLY valid JSON — no markdown, no preamble. Format exactly:
{"title":"...","verse":"...","reference":"...","body":"<p>...</p><p>...</p><p>...</p>","prayer":"..."}
The body must be 3 paragraphs wrapped in <p> tags. Keep a warm, urgent, Spirit-filled tone rooted in KJV Scripture.`,
          messages: [{
            role: "user",
            content: `Write a fresh daily devotional for today, ${dateLabel}. Focus on end-times readiness, watchfulness, intercession, or the signs of Christ's return. Each devotional must be unique.`
          }]
        })
      });

      const data = await res.json();
      const raw = data.content[0].text.replace(/```json|```/g, '').trim();
      devotion = JSON.parse(raw);
      devotion.date = today;
      devotion.dateLabel = dateLabel;

      // Cache it
      await store.setJSON(`devotion-${today}`, devotion);

      // Update archive
      let archiveIndex = [];
      try { archiveIndex = await store.get("archive-index", { type: "json" }) || []; } catch(e) {}
      if (!archiveIndex.find(d => d.date === today)) {
        archiveIndex.unshift({ date: today, dateLabel, title: devotion.title, reference: devotion.reference, verse: devotion.verse, body: devotion.body, prayer: devotion.prayer });
        if (archiveIndex.length > 60) archiveIndex = archiveIndex.slice(0, 60);
        await store.setJSON("archive-index", archiveIndex);
      }
    }

    return new Response(JSON.stringify(devotion), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export const config = { path: "/api/devotion" };
