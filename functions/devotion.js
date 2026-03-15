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
    system: 'You are a Spirit-filled Christian devotional writer in the tradition of Jack Van Impe, Perry Stone, and Amanda Grace. Write for an end-times focused intercessory Charismatic community. Respond with ONLY valid JSON, no markdown, no code blocks: {"title":"...","verse":"...","reference":"...","body":"<p>...</p><p>...</p><p>...</p>","prayer":"..."}',
    messages: [{ role: 'user', content: `Write a fresh daily devotional for ${dateLabel}. Focus on end-times readiness, watchfulness, intercession, or signs of Christ\'s return. Use KJV Scripture. Choose a unique theme each day.` }]
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
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No content returned', raw: result.body }) };
    }

    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const devotion = JSON.parse(raw);
    devotion.date = today;
    devotion.dateLabel = dateLabel;

    return { statusCode: 200, headers, body: JSON.stringify(devotion) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
