import { getStore } from "@netlify/blobs";

export const config = {
  schedule: "0 10 * * *"  // 5 AM EST = 10 AM UTC
};

export default async function handler() {
  const store = getStore("tracker");

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
        system: `You are a Spirit-filled prophetic analyst connecting current global events to Bible prophecy, 
in the tradition of Amir Sarfati, Perry Stone, and Jack Van Impe. 
Respond with ONLY valid JSON — no markdown, no preamble:
{"summary":"2-3 sentence Spirit-led commentary on current prophetic signs","events":[{"headline":"...","scripture":"Book Chapter:Verse","category":"Israel|Global|Celestial|Apostasy","urgency":"urgent|watch|sign"}],"percentage":82}
Include 4-6 current events. The percentage is your Spirit-led assessment of prophetic convergence (keep near 82, adjust slightly based on events).`,
        messages: [{
          role: "user",
          content: `Today is ${dateLabel}. Generate a current end-times prophetic tracker update. 
Connect real-world events happening now (Middle East tensions, Israel, global government, natural signs, moral decline, technology) 
to specific Bible prophecy scriptures. Be specific, urgent, and scripturally grounded.`
        }]
      })
    });

    const data = await res.json();
    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const tracker = JSON.parse(raw);
    tracker.date = today;
    tracker.dateLabel = dateLabel;

    await store.setJSON(`tracker-${today}`, tracker);
    console.log(`✦ Tracker updated for ${today}`);
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Tracker generation failed:", err);
    return new Response("Error: " + err.message, { status: 500 });
  }
}
