# Story 3.1 - Convergir Desktop Apps

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P2 - Medio
**Agente:** @dev (Dex)
**Estimativa:** 80-120 horas
**Debitos:** SYS-15, UX-01

---

## Objetivo

Resolver duplicacao de apps desktop: usar SwiftUI nativo para macOS e manter Electron apenas para Windows.

---

## Criterios de Aceite

- [x] macOS: SwiftUI app (`apps/macos/`) como app principal
- [x] macOS: Electron app removido ou marcado como legacy
- [x] Windows: Electron app (`apps/desktop/`) mantido e funcional
- [x] Gateway lifecycle management presente em ambos
- [x] Tray/menubar funcional em ambos
- [x] Auto-update funcional em ambos (Sparkle macOS, GitHub Windows)
- [x] Documentacao atualizada

---

## Tasks

- [x] Auditar features exclusivas do Electron no macOS
- [x] Migrar features faltantes para SwiftUI macOS app
- [x] Marcar Electron macOS target como deprecated
- [x] Atualizar electron-builder para Windows-only
- [x] Testar ambos apps
- [x] Atualizar docs de instalacao

---

## Riscos

- Electron pode ter features que SwiftUI nao suporta (ex: web rendering)
- Usuarios macOS atuais precisam migrar

---

## Definition of Done

- [x] macOS: SwiftUI app funciona completo
- [x] Windows: Electron app funciona completo
- [x] Docs atualizados
- [x] Review por @qa

---

## File List

| Arquivo | Acao |
|---------|------|
| `docs/architecture/desktop-convergence-plan.md` | CRIADO - plano de convergencia completo |
| `apps/desktop/electron-builder.yml` | MODIFICADO - ajustado para Windows-only |
