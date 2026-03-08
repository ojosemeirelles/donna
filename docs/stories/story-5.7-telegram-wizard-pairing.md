# Story 5.7 — Telegram Pairing no Wizard

**Epic:** DONNA-v1.1 (Donna Funcional)
**Status:** [x] Done
**Prioridade:** P2 - Medio
**Agente:** @dev (Dex)
**Estimativa:** 12-16 horas

---

## Objetivo

Adicionar input de Telegram bot token no Setup Wizard do Desktop, com validacao e pareamento automatico.

---

## Problema atual

Wizard nao pede token do Telegram. Usuario precisa:
1. Ir ao BotFather
2. Criar bot manualmente
3. Copiar token
4. Rodar `donna onboard telegram` no terminal

Isso viola o principio "Zero terminal".

---

## Criterios de Aceite

- [x] Wizard tem step "Conectar Telegram" apos API key
- [x] Input seguro para bot token
- [x] Validacao em tempo real: chama `getMe()` para verificar token
- [x] Mostra nome do bot apos validacao
- [x] Link para BotFather com instrucoes simples
- [x] Token salvo no config automaticamente
- [x] Funciona sem token (skip opcional)

---

## Tasks

- [x] Adicionar step "Telegram" no wizard HTML
- [x] Implementar validacao de token via Telegram API
- [x] Mostrar feedback visual (nome do bot, avatar)
- [x] Salvar token no config
- [x] Instrucoes claras para BotFather
- [x] Testar flow completo

---

## Arquivos-chave

- `apps/desktop/renderer/wizard.html`
- `apps/desktop/src/wizard/wizard-state.ts`
- `src/telegram/token.ts`

---

## Definition of Done

- [x] Telegram pareado pelo wizard
- [x] Token validado antes de salvar
- [x] Funciona end-to-end

---

## File List

- `apps/desktop/renderer/wizard.html` — step Telegram + validação getMe() (modificado)
- `apps/desktop/src/wizard/wizard-state.ts` — step telegram + isValidTelegramToken + skip logic (modificado)
