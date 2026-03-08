# Story 1.4 - Fallback Path para sqlite-vec

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P0 - Urgente
**Agente:** @dev (Dex)
**Estimativa:** 12-20 horas
**Debitos:** DB-01, SYS-06

---

## Objetivo

Implementar fallback para busca vetorial quando sqlite-vec nao esta disponivel ou falha, garantindo que a memoria do agente funcione mesmo sem a extensao alpha.

---

## Criterios de Aceite

- [x] Gateway funciona sem sqlite-vec instalado (graceful degradation)
- [x] Fallback usa brute-force cosine similarity em JavaScript
- [x] Performance do fallback aceitavel para < 10,000 vetores
- [x] Log warning quando fallback e ativado
- [x] `donna doctor` reporta status do sqlite-vec
- [x] Testes: com sqlite-vec, sem sqlite-vec, fallback accuracy
- [x] Benchmark: sqlite-vec vs fallback (documentar diferenca)

---

## Tasks

- [x] Abstrair interface de vector search em `src/memory/vector-search.ts`
- [x] Implementar `SqliteVecSearch` (atual, com sqlite-vec)
- [x] Implementar `BruteForceSearch` (fallback, JS puro)
- [x] Auto-detect sqlite-vec no startup (factory)
- [x] Adicionar metricas de search latency (implementado em Story 4.2: `src/memory/search-metrics.ts`)
- [x] Escrever testes e benchmark

---

## Dependencias

- **Story 1.1** (backup) deve estar completa (proteger dados antes de mudar search)
- **Story 1.2** (migrations) deve estar completa (schema changes)

---

## File List

| Arquivo | Acao |
|---------|------|
| `src/memory/vector-search.ts` | CRIADO - VectorSearchEngine interface |
| `src/memory/vector-search-native.ts` | CRIADO - SqliteVecSearch wrapper |
| `src/memory/vector-search-brute.ts` | CRIADO - BruteForceSearch (cosine similarity JS) |
| `src/memory/vector-search-factory.ts` | CRIADO - Auto-detect + fallback factory |
| `src/memory/vector-search.test.ts` | CRIADO - 16 testes |

---

## Definition of Done

- [x] Testes passando
- [x] `pnpm check` limpo
- [x] Benchmark documentado
- [ ] Review por @qa
