import './style.css'
import { parsePortfolio, CAT_COLORS } from './parser.js'
import { analyzePortfolio, rebalancePortfolio } from './api.js'
import { fmtBRL, fmtPct, formatReport, goTo, showTab, animateLoadingSteps } from './utils.js'

// ── App State ──────────────────────────────────────────────────────────────────
const state = {
  fileName: '',
  portfolio: null,
  profile: {},
  aiReport: '',
}

// ── Render shell ───────────────────────────────────────────────────────────────
document.getElementById('app').innerHTML = `
<div style="display:flex;flex-direction:column;min-height:100vh;">
  <header>
    <a class="logo" href="/">Carteira <span>/ análise</span></a>
    <div class="step-indicator">
      <div class="step-dot active" id="dot-1"></div>
      <div class="step-dot" id="dot-2"></div>
      <div class="step-dot" id="dot-3"></div>
      <div class="step-dot" id="dot-4"></div>
    </div>
  </header>

  <main style="flex:1;padding:3rem 1.5rem;max-width:860px;margin:0 auto;width:100%;">

    <!-- SCREEN: Upload -->
    <div class="screen active" id="screen-upload">
      <div class="upload-hero">
        <h1>Analise sua<br><em>carteira de investimentos</em></h1>
        <p>Faça upload do extrato da B3 e receba análise detalhada com recomendações de balanceamento.</p>
      </div>
      <div class="drop-zone" id="dropzone">
        <input type="file" id="fileInput" accept=".xlsx,.xls" />
        <div class="drop-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
        </div>
        <h3>Arraste o arquivo ou clique para selecionar</h3>
        <p>Formato .xlsx exportado da B3 / Nu Invest / Clear / XP</p>
      </div>
      <div class="format-note">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
        <span>Seu arquivo <strong>não é enviado para nenhum servidor</strong>. O processamento do XLSX acontece inteiramente no seu navegador. Apenas o texto da análise é enviado à IA.</span>
      </div>
    </div>

    <!-- SCREEN: Profile -->
    <div class="screen" id="screen-profile">
      <div class="action-bar">
        <div class="action-bar-info">
          <strong id="profile-filename">—</strong>
          <span id="profile-summary"></span>
        </div>
        <button class="btn btn-secondary" id="btn-change-file" style="font-size:0.8rem;padding:0.4rem 0.9rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
          </svg>
          Trocar arquivo
        </button>
      </div>
      <h2 class="screen-title">Perfil do investidor</h2>
      <p class="screen-subtitle">Essas informações guiam a análise e as recomendações da IA.</p>
      <div class="card">
        <p class="card-title">Características</p>
        <div class="form-grid">
          <div class="field">
            <label for="risk">Perfil de risco</label>
            <select id="risk">
              <option value="conservador">Conservador</option>
              <option value="moderado" selected>Moderado</option>
              <option value="arrojado">Arrojado / Agressivo</option>
            </select>
          </div>
          <div class="field">
            <label for="horizon">Horizonte de investimento</label>
            <select id="horizon">
              <option value="curto">Curto prazo (até 2 anos)</option>
              <option value="medio" selected>Médio prazo (2–7 anos)</option>
              <option value="longo">Longo prazo (7+ anos)</option>
            </select>
          </div>
          <div class="field">
            <label for="objective">Objetivo principal</label>
            <select id="objective">
              <option value="dividendos">Renda passiva (dividendos)</option>
              <option value="crescimento" selected>Crescimento de patrimônio</option>
              <option value="equilibrio">Equilíbrio renda + crescimento</option>
              <option value="preservacao">Preservação de capital</option>
            </select>
          </div>
          <div class="field">
            <label for="monthly">Aporte mensal estimado (R$)</label>
            <input type="number" id="monthly" placeholder="0,00" min="0" step="100" />
          </div>
          <div class="field full">
            <label for="obs">Observações e restrições</label>
            <textarea id="obs" placeholder="Ex: quero aumentar exposição a FIIs, evitar setor bancário, tenho renda fixa fora desta carteira..."></textarea>
          </div>
        </div>
      </div>
      <button class="btn btn-primary btn-full" id="btn-analyze">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
        </svg>
        Analisar carteira
      </button>
    </div>

    <!-- SCREEN: Loading -->
    <div class="screen" id="screen-loading">
      <div class="loading-wrap">
        <div class="spinner"></div>
        <p class="loading-title">Analisando sua carteira...</p>
        <div class="loading-steps">
          <div class="loading-step active" id="lstep-1">
            <span class="step-icon">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </span>
            Processando posições
          </div>
          <div class="loading-step" id="lstep-2">
            <span class="step-icon">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </span>
            Calculando concentrações
          </div>
          <div class="loading-step" id="lstep-3">
            <span class="step-icon">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </span>
            Consultando IA
          </div>
          <div class="loading-step" id="lstep-4">
            <span class="step-icon">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </span>
            Elaborando relatório
          </div>
        </div>
      </div>
    </div>

    <!-- SCREEN: Analysis -->
    <div class="screen" id="screen-analysis">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:2rem;">
        <div>
          <h2 class="screen-title">Análise da carteira</h2>
          <p class="screen-subtitle" id="analysis-date"></p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary" id="btn-new-analysis" style="font-size:0.8rem;padding:0.45rem 0.9rem;">Nova análise</button>
          <button class="btn btn-primary" id="btn-go-rebalance">
            Simular balanceamento
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="metrics-grid" id="metrics-grid"></div>
      <div class="section-tabs">
        <button class="section-tab active" data-tab="overview">Visão geral</button>
        <button class="section-tab" data-tab="positions">Posições</button>
        <button class="section-tab" data-tab="report">Relatório IA</button>
      </div>
      <div id="tab-overview">
        <div class="card">
          <p class="card-title">Alocação por classe</p>
          <div id="alloc-bars"></div>
        </div>
      </div>
      <div id="tab-positions" style="display:none;">
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="positions-wrap">
            <table class="positions-table">
              <thead>
                <tr>
                  <th>Ticker</th><th>Nome</th><th>Classe</th>
                  <th style="text-align:right">Qtd</th>
                  <th style="text-align:right">Valor</th>
                  <th style="text-align:right">%</th>
                </tr>
              </thead>
              <tbody id="positions-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="tab-report" style="display:none;">
        <div class="card">
          <div class="ai-report" id="ai-report-content"></div>
        </div>
      </div>
    </div>

    <!-- SCREEN: Rebalance -->
    <div class="screen" id="screen-rebalance">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:2rem;flex-wrap:wrap;">
        <button class="btn btn-secondary" id="btn-back-analysis" style="font-size:0.8rem;padding:0.45rem 0.9rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;">
            <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
          </svg>
          Voltar
        </button>
        <h2 class="screen-title" style="margin-bottom:0;">Simulação de balanceamento</h2>
      </div>

      <div class="callout callout-info">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
        <span>Defina a alocação ideal para cada classe. A IA calculará os ajustes necessários e gerará um plano de ação personalizado.</span>
      </div>

      <div class="card">
        <p class="card-title">Alocação alvo por classe (%)</p>
        <div id="target-rows"></div>
        <div class="total-row">
          <span>Total alocado</span>
          <span class="total-val" id="target-total">0%</span>
        </div>
      </div>

      <div class="card">
        <p class="card-title">Parâmetros do ajuste</p>
        <div class="form-grid">
          <div class="field full">
            <label for="rebal-obs">O que você quer ajustar? (opcional)</label>
            <textarea id="rebal-obs" placeholder="Ex: quero reduzir VALE3, aumentar FIIs de papel, considerar ETFs internacionais..."></textarea>
          </div>
          <div class="field">
            <label for="rebal-aporte">Novo aporte disponível (R$)</label>
            <input type="number" id="rebal-aporte" placeholder="0,00" min="0" step="100" />
          </div>
          <div class="field">
            <label for="rebal-strategy">Estratégia de ajuste</label>
            <select id="rebal-strategy">
              <option value="aportes">Só com novos aportes (sem vender)</option>
              <option value="misto" selected>Misto (aportes + realocação parcial)</option>
              <option value="completo">Realocação completa</option>
            </select>
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="btn-rebalance">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 3h6l3 9 4-6 3 4h2M3 12h4M3 17h8"/>
        </svg>
        Gerar plano de balanceamento
      </button>

      <div id="rebal-result" style="display:none;margin-top:1.5rem;">
        <div class="card">
          <p class="card-title">Comparativo atual vs. alvo</p>
          <div id="compare-bars"></div>
        </div>
        <div class="card">
          <p class="card-title">Plano de ação</p>
          <div class="rebal-list" id="rebal-actions"></div>
        </div>
        <div class="card">
          <p class="card-title">Análise e orientações da IA</p>
          <div class="ai-report" id="rebal-report"></div>
        </div>
      </div>
    </div>

  </main>

  <footer>
    Os dados são processados localmente no seu navegador. Esta ferramenta não constitui assessoria de investimentos. Consulte um profissional certificado.
  </footer>
</div>
`

// ── File upload ────────────────────────────────────────────────────────────────
const dropzone = document.getElementById('dropzone')
const fileInput = document.getElementById('fileInput')

dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag') })
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'))
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('drag')
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0])
})
fileInput.addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]) })

function loadFile(file) {
  state.fileName = file.name
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const data = parsePortfolio(e.target.result)
      state.portfolio = data
      document.getElementById('profile-filename').textContent = file.name
      document.getElementById('profile-summary').textContent =
        `${data.positions.length} ativos · R$ ${fmtBRL(data.total)}`
      goTo('profile')
    } catch (err) {
      alert('Não foi possível ler o arquivo.\n\n' + err.message)
    }
  }
  reader.readAsArrayBuffer(file)
}

// ── Profile & Analysis ─────────────────────────────────────────────────────────
document.getElementById('btn-change-file').addEventListener('click', () => goTo('upload'))
document.getElementById('btn-new-analysis').addEventListener('click', () => goTo('upload'))
document.getElementById('btn-back-analysis').addEventListener('click', () => goTo('analysis'))

document.getElementById('btn-analyze').addEventListener('click', async () => {
  state.profile = {
    risk: document.getElementById('risk').value,
    horizon: document.getElementById('horizon').value,
    objective: document.getElementById('objective').value,
    monthly: document.getElementById('monthly').value,
    obs: document.getElementById('obs').value,
  }
  goTo('loading')
  animateLoadingSteps()
  try {
    const report = await analyzePortfolio(state.portfolio, state.profile)
    state.aiReport = report
    renderAnalysis()
    goTo('analysis')
  } catch (err) {
    alert('Erro ao gerar análise: ' + err.message)
    goTo('profile')
  }
})

// ── Tabs ───────────────────────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('.section-tab')
  if (btn) showTab(btn.dataset.tab)
})

// ── Render Analysis ────────────────────────────────────────────────────────────
function renderAnalysis() {
  const { positions, total, byCategory } = state.portfolio

  // Metrics
  const biggest = [...positions].sort((a, b) => b.value - a.value)[0]
  document.getElementById('metrics-grid').innerHTML = `
    <div class="metric-card">
      <p class="metric-label">Patrimônio total</p>
      <p class="metric-value mono">R$ ${fmtBRL(total)}</p>
    </div>
    <div class="metric-card">
      <p class="metric-label">Ativos</p>
      <p class="metric-value">${positions.length}</p>
    </div>
    <div class="metric-card">
      <p class="metric-label">Classes</p>
      <p class="metric-value">${Object.keys(byCategory).length}</p>
    </div>
    <div class="metric-card">
      <p class="metric-label">Maior posição</p>
      <p class="metric-value" style="font-size:1.1rem;">
        ${biggest.ticker}
        <span style="font-size:0.82rem;color:var(--text-tertiary);font-family:var(--font-mono);">
          ${fmtPct((biggest.value / total) * 100)}
        </span>
      </p>
    </div>
  `

  // Alloc bars
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  document.getElementById('alloc-bars').innerHTML = sorted.map(([cat, val]) => {
    const pct = (val / total * 100).toFixed(1)
    const color = CAT_COLORS[cat] || '#888'
    return `<div class="alloc-bar-row">
      <span class="alloc-bar-label">${cat}</span>
      <div class="alloc-bar-track">
        <div class="alloc-bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
      <span class="alloc-bar-pct">${pct}%</span>
      <span class="alloc-bar-val">R$ ${fmtBRL(val)}</span>
    </div>`
  }).join('')

  // Positions table
  const rows = [...positions].sort((a, b) => b.value - a.value).map(p => {
    const pct = (p.value / total * 100)
    const color = CAT_COLORS[p.category] || '#888'
    return `<tr>
      <td><span class="ticker-badge">${p.ticker}</span></td>
      <td style="color:var(--text-secondary);font-size:0.82rem;">${p.name}</td>
      <td><span class="cat-badge" style="background:${color}18;color:${color};border:1px solid ${color}33;">${p.category}</span></td>
      <td style="text-align:right;font-family:var(--font-mono);font-size:0.8rem;">${p.qty}</td>
      <td style="text-align:right;font-family:var(--font-mono);font-size:0.8rem;">R$ ${fmtBRL(p.value)}</td>
      <td>
        <div class="pct-mini">
          <div class="pct-bar-bg">
            <div class="pct-bar-fg" style="width:${Math.min(pct * 2.5, 100)}%;background:${color};"></div>
          </div>
          <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-secondary);min-width:38px;text-align:right;">
            ${pct.toFixed(1)}%
          </span>
        </div>
      </td>
    </tr>`
  }).join('')
  document.getElementById('positions-tbody').innerHTML = rows

  // Report
  document.getElementById('ai-report-content').innerHTML = formatReport(state.aiReport)

  // Date
  document.getElementById('analysis-date').textContent =
    `Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`
}

// ── Rebalance ──────────────────────────────────────────────────────────────────
document.getElementById('btn-go-rebalance').addEventListener('click', () => {
  buildTargetRows()
  goTo('rebalance')
})

function buildTargetRows() {
  const { byCategory, total } = state.portfolio
  const html = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => {
      const curr = (val / total * 100).toFixed(1)
      const color = CAT_COLORS[cat] || '#888'
      return `<div class="target-edit-row">
        <div class="target-dot" style="background:${color};"></div>
        <span style="font-size:0.88rem;">${cat}</span>
        <span class="target-current">${curr}% atual</span>
        <input class="target-input" type="number" min="0" max="100" step="1"
          value="${Math.round(parseFloat(curr))}"
          data-cat="${cat}" />
      </div>`
    }).join('')

  document.getElementById('target-rows').innerHTML = html

  document.querySelectorAll('.target-input').forEach(inp => {
    inp.addEventListener('input', updateTargetTotal)
  })
  updateTargetTotal()
}

function updateTargetTotal() {
  let sum = 0
  document.querySelectorAll('.target-input').forEach(inp => {
    sum += parseFloat(inp.value) || 0
  })
  const el = document.getElementById('target-total')
  el.textContent = sum.toFixed(0) + '%'
  el.className = 'total-val ' + (Math.abs(sum - 100) < 1 ? 'ok' : 'over')
}

document.getElementById('btn-rebalance').addEventListener('click', async () => {
  const targets = {}
  document.querySelectorAll('.target-input').forEach(inp => {
    targets[inp.dataset.cat] = parseFloat(inp.value) || 0
  })

  const aporte = document.getElementById('rebal-aporte').value
  const strategy = document.getElementById('rebal-strategy').value
  const rebalObs = document.getElementById('rebal-obs').value

  renderCompareBars(targets)
  renderActionCards(targets, parseFloat(aporte) || 0)

  document.getElementById('rebal-result').style.display = 'block'
  document.getElementById('rebal-report').innerHTML =
    '<span style="color:var(--text-tertiary);font-size:0.85rem;">Gerando plano...</span>'
  document.getElementById('rebal-result').scrollIntoView({ behavior: 'smooth', block: 'start' })

  try {
    const report = await rebalancePortfolio(
      state.portfolio,
      state.profile,
      targets,
      { rebalObs, aporte, strategy }
    )
    document.getElementById('rebal-report').innerHTML = formatReport(report)
  } catch (err) {
    document.getElementById('rebal-report').innerHTML =
      `<span style="color:var(--red)">Erro de conexão: ${err.message}</span>`
  }
})

function renderCompareBars(targets) {
  const { byCategory, total } = state.portfolio
  const html = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => {
      const curr = (val / total * 100).toFixed(1)
      const tgt = targets[cat] || 0
      const color = CAT_COLORS[cat] || '#888'
      return `<div class="compare-row">
        <span style="font-family:var(--font-mono);font-size:0.78rem;">${cat}</span>
        <div>
          <div class="cbar-sublabel">atual</div>
          <div class="cbar-track">
            <div class="cbar-fill" style="width:${curr}%;background:${color}77;"></div>
          </div>
        </div>
        <div>
          <div class="cbar-sublabel">alvo</div>
          <div class="cbar-track">
            <div class="cbar-fill" style="width:${tgt}%;background:${color};"></div>
          </div>
        </div>
        <span style="font-family:var(--font-mono);font-size:0.75rem;text-align:right;">${tgt}%</span>
      </div>`
    }).join('')
  document.getElementById('compare-bars').innerHTML = html
}

function renderActionCards(targets, aporte) {
  const { byCategory, total } = state.portfolio
  const totalWithAporte = total + aporte
  const actions = []

  for (const [cat, currVal] of Object.entries(byCategory)) {
    const tgtPct = targets[cat] || 0
    const tgtVal = totalWithAporte * tgtPct / 100
    const diff = tgtVal - currVal
    const type = Math.abs(diff) < 50 ? 'hold' : diff > 0 ? 'buy' : 'sell'
    actions.push({ type, cat, diff })
  }

  const icons = { buy: '↑', sell: '↓', hold: '—' }
  const labels = { buy: 'Aumentar', sell: 'Reduzir', hold: 'Manter' }
  const descs = { buy: 'Aportar nesta classe', sell: 'Resgatar desta classe', hold: 'Classe já próxima do alvo' }

  document.getElementById('rebal-actions').innerHTML = actions
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .map(a => `
      <div class="rebal-action ${a.type}">
        <div class="rebal-icon">${icons[a.type]}</div>
        <div class="rebal-desc">
          <strong>${labels[a.type]} ${a.cat}</strong>
          <span>${a.type === 'hold' ? descs.hold : descs[a.type] + ' · R$ ' + fmtBRL(Math.abs(a.diff))}</span>
        </div>
        <div class="rebal-val">
          ${a.diff === 0 ? 'ok' : (a.diff > 0 ? '+' : '-') + 'R$ ' + fmtBRL(Math.abs(a.diff))}
        </div>
      </div>
    `).join('')
}
