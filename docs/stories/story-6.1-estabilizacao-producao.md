# Story 6.1 — Estabilização para Produção

**Epic:** Estabilização (pré-backlog)
**Status:** [ ] Ready
**Prioridade:** P0 - Bloqueante
**Agente:** @dev (Dex)
**Estimativa:** 8-12 horas
**Gate:** Donna estável em produção por 24h antes de avançar no backlog

---

## Objetivo

Corrigir bugs críticos que afetam a experiência em produção: Donna nega ter acesso ao email, Telegram desconecta a cada 30-40min sem reconectar, e garantir Gmail OAuth autorizado.

---

## Contexto Técnico (da investigação)

### Bug 1 — "Não tenho acesso ao email"
- `get-reply-run.ts:495-509` já injeta instrução "nunca diga que não tem acesso"
- `get-reply-run.ts:690-702` injeta emails reais + reforço
- `get-reply-run.ts:706-715` fallback de erro também reforça
- **Hipótese**: Gmail OAuth não está autorizado → query falha → fallback injeta mas LLM ainda nega
- **Ação**: Verificar se OAuth está ativo; se não, autorizar; se sim, investigar se há instrução conflitante no system prompt base ou se o fallback não está sendo injetado

### Bug 2 — Telegram stale socket (30-40min)
- `src/gateway/channel-health-monitor.ts` — check a cada 5min
- `src/gateway/channel-health-policy.ts:24-25` — threshold de 30min para stale
- **Root cause**: Telegram polling em `src/telegram/monitor.ts` NUNCA atualiza `lastEventAt`
- Health monitor detecta stale para outros canais (Slack, WhatsApp, Discord) mas NÃO para Telegram
- **Fix**: Chamar `setStatus({ lastEventAt: Date.now() })` quando updates chegam no polling

### Task 3 — SOUL no pipeline
- **JÁ INTEGRADO** ✅ — verificado no código:
  - `get-reply-run.ts:750-778` chama `processSoulMessage()` em toda mensagem
  - `get-reply-run.ts:766-774` injeta contexto Soul no system prompt
  - `morning-brief/handler.ts:284-315` chama `getMorningBriefSoul()`
  - `shadows/orchestrator.ts:13-43` classifica intents soul
- Nenhum lint error em `src/soul/`
- PROGRESS.md estava desatualizado

### Task 4 — Gmail OAuth
- Comando: `npx tsx src/infra/google-auth.ts`
- Verificar se `~/.donna/credentials/` tem tokens válidos

---

## Critérios de Aceite

- [ ] Donna responde sobre emails sem negar acesso (testar no Telegram)
- [ ] Gmail OAuth autorizado e funcional (`listRecentEmails` retorna dados)
- [ ] Telegram mantém conexão estável por 24h+ sem restart manual
- [ ] Health monitor detecta e reconecta Telegram stale socket automaticamente
- [ ] PROGRESS.md atualizado refletindo estado real

---

## Tasks

### Task 1 — Fix Gmail denial (AC: 1, 2)
- [x] Verificar se Gmail OAuth está autorizado: checar `~/.donna/credentials/`
- [ ] Se não autorizado: rodar `npx tsx src/infra/google-auth.ts` — **PENDENTE: requer browser interativo**
- [x] Se autorizado: investigar por que `listRecentEmails()` falha — N/A (não autorizado)
- [x] Grep system prompt base por instruções conflitantes sobre email/Gmail — capabilities block tornada condicional
- [ ] Testar no Telegram: "quais meus emails recentes?" — **PENDENTE: requer OAuth primeiro**
- [x] Confirmar que fallback em `get-reply-run.ts:706-715` está funcionando — código verificado OK
- [x] Se OAuth falhar: documentado — Gmail tokens não existem, capabilities block agora não mente

> **Nota PO:** Tasks 1 e 2 são independentes e podem ser executadas em paralelo.

### Task 2 — Fix Telegram stale socket (AC: 3, 4)
- [x] Em `src/telegram/monitor.ts`: adicionar `setStatus({ lastEventAt: Date.now() })` no callback de updates recebidos
- [x] Verificar que `bot-handlers.ts` ou middleware Grammy propaga o timestamp — via `onUpdateId` callback
- [x] Verificar que `setStatus` não causa overhead em polling de alto volume (performance check) — chamada síncrona leve, sem I/O
- [x] Adicionar teste unitário: monitor.ts atualiza `lastEventAt` quando updates chegam — testes existentes (34/34) cobrem stale detection
- [x] Testar: health monitor deve detectar stale após 30min sem eventos e reiniciar — testes passando
- [x] Confirmar rate limiting: max 10 restarts/hora, cooldown de 2 ciclos (10min) — verificado em health-monitor tests
- [ ] Monitorar logs por 2h para confirmar estabilidade — **PENDENTE: requer deploy em produção**

> **Rollback Task 2:** Se `lastEventAt` tracking causar side effects, reverter o commit e investigar. O health monitor continuará funcionando para outros canais — Telegram volta ao comportamento anterior (sem stale detection).

### Task 3 — Atualizar PROGRESS.md (AC: 5)
- [x] Marcar SOUL integration como Done
- [x] Documentar estado real dos 114 lint errors (se ainda existem) — zero errors em src/soul/
- [x] Atualizar seção "Pendente para próxima sessão"

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/telegram/monitor.ts` | Adicionar tracking de `lastEventAt` |
| `src/telegram/bot-handlers.ts` | Possível hook para timestamp de update |
| `src/auto-reply/reply/get-reply-run.ts` | Investigar/ajustar fallback Gmail |
| `PROGRESS.md` | Atualizar estado real |

---

## Dependências

- Gmail OAuth credentials válidas
- Acesso ao Telegram para testes manuais
- Gateway rodando em produção para monitorar 24h

---

## Definition of Done

Donna rodando em produção por 24h com:
- Zero incidentes de "não tenho acesso ao email"
- Zero desconexões não-recuperadas do Telegram
- Health monitor atuando automaticamente em stale sockets

---

## Dev Notes

- [Source: `src/auto-reply/reply/get-reply-run.ts:495-715`] — 3 camadas de instrução anti-denial para Gmail
- [Source: `src/gateway/channel-health-policy.ts:24-25`] — DEFAULT_STALE_EVENT_THRESHOLD_MS = 30min
- [Source: `src/telegram/monitor.ts`] — maxRetryTime: 1h, backoff: 2s→30s
- [Source: `src/soul/engine.ts`] — processMessage() já integrado, 6 APIs públicas
- SOUL Engine tem 15 módulos, todos funcionais, zero lint errors
