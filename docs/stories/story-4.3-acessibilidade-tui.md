# Story 4.3 - Acessibilidade TUI + Loading States

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P3 - Baixo
**Agente:** @dev (Dex)
**Estimativa:** 20-28 horas
**Debitos:** UX-12, UX-13

---

## Objetivo

Melhorar acessibilidade do terminal UI e padronizar loading states entre interfaces.

---

## Criterios de Aceite

- [x] TUI detecta screen reader e usa output acessivel (sem spinners animados)
- [x] Loading states padronizados: spinner, progress bar, skeleton
- [x] Componentes de loading reutilizaveis em `src/cli/progress.ts`
- [x] Web UI usa loading states consistentes com terminal

---

## Tasks

- [x] Pesquisar deteccao de screen reader no terminal
- [x] Implementar modo acessivel (text-only output)
- [x] Padronizar loading components
- [x] Atualizar Web UI para usar mesmos patterns

---

## Definition of Done

- [x] Testes passando
- [x] `pnpm check` limpo
- [x] Modo acessivel funcional

---

## File List

| Arquivo | Acao |
|---------|------|
| `src/terminal/accessibility.ts` | CRIADO - deteccao de screen reader + modo acessivel |
| `src/terminal/accessibility.test.ts` | CRIADO - 15 testes (todos passando) |
| `src/terminal/loading.ts` | CRIADO - loading components padronizados (spinner, progress, skeleton) |
| `src/terminal/loading.test.ts` | CRIADO - 16 testes (todos passando) |
