# Story 5.6 — Gemini Model Integration Fix

**Epic:** DONNA-v1.1 (Donna Funcional)
**Status:** [x] Done
**Prioridade:** P2 - Medio
**Agente:** @dev (Dex)
**Estimativa:** 8-12 horas

---

## Objetivo

Corrigir integracao com Gemini para que funcione como modelo de margem (mais barato que Claude).

---

## Problemas identificados

1. Schema fields silently dropped (`minLength`, `maxLength`, etc.) sem log
2. Sem pre-flight check para safety policies do Gemini
3. Batch-Gemini upload sem retry com backoff
4. Turn ordering pode quebrar com subagent sessions

---

## Criterios de Aceite

- [x] Schema field drops logados como warning
- [x] Pre-flight safety check antes de enviar para Gemini
- [x] Batch upload com retry (3x, exponential backoff)
- [x] Turn ordering correto em todos os code paths
- [x] Testes

---

## Arquivos-chave

- `src/agents/pi-embedded-runner/google.ts`
- `src/memory/batch-gemini.ts`
- `src/agents/models-config.providers.ts`

---

## Definition of Done

- [x] Gemini funciona end-to-end
- [x] Testes passando
- [x] Log warnings para schema drops

---

## File List

- `src/agents/pi-embedded-runner/google.ts` — schema drop warning melhorado + pre-flight safety check (modificado)
- `src/memory/batch-gemini.ts` — retry com exponential backoff (modificado)
