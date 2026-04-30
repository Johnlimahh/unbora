export default async function handler(req, res) {
  // ===== CORS =====
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // ===== Validação =====
  const { humor, sentir, activities } = req.body || {};

  if (!humor || !sentir || !Array.isArray(activities) || activities.length === 0) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  // ===== API KEY =====
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
  }

  // ===== Prompt =====
  const prompt = `
Você é um especialista em lazer e entretenimento em Fortaleza, Ceará, Brasil.

Perfil do usuário:
- Humor atual: ${humor}
- Como quer se sentir: ${sentir}
- Atividades de interesse: ${activities.join(', ')}

Liste OS 4 MELHORES lugares reais em Fortaleza que combinem com esse perfil.

Responda SOMENTE com JSON válido:
{
  "titulo": "frase curta (máx 6 palavras)",
  "subtitulo": "frase curta contextual",
  "lugares": [
    {
      "nome": "Nome real do lugar",
      "tipo": "Categoria",
      "icone": "emoji",
      "nota": 4.6,
      "descricao": "2 frases explicativas.",
      "tags": ["tag1","tag2"],
      "destaque": true
    }
  ]
}

Apenas o primeiro lugar tem destaque true.
`;

  try {
    // ✅ API V1 (CORRETA)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: error.error?.message || 'Erro na API do Gemini'
      });
    }

    const data = await response.json();
    const raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!raw) {
      return res.status(500).json({ error: 'Resposta vazia da IA' });
    }

    const clean = raw.replace(/```json|```/gi, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');

    if (start === -1 || end === -1) {
      return res.status(500).json({ error: 'JSON inválido retornado pela IA' });
    }

    const result = JSON.parse(clean.slice(start, end + 1));
    return res.status(200).json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
