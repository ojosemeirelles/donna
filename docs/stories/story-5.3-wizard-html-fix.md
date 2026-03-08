# Story 5.3 — Fix Wizard HTML do Desktop

**Epic:** DONNA-v1.1 (Donna Funcional)
**Status:** [x] Done
**Prioridade:** P1 - Alto
**Agente:** @dev (Dex)
**Estimativa:** 4-8 horas

---

## Objetivo

Corrigir o Setup Wizard do Desktop App para que renderize corretamente e ofereça feedback visual de validacao.

---

## Problema

- Erro de IPC bridge: `window.donna.wizard.*` pode nao existir se preload nao carregou
- Sem feedback visual de validacao (sem borda vermelha, sem animacao)
- Sem validacao em tempo real nos inputs
- Se wizard fecha antes de `complete()`, usuario fica preso

---

## Criterios de Aceite

- [x] Wizard renderiza sem erros em macOS e Windows
- [x] Inputs tem validacao visual em tempo real (borda vermelha + msg de erro)
- [x] API key validada antes de avancar (check format)
- [x] Preload bridge tem fallback seguro
- [x] Botao "Abrir Donna" funciona com error handling
- [x] CSS responsivo e bonito

---

## Tasks

- [x] Adicionar CSS para estados de erro (.error border, shake animation)
- [x] Adicionar event listeners de validacao em tempo real
- [x] Implementar fallback seguro para `window.donna.wizard`
- [x] Adicionar error handling no `complete()`
- [ ] Testar em macOS e Windows

---

## Arquivos-chave

- `apps/desktop/renderer/wizard.html` — HTML + CSS + JS do wizard
- `apps/desktop/src/main.ts` — criacao da janela do wizard
- `apps/desktop/src/wizard/wizard-state.ts` — estado do wizard

---

## Definition of Done

- [x] Wizard renderiza corretamente
- [x] Validacao visual funciona
- [x] Nenhum erro no console

---

## File List

- `apps/desktop/renderer/wizard.html` — CSS error states, real-time validation, bridge fallback, error handling (modificado)
