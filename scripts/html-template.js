// ═══════════════════════════════════════════════════════════
// CAIXINHA — HTML Template Generator
// Gera o diagnostico.html a partir dos dados calculados.
// ═══════════════════════════════════════════════════════════

function getBarClass(pct) {
  if (pct >= 60) return 'bar-green';
  if (pct >= 30) return 'bar-yellow';
  return 'bar-red';
}

function getPctClass(pct) {
  if (pct >= 60) return 'pct-high';
  if (pct >= 30) return 'pct-mid';
  return 'pct-low';
}

function getStatusBadge(pct) {
  if (pct >= 80) return { label: 'Funcional', cls: 'status-green' };
  if (pct >= 50) return { label: 'Parcial', cls: 'status-yellow' };
  if (pct >= 15) return { label: 'Em progresso', cls: 'status-yellow' };
  if (pct > 0)   return { label: 'Inicial', cls: 'status-red' };
  return { label: 'Nao implementado', cls: 'status-red' };
}

function generateHTML(data) {
  const { modules, overall, stack, version, date, history, historicalData } = data;

  const moduleRows = modules.map(m => {
    const barCls = getBarClass(m.percent);
    const pctCls = getPctClass(m.percent);
    return `
    <div class="module-row">
      <span class="module-name">${m.name}</span>
      <div class="bar-container"><div class="bar-fill ${barCls}" style="width: ${m.percent}%"></div></div>
      <span class="module-pct ${pctCls}">${m.percent}%</span>
    </div>`;
  }).join('\n');

  const detailRows = modules.map(m => {
    const badge = getStatusBadge(m.percent);
    const passed = m.checks.filter(c => c.passed).map(c => c.desc).join('. ');
    const failed = m.checks.filter(c => !c.passed).map(c => c.desc);
    const failedText = failed.length > 0 ? `Falta: ${failed.join(', ')}.` : 'Todos os checks atendidos.';
    return `
        <tr>
          <td>${m.name}</td>
          <td><span class="status-badge ${badge.cls}">${badge.label}</span></td>
          <td>${failedText}</td>
        </tr>`;
  }).join('\n');

  const historyRows = (history || []).map(h => `
    <div class="history-item">
      <span class="history-version">${h.version}</span>
      <span class="history-desc">${h.desc}</span>
      <span class="history-date">${h.date}</span>
    </div>`).join('\n');

  const stackTags = (stack || []).map(s => `<span class="tag">${s}</span>`).join('\n    ');

  // Historical chart data
  const chartSection = generateChartSection(historicalData);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Caixinha — Diagnostico do Projeto</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a0f; color: #e0e0e0; min-height: 100vh; padding: 40px 20px; line-height: 1.6; }
  .container { max-width: 960px; margin: 0 auto; }
  .header { margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid rgba(63, 166, 114, 0.15); }
  .header h1 { font-size: 42px; font-weight: 800; color: #ffffff; letter-spacing: -1.5px; margin-bottom: 8px; }
  .header .subtitle { font-size: 14px; color: #737373; font-weight: 400; margin-bottom: 16px; }
  .header-meta { display: flex; gap: 24px; flex-wrap: wrap; }
  .header-meta span { font-size: 13px; color: #888; }
  .header-meta strong { color: #3fa672; font-weight: 600; }
  .section-title { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 20px; letter-spacing: -0.3px; }
  .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 48px; }
  .tag { background: rgba(63, 166, 114, 0.08); border: 1px solid rgba(63, 166, 114, 0.2); color: #3fa672; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; }
  .progress-section { margin-bottom: 48px; }
  .overall-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(63, 166, 114, 0.08); border: 1px solid rgba(63, 166, 114, 0.2); padding: 8px 16px; border-radius: 8px; margin-bottom: 28px; font-size: 14px; color: #3fa672; font-weight: 600; }
  .module-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; padding: 12px 16px; background: rgba(255, 255, 255, 0.02); border-radius: 10px; transition: background 0.2s; }
  .module-row:hover { background: rgba(255, 255, 255, 0.04); }
  .module-name { flex: 0 0 280px; font-size: 14px; font-weight: 500; color: #d0d0d0; }
  .bar-container { flex: 1; height: 8px; background: rgba(255, 255, 255, 0.06); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1); }
  .bar-fill::after { content: ''; position: absolute; top: 0; right: 0; width: 20px; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15)); border-radius: 0 4px 4px 0; }
  .bar-green { background: linear-gradient(90deg, #1a6b40, #3fa672); position: relative; }
  .bar-yellow { background: linear-gradient(90deg, #8a6d1b, #d4a529); position: relative; }
  .bar-red { background: linear-gradient(90deg, #8a1b1b, #d42929); position: relative; }
  .module-pct { flex: 0 0 48px; text-align: right; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .pct-high { color: #3fa672; }
  .pct-mid { color: #d4a529; }
  .pct-low { color: #d42929; }
  .detail-section { margin-bottom: 48px; }
  .detail-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
  .detail-table thead th { text-align: left; padding: 12px 16px; font-weight: 600; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
  .detail-table tbody tr { transition: background 0.15s; }
  .detail-table tbody tr:hover { background: rgba(255, 255, 255, 0.03); }
  .detail-table td { padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); vertical-align: top; }
  .detail-table td:first-child { font-weight: 600; color: #d0d0d0; white-space: nowrap; }
  .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; }
  .status-green { background: rgba(63,166,114,0.1); color: #3fa672; }
  .status-yellow { background: rgba(212,165,41,0.1); color: #d4a529; }
  .status-red { background: rgba(212,41,41,0.1); color: #d42929; }
  .next-step { background: rgba(63, 166, 114, 0.04); border: 1px solid rgba(63, 166, 114, 0.12); border-radius: 12px; padding: 24px; margin-bottom: 48px; }
  .next-step h3 { font-size: 15px; font-weight: 700; color: #3fa672; margin-bottom: 12px; }
  .next-step p { font-size: 14px; color: #b0b0b0; margin-bottom: 8px; }
  .history { margin-bottom: 32px; }
  .history-item { display: flex; gap: 16px; align-items: baseline; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; }
  .history-version { flex: 0 0 100px; font-weight: 700; color: #3fa672; }
  .history-desc { color: #999; flex: 1; }
  .history-date { flex: 0 0 80px; text-align: right; color: #555; }
  .chart-section { margin-bottom: 48px; }
  .chart-canvas { width: 100%; height: 200px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 20px; position: relative; }
  .chart-svg { width: 100%; height: 100%; }
  .chart-line { fill: none; stroke: #3fa672; stroke-width: 2; }
  .chart-area { fill: url(#chartGrad); }
  .chart-dot { fill: #3fa672; r: 4; }
  .chart-dot:hover { r: 6; }
  .chart-label { fill: #888; font-size: 11px; font-family: 'Inter', sans-serif; }
  .chart-grid { stroke: rgba(255,255,255,0.04); stroke-width: 1; }
  .footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.04); text-align: center; font-size: 12px; color: #444; }
  @media (max-width: 768px) {
    body { padding: 24px 16px; }
    .header h1 { font-size: 32px; }
    .module-name { flex: 0 0 160px; font-size: 12px; }
    .module-pct { flex: 0 0 40px; font-size: 12px; }
    .detail-table td:first-child { white-space: normal; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Caixinha</h1>
    <p class="subtitle">Node.js &middot; TypeScript &middot; Supabase &middot; Next.js 14 &middot; Vercel &middot; Twilio &middot; ${date}</p>
    <div class="header-meta">
      <span>Versao em producao: <strong>${version}</strong></span>
      <span>Progresso geral: <strong>${overall}%</strong></span>
      <span>Atualizado: <strong>${date}</strong></span>
    </div>
  </div>

  <h2 class="section-title">Stack Tecnologica</h2>
  <div class="tags">
    ${stackTags}
  </div>

  <h2 class="section-title">Progresso por Modulo</h2>
  <div class="progress-section">
    <div class="overall-badge">Progresso geral do projeto: ${overall}%</div>
    ${moduleRows}
  </div>

  <h2 class="section-title">Status Detalhado</h2>
  <div class="detail-section">
    <table class="detail-table">
      <thead><tr><th>Modulo</th><th>Status</th><th>Detalhes</th></tr></thead>
      <tbody>${detailRows}
      </tbody>
    </table>
  </div>

  ${chartSection}

  <h2 class="section-title">Historico de Versoes</h2>
  <div class="history">
    ${historyRows}
  </div>

  <div class="footer">Caixinha &middot; Diagnostico gerado em ${date}</div>
</div>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.bar-fill').forEach(bar => {
      const target = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = target; }));
    });
  });
</script>
</body>
</html>`;
}

function generateChartSection(historicalData) {
  if (!historicalData || historicalData.length < 2) {
    return `
  <div class="chart-section">
    <h2 class="section-title">Evolucao Historica</h2>
    <div class="chart-canvas" style="display:flex;align-items:center;justify-content:center;">
      <span style="color:#555;font-size:14px;">Dados historicos insuficientes. Aparece apos 2+ rodadas de diagnostico.</span>
    </div>
  </div>`;
  }

  const W = 860, H = 160, PAD = 40;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  const maxPct = 100;
  const n = historicalData.length;
  const xStep = n > 1 ? plotW / (n - 1) : plotW;

  const points = historicalData.map((d, i) => ({
    x: PAD + (i * xStep),
    y: PAD + plotH - (d.overall / maxPct * plotH),
    label: d.date.split(' ').slice(0, 2).join(' '),
    pct: d.overall,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length-1].x} ${PAD + plotH} L ${points[0].x} ${PAD + plotH} Z`;

  const dots = points.map(p => `<circle class="chart-dot" cx="${p.x}" cy="${p.y}"><title>${p.label}: ${p.pct}%</title></circle>`).join('\n      ');

  const labels = points.filter((_, i) => i === 0 || i === n - 1 || i % Math.ceil(n / 6) === 0)
    .map(p => `<text class="chart-label" x="${p.x}" y="${PAD + plotH + 18}" text-anchor="middle">${p.label}</text>`).join('\n      ');

  const gridLines = [0, 25, 50, 75, 100].map(v => {
    const y = PAD + plotH - (v / 100 * plotH);
    return `<line class="chart-grid" x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}"/>
      <text class="chart-label" x="${PAD - 8}" y="${y + 4}" text-anchor="end">${v}%</text>`;
  }).join('\n      ');

  return `
  <div class="chart-section">
    <h2 class="section-title">Evolucao Historica</h2>
    <div class="chart-canvas">
      <svg class="chart-svg" viewBox="0 0 ${W} ${H + 20}">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3fa672" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#3fa672" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${gridLines}
        <path class="chart-area" d="${areaPath}"/>
        <path class="chart-line" d="${linePath}"/>
        ${dots}
        ${labels}
      </svg>
    </div>
  </div>`;
}

module.exports = { generateHTML };
