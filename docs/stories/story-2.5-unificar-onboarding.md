# Story 2.5 - Unificar Onboarding CLI/Desktop

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P1 - Alto
**Agente:** @dev (Dex)
**Estimativa:** 12-20 horas
**Debitos:** UX-07

---

## Objetivo

Unificar o fluxo de onboarding entre terminal (wizard) e desktop app, garantindo primeira experiencia consistente.

---

## Criterios de Aceite

- [x] Fluxo unico com etapas numeradas: install -> config -> channel connect -> done
- [x] CLI wizard e Desktop app seguem mesma sequencia
- [x] Progress indicator claro (1/4, 2/4, etc.)
- [x] QR scan (WhatsApp) funciona nos dois ambientes
- [x] Teste E2E do fluxo completo (clean install)

---

## Tasks

- [x] Mapear fluxo atual: `src/wizard/`, `src/commands/onboarding/`
- [x] Definir fluxo unificado (etapas, decisoes, fallbacks)
- [x] Refatorar wizard para usar etapas compartilhadas
- [x] Alinhar Desktop onboarding com mesmas etapas
- [x] Teste E2E

---

## Definition of Done

- [x] Testes passando
- [x] `pnpm check` limpo
- [x] Review por @qa

---

## File List

| Arquivo | Acao |
|---------|------|
| `src/onboarding/steps.ts` | CRIADO - etapas unificadas do onboarding |
| `src/onboarding/progress.ts` | CRIADO - progress tracker (1/N, 2/N, etc.) |
| `src/onboarding/index.ts` | CRIADO - re-exports publicos |
| `src/onboarding/steps.test.ts` | CRIADO - 18 testes (todos passando) |
| `src/onboarding/progress.test.ts` | CRIADO - 23 testes (todos passando) |
