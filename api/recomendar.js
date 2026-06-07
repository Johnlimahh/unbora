export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { humor, sentir, activities } = req.body || {};
  if (!humor || !sentir || !Array.isArray(activities) || activities.length === 0) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY não configurada' });

  const prompt = `Você é um especialista em lazer e entretenimento em Fortaleza, Ceará, Brasil.

Perfil do usuário:
- Humor atual: ${humor}
- Como quer se sentir: ${sentir}
- Atividades de interesse: ${activities.join(', ')}

Liste os 4 MELHORES lugares reais e eventos atuais em Fortaleza que combinem com esse perfil. Inclua bares, praias, shows, restaurantes, festas e atrações da cidade.

Responda SOMENTE com JSON válido, sem texto antes ou depois, sem blocos de código:
{
  "titulo": "frase curta (máx 6 palavras)",
  "subtitulo": "frase curta contextual",
  "lugares": [
    {
      "nome": "Nome real do lugar em Fortaleza",
      "tipo": "Categoria",
      "icone": "emoji",
      "nota": 4.6,
      "descricao": "2 frases explicativas sobre o lugar e por que combina com o perfil.",
      "tags": ["tag1","tag2","tag3"],
      "destaque": true
    }
  ]
}
Apenas o primeiro lugar tem destaque true, os demais false.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'Erro na API do Groq' });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const s = clean.indexOf('{');
    const e = clean.lastIndexOf('}');
    if (s === -1) return res.status(500).json({ error: 'Formato de resposta inválido' });

    const result = JSON.parse(clean.slice(s, e + 1));
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
}
