// ═══════════════════════════════════════════════════════════
// CAIXINHA — Diagnostic Rules
// Cada módulo tem checks objetivos com peso definido.
// O script diagnose.js avalia cada check e soma os pesos.
// ═══════════════════════════════════════════════════════════

const rules = {
  'Bot WhatsApp / Conversacao': {
    checks: [
      { id: 'webhook_route',       weight: 10, desc: 'Rota /api/webhook existe',                     test: (ctx) => ctx.fileExists('src/app/api/webhook/route.ts') },
      { id: 'handler_expense',     weight: 10, desc: 'Handler de despesa existe',                    test: (ctx) => ctx.fileExists('src/handlers/expense.ts') },
      { id: 'handler_income',      weight: 10, desc: 'Handler de receita existe',                    test: (ctx) => ctx.fileExists('src/handlers/income.ts') },
      { id: 'handler_undo',        weight: 8,  desc: 'Handler de desfazer existe',                   test: (ctx) => ctx.fileExists('src/handlers/undo.ts') },
      { id: 'handler_correction',  weight: 8,  desc: 'Handler de correcao existe',                   test: (ctx) => ctx.fileExists('src/handlers/correction.ts') },
      { id: 'handler_query',       weight: 8,  desc: 'Handler de consulta existe',                   test: (ctx) => ctx.fileExists('src/handlers/query.ts') },
      { id: 'handler_category',    weight: 8,  desc: 'Handler de comando de categoria existe',       test: (ctx) => ctx.fileExists('src/handlers/category-command.ts') },
      { id: 'handler_pending',     weight: 5,  desc: 'Handler de acoes pendentes existe',            test: (ctx) => ctx.fileExists('src/handlers/pending.ts') },
      { id: 'router_index',        weight: 8,  desc: 'Router central (index) com prioridades',       test: (ctx) => ctx.fileContains('src/handlers/index.ts', 'routeMessage') },
      { id: 'parser_exists',       weight: 8,  desc: 'Parser de mensagem existe',                    test: (ctx) => ctx.fileExists('src/lib/parser.ts') },
      { id: 'payment_detection',   weight: 7,  desc: 'Parser detecta metodo de pagamento',           test: (ctx) => ctx.fileContains('src/lib/parser.ts', 'payment_method') },
      { id: 'twilio_integration',  weight: 5,  desc: 'Integracao Twilio funcional',                  test: (ctx) => ctx.fileExists('src/lib/twilio.ts') },
      { id: 'await_webhook',       weight: 5,  desc: 'Webhook usa await (nao fire-and-forget)',       test: (ctx) => ctx.fileContains('src/app/api/webhook/route.ts', 'await routeMessage') },
    ]
  },

  'Categorizacao Inteligente': {
    checks: [
      { id: 'categories_lib',      weight: 15, desc: 'Lib de categorias existe',                     test: (ctx) => ctx.fileExists('src/lib/categories.ts') },
      { id: 'keyword_matching',    weight: 15, desc: 'Keyword matching implementado',                test: (ctx) => ctx.fileContains('src/lib/categories.ts', 'keywords') },
      { id: 'default_categories',  weight: 10, desc: 'Categorias default no schema/seed',            test: (ctx) => ctx.fileContains('supabase/schema.sql', 'INSERT INTO categories') },
      { id: 'category_create_cmd', weight: 15, desc: 'Criacao de categoria via chat',                test: (ctx) => ctx.fileContains('src/handlers/category-command.ts', 'create') },
      { id: 'learned_items_field', weight: 5,  desc: 'Campo learned_items existe no schema',         test: (ctx) => ctx.fileContains('supabase/schema.sql', 'learned_items') },
      { id: 'learned_items_pop',   weight: 20, desc: 'learned_items sendo populado em handlers',     test: (ctx) => ctx.fileContains('src/handlers/correction.ts', 'learned_items') },
      { id: 'smart_suggestions',   weight: 10, desc: 'Sugestao inteligente ao registrar',            test: (ctx) => ctx.fileContains('src/handlers/expense.ts', 'suggest') },
      { id: 'category_rename',     weight: 5,  desc: 'Rename de categoria via chat',                 test: (ctx) => ctx.fileContains('src/handlers/category-command.ts', 'rename') },
      { id: 'category_delete',     weight: 5,  desc: 'Delete de categoria via chat',                 test: (ctx) => ctx.fileContains('src/handlers/category-command.ts', 'delete') },
    ]
  },

  'Banco de Dados / Persistencia': {
    checks: [
      { id: 'supabase_client',     weight: 12, desc: 'Cliente Supabase configurado',                 test: (ctx) => ctx.fileExists('src/lib/supabase.ts') },
      { id: 'schema_exists',       weight: 10, desc: 'Schema SQL existe',                            test: (ctx) => ctx.fileExists('supabase/schema.sql') },
      { id: 'table_users',         weight: 8,  desc: 'Tabela users no schema',                       test: (ctx) => ctx.fileContains('supabase/schema.sql', 'CREATE TABLE users') },
      { id: 'table_categories',    weight: 8,  desc: 'Tabela categories no schema',                  test: (ctx) => ctx.fileContains('supabase/schema.sql', 'CREATE TABLE categories') },
      { id: 'table_transactions',  weight: 8,  desc: 'Tabela transactions no schema',                test: (ctx) => ctx.fileContains('supabase/schema.sql', 'CREATE TABLE transactions') },
      { id: 'table_log',           weight: 6,  desc: 'Tabela transaction_log no schema',             test: (ctx) => ctx.fileContains('supabase/schema.sql', 'CREATE TABLE transaction_log') },
      { id: 'table_pending',       weight: 6,  desc: 'Tabela pending_actions no schema',             test: (ctx) => ctx.fileContains('supabase/schema.sql', 'CREATE TABLE pending_actions') },
      { id: 'table_config',        weight: 6,  desc: 'Tabela config no schema',                      test: (ctx) => ctx.fileContains('supabase/schema.sql', 'CREATE TABLE config') },
      { id: 'rls_enabled',         weight: 10, desc: 'RLS habilitado nas tabelas',                   test: (ctx) => ctx.fileContains('supabase/schema.sql', 'ENABLE ROW LEVEL SECURITY') },
      { id: 'service_role',        weight: 8,  desc: 'Service role key no backend',                  test: (ctx) => ctx.fileContains('src/lib/supabase.ts', 'SUPABASE_SERVICE_KEY') },
      { id: 'migrations_dir',      weight: 8,  desc: 'Migrations versionadas existem',               test: (ctx) => ctx.dirExists('supabase/migrations') },
      { id: 'backup_strategy',     weight: 5,  desc: 'Script ou doc de backup',                      test: (ctx) => ctx.fileExists('scripts/backup.js') || ctx.fileExists('scripts/backup.sh') },
      { id: 'seed_data',           weight: 5,  desc: 'Seed data no schema',                          test: (ctx) => ctx.fileContains('supabase/schema.sql', 'INSERT INTO') },
    ]
  },

  'Dashboard Web': {
    checks: [
      { id: 'page_exists',         weight: 8,  desc: 'Pagina principal existe',                      test: (ctx) => ctx.fileExists('src/app/page.tsx') },
      { id: 'api_summary',         weight: 7,  desc: 'API /api/summary existe',                      test: (ctx) => ctx.fileExists('src/app/api/summary/route.ts') },
      { id: 'api_transactions',    weight: 7,  desc: 'API /api/transactions existe',                 test: (ctx) => ctx.fileExists('src/app/api/transactions/route.ts') },
      { id: 'api_evolution',       weight: 7,  desc: 'API /api/evolution existe',                    test: (ctx) => ctx.fileExists('src/app/api/evolution/route.ts') },
      { id: 'kpi_cards',           weight: 8,  desc: 'KPI cards renderizam',                         test: (ctx) => ctx.fileContains('src/app/page.tsx', 'SummaryCard') },
      { id: 'chart_donut',         weight: 7,  desc: 'Grafico donut de categorias',                  test: (ctx) => ctx.fileContains('src/app/page.tsx', 'PieChart') },
      { id: 'chart_evolution',     weight: 7,  desc: 'Grafico de evolucao',                          test: (ctx) => ctx.fileContains('src/app/page.tsx', 'AreaChart') },
      { id: 'transaction_list',    weight: 6,  desc: 'Lista de transacoes',                          test: (ctx) => ctx.fileContains('src/app/page.tsx', 'sortedFilteredTransactions') },
      { id: 'month_selector',      weight: 5,  desc: 'Seletor de mes funcional',                     test: (ctx) => ctx.fileContains('src/app/page.tsx', 'MonthSelector') },
      { id: 'category_filter',     weight: 5,  desc: 'Filtro por categoria (click donut)',           test: (ctx) => ctx.fileContains('src/app/page.tsx', 'selectedCategory') },
      { id: 'payment_methods',     weight: 5,  desc: 'Breakdown de metodos de pagamento',            test: (ctx) => ctx.fileContains('src/app/page.tsx', 'paymentMethodBreakdown') },
      { id: 'manual_add',          weight: 8,  desc: 'Adicionar transacao manualmente',              test: (ctx) => ctx.fileContains('src/app/page.tsx', 'addTransaction') || ctx.fileExists('src/app/api/transactions/add/route.ts') },
      { id: 'config_page',         weight: 5,  desc: 'Pagina de configuracao',                       test: (ctx) => ctx.fileExists('src/app/config/page.tsx') || ctx.fileExists('src/app/settings/page.tsx') },
      { id: 'drill_down',          weight: 5,  desc: 'Drill-down em categorias',                     test: (ctx) => ctx.fileExists('src/app/category/[id]/page.tsx') },
      { id: 'dark_premium',        weight: 5,  desc: 'Redesign dark premium aplicado',               test: (ctx) => ctx.fileContains('src/app/globals.css', '#0a0a0f') },
      { id: 'csv_export',          weight: 5,  desc: 'Export CSV implementado',                      test: (ctx) => ctx.fileContains('src/app/page.tsx', 'csv') || ctx.fileContains('src/app/page.tsx', 'export') },
    ]
  },

  'Acesso Mobile (PWA)': {
    checks: [
      { id: 'manifest_exists',     weight: 15, desc: 'manifest.json existe no /public',              test: (ctx) => ctx.fileExists('public/manifest.json') },
      { id: 'manifest_icons',      weight: 10, desc: 'Icones 192x192 e 512x512 declarados',         test: (ctx) => ctx.fileContains('public/manifest.json', '192x192') && ctx.fileContains('public/manifest.json', '512x512') },
      { id: 'icon_files_exist',    weight: 10, desc: 'Arquivos de icone existem',                    test: (ctx) => ctx.fileExists('public/icons/icon-192.png') && ctx.fileExists('public/icons/icon-512.png') },
      { id: 'sw_exists',           weight: 20, desc: 'Service worker existe e registrado',           test: (ctx) => ctx.fileExists('public/sw.js') },
      { id: 'sw_registered',       weight: 5,  desc: 'SW registrado no layout/page',                 test: (ctx) => ctx.fileContains('src/app/layout.tsx', 'serviceWorker') || ctx.fileContains('src/app/layout.tsx', 'sw.js') },
      { id: 'apple_capable',       weight: 10, desc: 'Meta apple-mobile-web-app-capable',            test: (ctx) => ctx.fileContains('src/app/layout.tsx', 'appleWebApp') },
      { id: 'apple_icon',          weight: 5,  desc: 'apple-touch-icon definido',                    test: (ctx) => ctx.fileContains('src/app/layout.tsx', 'apple-touch-icon') || ctx.fileContains('public/manifest.json', 'apple') },
      { id: 'theme_color',         weight: 5,  desc: 'Theme color definido',                         test: (ctx) => ctx.fileContains('public/manifest.json', 'theme_color') },
      { id: 'responsive_layout',   weight: 10, desc: 'Layout responsivo (media queries ou tailwind)', test: (ctx) => ctx.fileContains('src/app/page.tsx', 'sm:') || ctx.fileContains('src/app/page.tsx', 'lg:') },
      { id: 'offline_fallback',    weight: 10, desc: 'Fallback offline no SW',                       test: (ctx) => ctx.fileContains('public/sw.js', 'caches.match') },
    ]
  },

  'Relatorios e Insights': {
    checks: [
      { id: 'query_resumo',        weight: 12, desc: 'Bot responde "resumo"',                        test: (ctx) => ctx.fileContains('src/handlers/query.ts', 'summary') || ctx.fileContains('src/handlers/query.ts', 'resumo') },
      { id: 'query_saldo',         weight: 10, desc: 'Bot responde "saldo"',                         test: (ctx) => ctx.fileContains('src/handlers/query.ts', 'balance') || ctx.fileContains('src/handlers/query.ts', 'saldo') },
      { id: 'query_week',          weight: 8,  desc: 'Bot responde "semana"',                        test: (ctx) => ctx.fileContains('src/handlers/query.ts', 'week') },
      { id: 'query_today',         weight: 8,  desc: 'Bot responde "hoje"',                          test: (ctx) => ctx.fileContains('src/handlers/query.ts', 'today') },
      { id: 'query_category',      weight: 7,  desc: 'Bot responde "quanto gastei em X"',            test: (ctx) => ctx.fileContains('src/handlers/query.ts', 'category') },
      { id: 'context_analysis',    weight: 5,  desc: 'Motor de contexto (ContextAnalysis)',           test: (ctx) => ctx.fileContains('src/types/index.ts', 'ContextAnalysis') },
      { id: 'weekly_auto',         weight: 15, desc: 'Relatorio semanal automatico',                 test: (ctx) => ctx.fileExists('src/handlers/report-weekly.ts') || ctx.fileExists('src/app/api/cron/weekly/route.ts') },
      { id: 'monthly_auto',        weight: 15, desc: 'Relatorio mensal automatico',                  test: (ctx) => ctx.fileExists('src/handlers/report-monthly.ts') || ctx.fileExists('src/app/api/cron/monthly/route.ts') },
      { id: 'anomaly_alerts',      weight: 10, desc: 'Alertas de anomalia',                          test: (ctx) => ctx.fileContains('src/handlers/query.ts', 'anomal') || ctx.fileExists('src/lib/anomaly.ts') },
      { id: 'narrative_motor',     weight: 10, desc: 'Motor narrativo completo',                     test: (ctx) => ctx.fileExists('src/lib/narrative.ts') || ctx.fileContains('src/handlers/query.ts', 'narrative') },
    ]
  },

  'Identidade Visual / Branding': {
    checks: [
      { id: 'app_name',            weight: 10, desc: 'Nome "Caixinha" definido no app',              test: (ctx) => ctx.fileContains('src/app/layout.tsx', 'Caixinha') },
      { id: 'logo_file',           weight: 15, desc: 'Logo existe no /public',                       test: (ctx) => ctx.fileExists('public/logo.png') || ctx.fileExists('public/logo.svg') || ctx.fileExists('public/icons/icon-512.png') },
      { id: 'palette_defined',     weight: 15, desc: 'Paleta de cores documentada/aplicada',         test: (ctx) => ctx.fileContains('tailwind.config.js', 'caixa') || ctx.fileContains('src/app/globals.css', '--caixa') },
      { id: 'dark_base',           weight: 10, desc: 'Base dark #0a0a0f aplicada',                   test: (ctx) => ctx.fileContains('src/app/globals.css', '0a0a0f') || ctx.fileContains('tailwind.config.js', '0a0a0f') },
      { id: 'green_accent',        weight: 10, desc: 'Accent verde #3fa672 aplicado',                test: (ctx) => ctx.fileContains('tailwind.config.js', '3fa672') || ctx.fileContains('src/app/globals.css', '3fa672') },
      { id: 'font_inter',          weight: 10, desc: 'Font Inter/Geist configurada',                 test: (ctx) => ctx.fileContains('src/app/layout.tsx', 'Inter') || ctx.fileContains('src/app/layout.tsx', 'Geist') },
      { id: 'tone_of_voice',       weight: 10, desc: 'Tom de voz documentado',                       test: (ctx) => ctx.fileExists('BRAND.md') || ctx.fileExists('docs/brand.md') },
      { id: 'wa_profile_custom',   weight: 10, desc: 'Perfil WhatsApp customizado (nome/foto)',      test: (ctx) => false },
      { id: 'no_emojis_ui',        weight: 10, desc: 'Dashboard sem emojis na UI',                   test: (ctx) => !ctx.fileContains('src/app/page.tsx', 'emoji') },
    ]
  },

  'Infraestrutura / Deploy': {
    checks: [
      { id: 'github_repo',         weight: 10, desc: 'Repositorio GitHub existe',                    test: (ctx) => ctx.dirExists('.git') },
      { id: 'vercel_config',       weight: 10, desc: 'Vercel configurado (vercel.json)',             test: (ctx) => ctx.fileExists('vercel.json') },
      { id: 'env_example',         weight: 8,  desc: 'Arquivo .env.local.example existe',            test: (ctx) => ctx.fileExists('.env.local.example') },
      { id: 'gitignore',           weight: 5,  desc: '.gitignore configurado',                       test: (ctx) => ctx.fileExists('.gitignore') },
      { id: 'ts_config',           weight: 5,  desc: 'TypeScript configurado',                       test: (ctx) => ctx.fileExists('tsconfig.json') },
      { id: 'tailwind_config',     weight: 5,  desc: 'Tailwind configurado',                         test: (ctx) => ctx.fileExists('tailwind.config.js') },
      { id: 'package_json',        weight: 5,  desc: 'package.json presente',                        test: (ctx) => ctx.fileExists('package.json') },
      { id: 'ci_tests',            weight: 12, desc: 'CI/CD com testes automatizados',               test: (ctx) => ctx.fileExists('.github/workflows/test.yml') || ctx.fileExists('.github/workflows/ci.yml') },
      { id: 'diagnostic_auto',     weight: 10, desc: 'Diagnostico automatizado (npm run diagnose)',  test: (ctx) => ctx.packageHasScript('diagnose') },
      { id: 'husky_hooks',         weight: 8,  desc: 'Git hooks (Husky) configurados',               test: (ctx) => ctx.dirExists('.husky') },
      { id: 'gh_action_diagnose',  weight: 7,  desc: 'GitHub Action de auto-diagnostico',            test: (ctx) => ctx.fileExists('.github/workflows/auto-diagnose.yml') },
      { id: 'error_tracking',      weight: 8,  desc: 'Error tracking (Sentry ou similar)',           test: (ctx) => ctx.fileContains('package.json', 'sentry') || ctx.fileContains('src/app/layout.tsx', 'sentry') },
      { id: 'readme_updated',      weight: 7,  desc: 'README documentado',                           test: (ctx) => ctx.fileExists('README.md') },
    ]
  },

  'Multi-usuario (preparacao)': {
    checks: [
      { id: 'schema_user_id',      weight: 15, desc: 'Schema tem user_id em todas tabelas',          test: (ctx) => ctx.fileContains('supabase/schema.sql', 'user_id UUID') },
      { id: 'handlers_user_param', weight: 15, desc: 'Handlers recebem userId como parametro',       test: (ctx) => ctx.fileContains('src/handlers/expense.ts', 'user_id') },
      { id: 'queries_filter_user', weight: 10, desc: 'Queries filtram por user_id',                  test: (ctx) => ctx.fileContains('src/app/api/summary/route.ts', 'user_id') || ctx.fileContains('src/app/api/summary/route.ts', 'user.id') },
      { id: 'user_registration',   weight: 15, desc: 'Fluxo de registro de novos usuarios',          test: (ctx) => ctx.fileExists('src/handlers/register.ts') || ctx.fileContains('src/handlers/index.ts', 'register') },
      { id: 'auth_system',         weight: 15, desc: 'Sistema de autenticacao',                      test: (ctx) => ctx.fileExists('src/lib/auth.ts') || ctx.fileContains('package.json', 'next-auth') },
      { id: 'dynamic_owner',       weight: 10, desc: 'Owner nao hardcoded (resolve por phone)',       test: (ctx) => ctx.fileContains('src/handlers/index.ts', 'getUserByPhone') || !ctx.fileContains('src/handlers/index.ts', 'OWNER_PHONE') },
      { id: 'rls_per_user',        weight: 10, desc: 'RLS policy filtra por user real',              test: (ctx) => ctx.fileContains('supabase/schema.sql', 'auth.uid()') },
      { id: 'multi_tenant_api',    weight: 10, desc: 'APIs suportam multi-tenant',                   test: (ctx) => ctx.fileContains('src/app/api/summary/route.ts', 'session') || ctx.fileContains('src/app/api/summary/route.ts', 'token') },
    ]
  },

  'Integracao WhatsApp Oficial': {
    checks: [
      { id: 'twilio_sandbox',      weight: 15, desc: 'Twilio Sandbox funcional',                     test: (ctx) => ctx.fileExists('src/lib/twilio.ts') },
      { id: 'webhook_active',      weight: 10, desc: 'Webhook respondendo',                          test: (ctx) => ctx.fileContains('src/app/api/webhook/route.ts', 'POST') },
      { id: 'br_number',           weight: 20, desc: 'Numero brasileiro (DDD 21)',                   test: (ctx) => ctx.envContains('TWILIO_NUMBER', '+5521') || ctx.envContains('META_PHONE', '+5521') },
      { id: 'meta_cloud_api',      weight: 20, desc: 'Meta Cloud API integrada',                     test: (ctx) => ctx.fileExists('src/lib/meta-whatsapp.ts') || ctx.fileContains('package.json', 'whatsapp-business') },
      { id: 'business_profile',    weight: 10, desc: 'Perfil business verificado',                   test: (ctx) => false },
      { id: 'custom_photo',        weight: 10, desc: 'Foto customizada no perfil',                   test: (ctx) => false },
      { id: 'custom_name',         weight: 10, desc: 'Nome customizado no contato',                  test: (ctx) => false },
      { id: 'template_messages',   weight: 5,  desc: 'Template messages configurados',               test: (ctx) => ctx.fileExists('src/lib/wa-templates.ts') },
    ]
  },
};

module.exports = rules;
