# Story 5.2 — Integrar Memory Orchestrator no Gateway

**Epic:** DONNA-v1.1 (Donna Funcional)
**Status:** [x] Done
**Prioridade:** P0 - Urgente
**Agente:** @dev (Dex)
**Estimativa:** 8-12 horas

---

## Objetivo

Ativar o Memory Orchestrator no pipeline real. Hoje ele existe com testes mas nunca e chamado — Donna nao lembra de nada entre sessoes.

---

## Problema

- `MemoryOrchestrator.onSessionStart()` nunca chamada no gateway
- `MemoryOrchestrator.recordEvent()` nunca chamada nos event hooks
- Config default `enabled: false` e ninguem muda para true
- Memory context block nunca injetado no system prompt do agente
- Pattern memory fica vazia para sempre

---

## Criterios de Aceite

- [x] Memory Orchestrator instanciado no gateway startup
- [x] `onSessionStart()` chamada quando agente inicia sessao
- [x] Context block (identity + patterns + episodic) injetado no bootstrap do agente
- [x] `recordEvent()` chamada em tool use e session start
- [x] Config `memory.enabled` controlavel pelo usuario
- [x] Graceful degradation: erro de memoria nunca quebra sessao
- [x] Testes de integracao

---

## Tasks

- [x] Instanciar MemoryOrchestrator em `server.impl.ts`
- [x] Chamar `onSessionStart()` em `get-reply-run.ts`
- [x] Injetar context block no system prompt
- [x] Chamar `recordEvent()` em `server-chat.ts` (tool use, session events)
- [x] Adicionar config `gateway.memory.enabled` (default: true para novos users)
- [x] Testar graceful degradation
- [x] Testes

---

## Arquivos-chave

- `src/memory/memory-orchestrator.ts` — orchestrator (existe, testado)
- `src/gateway/server.impl.ts` — startup do gateway (instanciar aqui)
- `src/agents/pi-embedded-runner/run.ts` — inicio da sessao (chamar onSessionStart)
- `src/gateway/server-chat.ts` — event handler (chamar recordEvent)

---

## Definition of Done

- [x] Testes passando
- [x] Donna lembra nome e preferencias do usuario entre sessoes
- [x] Pattern memory registra eventos
- [x] Episodic memory mostra resumo do dia anterior

---

## File List

- `src/memory/memory-orchestrator-singleton.ts` — global singleton (novo)
- `src/memory/memory-orchestrator-singleton.test.ts` — testes do singleton (novo)
- `src/gateway/server.impl.ts` — inicializacao no startup
- `src/auto-reply/reply/get-reply-run.ts` — injecao de contexto no system prompt
- `src/memory/memory-orchestrator.ts` — orchestrator (existente, sem mudancas)
- `src/config/types.memory.ts` — tipos de config (existente, sem mudancas)
