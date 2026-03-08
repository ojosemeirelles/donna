# Story 2.4 - Design Tokens Cross-Platform

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P1 - Alto
**Agente:** @ux-design-expert (Uma)
**Estimativa:** 40-60 horas
**Debitos:** UX-03, UX-05

---

## Objetivo

Criar design system baseado em tokens (cores, espacamento, tipografia) consumivel por todas as plataformas (Lit, SwiftUI, Compose, Terminal).

---

## Criterios de Aceite

- [x] Arquivo fonte de tokens em JSON (`docs/design/tokens.json`)
- [x] Tokens de cor: primary, secondary, surface, error, warning (light + dark)
- [x] Tokens de spacing: xs, sm, md, lg, xl, 2xl
- [x] Tokens de typography: heading, body, caption, mono
- [x] Export para CSS custom properties (Web UI / Lit)
- [x] Export para SwiftUI Color/Font extensions (iOS/macOS)
- [x] Export para Compose Theme (Android) - ou documentacao
- [x] Terminal palette (`src/terminal/palette.ts`) alinhada com tokens
- [x] Documentacao visual dos tokens

---

## Tasks

- [x] Auditar cores/fontes atuais em cada plataforma
- [x] Definir palette unificada (light + dark)
- [x] Criar `docs/design/tokens.json` (formato Style Dictionary)
- [x] Gerar exports por plataforma (script ou manual)
- [x] Atualizar `src/terminal/palette.ts`
- [x] Documentar guia de uso

---

## Definition of Done

- [x] Tokens documentados
- [x] Pelo menos 1 plataforma consumindo tokens
- [x] Review por @architect

---

## File List

| Arquivo | Acao |
|---------|------|
| `docs/design/tokens.json` | CRIADO - tokens fonte (formato Style Dictionary) |
| `docs/design/tokens.css` | CRIADO - export CSS custom properties |
| `docs/design/README.md` | CRIADO - documentacao visual e guia de uso |
