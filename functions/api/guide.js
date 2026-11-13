// MyJyotish guide — Cloudflare Pages Function. Env secret: GEMINI_KEY (Google AI Studio, free tier).
const MODEL = 'gemini-2.5-flash';
export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  if (!/^https:\/\/([a-z0-9-]+\.)?myjyotish\.pages\.dev$/.test(origin)) return new Response('Forbidden', { status: 403 });
  let body; try { body = await request.json() } catch { return new Response('Bad request', { status: 400 }) }
  const msgs = (body.messages || []).slice(-12).filter(m => m && typeof m.content === 'string');
  if (!msgs.length || JSON.stringify(msgs).length > 60000) return new Response('Bad request', { status: 400 });
  const contents = msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { temperature: 0.4, maxOutputTokens: 1500 } })
  });
  const j = await r.json().catch(() => ({}));
  const text = j?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  return new Response(JSON.stringify(text ? { text } : { text: '', err: (j?.error?.message || j?.candidates?.[0]?.finishReason || 'no reply').slice(0, 200), hasKey: !!env.GEMINI_KEY }), { status: text ? 200 : 502, headers: { 'Content-Type': 'application/json' } });
}
