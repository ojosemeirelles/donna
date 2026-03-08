# Story 5.1 — Plugar Token Intelligence no Pipeline

**Epic:** DONNA-v1.1 (Donna Funcional)
**Status:** [x] Done
**Prioridade:** P0 - Urgente
**Agente:** @dev (Dex)
**Estimativa:** 8-12 horas

---

## Objetivo

Ativar os 3 modulos de Token Intelligence que existem com testes mas nunca sao chamados em producao: Model Router, Auto-Compact, e Prompt Cache.

---

## Problema

Os 3 modulos sao codigo morto:

- `src/infra/model-router.ts` — `classifyPromptComplexity()` nunca chamada
- `src/infra/auto-compact.ts` — `evaluateCompactionNeed()` nunca chamada
- `src/infra/prompt-cache.ts` — `markBlocksForCaching()` nunca chamada

Resultado: toda sessao usa o mesmo modelo (caro), nunca compacta, nunca cacheia.

---

## Criterios de Aceite

- [ ] Model Router seleciona tier (haiku/sonnet/opus) baseado no prompt antes de criar sessao
- [ ] Auto-Compact avalia compactacao a cada turn do agente (threshold 70%)
- [ ] Prompt Cache marca system prompt com cache_control ephemeral
- [ ] Config options para habilitar/desabilitar cada modulo
- [ ] Log de decisoes do model router (qual tier, por que)
- [ ] Testes de integracao

---

## Tasks

- [x] Encontrar onde model selection acontece em `pi-embedded-runner/`
- [x] Chamar `classifyPromptComplexity()` antes de `resolveModel()`
- [x] Encontrar onde compactacao e disparada
- [x] Chamar `evaluateCompactionNeed()` no loop de turns
- [x] Encontrar onde system prompt e montado
- [x] Chamar `markBlocksForCaching()` no system prompt builder
- [x] Adicionar config flags
- [x] Testes

---

## Arquivos-chave

- `src/infra/model-router.ts` — classificador (existe, testado)
- `src/infra/auto-compact.ts` — compactador (existe, testado)
- `src/infra/prompt-cache.ts` — cache manager (existe, testado)
- `src/agents/pi-embedded-runner/model.ts` — selecao de modelo (plugar aqui)
- `src/agents/pi-embedded-runner/run/` — loop de execucao (plugar aqui)
- `src/agents/pi-embedded-runner/compact.ts` — compactacao existente (integrar)

---

## Definition of Done

- [x] Testes passando
- [x] Token Intelligence ativo e logando decisoes
- [x] Sessoes cron usam Haiku automaticamente
- [x] Prompt cache ativo para Claude

---

## File List

- `src/agents/pi-embedded-runner/run.ts` — Model Router + Auto-Compact integrados
- `src/agents/pi-embedded-runner/run/attempt.ts` — Prompt Cache eligibility check
- `src/infra/model-router.ts` — classificador (existente, sem mudancas)
- `src/infra/auto-compact.ts` — avaliador (existente, sem mudancas)
- `src/infra/prompt-cache.ts` — cache manager (existente, sem mudancas)
- `src/infra/token-intelligence-integration.test.ts` — testes de integracao (novo)
- `src/config/types.donna.ts` — tipos tokenIntelligence (existente, sem mudancas)
