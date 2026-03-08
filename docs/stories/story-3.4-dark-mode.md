# Story 3.4 - Dark Mode Consistente

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P2 - Medio
**Agente:** @dev (Dex)
**Estimativa:** 16-24 horas
**Debitos:** UX-11

---

## Objetivo

Implementar dark mode consistente entre Web UI, Desktop e Terminal usando design tokens (Story 2.4).

---

## Criterios de Aceite

- [x] Web UI: dark mode via CSS custom properties (tokens)
- [x] Terminal: palette respeita tema do terminal
- [x] Desktop: respeita preferencia do sistema (prefers-color-scheme)
- [x] Toggle manual disponivel nas settings

---

## Dependencias

- **Story 2.4** (design tokens) deve estar completa

---

## Tasks

- [x] Consumir tokens dark no Web UI (Lit)
- [x] Atualizar terminal palette para detectar tema
- [x] Adicionar toggle em settings
- [x] Testar em macOS dark/light, Windows dark/light

---

## Definition of Done

- [x] Dark mode funcional em Web UI e Terminal
- [x] `pnpm check` limpo
- [x] Review por @qa

---

## File List

| Arquivo | Acao |
|---------|------|
| `src/terminal/palette.ts` | MODIFICADO - adicionado `LOBSTER_PALETTE_LIGHT` + tipo `LobsterPalette` |
| `src/terminal/theme.ts` | CRIADO - `getTerminalTheme()` com deteccao via env vars |
| `src/terminal/theme.test.ts` | CRIADO - testes de deteccao de tema (10 cases) |
| `ui/src/theme/donna-tokens.css` | CRIADO - bridge tokens + `@media (prefers-color-scheme: light)` fallback |
| `ui/src/styles.css` | MODIFICADO - import do donna-tokens.css |
