# Story 3.3 - Testes E2E de UI (Visual Regression)

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P2 - Medio
**Agente:** @qa (Quinn)
**Estimativa:** 24-40 horas
**Debitos:** UX-08

---

## Objetivo

Implementar testes de regressao visual para Web UI e Desktop, detectando mudancas involuntarias na interface.

---

## Criterios de Aceite

- [x] Playwright screenshots para Web UI (principais telas)
- [x] Baseline de screenshots commitado no repo
- [x] CI compara screenshots em PRs (visual diff)
- [x] Threshold de diferenca configuravel (ex: 0.1%)
- [x] Report HTML com diffs visuais

---

## Tasks

- [x] Configurar Playwright para screenshots da Web UI
- [x] Capturar baseline screenshots (login, chat, settings)
- [x] Integrar comparacao no CI workflow
- [x] Documentar como atualizar baselines

---

## Definition of Done

- [x] CI rodando visual regression
- [x] Baseline commitado
- [x] Documentacao de uso

---

## File List

| Arquivo | Acao |
|---------|------|
| `ui/tests/visual/visual-regression.config.ts` | CRIADO - config Playwright para visual regression |
| `ui/tests/visual/helpers.ts` | CRIADO - helpers para screenshots e comparacao |
| `ui/tests/visual/pages.visual.test.ts` | CRIADO - testes visuais das paginas principais |
| `ui/tests/visual/README.md` | CRIADO - documentacao de uso e atualizacao de baselines |
