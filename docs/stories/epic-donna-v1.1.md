# Epic: DONNA-v1.1 — Donna Funcional

**Status:** InProgress
**Prioridade:** P0
**Estimativa total:** 80-120 horas
**Objetivo:** Ativar tudo que o PRD promete mas nao funciona. Transformar Donna de "chatbot com gateway" em "secretaria que evolui".

---

## Contexto

A revisao de arquitetura revelou que 4 sistemas criticos existem no codigo com testes mas **nunca sao chamados em producao**:

1. **Model Router** (`src/infra/model-router.ts`) — classifica haiku/sonnet/opus, zero callers
2. **Auto-Compact** (`src/infra/auto-compact.ts`) — compacta sessao, zero callers
3. **Prompt Cache** (`src/infra/prompt-cache.ts`) — cache_control ephemeral, zero callers
4. **Memory Orchestrator** (`src/memory/memory-orchestrator.ts`) — 3 camadas, zero callers no gateway

Alem disso, o **Sistema de Niveis** (core differentiator do PRD) nao tem nenhum codigo.

---

## Stories (ordenadas por impacto)

### Fase 1 — Ativar codigo morto (maior ROI, menor risco)

| Story | Titulo | Esforco | Impacto |
|-------|--------|---------|---------|
| 5.1 | Plugar Token Intelligence no pipeline | 8-12h | Reducao de custo imediata |
| 5.2 | Integrar Memory Orchestrator no gateway | 8-12h | Donna lembra do usuario |
| 5.3 | Fix Wizard HTML do Desktop | 4-8h | Onboarding funcional |

### Fase 2 — Core do produto

| Story | Titulo | Esforco | Impacto |
|-------|--------|---------|---------|
| 5.4 | Sistema de Niveis (Evolution Engine) | 20-30h | Core differentiator |
| 5.5 | Relatorio de Evolucao Semanal | 8-12h | Engagement/retention |

### Fase 3 — Polish

| Story | Titulo | Esforco | Impacto |
|-------|--------|---------|---------|
| 5.6 | Gemini model integration fix | 8-12h | Margem financeira |
| 5.7 | Telegram pairing no Wizard | 12-16h | Reduce onboarding friction |

---

## Definition of Done (Epic)

- [ ] Token Intelligence ativo no pipeline (model router + auto-compact + prompt cache)
- [ ] Memory Orchestrator carregando contexto em cada sessao
- [ ] Desktop wizard funcional e bonito
- [ ] Sistema de niveis trackando progresso
- [ ] Relatorio semanal enviado via Telegram
- [ ] Gemini funcionando como modelo de margem
- [ ] Telegram pareando pelo wizard
