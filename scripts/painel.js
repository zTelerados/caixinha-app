#!/usr/bin/env node
/**
 * Caixinha - Painel do Dono
 *
 * Gera painel.html em linguagem simples a partir de:
 *   docs/PAINEL_ESTADO.md   -> fase atual, feitos, pendencias, proximos passos
 *   docs/PAINEL_ROADMAP.md  -> comodos futuros
 *   DIAGNOSTICO_CAIXINHA.md -> percentual geral
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ESTADO_PATH = path.join(ROOT, 'docs', 'PAINEL_ESTADO.md');
const ROADMAP_PATH = path.join(ROOT, 'docs', 'PAINEL_ROADMAP.md');
const DIAG_PATH = path.join(ROOT, 'DIAGNOSTICO_CAIXINHA.md');
const OUT_PATH = path.join(ROOT, 'painel.html');

// ---- Parser simples de markdown de secoes ----

function readSections(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const txt = fs.readFileSync(filePath, 'utf8');
  const sections = {};
  const lines = txt.split(/\r?\n/);
  let current = null;
  let buf = [];
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (current) sections[current] = buf.join('\n').trim();
      current = h[1].trim();
      buf = [];
    } else if (current) {
      buf.push(line);
    }
  }
  if (current) sections[current] = buf.join('\n').trim();
  return sections;
}

function parseKeyValueBlock(txt) {
  const out = {};
  const lines = txt.split(/\r?\n/);
  let lastKey = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (m) {
      const [, k, v] = m;
      if (v === '|') {
        out[k] = '';
        lastKey = k;
      } else if (v === '' && line.endsWith(':')) {
        out[k] = '';
        lastKey = k;
      } else {
        out[k] = v.trim();
        lastKey = k;
      }
    } else if (lastKey && line.startsWith('  ')) {
      out[lastKey] = (out[lastKey] ? out[lastKey] + ' ' : '') + line.trim();
    }
  }
  return out;
}

function parseListBlock(txt) {
  const items = [];
  const lines = txt.split(/\r?\n/);
  let current = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    if (line.startsWith('- ')) {
      if (current) items.push(current);
      current = {};
      const rest = line.slice(2).trim();
      if (rest) {
        const m = rest.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
        if (m) {
          current[m[1]] = m[2].trim();
        } else {
          current.text = rest;
        }
      }
    } else if (current && line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/)) {
      const m = line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
      current[m[1]] = m[2].trim();
    } else if (current && line.startsWith('  ')) {
      // continuation of last field
      const keys = Object.keys(current);
      if (keys.length) {
        const last = keys[keys.length - 1];
        current[last] = current[last] + ' ' + line.trim();
      }
    }
  }
  if (current) items.push(current);
  return items;
}

// ---- Loaders ----

function loadEstado() {
  const s = readSections(ESTADO_PATH);
  return {
    fase: parseKeyValueBlock(s['Fase'] || ''),
    feitos: parseListBlock(s['Acabou de ser feito'] || ''),
    pendencias: parseListBlock(s['Esperando voce'] || ''),
    proximos: parseListBlock(s['Vem a seguir'] || ''),
    tempo: (s['Tempo estimado'] || '').trim(),
  };
}

function loadRoadmap() {
  const s = readSections(ROADMAP_PATH);
  return parseListBlock(s['Comodos'] || '');
}

function loadDiagnostico() {
  if (!fs.existsSync(DIAG_PATH)) return { pct: null, summary: null };
  const txt = fs.readFileSync(DIAG_PATH, 'utf8');
  const m = txt.match(/Media geral do projeto:\s*(\d+)%/);
  const pct = m ? parseInt(m[1], 10) : null;
  return { pct };
}

// ---- Helpers ----

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function humanFrase(pct) {
  if (pct == null) return 'Diagnostico ainda nao foi rodado.';
  if (pct >= 85) return 'Produto quase redondo. Faltam poucas pontas pra soltar pro mundo.';
  if (pct >= 70) return 'Caixinha ja funciona bem no dia a dia. Ainda tem comodo pra construir.';
  if (pct >= 50) return 'Meio do caminho. Base esta firme, faltam features importantes.';
  if (pct >= 30) return 'Ainda esta nos primeiros andares. Progresso visivel, mas tem muito pela frente.';
  return 'Inicio de tudo. Fundacao sendo feita.';
}

function statusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'pronto') return { bg: '#0f3b1e', border: '#22c55e', text: '#86efac', label: 'Pronto' };
  if (s === 'em andamento') return { bg: '#3b2a0f', border: '#f59e0b', text: '#fcd34d', label: 'Em andamento' };
  return { bg: '#1a1a1f', border: '#3f3f46', text: '#a1a1aa', label: 'Planejado' };
}

// ---- Glossario ----

const GLOSSARIO = [
  ['Encoding', 'Idioma que o computador usa pra ler um arquivo. Quando da ruim, e tipo abrir uma carta escrita em codigo que voce nao entende.'],
  ['Refator', 'Reorganizar o codigo por dentro sem mudar o que ele faz por fora. Tipo arrumar a gaveta sem comprar gaveta nova.'],
  ['Schema', 'Planta da casa do banco de dados. Mostra onde fica cada comodo (tabela) e o que tem em cada um.'],
  ['Migration', 'Reforma da planta da casa. Adiciona, tira ou muda comodos do banco de dados.'],
  ['RLS', 'Tranca que garante que cada morador da casa so ve o comodo dele, nao o dos outros.'],
  ['Webhook', 'Campainha que toca no Caixinha quando o WhatsApp recebe uma mensagem nova.'],
  ['Cron', 'Despertador que faz o Caixinha rodar uma tarefa em horario marcado todo dia.'],
  ['PWA', 'Truque que faz um site parecer um aplicativo no celular, sem baixar da loja.'],
  ['Deploy', 'Mandar a versao nova do Caixinha pro ar pra todo mundo poder usar.'],
  ['Commit', '"Salvar" do codigo. Cada commit e uma versao guardada que da pra voltar se precisar.'],
  ['Repo / Repositorio', 'Pasta grande que guarda o projeto inteiro e todo o historico de mudancas.'],
  ['Branch', 'Rascunho paralelo do projeto. Voce experimenta numa branch sem mexer na versao principal.'],
  ['Merge', 'Juntar o rascunho com a versao principal depois que tudo funcionou.'],
  ['Push', 'Mandar suas alteracoes locais pra copia online do projeto (GitHub).'],
  ['Pull', 'Baixar pra sua maquina as alteracoes novas que estao online.'],
  ['API', 'Porta de entrada por onde um sistema conversa com outro. Tipo uma recepcao.'],
  ['Endpoint', 'Uma porta especifica da recepcao. Cada endpoint atende um tipo de pedido.'],
  ['Build', 'Montar a versao final do projeto, pronta pra rodar em producao.'],
  ['Producao', 'Versao do projeto que os usuarios de verdade estao usando.'],
  ['Cache', 'Memoria curta que guarda resposta rapida pra nao precisar calcular de novo.'],
  ['Env / Variavel de ambiente', 'Configuracao secreta (chave, senha) que mora fora do codigo.'],
  ['Supabase', 'Servico onde mora o banco de dados do Caixinha.'],
  ['Vercel', 'Servico onde o Caixinha fica hospedado e roda na internet.'],
  ['Webhook Meta / Twilio', 'Conexao entre o WhatsApp e o Caixinha. Quando voce manda mensagem, a Meta avisa o Caixinha.'],
  ['Whisper', 'Servico da OpenAI que transcreve audio pra texto. E como um estagiario que ouve e digita.'],
  ['Parser', 'Pedaco de codigo que le sua mensagem e entende o que voce quis dizer (valor, descricao, forma de pagamento).'],
  ['Handler', 'Pedaco de codigo que cuida de um tipo de situacao especifica (registrar gasto, desfazer, consultar).'],
  ['Diagnostico', 'Lista automatica de checks que medem o quanto de cada modulo do projeto esta pronto.'],
  ['Husky', 'Cachorro de guarda que roda tarefas automaticamente antes de cada commit (tipo atualizar o diagnostico).'],
];

// ---- HTML render ----

function render(estado, roadmap, diag) {
  const fase = estado.fase || {};
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const feitosHtml = (estado.feitos || []).map(item => `
    <li class="card done">
      <div class="icon">&#9989;</div>
      <div class="content">
        <div class="humano">${escapeHtml(item.humano || item.text || '')}</div>
        ${item.tecnico ? `<div class="tecnico">em tecnico: ${escapeHtml(item.tecnico)}</div>` : ''}
      </div>
    </li>
  `).join('');

  const pendencias = estado.pendencias || [];
  const pendenciasHtml = pendencias.length === 0
    ? `<div class="empty-state">&#10024; Tudo em dia. Pode esperar o Cowork terminar a fase atual.</div>`
    : pendencias.map((p, i) => `
      <li class="card pending" data-idx="${i}">
        <div class="icon">&#9995;</div>
        <div class="content">
          <div class="pergunta">Pergunta ${i + 1}: ${escapeHtml(p.pergunta || p.text || '')}</div>
          ${p.analogia ? `<div class="analogia">${escapeHtml(p.analogia)}</div>` : ''}
          ${p.recomendacao ? `<div class="recomendacao"><strong>Recomendacao:</strong> ${escapeHtml(p.recomendacao)}</div>` : ''}
          <button class="btn-resolver" onclick="resolver(this)">Ja respondi essa</button>
        </div>
      </li>
    `).join('');

  const proximosHtml = (estado.proximos || []).map((p, i) => `
    <li>
      <span class="num">${i + 1}.</span>
      <span class="texto">${escapeHtml(p.text || p.humano || '')}</span>
    </li>
  `).join('');

  const roadmapHtml = roadmap.map(item => {
    const c = statusColor(item.status);
    return `
      <div class="comodo" style="background:${c.bg};border-left-color:${c.border};">
        <div class="comodo-header">
          <span class="emoji">${escapeHtml(item.emoji || '')}</span>
          <span class="nome">${escapeHtml(item.nome || '')}</span>
          <span class="status-badge" style="color:${c.text};border-color:${c.border};">${c.label}</span>
        </div>
        <div class="comodo-desc">${escapeHtml(item.descricao || '')}</div>
      </div>
    `;
  }).join('');

  const glossarioHtml = GLOSSARIO.map(([termo, def]) => `
    <details class="termo">
      <summary>${escapeHtml(termo)}</summary>
      <div class="definicao">${escapeHtml(def)}</div>
    </details>
  `).join('');

  const pct = diag.pct;
  const pctBar = pct != null ? `
    <div class="pct-container">
      <div class="pct-number">${pct}%</div>
      <div class="pct-bar"><div class="pct-fill" style="width:${pct}%;"></div></div>
    </div>
  ` : '<div class="pct-container"><div class="pct-number">--</div></div>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Caixinha - Painel do Dono</title>
  <style>
    :root {
      --bg: #0a0a0b;
      --bg-card: #141418;
      --bg-card-hover: #1a1a20;
      --border: #27272a;
      --text: #fafafa;
      --text-dim: #a1a1aa;
      --text-muted: #71717a;
      --accent: #8b5cf6;
      --accent-soft: rgba(139, 92, 246, 0.15);
      --green: #22c55e;
      --yellow: #f59e0b;
      --red: #ef4444;
      --blue: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-size: 18px;
      line-height: 1.6;
      padding: 32px 24px;
      max-width: 960px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 15px;
    }
    section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      margin-bottom: 16px;
      font-weight: 600;
    }
    .fase-card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 32px;
      border: 1px solid var(--border);
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }
    .fase-emoji {
      font-size: 56px;
      line-height: 1;
      flex-shrink: 0;
    }
    .fase-content { flex: 1; }
    .fase-titulo {
      font-size: 26px;
      font-weight: 600;
      margin-bottom: 12px;
      letter-spacing: -0.01em;
    }
    .fase-analogia {
      color: var(--text-dim);
      font-size: 17px;
      line-height: 1.7;
    }
    ul { list-style: none; }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 12px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      transition: background 0.15s;
    }
    .card.done .icon { color: var(--green); }
    .card.pending .icon { color: var(--yellow); }
    .card.pending {
      border-left: 4px solid var(--yellow);
    }
    .card .icon {
      font-size: 22px;
      line-height: 1.3;
      flex-shrink: 0;
    }
    .card .content { flex: 1; }
    .humano {
      font-size: 17px;
      color: var(--text);
    }
    .tecnico {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 6px;
      font-style: italic;
    }
    .pergunta {
      font-size: 17px;
      font-weight: 500;
      margin-bottom: 10px;
    }
    .analogia {
      color: var(--text-dim);
      font-size: 15px;
      margin-bottom: 10px;
      line-height: 1.7;
    }
    .recomendacao {
      background: var(--accent-soft);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 15px;
      margin-bottom: 14px;
      color: var(--text);
    }
    .btn-resolver {
      background: var(--accent);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-resolver:hover { opacity: 0.85; }
    .card.resolved {
      opacity: 0.5;
      border-left-color: var(--green);
    }
    .card.resolved .pergunta::before {
      content: "&#9989; ";
    }
    .empty-state {
      color: var(--text-dim);
      font-size: 17px;
      padding: 24px;
      background: var(--bg-card);
      border-radius: 12px;
      text-align: center;
    }
    .proximos-list {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 24px;
    }
    .proximos-list li {
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 14px;
    }
    .proximos-list li:last-child { border-bottom: none; }
    .proximos-list .num {
      color: var(--accent);
      font-weight: 600;
      flex-shrink: 0;
    }
    .tempo-estimado {
      margin-top: 14px;
      color: var(--text-muted);
      font-size: 14px;
    }
    .roadmap-grid {
      display: grid;
      gap: 12px;
    }
    .comodo {
      border-radius: 12px;
      padding: 18px 22px;
      border-left: 4px solid var(--border);
      border-top: 1px solid var(--border);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }
    .comodo-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }
    .comodo .emoji { font-size: 22px; }
    .comodo .nome {
      font-weight: 600;
      font-size: 17px;
      flex: 1;
    }
    .status-badge {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border: 1px solid;
      padding: 3px 10px;
      border-radius: 999px;
      font-weight: 600;
    }
    .comodo-desc {
      color: var(--text-dim);
      font-size: 15px;
      margin-left: 34px;
    }
    .saude-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
    }
    .pct-container {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 12px;
    }
    .pct-number {
      font-size: 40px;
      font-weight: 700;
      color: var(--accent);
      line-height: 1;
    }
    .pct-bar {
      flex: 1;
      height: 10px;
      background: var(--border);
      border-radius: 999px;
      overflow: hidden;
    }
    .pct-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--blue));
      transition: width 0.4s;
    }
    .saude-frase {
      color: var(--text-dim);
      font-size: 16px;
      margin-bottom: 14px;
    }
    .saude-link {
      color: var(--accent);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
    }
    .saude-link:hover { text-decoration: underline; }
    .glossario {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 24px;
    }
    .termo {
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }
    .termo:last-child { border-bottom: none; }
    .termo summary {
      cursor: pointer;
      font-weight: 600;
      font-size: 16px;
      color: var(--text);
      user-select: none;
    }
    .termo summary:hover { color: var(--accent); }
    .termo .definicao {
      color: var(--text-dim);
      font-size: 15px;
      margin-top: 8px;
      padding-left: 18px;
      line-height: 1.7;
    }
    footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 12px;
      padding: 32px 0;
      border-top: 1px solid var(--border);
      margin-top: 40px;
    }
    @media (max-width: 640px) {
      body { padding: 20px 16px; font-size: 16px; }
      h1 { font-size: 24px; }
      .fase-card { flex-direction: column; padding: 20px; }
      .fase-emoji { font-size: 40px; }
      .fase-titulo { font-size: 22px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>&#127969; Caixinha - Painel do Dono</h1>
    <div class="subtitle">Atualizado em ${dateStr}, ${timeStr}</div>
  </header>

  <section>
    <div class="section-title">Onde estamos agora</div>
    <div class="fase-card">
      <div class="fase-emoji">${escapeHtml(fase.emoji || '&#128270;')}</div>
      <div class="fase-content">
        <div class="fase-titulo">${escapeHtml(fase.titulo || 'Fase nao definida')}</div>
        <div class="fase-analogia">${escapeHtml(fase.analogia || 'Nenhuma analogia cadastrada ainda.')}</div>
      </div>
    </div>
  </section>

  <section>
    <div class="section-title">O que acabou de ser feito</div>
    <ul>${feitosHtml || '<li class="empty-state">Nada marcado ainda.</li>'}</ul>
  </section>

  <section>
    <div class="section-title">O que ta esperando voce</div>
    <ul>${pendenciasHtml}</ul>
  </section>

  <section>
    <div class="section-title">O que vem a seguir</div>
    <ol class="proximos-list">${proximosHtml}</ol>
    ${estado.tempo ? `<div class="tempo-estimado">&#9201; Tempo estimado: ${escapeHtml(estado.tempo)}</div>` : ''}
  </section>

  <section>
    <div class="section-title">Proximos comodos da casa</div>
    <div class="roadmap-grid">${roadmapHtml}</div>
  </section>

  <section>
    <div class="section-title">Saude geral do Caixinha</div>
    <div class="saude-card">
      ${pctBar}
      <div class="saude-frase">${humanFrase(pct)}</div>
      <a class="saude-link" href="./diagnostico.html">Ver detalhes tecnicos &rarr;</a>
    </div>
  </section>

  <section>
    <div class="section-title">O que cada palavra tecnica significa</div>
    <div class="glossario">
      ${glossarioHtml}
    </div>
  </section>

  <footer>
    Painel gerado automaticamente por <code>npm run painel</code>.
    Atualize <code>docs/PAINEL_ESTADO.md</code> e <code>docs/PAINEL_ROADMAP.md</code> e regenere.
  </footer>

  <script>
    function resolver(btn) {
      const card = btn.closest('.card');
      card.classList.add('resolved');
      btn.textContent = 'Respondido';
      btn.disabled = true;
    }
  </script>
</body>
</html>
`;
}

// ---- Main ----

function main() {
  const estado = loadEstado();
  const roadmap = loadRoadmap();
  const diag = loadDiagnostico();
  const html = render(estado, roadmap, diag);
  fs.writeFileSync(OUT_PATH, html, 'utf8');
  console.log('  Painel do dono atualizado: painel.html');
}

main();
