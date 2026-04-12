#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// CAIXINHA — Diagnostic Generator
// npm run diagnose          → gera MD + HTML + historico
// npm run diagnose -- --dry-run  → so imprime, nao escreve
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const rules = require('./diagnostic-rules');
const { generateHTML } = require('./html-template');

const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Context object passed to each check ───────────────────
function buildContext() {
  const fileCache = {};
  const envCache = {};

  // Load .env.local if exists
  const envPath = path.join(ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) envCache[match[1].trim()] = match[2].trim();
    }
  }

  function readFile(relPath) {
    const abs = path.join(ROOT, relPath);
    if (fileCache[abs] === undefined) {
      try {
        fileCache[abs] = fs.readFileSync(abs, 'utf-8');
      } catch {
        fileCache[abs] = null;
      }
    }
    return fileCache[abs];
  }

  return {
    fileExists(relPath) {
      return fs.existsSync(path.join(ROOT, relPath));
    },
    dirExists(relPath) {
      const abs = path.join(ROOT, relPath);
      return fs.existsSync(abs) && fs.statSync(abs).isDirectory();
    },
    fileContains(relPath, term) {
      const content = readFile(relPath);
      if (!content) return false;
      return content.includes(term);
    },
    envContains(key, substr) {
      const val = envCache[key] || '';
      return val.includes(substr);
    },
    packageHasScript(name) {
      const pkg = readFile('package.json');
      if (!pkg) return false;
      try {
        const json = JSON.parse(pkg);
        return !!(json.scripts && json.scripts[name]);
      } catch { return false; }
    }
  };
}

// ─── Run all checks ────────────────────────────────────────
function evaluate() {
  const ctx = buildContext();
  const results = [];

  for (const [moduleName, moduleDef] of Object.entries(rules)) {
    const checks = moduleDef.checks.map(check => {
      let passed = false;
      try { passed = check.test(ctx); } catch { passed = false; }
      return { id: check.id, desc: check.desc, weight: check.weight, passed };
    });

    const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
    const earnedWeight = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
    const percent = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    results.push({ name: moduleName, percent, checks, earned: earnedWeight, total: totalWeight });
  }

  const overall = Math.round(results.reduce((s, m) => s + m.percent, 0) / results.length);
  return { modules: results, overall };
}

// ─── Load previous history ─────────────────────────────────
function loadHistory() {
  const histPath = path.join(ROOT, 'diagnostic-history.json');
  try {
    return JSON.parse(fs.readFileSync(histPath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveHistory(history) {
  const histPath = path.join(ROOT, 'diagnostic-history.json');
  fs.writeFileSync(histPath, JSON.stringify(history, null, 2) + '\n');
}

// ─── Get git commit hash ──────────────────────────────────
function getCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf-8' }).trim();
  } catch { return 'unknown'; }
}

// ─── Generate Markdown ─────────────────────────────────────
function generateMarkdown(data) {
  const { modules, overall } = data;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  function makeBar(pct) {
    const filled = Math.round(pct / 100 * 30);
    const empty = 30 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  function getStatus(pct) {
    if (pct >= 80) return '🟢 Funcional';
    if (pct >= 50) return '🟡 Parcial';
    if (pct >= 15) return '🟡 Em progresso';
    if (pct > 0) return '🔴 Inicial';
    return '🔴 Nao implementado';
  }

  const stack = ['Node.js', 'TypeScript', 'Supabase (PostgreSQL)', 'Next.js 14', 'Vercel', 'Tailwind CSS', 'Recharts', 'Twilio', 'WhatsApp Sandbox'];

  let md = `# Caixinha — Diagnostico do Projeto

**Stack:** ${stack.join(' · ')}
**Versao em producao:** v8.0
**Ultima atualizacao:** ${dateStr}
**Gerado automaticamente por** \`npm run diagnose\`

---

## Stack Tecnologica

${stack.map(s => '`' + s + '`').join(' ')}

---

## Progresso Geral por Modulo

\`\`\`
${modules.map(m => `${m.name.padEnd(38)} ${makeBar(m.percent)} ${String(m.percent).padStart(3)}%`).join('\n')}
\`\`\`

**Media geral do projeto: ${overall}%**

---

## Status Detalhado por Modulo

| Modulo | Status | Detalhes |
|--------|--------|----------|
${modules.map(m => {
  const failed = m.checks.filter(c => !c.passed).map(c => c.desc);
  const detail = failed.length > 0 ? `Falta: ${failed.join(', ')}.` : 'Todos os checks atendidos.';
  return `| **${m.name}** | ${getStatus(m.percent)} | ${detail} |`;
}).join('\n')}

---

## Proximo Passo Prioritario

${getNextStep(modules)}

## Bloqueios Atuais

${getBlockers(modules)}

---

## Historico de Versoes

${getVersionHistory()}
`;

  return md;
}

function getNextStep(modules) {
  // Find lowest non-zero module or most impactful
  const sorted = [...modules].sort((a, b) => a.percent - b.percent);
  const lowest = sorted.find(m => m.percent > 0 && m.percent < 80);
  if (lowest) {
    const failedChecks = lowest.checks.filter(c => !c.passed).slice(0, 3);
    return `**${lowest.name}** esta em ${lowest.percent}%. Proximos checks a atender: ${failedChecks.map(c => c.desc).join(', ')}.`;
  }
  return 'Todos os modulos acima de 80%. Foco em polish e novos modulos.';
}

function getBlockers(modules) {
  const blockers = [];
  const wa = modules.find(m => m.name.includes('WhatsApp Oficial'));
  if (wa && wa.percent < 50) blockers.push('- Numero WhatsApp DDD 21 requer conta Twilio paga ou Meta Cloud API');
  const pwa = modules.find(m => m.name.includes('PWA'));
  if (pwa && pwa.percent < 50) blockers.push('- Icones PWA (192x192 e 512x512) nao existem no /public/icons');
  const multi = modules.find(m => m.name.includes('Multi'));
  if (multi && multi.percent < 30) blockers.push('- Multi-usuario requer sistema de auth (next-auth ou similar)');
  return blockers.length > 0 ? blockers.join('\n') : 'Nenhum bloqueio critico no momento.';
}

function getVersionHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    return `- **v8.0** — migracao completa Supabase + Next.js + Vercel (12/abr)
- **v8.0-fixes** — correcoes de build, webhook, env vars (12/abr)
- **v6.2** — ultima versao estavel Apps Script + Sheets (pre-migracao)`;
  }
  // Show last 10 entries
  return history.slice(-10).reverse().map(h => {
    return `- **${h.commit || 'dev'}** — progresso geral ${h.overall}% (${h.date})`;
  }).join('\n');
}

// ─── Terminal output ───────────────────────────────────────
function printResults(data, prevHistory) {
  const { modules, overall } = data;
  const prev = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1] : null;

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         CAIXINHA — DIAGNOSTICO DO PROJETO        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  for (const m of modules) {
    const bar = '█'.repeat(Math.round(m.percent / 5)) + '░'.repeat(20 - Math.round(m.percent / 5));
    const pctStr = `${m.percent}%`.padStart(4);

    let delta = '';
    if (prev) {
      const prevMod = prev.modules ? prev.modules[m.name] : null;
      if (prevMod !== undefined && prevMod !== null) {
        const diff = m.percent - prevMod;
        if (diff > 0) delta = `  ↑ +${diff}%`;
        else if (diff < 0) delta = `  ↓ ${diff}%`;
      }
    }

    console.log(`  ${m.name.padEnd(36)} ${bar} ${pctStr}${delta}`);
  }

  const prevOverall = prev ? prev.overall : null;
  let overallDelta = '';
  if (prevOverall !== null) {
    const diff = overall - prevOverall;
    if (diff > 0) overallDelta = ` (era ${prevOverall}%, +${diff}%)`;
    else if (diff < 0) overallDelta = ` (era ${prevOverall}%, ${diff}%)`;
  }

  console.log(`\n  Progresso geral: ${overall}%${overallDelta}`);

  // Print notable changes
  if (prev && prev.modules) {
    console.log('');
    for (const m of modules) {
      const prevPct = prev.modules[m.name];
      if (prevPct === undefined) continue;
      const diff = m.percent - prevPct;
      if (diff >= 10) {
        const wasStatus = prevPct >= 80 ? 'Funcional' : prevPct >= 50 ? 'Parcial' : 'Inicial';
        const isStatus = m.percent >= 80 ? 'Funcional' : m.percent >= 50 ? 'Parcial' : 'Inicial';
        if (wasStatus !== isStatus) {
          console.log(`  ✨ ${m.name}: ${prevPct}% → ${m.percent}% — agora ${isStatus}`);
        }
      } else if (diff <= -5) {
        console.log(`  ⚠️  ${m.name}: ${prevPct}% → ${m.percent}% — regrediu`);
      }
    }
  }

  if (DRY_RUN) {
    console.log('\n  [dry-run] Nenhum arquivo foi alterado.\n');
  } else {
    console.log('\n  Arquivos atualizados: DIAGNOSTICO_CAIXINHA.md, diagnostico.html, diagnostic-history.json\n');
  }
}

// ─── Main ──────────────────────────────────────────────────
function main() {
  const data = evaluate();
  const prevHistory = loadHistory();

  printResults(data, prevHistory);

  if (DRY_RUN) return;

  // Generate and write markdown
  const md = generateMarkdown(data);
  fs.writeFileSync(path.join(ROOT, 'DIAGNOSTICO_CAIXINHA.md'), md);

  // Prepare data for HTML
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const stack = ['Node.js', 'TypeScript', 'Supabase (PostgreSQL)', 'Next.js 14', 'Vercel', 'Tailwind CSS', 'Recharts', 'Twilio', 'WhatsApp Sandbox'];

  const versionHistory = [
    { version: 'v8.0', desc: 'Migracao completa Supabase + Next.js + Vercel', date: '12/abr' },
    { version: 'v8.0-fixes', desc: 'Correcoes build, webhook, env vars', date: '12/abr' },
    { version: 'v6.2', desc: 'Ultima versao estavel Apps Script + Sheets', date: 'pre-migracao' },
  ];

  const html = generateHTML({
    modules: data.modules,
    overall: data.overall,
    stack,
    version: 'v8.0',
    date: dateStr,
    history: versionHistory,
    historicalData: prevHistory,
  });

  fs.writeFileSync(path.join(ROOT, 'diagnostico.html'), html);

  // Update history
  const historyEntry = {
    date: dateStr,
    timestamp: now.toISOString(),
    overall: data.overall,
    commit: getCommitHash(),
    modules: {},
  };
  for (const m of data.modules) {
    historyEntry.modules[m.name] = m.percent;
  }
  prevHistory.push(historyEntry);
  saveHistory(prevHistory);
}

main();
