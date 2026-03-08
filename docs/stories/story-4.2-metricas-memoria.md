# Story 4.2 - Metricas de Memoria + Embedding Config

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P3 - Baixo
**Agente:** @dev (Dex)
**Estimativa:** 12-20 horas
**Debitos:** DB-07, DB-08

---

## Objetivo

Adicionar observabilidade ao sistema de memoria vetorial e tornar o modelo de embedding configuravel.

---

## Criterios de Aceite

- [x] `donna memory stats` mostra: total vetores, tamanho em disco, modelo de embedding
- [x] Embedding model configuravel via `donna.yaml` (campo `memory.embeddingModel`)
- [x] Metricas de search latency logadas (p50, p95)
- [x] Dashboard basico via `donna status --deep`

---

## Tasks

- [x] Implementar `donna memory stats`
- [x] Extrair embedding model config de hardcoded para config
- [x] Adicionar timing ao vector search
- [x] Expor metricas no status

---

## Definition of Done

- [x] Testes passando
- [x] `pnpm check` limpo

---

## File List

| Arquivo | Acao |
|---------|------|
| `src/memory/stats.ts` | CRIADO - coleta de stats de memoria vetorial |
| `src/memory/stats.test.ts` | CRIADO - 9 testes (todos passando) |
| `src/memory/search-metrics.ts` | CRIADO - metricas de latencia (p50, p95) |
| `src/memory/search-metrics.test.ts` | CRIADO - 11 testes (todos passando) |
