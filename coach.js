const MODEL = 'gemini-3.8-flash';
const MAX_BODY = 32 * 1024;
const hits = new Map();

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET') {
    return send(res, 200, { ok: true, configured: Boolean(process.env.GEMINI_API_KEY), model: MODEL });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  if (!process.env.GEMINI_API_KEY) return send(res, 503, { error: 'ai_not_configured', message: 'O servidor ainda precisa da chave do Gemini.' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const entry = hits.get(ip) || { start: now, count: 0 };
  if (now - entry.start > 60_000) { entry.start = now; entry.count = 0; }
  entry.count += 1;
  hits.set(ip, entry);
  if (entry.count > 15) return send(res, 429, { error: 'rate_limited', message: 'Muitas mensagens em pouco tempo. Aguarde um minuto.' });

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    if (!body || typeof body !== 'object') return send(res, 400, { error: 'invalid_body' });
    const system = typeof body.system === 'string' ? body.system.slice(0, 5000) : '';
    const context = typeof body.context === 'string' ? body.context.slice(0, 8000) : '';
    const raw = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    const messages = raw.map(m => ({
      role: m && m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m && m.content || '').slice(0, 2500) }]
    })).filter(m => m.parts[0].text.trim());
    if (!messages.length || messages[messages.length - 1].role !== 'user') return send(res, 400, { error: 'message_required' });

    const instruction = [system, context ? 'Dados atuais do corredor no aplicativo Passada:\n' + context : ''].filter(Boolean).join('\n\n');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: messages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 650 }
      }),
      signal: AbortSignal.timeout(40_000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502;
      return send(res, status, { error: 'model_error', message: response.status === 429 ? 'O limite temporário do serviço de IA foi atingido. Tente novamente em instantes.' : 'Não foi possível obter uma resposta da IA agora.' });
    }
    const text = (data.candidates || []).flatMap(c => c.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!text) return send(res, 502, { error: 'empty_response', message: 'O Treinador IA não retornou uma resposta. Tente novamente.' });
    return send(res, 200, { text, model: MODEL });
  } catch (error) {
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return send(res, 502, { error: timedOut ? 'timeout' : 'server_error', message: timedOut ? 'A resposta demorou demais. Tente novamente.' : 'Ocorreu um erro ao conversar com o Treinador IA.' });
  }
};
