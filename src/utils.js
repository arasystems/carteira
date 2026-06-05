export function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function fmtPct(v, decimals = 1) {
  return Number(v).toFixed(decimals) + '%'
}

export function formatReport(text) {
  if (!text) return ''
  return text
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<)/, '<p>')
}

export function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  const target = document.getElementById('screen-' + screenId)
  if (target) target.classList.add('active')
  updateDots(screenId)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateDots(screen) {
  const order = ['upload', 'profile', 'loading', 'analysis', 'rebalance']
  const idx = order.indexOf(screen)
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById('dot-' + i)
    if (!dot) continue
    dot.className = 'step-dot'
    if (i - 1 < idx) dot.classList.add('done')
    else if (i - 1 === idx) dot.classList.add('active')
  }
}

export function showTab(name) {
  const tabs = ['overview', 'positions', 'report']
  tabs.forEach(t => {
    const el = document.getElementById('tab-' + t)
    if (el) el.style.display = t === name ? 'block' : 'none'
  })
  document.querySelectorAll('.section-tab').forEach((btn, i) => {
    btn.classList.toggle('active', tabs[i] === name)
  })
}

export function animateLoadingSteps(durations = [400, 1200, 2800, 5500]) {
  const ids = ['lstep-1', 'lstep-2', 'lstep-3', 'lstep-4']
  ids.forEach((id, i) => {
    setTimeout(() => {
      ids.forEach((sid, j) => {
        const el = document.getElementById(sid)
        if (!el) return
        if (j < i) {
          el.className = 'loading-step done'
          el.querySelector('.step-icon').innerHTML = checkSVG()
        } else if (j === i) {
          el.className = 'loading-step active'
        } else {
          el.className = 'loading-step'
        }
      })
    }, durations[i])
  })
}

function checkSVG() {
  return `<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M4 6.5l2 2 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}
