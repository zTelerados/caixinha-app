// ═══════════════════════════════════════════════════════════
// CAIXINHA — Diagnostic Rules (RECALIBRATED)
// Checks focus on FUNCTIONALITY not just file presence.
// Compound checks penalize broken reference chains.
// Real feature completeness drives scoring.
// ═══════════════════════════════════════════════════════════

const rules = {
  'Bot WhatsApp / Conversacao': {
    checks: [
      { id: 'webhook_route',       weight: 8,  desc: 'Rota /api/webhook existe com logica POST',     test: (ctx) => ctx.fileExists('src/app/api/webhook/route.ts') && ctx.fileContains('src/app/api/webhook/route.ts', 'POST') },
      { id: 'handler_expense',     weight: 10, desc: 'Handler despesa: processa valor + categoria',   test: (ctx) => ctx.fileExists('src/handlers/expense.ts') && ctx.fileContains('src/handlers/expense.ts', 'amount') && ctx.fileContains('src/handlers/expense.ts', 'category') },
      { id: 'handler_income',      weight: 10, desc: 'Handler receita: processa valor + categoria',   test: (ctx) => ctx.fileExists('src/handlers/income.ts') && ctx.fileContains('src/handlers/income.ts', 'amount') && ctx.fileContains('src/handlers/income.ts', 'category') },
      { id: 'handler_undo',        weight: 8,  desc: 'Handler desfazer: reversa transacao no DB',    test: (ctx) => ctx.fileExists('src/handlers/undo.ts') && ctx.fileContains('src/handlers/undo.ts', 'delete') },
      { id: 'handler_correction',  weight: 8,  desc: 'Handler correcao com learned_items save',      test: (ctx) => ctx.fileExists('src/handlers/correction.ts') && ctx.fileContains('src/handlers/correction.ts', 'learned_items') },
      { id: 'handler_query',       weight: 8,  desc: 'Handler query responde 6 tipos (summary etc)', test: (ctx) => ctx.fileExists('src/handlers/query.ts') && ctx.fileContains('src/handlers/query.ts', 'summary') && ctx.fileContains('src/handlers/query.ts', 'balance') },
      { id: 'handler_category',    weight: 7,  desc: 'Handler categoria: create/rename/delete ops',   test: (ctx) => ctx.fileExists('src/handlers/category-command.ts') && ctx.fileContains('src/handlers/category-command.ts', 'create') },
      { id: 'handler_pending',     weight: 5,  desc: 'Handler acoes pendentes existe',               test: (ctx) => ctx.fileExists('src/handlers/pending.ts') },
      { id: 'router_index',        weight: 9,  desc: 'Router prioriza: query>undo>correction>expense', test: (ctx) => ctx.fileContains('src/handlers/index.ts', 'routeMessage') && ctx.fileContains('src/handlers/index.ts', 'detectQuery') },
      { id: 'parser_complete',     weight: 9,  desc: 'Parser: detectUndo, detectCorrection, parseExp', test: (ctx) => ctx.fileExists('src/lib/parser.ts') && ctx.fileContains('src/lib/parser.ts', 'detectUndo') && ctx.fileContains('src/lib/parser.ts', 'parseExpense') },
      { id: 'parser_no_learned',   weight: -5, desc: 'PENALTY: parser nao usa learned_items recall',  test: (ctx) => !ctx.fileContains('src/lib/parser.ts', 'learned_items') },
      { id: 'payment_detection',   weight: 6,  desc: 'Parser detecta payment_method (dinheiro etc)',  test: (ctx) => ctx.fileContains('src/lib/parser.ts', 'payment') },
      { id: 'twilio_integration',  weight: 5,  desc: 'Twilio lib existe com sendMessage',            test: (ctx) => ctx.fileExists('src/lib/twilio.ts') && ctx.fileContains('src/lib/twilio.ts', 'send') },
      { id: 'webhook_async',       weight: 6,  desc: 'Webhook executa await (nao fire-and-forget)',  test: (ctx) => ctx.fileContains('src/app/api/webhook/route.ts', 'await') },
      { id: 'no_edge_case_handling', weight: -8, desc: 'PENALTY: nenhuma edge-case validation',      test: (ctx) => !ctx.fileContains('src/handlers/index.ts', 'validate') && !ctx.fileContains('src/handlers/index.ts', 'error') },
      { id: 'no_multiturn',        weight: -8, desc: 'PENALTY: sem suporte a multi-turn convo',      test: (ctx) => !ctx.fileContains('src/lib/parser.ts', 'context') && !ctx.fileContains('src/types/index.ts', 'history') },
      { id: 'no_presend_validation', weight: -5, desc: 'PENALTY: sem validacao pre-envio (ambiguidade)', test: (ctx) => !ctx.fileContains('src/handlers/index.ts', 'confirm') },
    ]
  },

  'Categorizacao Inteligente': {
    checks: [
      { id: 'categories_lib',      weight: 10, desc: 'Lib categorias com matchCategory + keywords',   test: (ctx) => ctx.fileExists('src/lib/categories.ts') && ctx.fileContains('src/lib/categories.ts', 'matchCategory') },
      { id: 'keywords_working',    weight: 12, desc: 'Keyword matching retorna categoria correta',    test: (ctx) => ctx.fileContains('src/lib/categories.ts', 'keywords') && ctx.fileContains('src/lib/categories.ts', 'includes') },
      { id: 'learned_items_save',  weight: 12, desc: 'learnItem() chamado em expense + correction',   test: (ctx) => ctx.fileContains('src/handlers/expense.ts', 'learnItem') && ctx.fileContains('src/handlers/correction.ts', 'learnItem') },
      { id: 'learned_items_recall', weight: -10, desc: 'PENALTY: learnItem saved mas parser nao usa', test: (ctx) => ctx.fileContains('src/handlers/correction.ts', 'learned_items') && !ctx.fileContains('src/lib/parser.ts', 'learned_items') },
      { id: 'default_categories',  weight: 8,  desc: 'Seed categories no schema.sql',                 test: (ctx) => ctx.fileContains('supabase/schema.sql', 'INSERT INTO categories') },
      { id: 'category_create_cmd', weight: 10, desc: 'Criar categoria via /create category',          test: (ctx) => ctx.fileContains('src/handlers/category-command.ts', 'create') && ctx.fileContains('src/handlers/category-command.ts', 'INSERT') },
      { id: 'category_rename',     weight: 5,  desc: 'Rename categoria via /rename',                  test: (ctx) => ctx.fileContains('src/handlers/category-command.ts', 'rename') },
      { id: 'category_delete',     weight: 5,  desc: 'Delete categoria via /delete',                  test: (ctx) => ctx.fileContains('src/handlers/category-command.ts', 'delete') },
      { id: 'suggestCategory_fn',  weight: 5,  desc: 'suggestCategory() propoe ao usuario',          test: (ctx) => ctx.fileContains('src/lib/categories.ts', 'suggestCategory') },
      { id: 'no_fuzzy_matching',   weight: -8, desc: 'PENALTY: sem fuzzy/typo tolerance',            test: (ctx) => !ctx.fileContains('src/lib/categories.ts', 'fuzzy') && !ctx.fileContains('src/lib/categories.ts', 'Levenshtein') },
    ]
  },

  'Banco de Dados / Persistencia': {
    checks: [
      { id: 'supabase_client',     weight: 10, desc: 'Cliente Supabase com ANON + SERVICE keys',     test: (ctx) => ctx.fileExists('src/lib/supabase.ts') && ctx.fileContains('src/lib/supabase.ts', 'SUPABASE_KEY') },
      { id: 'schema_complete',     weight: 8,  desc: 'Schema SQL com users, categories, transactions', test: (ctx) => ctx.fileExists('supabase/schema.sql') && ctx.fileContains('supabase/schema.sql', 'CREATE TABLE users') && ctx.fileContains('supabase/schema.sql', 'CREATE TABLE transactions') },
      { id: 'table_transaction_log', weight: 6, desc: 'Tabela transaction_log para auditoria',        test: (ctx) => ctx.fileContains('supabase/schema.sql', 'CREATE TABLE transaction_log') },
      { id: 'table_pending_actions', weight: 5, desc: 'Tabela pending_actions',                       test: (ctx) => ctx.fileContains('supabase/schema.sql', 'CREATE TABLE pending_actions') },
      { id: 'rls_enabled',         weight: 9,  desc: 'RLS habilitado (ENABLE ROW LEVEL SECURITY)',   test: (ctx) => ctx.fileContains('supabase/schema.sql', 'ENABLE ROW LEVEL SECURITY') },
      { id: 'rls_policies',        weight: 7,  desc: 'Policies RLS criadas para protecao',           test: (ctx) => ctx.fileContains('supabase/schema.sql', 'CREATE POLICY') },
      { id: 'service_role_backend', weight: 8, desc: 'Service role key no backend (SUPABASE_SERVICE_KEY)', test: (ctx) => ctx.fileContains('src/lib/supabase.ts', 'SUPABASE_SERVICE') },
      { id: 'no_migrations_dir',   weight: -8, desc: 'PENALTY: sem migrations versionadas',          test: (ctx) => !ctx.dirExists('supabase/migrations') },
      { id: 'no_backup_script',    weight: -5, desc: 'PENALTY: sem backup strategy',                 test: (ctx) => !ctx.fileExists('scripts/backup.js') && !ctx.fileExists('scripts/backup.sh') && !ctx.fileExists('BACKUP_STRATEGY.md') },
      { id: 'seed_data',           weight: 4,  desc: 'Seed data (INSERT INTO) no schema',            test: (ctx) => ctx.fileContains('supabase/schema.sql', 'INSERT INTO') },
    ]
  },

  'Dashboard Web': {
    checks: [
      { id: 'page_exists',         weight: 7,  desc: 'Page existe com imports e logica',             test: (ctx) => ctx.fileExists('src/app/page.tsx') && ctx.fileContains('src/app/page.tsx', 'use') },
      { id: 'api_summary_functional', weight: 7, desc: 'API /api/summary retorna JSON com saldos',   test: (ctx) => ctx.fileExists('src/app/api/summary/route.ts') && ctx.fileContains('src/app/api/summary/route.ts', 'GET') },
      { id: 'api_transactions',    weight: 7,  desc: 'API /api/transactions lista transacoes',       test: (ctx) => ctx.fileExists('src/app/api/transactions/route.ts') && ctx.fileContains('src/app/api/transactions/route.ts', 'GET') },
      { id: 'api_evolution',       weight: 7,  desc: 'API /api/evolution dados para grafico mensal',  test: (ctx) => ctx.fileExists('src/app/api/evolution/route.ts') },
      { id: 'kpi_cards_rendering', weight: 7,  desc: 'KPI cards renderizam com dados reais',         test: (ctx) => ctx.fileContains('src/app/page.tsx', 'SummaryCard') && ctx.fileContains('src/app/page.tsx', 'useState') },
      { id: 'chart_donut',         weight: 6,  desc: 'Grafico donut de categorias (PieChart)',       test: (ctx) => ctx.fileContains('src/app/page.tsx', 'PieChart') },
      { id: 'chart_evolution',     weight: 6,  desc: 'Grafico evolucao mensal (AreaChart)',          test: (ctx) => ctx.fileContains('src/app/page.tsx', 'AreaChart') },
      { id: 'transaction_list',    weight: 6,  desc: 'Lista transacoes filtravel',                   test: (ctx) => ctx.fileContains('src/app/page.tsx', 'transactions') || ctx.fileContains('src/app/page.tsx', 'sortedFiltered') },
      { id: 'month_selector',      weight: 4,  desc: 'Seletor mes (state management)',               test: (ctx) => ctx.fileContains('src/app/page.tsx', 'month') || ctx.fileContains('src/app/page.tsx', 'Month') },
      { id: 'category_filter',     weight: 5,  desc: 'Click donut filtra por categoria',             test: (ctx) => ctx.fileContains('src/app/page.tsx', 'selectedCategory') || ctx.fileContains('src/app/page.tsx', 'onClick') },
      { id: 'payment_breakdown',   weight: 3,  desc: 'Breakdown metodos pagamento (opcional)',       test: (ctx) => ctx.fileContains('src/app/page.tsx', 'paymentMethod') },
      { id: 'no_manual_add',       weight: -10, desc: 'PENALTY: sem adicionar transacao manual',      test: (ctx) => !ctx.fileContains('src/app/page.tsx', 'addTransaction') && !ctx.fileExists('src/app/api/transactions/add/route.ts') },
      { id: 'no_config_page',      weight: -5, desc: 'PENALTY: sem settings/config page',            test: (ctx) => !ctx.fileExists('src/app/config/page.tsx') && !ctx.fileExists('src/app/settings/page.tsx') },
      { id: 'no_drill_down',       weight: -5, desc: 'PENALTY: sem drill-down em categorias',        test: (ctx) => !ctx.fileContains('src/app/page.tsx', 'DrillDown') && !ctx.fileExists('src/app/category/[id]/page.tsx') },
      { id: 'no_dark_premium_exact', weight: -8, desc: 'PENALTY: dark premium #0a0a0f nao aplicado', test: (ctx) => !ctx.fileContains('src/app/globals.css', '0a0a0f') },
      { id: 'csv_export',          weight: 4,  desc: 'Export CSV implementado',                      test: (ctx) => ctx.fileContains('src/app/page.tsx', 'csv') || ctx.fileContains('src/app/page.tsx', 'export') || ctx.fileExists('src/app/api/config/export/route.ts') },
      { id: 'filter_bar',          weight: 5,  desc: 'Filtros combinados na lista de transacoes',    test: (ctx) => ctx.fileContains('src/app/page.tsx', 'FilterBar') || ctx.fileContains('src/app/page.tsx', 'filters') },
      { id: 'inline_edit',         weight: 5,  desc: 'Edicao inline de transacoes (edit+delete)',    test: (ctx) => ctx.fileContains('src/app/page.tsx', 'EditTransaction') || ctx.fileContains('src/app/page.tsx', 'updateTransaction') },
      { id: 'sync_indicator',      weight: 3,  desc: 'Indicador de sync no header',                 test: (ctx) => ctx.fileContains('src/app/page.tsx', 'SyncIndicator') || ctx.fileContains('src/app/page.tsx', 'syncStatus') },
      { id: 'refresh_button',      weight: 3,  desc: 'Botao de refresh manual',                     test: (ctx) => ctx.fileContains('src/app/page.tsx', 'RefreshCw') || ctx.fileContains('src/app/page.tsx', 'onRefresh') },
      { id: 'api_add_transaction',  weight: 5, desc: 'API POST /api/transactions/add',              test: (ctx) => ctx.fileExists('src/app/api/transactions/add/route.ts') && ctx.fileContains('src/app/api/transactions/add/route.ts', 'POST') },
      { id: 'api_edit_delete',      weight: 5, desc: 'API PUT+DELETE /api/transactions/[id]',       test: (ctx) => ctx.fileExists('src/app/api/transactions/[id]/route.ts') && ctx.fileContains('src/app/api/transactions/[id]/route.ts', 'PUT') },
    ]
  },

  'Acesso Mobile (PWA)': {
    checks: [
      { id: 'manifest_exists',     weight: 5,  desc: 'manifest.json existe',                         test: (ctx) => ctx.fileExists('public/manifest.json') },
      { id: 'manifest_icons_declared', weight: 4, desc: 'Icons 192x512 declarados em manifest',      test: (ctx) => ctx.fileContains('public/manifest.json', '192x192') && ctx.fileContains('public/manifest.json', '512x512') },
      { id: 'icon_files_missing',  weight: -15, desc: 'PENALTY: icon files nao existem',            test: (ctx) => !ctx.fileExists('public/icons/icon-192.png') || !ctx.fileExists('public/icons/icon-512.png') },
      { id: 'sw_exists',           weight: 8,  desc: 'Service worker existe (public/sw.js)',        test: (ctx) => ctx.fileExists('public/sw.js') },
      { id: 'sw_not_registered',   weight: -12, desc: 'PENALTY CRITICAL: SW nao registrado em layout', test: (ctx) => !ctx.fileContains('src/app/layout.tsx', 'serviceWorker') && !ctx.fileContains('src/app/layout.tsx', 'sw.js') },
      { id: 'sw_offline_cache',    weight: 5,  desc: 'SW implementa offline caching',                test: (ctx) => ctx.fileContains('public/sw.js', 'cache') && ctx.fileContains('public/sw.js', 'install') },
      { id: 'sw_stale_revalidate', weight: 4,  desc: 'SW usa stale-while-revalidate',               test: (ctx) => ctx.fileContains('public/sw.js', 'STATIC_CACHE') || ctx.fileContains('public/sw.js', 'DYNAMIC_CACHE') },
      { id: 'sw_api_fallback',     weight: 4,  desc: 'SW tem fallback pra API offline',             test: (ctx) => ctx.fileContains('public/sw.js', 'DATA_CACHE') || ctx.fileContains('public/sw.js', '/api/') },
      { id: 'sw_push_ready',       weight: 3,  desc: 'SW tem handler push notifications',           test: (ctx) => ctx.fileContains('public/sw.js', 'push') },
      { id: 'apple_webclip',       weight: 4,  desc: 'Meta apple-mobile-web-app-capable',            test: (ctx) => ctx.fileContains('src/app/layout.tsx', 'appleWebApp') },
      { id: 'apple_icon_missing',  weight: -3, desc: 'PENALTY: apple-touch-icon nao existe',        test: (ctx) => !ctx.fileContains('src/app/layout.tsx', 'apple-touch-icon') },
      { id: 'theme_color',         weight: 3,  desc: 'Theme color definido em manifest',             test: (ctx) => ctx.fileContains('public/manifest.json', 'theme_color') },
      { id: 'responsive_layout',   weight: 5,  desc: 'Layout responsivo (Tailwind responsive)',      test: (ctx) => ctx.fileContains('src/app/page.tsx', 'sm:') || ctx.fileContains('src/app/page.tsx', 'lg:') },
    ]
  },

  'Relatorios e Insights': {
    checks: [
      { id: 'query_handlers_exist', weight: 8, desc: 'Query handlers: summary, saldo, week etc',     test: (ctx) => ctx.fileExists('src/handlers/query.ts') && ctx.fileContains('src/handlers/query.ts', 'summary') },
      { id: 'context_analysis_type', weight: 4, desc: 'ContextAnalysis type definido',               test: (ctx) => ctx.fileContains('src/types/index.ts', 'ContextAnalysis') },
      { id: 'query_count_6_types',  weight: 8, desc: 'Query responde 6 tipos (summary, balance...)', test: (ctx) => ctx.fileContains('src/handlers/query.ts', 'summary') && ctx.fileContains('src/handlers/query.ts', 'balance') && ctx.fileContains('src/handlers/query.ts', 'week') },
      { id: 'no_weekly_auto',      weight: -20, desc: 'PENALTY CRITICAL: sem relatorio semanal auto', test: (ctx) => !ctx.fileExists('src/handlers/report-weekly.ts') && !ctx.fileExists('src/app/api/cron/weekly/route.ts') },
      { id: 'no_monthly_auto',     weight: -20, desc: 'PENALTY CRITICAL: sem relatorio mensal auto',  test: (ctx) => !ctx.fileExists('src/handlers/report-monthly.ts') && !ctx.fileExists('src/app/api/cron/monthly/route.ts') },
      { id: 'no_anomaly_detection', weight: -10, desc: 'PENALTY: sem anomaly detection/alerts',      test: (ctx) => !ctx.fileContains('src/handlers/query.ts', 'anomal') && !ctx.fileExists('src/lib/anomaly.ts') },
      { id: 'no_narrative_engine',  weight: -10, desc: 'PENALTY: sem narrative motor',               test: (ctx) => !ctx.fileExists('src/lib/narrative.ts') && !ctx.fileContains('src/handlers/query.ts', 'narrative') },
      { id: 'no_cron_routes',      weight: -10, desc: 'PENALTY: sem /api/cron/weekly ou monthly',    test: (ctx) => !ctx.dirExists('src/app/api/cron') },
    ]
  },

  'Identidade Visual / Branding': {
    checks: [
      { id: 'app_name_in_layout',  weight: 6,  desc: 'Nome "Caixinha" em layout.tsx',                test: (ctx) => ctx.fileContains('src/app/layout.tsx', 'Caixinha') },
      { id: 'no_logo_file',        weight: -12, desc: 'PENALTY: logo nao existe',                     test: (ctx) => !ctx.fileExists('public/logo.png') && !ctx.fileExists('public/logo.svg') },
      { id: 'no_brand_doc',        weight: -10, desc: 'PENALTY: BRAND.md nao documentado',            test: (ctx) => !ctx.fileExists('BRAND.md') && !ctx.fileExists('docs/brand.md') },
      { id: 'palette_in_tailwind',  weight: 7,  desc: 'Paleta "caixa" em tailwind.config.js',        test: (ctx) => ctx.fileContains('tailwind.config.js', 'caixa') },
      { id: 'dark_base_wrong',     weight: -8, desc: 'PENALTY: #0a0a0f nao em globals.css',          test: (ctx) => !ctx.fileContains('src/app/globals.css', '0a0a0f') && !ctx.fileContains('tailwind.config.js', '0a0a0f') },
      { id: 'green_accent_wrong',  weight: -8, desc: 'PENALTY: #3fa672 nao em tailwind/globals',     test: (ctx) => !ctx.fileContains('tailwind.config.js', '3fa672') && !ctx.fileContains('src/app/globals.css', '3fa672') },
      { id: 'tailwind_uses_wrong_green', weight: -6, desc: 'PENALTY: tailwind usa #2D6A4F nao #3fa672', test: (ctx) => ctx.fileContains('tailwind.config.js', '2D6A4F') },
      { id: 'font_inter',          weight: 5,  desc: 'Font Inter configurada em layout',             test: (ctx) => ctx.fileContains('src/app/layout.tsx', 'Inter') },
      { id: 'no_wa_profile',       weight: -5, desc: 'PENALTY: perfil WhatsApp nao customizado',     test: (ctx) => false },
    ]
  },

  'Infraestrutura / Deploy': {
    checks: [
      { id: 'github_repo',         weight: 8,  desc: 'Repo GitHub (.git existe)',                    test: (ctx) => ctx.dirExists('.git') },
      { id: 'vercel_config',       weight: 7,  desc: 'Vercel configurado (vercel.json)',             test: (ctx) => ctx.fileExists('vercel.json') },
      { id: 'env_template',        weight: 6,  desc: '.env.local.example existe',                    test: (ctx) => ctx.fileExists('.env.local.example') },
      { id: 'ts_configured',       weight: 6,  desc: 'TypeScript tsconfig.json',                     test: (ctx) => ctx.fileExists('tsconfig.json') },
      { id: 'tailwind_configured', weight: 6,  desc: 'Tailwind configurado',                         test: (ctx) => ctx.fileExists('tailwind.config.js') },
      { id: 'husky_hooks',         weight: 6,  desc: 'Husky .husky/ com pre-commit',                 test: (ctx) => ctx.dirExists('.husky') && ctx.fileExists('.husky/pre-commit') },
      { id: 'diagnostic_script',   weight: 7,  desc: 'Script diagnose em package.json',              test: (ctx) => ctx.packageHasScript('diagnose') },
      { id: 'gh_action_auto_diagnose', weight: 6, desc: 'GitHub Action auto-diagnostico',            test: (ctx) => ctx.fileExists('.github/workflows/auto-diagnose.yml') },
      { id: 'no_ci_tests',         weight: -12, desc: 'PENALTY: sem CI tests (test.yml/ci.yml)',     test: (ctx) => !ctx.fileExists('.github/workflows/test.yml') && !ctx.fileExists('.github/workflows/ci.yml') },
      { id: 'backup_script',       weight: 5,  desc: 'Script de backup existe',                     test: (ctx) => ctx.fileExists('scripts/backup.js') && ctx.packageHasScript('backup') },
      { id: 'backup_strategy_doc', weight: 3,  desc: 'BACKUP_STRATEGY.md documentado',              test: (ctx) => ctx.fileExists('BACKUP_STRATEGY.md') },
      { id: 'migrations_dir',      weight: 3,  desc: 'Diretorio supabase/migrations existe',        test: (ctx) => ctx.dirExists('supabase/migrations') },
      { id: 'no_sentry',           weight: -8, desc: 'PENALTY: sem error tracking (Sentry)',         test: (ctx) => !ctx.fileContains('package.json', 'sentry') },
      { id: 'readme_exists',       weight: 5,  desc: 'README.md existe e documentado',               test: (ctx) => ctx.fileExists('README.md') },
    ]
  },

  'Multi-usuario (preparacao)': {
    checks: [
      { id: 'schema_user_id_field', weight: 5, desc: 'Schema tem user_id UUID field',                test: (ctx) => ctx.fileContains('supabase/schema.sql', 'user_id UUID') },
      { id: 'handlers_accept_user_id', weight: 5, desc: 'Handlers aceitam user_id param',           test: (ctx) => ctx.fileContains('src/handlers/expense.ts', 'user_id') },
      { id: 'queries_filter_user_id', weight: 5, desc: 'APIs filtram transacoes por user_id',       test: (ctx) => ctx.fileContains('src/app/api/summary/route.ts', 'user') || ctx.fileContains('src/app/api/transactions/route.ts', 'user') },
      { id: 'no_auth_system',      weight: -12, desc: 'PENALTY CRITICAL: sem auth system',           test: (ctx) => !ctx.fileExists('src/lib/auth.ts') && !ctx.fileContains('package.json', 'next-auth') },
      { id: 'no_user_registration', weight: -12, desc: 'PENALTY CRITICAL: sem registration handler',  test: (ctx) => !ctx.fileExists('src/handlers/register.ts') && !ctx.fileContains('src/handlers/index.ts', 'register') },
      { id: 'hardcoded_owner_phone', weight: -10, desc: 'PENALTY: OWNER_PHONE hardcoded (single-user)', test: (ctx) => ctx.fileContains('src/handlers/index.ts', 'OWNER_PHONE') },
      { id: 'no_dynamic_user_resolution', weight: -10, desc: 'PENALTY: sem getUserByPhone/query user', test: (ctx) => !ctx.fileContains('src/handlers/index.ts', 'getUserByPhone') },
      { id: 'rls_uses_auth_uid',   weight: 4,  desc: 'RLS policies usam auth.uid()',                 test: (ctx) => ctx.fileContains('supabase/schema.sql', 'auth.uid()') },
      { id: 'no_rls_real_user',    weight: -8, desc: 'PENALTY: RLS nao filtra por user real',        test: (ctx) => !ctx.fileContains('supabase/schema.sql', 'auth.uid()') },
    ]
  },

  'Integracao WhatsApp Oficial': {
    checks: [
      { id: 'twilio_lib_exists',   weight: 8,  desc: 'Twilio lib (src/lib/twilio.ts) existe',        test: (ctx) => ctx.fileExists('src/lib/twilio.ts') && ctx.fileContains('src/lib/twilio.ts', 'send') },
      { id: 'webhook_implemented', weight: 7,  desc: 'Webhook route POST implementada',              test: (ctx) => ctx.fileContains('src/app/api/webhook/route.ts', 'POST') },
      { id: 'no_br_number',        weight: -15, desc: 'PENALTY CRITICAL: sem numero BR (+5521)',      test: (ctx) => !ctx.envContains('TWILIO_NUMBER', '+5521') && !ctx.envContains('META_PHONE', '+5521') },
      { id: 'no_meta_api',         weight: -15, desc: 'PENALTY CRITICAL: sem Meta Cloud API',        test: (ctx) => !ctx.fileExists('src/lib/meta-whatsapp.ts') && !ctx.fileContains('package.json', 'whatsapp-business') },
      { id: 'no_business_profile', weight: -5, desc: 'PENALTY: perfil business nao verificado',      test: (ctx) => false },
      { id: 'template_messages',   weight: 3,  desc: 'Template messages arquivo existe',             test: (ctx) => ctx.fileExists('src/lib/wa-templates.ts') },
    ]
  },
};

module.exports = rules;
