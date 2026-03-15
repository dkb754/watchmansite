import { getStore } from "@netlify/blobs";

export const config = {
  schedule: "0 8 * * *"  // 3 AM EST = 8 AM UTC
};

export default async function handler() {
  const store = getStore("devotionals");

  const today = new Date().toISOString().slice(0, 10);
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/New_York'
  });

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
        system: `You are a Spirit-filled Christian devotional writer in the tradition of Jack Van Impe, Perry Stone, and Amanda Grace. 
You write for an end-times focused, intercessory community of Charismatic believers who believe in the gifts of the Spirit including deliverance and intercession.
Always respond with ONLY valid JSON — no markdown, no preamble. Format exactly:
{"title":"...","verse":"...","reference":"...","body":"<p>...</p><p>...</p><p>...</p>","prayer":"..."}
The body must be 3 paragraphs wrapped in <p> tags. Keep a warm, urgent, Spirit-filled tone rooted in KJV Scripture.`,
        messages: [{
          role: "user",
          content: `Write a fresh daily devotional for today, ${dateLabel}. 
Focus on end-times readiness, watchfulness, intercession, or the signs of Christ's return. 
Each devotional must be unique — choose a different Scripture and theme each day.`
        }]
      })
    });

    const data = await res.json();
    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const devotion = JSON.parse(raw);
    devotion.date = today;
    devotion.dateLabel = dateLabel;

    // Save today's devotion
    await store.setJSON(`devotion-${today}`, devotion);

    // Update archive index
    let archiveIndex = [];
    try {
      archiveIndex = await store.get("archive-index", { type: "json" }) || [];
    } catch (e) { archiveIndex = []; }

    if (!archiveIndex.find(d => d.date === today)) {
      archiveIndex.unshift({
        date: today,
        dateLabel,
        title: devotion.title,
        reference: devotion.reference,
        verse: devotion.verse,
        body: devotion.body,
        prayer: devotion.prayer
      });
      if (archiveIndex.length > 60) archiveIndex = archiveIndex.slice(0, 60);
      await store.setJSON("archive-index", archiveIndex);
    }

    console.log(`✦ Devotional generated for ${today}: ${devotion.title}`);
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Devotion generation failed:", err);
    return new Response("Error: " + err.message, { status: 500 });
  }
}
