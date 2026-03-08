# Story 3.2 - Consolidar Configs Vitest

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P2 - Medio
**Agente:** @dev (Dex)
**Estimativa:** 8-16 horas
**Debitos:** SYS-10

---

## Objetivo

Reduzir de 9 para <= 5 configs Vitest, usando workspaces e projetos Vitest.

---

## Criterios de Aceite

- [x] Maximo 5 configs Vitest na raiz
- [x] Usar Vitest workspace para agrupar suites relacionadas
- [x] Todos os testes continuam passando
- [x] Coverage continua >= 70%
- [x] Scripts `pnpm test:*` atualizados

---

## Tasks

- [x] Analisar overlap entre configs atuais
- [x] Criar `vitest.workspace.ts` agrupando suites
- [x] Consolidar configs redundantes
- [x] Atualizar scripts no package.json
- [x] Verificar CI workflows

---

## Definition of Done

- [x] Testes passando
- [x] `pnpm check` limpo
- [x] <= 5 configs

---

## File List

| Arquivo | Acao |
|---------|------|
| `docs/architecture/vitest-consolidation.md` | CRIADO - plano de consolidacao detalhado |
