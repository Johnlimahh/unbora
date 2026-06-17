# 🌴 Unbora Fortaleza

> Descubra o que fazer hoje em Fortaleza com recomendações personalizadas por IA.

## O que é?

O **Unbora** é um app web que analisa seu humor e te indica os melhores lugares, eventos e atividades em Fortaleza-CE no momento. Em 3 passos simples, a IA cruza seu estado emocional com a agenda real da cidade e entrega uma lista personalizada.

## Como funciona?

1. **Como você está?** — Escolha seu humor atual (animado, tranquilo, aventureiro, romântico...)
2. **Como quer se sentir?** — Defina o que busca (revigorado, feliz, relaxado, conectado...)
3. **Que programa te chama?** — Selecione as atividades de interesse (praia, show, balada, gastronomia, cinema, teatro, reggae...)

A IA busca eventos reais em fontes como Sympla, O Povo, Diário do Nordeste e a agenda da Prefeitura de Fortaleza, e retorna os **10 melhores lugares e eventos** do momento para o seu perfil.

## Funcionalidades

- 🤖 Recomendações geradas por IA (LLaMA 3.3 70B via Groq)
- 🔍 Busca em tempo real de eventos e agenda da cidade
- 🎯 10 sugestões personalizadas por perfil
- 🌙 Suporte a tema claro e escuro
- 📱 100% responsivo e otimizado para mobile
- ⚡ PWA — pode ser instalado como app no celular

## Tecnologias

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Node.js (Vercel Serverless Functions)
- **IA:** LLaMA 3.3 70B via [Groq API](https://groq.com)
- **Busca:** [Brave Search API](https://brave.com/search/api/)
- **Deploy:** [Vercel](https://vercel.com)

## Variáveis de Ambiente

Configure no painel da Vercel:

| Variável | Descrição |
|---|---|
| `GROQ_API_KEY` | Chave da API do Groq |
| `BRAVE_API_KEY` | Chave da Brave Search API |
| `ALLOWED_ORIGIN` | Origem permitida (opcional) |

## Deploy

O projeto é automaticamente deployado na Vercel a cada push na branch `main`.

🔗 **[unbora.vercel.app](https://unbora.vercel.app)**

---

Feito com ❤️ em Fortaleza
