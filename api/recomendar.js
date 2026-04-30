
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { humor, sentir, activities } = req.body || {};
  if (!humor || !sentir || !activities?.length) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Chave de API não configurada no servidor' });

  const prompt = `Você é um especialista em lazer e entretenimento em Fortaleza, Ceará, Brasil.

Perfil do usuário:
- Humor atual: ${humor}
- Como quer se sentir: ${sentir}
- Atividades de interesse: ${activities.join(', ')}

Use sua busca na web para encontrar dados atuais sobre avaliações, comentários e recomendações de lugares em Fortaleza que combinem com esse perfil.

Liste os 4 MELHORES lugares específicos e reais para visitar HOJE em Fortaleza.

Responda SOMENTE com JSON válido, sem texto antes ou depois, sem blocos de código:
{
  "titulo": "frase curta personalizada de até 6 palavras",
  "subtitulo": "frase de 1 linha contextualizada",
  "lugares": [
    {
      "nome": "Nome real do lugar em Fortaleza",
      "tipo": "categoria (ex: Praia, Show, Bar, Parque)",
      "icone": "emoji único",
      "nota": 4.5,
      "descricao": "2 frases sobre por que combina com esse perfil.",
      "tags": ["tag1", "tag2", "tag3"],
      "destaque": true
    }
  ]
}
Apenas o primeiro lugar deve ter destaque true, os demais false.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'Erro na API da Anthropic' });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) return res.status(500).json({ error: 'Resposta vazia da IA' });

    let raw = textBlock.text.replace(/```json|```/g, '').trim();
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    if (s === -1) return res.status(500).json({ error: 'Formato de resposta inválido' });

    const result = JSON.parse(raw.slice(s, e + 1));
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
