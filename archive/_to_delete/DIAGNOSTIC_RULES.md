# Caixinha — Regras de Calculo do Diagnostico

Cada modulo tem uma lista de checks objetivos. Cada check verifica a existencia de um arquivo, a presenca de um trecho de codigo, ou uma condicao mensuravel. Nada e subjetivo. O percentual do modulo e a soma dos pesos dos checks atendidos dividida pelo total de pesos possiveis.

Para ajustar os pesos ou adicionar checks, edite `scripts/diagnostic-rules.js`.

---

## Bot WhatsApp / Conversacao (13 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| webhook_route | 10% | Rota /api/webhook existe |
| handler_expense | 10% | Handler de despesa existe |
| handler_income | 10% | Handler de receita existe |
| handler_undo | 8% | Handler de desfazer existe |
| handler_correction | 8% | Handler de correcao existe |
| handler_query | 8% | Handler de consulta existe |
| handler_category | 8% | Handler de comando de categoria existe |
| handler_pending | 5% | Handler de acoes pendentes existe |
| router_index | 8% | Router central com routeMessage |
| parser_exists | 8% | Parser de mensagem existe |
| payment_detection | 7% | Parser detecta metodo de pagamento |
| twilio_integration | 5% | Integracao Twilio funcional |
| await_webhook | 5% | Webhook usa await (nao fire-and-forget) |

---

## Categorizacao Inteligente (9 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| categories_lib | 15% | Lib de categorias existe |
| keyword_matching | 15% | Keyword matching implementado |
| default_categories | 10% | Categorias default no schema/seed |
| category_create_cmd | 15% | Criacao de categoria via chat |
| learned_items_field | 5% | Campo learned_items existe no schema |
| learned_items_pop | 20% | learned_items sendo populado em handlers |
| smart_suggestions | 10% | Sugestao inteligente ao registrar |
| category_rename | 5% | Rename de categoria via chat |
| category_delete | 5% | Delete de categoria via chat |

---

## Banco de Dados / Persistencia (13 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| supabase_client | 12% | Cliente Supabase configurado |
| schema_exists | 10% | Schema SQL existe |
| table_users | 8% | Tabela users no schema |
| table_categories | 8% | Tabela categories no schema |
| table_transactions | 8% | Tabela transactions no schema |
| table_log | 6% | Tabela transaction_log no schema |
| table_pending | 6% | Tabela pending_actions no schema |
| table_config | 6% | Tabela config no schema |
| rls_enabled | 10% | RLS habilitado nas tabelas |
| service_role | 8% | Service role key no backend |
| migrations_dir | 8% | Migrations versionadas existem |
| backup_strategy | 5% | Script ou doc de backup |
| seed_data | 5% | Seed data no schema |

---

## Dashboard Web (16 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| page_exists | 8% | Pagina principal existe |
| api_summary | 7% | API /api/summary existe |
| api_transactions | 7% | API /api/transactions existe |
| api_evolution | 7% | API /api/evolution existe |
| kpi_cards | 8% | KPI cards renderizam |
| chart_donut | 7% | Grafico donut de categorias |
| chart_evolution | 7% | Grafico de evolucao |
| transaction_list | 6% | Lista de transacoes |
| month_selector | 5% | Seletor de mes funcional |
| category_filter | 5% | Filtro por categoria (click donut) |
| payment_methods | 5% | Breakdown de metodos de pagamento |
| manual_add | 8% | Adicionar transacao manualmente |
| config_page | 5% | Pagina de configuracao |
| drill_down | 5% | Drill-down em categorias |
| dark_premium | 5% | Redesign dark premium aplicado |
| csv_export | 5% | Export CSV implementado |

---

## Acesso Mobile / PWA (10 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| manifest_exists | 15% | manifest.json existe no /public |
| manifest_icons | 10% | Icones 192x192 e 512x512 declarados |
| icon_files_exist | 10% | Arquivos de icone existem fisicamente |
| sw_exists | 20% | Service worker existe |
| sw_registered | 5% | SW registrado no layout/page |
| apple_capable | 10% | Meta apple-mobile-web-app-capable |
| apple_icon | 5% | apple-touch-icon definido |
| theme_color | 5% | Theme color definido |
| responsive_layout | 10% | Layout responsivo (sm:/lg: no Tailwind) |
| offline_fallback | 10% | Fallback offline no SW |

---

## Relatorios e Insights (10 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| query_resumo | 12% | Bot responde "resumo" |
| query_saldo | 10% | Bot responde "saldo" |
| query_week | 8% | Bot responde "semana" |
| query_today | 8% | Bot responde "hoje" |
| query_category | 7% | Bot responde "quanto gastei em X" |
| context_analysis | 5% | Motor de contexto (ContextAnalysis) |
| weekly_auto | 15% | Relatorio semanal automatico |
| monthly_auto | 15% | Relatorio mensal automatico |
| anomaly_alerts | 10% | Alertas de anomalia |
| narrative_motor | 10% | Motor narrativo completo |

---

## Identidade Visual / Branding (9 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| app_name | 10% | Nome "Caixinha" definido no app |
| logo_file | 15% | Logo existe no /public |
| palette_defined | 15% | Paleta de cores aplicada (Tailwind custom) |
| dark_base | 10% | Base dark #0a0a0f aplicada |
| green_accent | 10% | Accent verde #3fa672 aplicado |
| font_inter | 10% | Font Inter/Geist configurada |
| tone_of_voice | 10% | Tom de voz documentado (BRAND.md) |
| wa_profile_custom | 10% | Perfil WhatsApp customizado |
| no_emojis_ui | 10% | Dashboard sem emojis na UI |

---

## Infraestrutura / Deploy (13 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| github_repo | 10% | Repositorio .git existe |
| vercel_config | 10% | vercel.json configurado |
| env_example | 8% | .env.local.example existe |
| gitignore | 5% | .gitignore configurado |
| ts_config | 5% | tsconfig.json presente |
| tailwind_config | 5% | tailwind.config.js presente |
| package_json | 5% | package.json presente |
| ci_tests | 12% | CI/CD com testes automatizados |
| diagnostic_auto | 10% | npm run diagnose configurado |
| husky_hooks | 8% | Git hooks (Husky) configurados |
| gh_action_diagnose | 7% | GitHub Action de auto-diagnostico |
| error_tracking | 8% | Error tracking (Sentry ou similar) |
| readme_updated | 7% | README documentado |

---

## Multi-usuario / Preparacao (8 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| schema_user_id | 15% | Schema tem user_id em todas tabelas |
| handlers_user_param | 15% | Handlers usam user_id |
| queries_filter_user | 10% | APIs filtram por user |
| user_registration | 15% | Fluxo de registro de novos usuarios |
| auth_system | 15% | Sistema de autenticacao |
| dynamic_owner | 10% | Owner nao hardcoded |
| rls_per_user | 10% | RLS policy filtra por user real |
| multi_tenant_api | 10% | APIs suportam multi-tenant |

---

## Integracao WhatsApp Oficial (8 checks)

| Check | Peso | O que verifica |
|-------|------|----------------|
| twilio_sandbox | 15% | Twilio Sandbox funcional |
| webhook_active | 10% | Webhook respondendo (POST handler) |
| br_number | 20% | Numero brasileiro (DDD 21) |
| meta_cloud_api | 20% | Meta Cloud API integrada |
| business_profile | 10% | Perfil business verificado |
| custom_photo | 10% | Foto customizada no perfil |
| custom_name | 10% | Nome customizado no contato |
| template_messages | 5% | Template messages configurados |

---

## Como funciona

1. `npm run diagnose` roda o script `scripts/diagnose.js`
2. O script importa as regras de `scripts/diagnostic-rules.js`
3. Cada check e avaliado: `fileExists`, `fileContains`, `dirExists`, `envContains`, `packageHasScript`
4. O percentual de cada modulo = soma dos pesos atendidos / soma total dos pesos
5. O progresso geral = media dos percentuais dos 10 modulos
6. Os resultados sao escritos em `DIAGNOSTICO_CAIXINHA.md`, `diagnostico.html`, e `diagnostic-history.json`

## Como ajustar

Edite `scripts/diagnostic-rules.js`. Cada check tem:
- `id`: identificador unico
- `weight`: peso de 0 a 100 (nao precisa somar 100, o calculo e proporcional)
- `desc`: descricao legivel
- `test`: funcao que recebe o contexto e retorna true/false

Adicione, remova ou altere pesos conforme o projeto evolui.
