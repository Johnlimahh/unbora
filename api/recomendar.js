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

  const groqKey = process.env.GROQ_API_KEY;
  const braveKey = process.env.BRAVE_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY não configurada' });

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let contextoReal = '';
  if (braveKey) {
    try {
      const queries = [
        `agenda eventos Fortaleza ${mesAno} ${activities.join(' ')}`,
        `site:opovo.com.br OR site:diariodonordeste.com.br agenda Fortaleza ${mesAno}`,
        `site:sympla.com.br eventos Fortaleza ${mesAno}`,
        `shows festas baladas bares Fortaleza ${mesAno} novidades`
      ];

      const buscas = await Promise.all(queries.map(q =>
        fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5&lang=pt&country=BR&freshness=pm`, {
          headers: { 'Accept': 'application/json', 'X-Subscription-Token': braveKey }
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      ));

      const resultados = buscas
        .filter(Boolean)
        .flatMap(b => b.web?.results || [])
        .slice(0, 15)
        .map(r => `FONTE: ${r.url}\nTÍTULO: ${r.title}\nDESCRIÇÃO: ${r.description}`)
        .join('\n---\n');

      if (resultados) contextoReal = `\n\n=== DADOS REAIS DA INTERNET ===\n${resultados}\n=== FIM DOS DADOS ===`;
    } catch (e) {
      console.error('Brave error:', e);
    }
  }

  const prompt = `Você é um guia local ESPECIALISTA em Fortaleza, Ceará, Brasil. Conhece cada bairro, bar, restaurante, praia, show e evento da cidade profundamente.

Hoje é ${hoje}.

PERFIL DO USUÁRIO:
- Humor atual: ${humor}
- Como quer se sentir depois: ${sentir}
- Tipo de programa desejado: ${activities.join(', ')}
${contextoReal}

SUA TAREFA:
Indique 4 lugares ou eventos COMPLETAMENTE DIFERENTES entre si, altamente específicos para Fortaleza-CE, que combinem DIRETAMENTE com o humor "${humor}" e o desejo de se sentir "${sentir}".

REGRAS ABSOLUTAS:
1. TODOS os lugares devem ser em Fortaleza-CE — nenhuma exceção
2. Use nomes REAIS e COMPLETOS: "Boteco Praia — Av. Beira Mar", "Chopão da Aldeota", "Cineteatro São Luiz", "Mercado dos Pinhões — Centro", "Club 26 — Varjota", etc
3. Cada lugar deve ser de uma CATEGORIA DIFERENTE — não repita tipos
4. A escolha do lugar deve fazer sentido DIRETO com o humor: se está amargo, sugira lugares para desabafar ou distrair; se está exausto, lugares calmos; se está animado, lugares agitados
5. Varie os BAIRROS: Meireles, Aldeota, Varjota, Praia de Iracema, Mucuripe, Benfica, Centro, Messejana, etc
6. Se encontrou eventos reais nos dados da internet, USE-OS e cite datas reais
7. NUNCA repita os mesmos lugares em respostas diferentes — explore toda a cidade
8. Notas baseadas em avaliações reais do Google Maps

Responda SOMENTE com JSON válido, sem texto antes ou depois, sem blocos de código markdown:
{
  "titulo": "frase criativa e personalizada com o humor (máx 6 palavras)",
  "subtitulo": "frase com o dia da semana e contexto",
  "lugares": [
    {
      "nome": "Nome completo real do lugar + bairro se necessário",
      "tipo": "categoria bem específica (ex: Bar de Praia, Forró Pé de Serra, Restaurante Cearense, Cinema de Shopping)",
      "icone": "emoji que representa bem o lugar",
      "nota": 4.3,
      "descricao": "Frase 1: o que torna esse lugar único e especial em Fortaleza. Frase 2: por que combina ESPECIFICAMENTE com quem está ${humor} e quer se sentir ${sentir}.",
      "tags": ["Bairro específico", "R$ faixa de preço", "horário ou dia de funcionamento"],
      "destaque": true
    }
  ]
}
Apenas o primeiro lugar tem destaque true, os demais false.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista local em Fortaleza-CE. Conhece profundamente todos os bares, restaurantes, praias, shows, eventos e atrações da cidade. Sempre indica lugares REAIS com nomes completos e corretos. Nunca repete os mesmos lugares. Varia sempre os bairros e categorias.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 1800
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
