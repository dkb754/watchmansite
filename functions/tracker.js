const https = require('https');

exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/New_York'
  });
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const payload = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: 'You are a Spirit-filled prophetic analyst in the tradition of Amir Sarfati, Perry Stone, and Jack Van Impe. Respond with ONLY valid JSON, no markdown: {"summary":"2-3 sentence Spirit-led commentary on current prophetic signs","events":[{"headline":"...","scripture":"Book Chapter:Verse","category":"Israel|Global|Celestial|Apostasy","urgency":"urgent|watch|sign"}],"percentage":82}. Include 4-6 current events.',
    messages: [{ role: 'user', content: `Today is ${dateLabel}. Generate an end-times prophetic tracker connecting current global events to Bible prophecy. Be specific and scripturally grounded.` }]
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    const data = JSON.parse(result.body);
    if (!data.content || !data.content[0]) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No content', raw: result.body }) };
    }

    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const tracker = JSON.parse(raw);
    tracker.date = today;

    return { statusCode: 200, headers, body: JSON.stringify(tracker) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
