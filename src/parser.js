import * as XLSX from 'xlsx'

export const CAT_COLORS = {
  'Ações':  '#1A1916',
  'FIIs':   '#2D6A4F',
  'BDRs':   '#92400E',
  'Outros': '#888780',
}

const SHEET_CATS = {
  'Acoes': 'Ações',
  'Ações': 'Ações',
  'BDR': 'BDRs',
  'Fundo de Investimento': 'FIIs',
}

export function parsePortfolio(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const positions = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
    const cat = SHEET_CATS[sheetName] || 'Outros'

    for (const row of rows) {
      const ticker = String(row['Código de Negociação'] || '').trim()
      const val = parseFloat(row['Valor Atualizado']) || 0
      if (!ticker || val <= 0) continue

      const raw = String(row['Produto'] || '')
      const name = raw.includes(' - ')
        ? raw.split(' - ').slice(1).join(' - ')
        : raw

      positions.push({
        ticker,
        name: name.substring(0, 48),
        value: val,
        qty: parseFloat(row['Quantidade']) || 0,
        price: parseFloat(row['Preço de Fechamento']) || 0,
        category: cat,
      })
    }
  }

  if (positions.length === 0) throw new Error('Nenhum ativo encontrado no arquivo.')

  const total = positions.reduce((s, p) => s + p.value, 0)
  const byCategory = {}
  for (const p of positions) {
    byCategory[p.category] = (byCategory[p.category] || 0) + p.value
  }

  return { positions, total, byCategory }
}
