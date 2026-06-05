const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

async function callClaude(prompt) {
  if (!API_KEY) throw new Error('Chave da API não configurada. Adicione VITE_ANTHROPIC_API_KEY no Vercel.')

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return (data.content || []).map(b => b.text || '').join('')
}

export async function analyzePortfolio(portfolio, profile) {
  const { positions, total, byCategory } = portfolio
  const { risk, horizon, objective, monthly, obs } = profile

  const posText = [...positions]
    .sort((a, b) => b.value - a.value)
    .map(p => `- ${p.ticker} (${p.category}): R$${p.value.toFixed(2)} — ${((p.value / total) * 100).toFixed(1)}%`)
    .join('\n')

  const catText = Object.entries(byCategory)
    .map(([c, v]) => `- ${c}: R$${v.toFixed(2)} (${((v / total) * 100).toFixed(1)}%)`)
    .join('\n')

  const prompt = `Você é um analista sênior de investimentos especializado em carteiras de renda variável brasileira. Analise a carteira abaixo com rigor técnico e produza um relatório profissional em português.

## CARTEIRA
Patrimônio total: R$ ${total.toFixed(2)}
Número de ativos: ${positions.length}

Composição por classe:
${catText}

Posições (ordem decrescente de valor):
${posText}

## PERFIL DO INVESTIDOR
- Perfil de risco: ${risk}
- Horizonte: ${horizon} prazo
- Objetivo: ${objective}
- Aporte mensal estimado: ${monthly ? 'R$ ' + monthly : 'não informado'}
${obs ? `- Observações: ${obs}` : ''}

## FORMATO DO RELATÓRIO
Produza um relatório com as seguintes seções (use ### para cada título):

### Diagnóstico geral
Avalie a carteira de forma abrangente: pontos fortes, qualidade dos ativos, coerência da estratégia.

### Concentração e diversificação
Identifique concentrações excessivas por ativo, setor e classe. Aponte ativos com peso acima do recomendado e lacunas.

### Aderência ao perfil
Avalie se a composição está alinhada com o perfil de risco, horizonte e objetivo declarados.

### Qualidade dos ativos
Comente os 5 maiores ativos. Mencione pontos de atenção.

### Recomendações de ajuste
Liste ações concretas: o que reduzir, manter e considerar adicionar. Organize por prioridade.

### Alertas de risco
Riscos específicos desta carteira que merecem atenção ou monitoramento.

Seja direto, técnico, use os tickers. Não prometa retornos. Máximo 600 palavras.`

  return callClaude(prompt)
}

export async function rebalancePortfolio(portfolio, profile, targets, rebalParams) {
  const { byCategory, total, positions } = portfolio
  const { rebalObs, aporte, strategy } = rebalParams

  const currText = Object.entries(byCategory)
    .map(([c, v]) => `${c}: R$${v.toFixed(2)} (${((v / total) * 100).toFixed(1)}%)`)
    .join(', ')

  const tgtText = Object.entries(targets)
    .map(([c, pct]) => `${c}: ${pct}%`)
    .join(', ')

  const topPos = [...positions]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map(p => `${p.ticker} R$${p.value.toFixed(0)} (${((p.value / total) * 100).toFixed(1)}%)`)
    .join(', ')

  const prompt = `Você é um analista de investimentos. Produza um plano de balanceamento em português, estruturado e objetivo.

CARTEIRA ATUAL
Total: R$ ${total.toFixed(2)}
Composição atual: ${currText}
Principais posições: ${topPos}

PERFIL
- Risco: ${profile.risk}, horizonte: ${profile.horizon}, objetivo: ${profile.objective}
${profile.obs ? `- Preferências: ${profile.obs}` : ''}

ALVO DEFINIDO PELO INVESTIDOR
${tgtText}

PARÂMETROS DO AJUSTE
- Estratégia: ${strategy}
- Novo aporte disponível: ${aporte ? 'R$ ' + aporte : 'não informado'}
${rebalObs ? `- Orientações específicas: ${rebalObs}` : ''}

Produza um plano com estas seções (### para títulos):

### Avaliação do alvo proposto
Avalie se a alocação alvo faz sentido dado o perfil.

### Estratégia de transição
Como executar a migração considerando a estratégia escolhida (${strategy}).

### Ações prioritárias por ativo
Liste ações específicas por ticker (comprar, reduzir, manter).

### Considerações tributárias
Mencione IR, isenções para FIIs e ações abaixo de R$ 20.000/mês de venda.

Máximo 500 palavras.`

  return callClaude(prompt)
}
