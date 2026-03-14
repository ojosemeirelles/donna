# Progress — 2026-03-14 (sessão estabilização)

## Feito nesta sessão

### Story 6.1 — Estabilização para Produção

#### Fix 1: Gmail denial bug
- Capabilities block em `get-reply-run.ts:495-509` agora é condicional
- Só declara "Gmail OAuth autorizado" se `~/.donna/google-tokens.json` existir
- Import de `loadTokens` adicionado ao get-reply-run.ts
- **Gmail OAuth ainda não autorizado** — precisa rodar `npx tsx src/infra/google-auth.ts` (interativo, abre browser)

#### Fix 2: Telegram stale socket (30-40min disconnect)
- Root cause: `monitorTelegramProvider` nunca atualizava `lastEventAt`
- Adicionado `setStatus` ao tipo `MonitorTelegramOpts` em `src/telegram/monitor.ts`
- Tracking via `onUpdateId` callback — cada update recebido atualiza `lastEventAt` e `lastInboundAt`
- Plugin Telegram (`extensions/telegram/src/channel.ts`) agora passa `ctx.setStatus` ao monitor
- Health monitor (threshold 30min) agora detecta e reinicia Telegram stale sockets
- Todos os testes passando: monitor (14/14), bot (46/46), health-monitor (34/34)

### Sessão anterior (2026-03-10)

#### 14 Hooks Nativos (Tier 1+2+3)
- google-calendar, stripe-monitor, browser-agent, notion-sync, google-drive
- whatsapp-send, social-poster, analytics-report, google-ads-monitor
- airtable-crm, slack-bridge, github-monitor, shopify-dashboard, home-assistant

#### SOUL Engine (15 módulos) — INTEGRADO ✅
- Todos os módulos implementados e integrados no pipeline
- `get-reply-run.ts` chama `processSoulMessage()` em toda mensagem
- `morning-brief/handler.ts` chama `getMorningBriefSoul()`
- `shadows/orchestrator.ts` classifica intents soul
- Zero lint errors em `src/soul/`

## Pendente
- Autorizar Gmail OAuth: `npx tsx src/infra/google-auth.ts` (requer browser)
- Monitorar Telegram por 24h para confirmar estabilidade
- Fix lint errors em arquivos Ralph (session-manager, tracker)
- Gmail watcher graceful quando account não configurado

## Erros conhecidos
- Lint errors pre-existentes em .aiox-core/ (não bloqueiam)
- Typecheck errors pre-existentes em ui/ e evolution-report/
- Electron tela preta: donna-app custom element não registra
- Gmail OAuth não autorizado (tokens não existem em ~/.donna/google-tokens.json)

## Arquivos modificados nesta sessão
- src/auto-reply/reply/get-reply-run.ts — capabilities block condicional para Gmail
- src/telegram/monitor.ts — setStatus + lastEventAt tracking
- extensions/telegram/src/channel.ts — pass-through de setStatus ao monitor
- PROGRESS.md — atualizado
- docs/stories/story-6.1-estabilizacao-producao.md — story criada
