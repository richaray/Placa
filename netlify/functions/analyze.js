exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured on server.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { imageData, mimeType } = body;
  if (!imageData || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing imageData or mimeType.' }) };
  }

  const prompt = `You are Placa, a friendly plant care expert. Identify the plant in the image and respond with EXACTLY these 6 lines and nothing else. Each line must start with the exact label shown, followed by a colon, followed by the answer on that SAME single line. Do not wrap text across multiple lines. No extra text before or after. No markdown, no asterisks, no numbered lists, no blank lines.

PLANT_NAME: common name (Scientific name)
WATERING: specific frequency and amount
LIGHT: what kind of light it needs
SOIL_FERTILISER: soil type and feeding schedule
COMMON_MISTAKE: one mistake to avoid
FUN_FACT: one interesting fact about this plant

Be warm, specific, and concise. Each answer must fit on one line.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageData
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            maxOutputTokens: 900,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || 'Gemini API error.';
      return { statusCode: response.status, body: JSON.stringify({ error: errMsg }) };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: text })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error: ' + err.message })
    };
  }
};
