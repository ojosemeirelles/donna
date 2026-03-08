# Story 5.4 — Sistema de Niveis (Evolution Engine)

**Epic:** DONNA-v1.1 (Donna Funcional)
**Status:** [x] Done
**Prioridade:** P0 - Urgente
**Agente:** @dev (Dex)
**Estimativa:** 20-30 horas

---

## Objetivo

Implementar o sistema de progressao inspirado em Solo Leveling. Cada instancia da Donna evolui individualmente baseada no uso real, desbloqueando capacidades conforme o usuario interage.

---

## Sistema de Niveis

| Nivel | Nome | Criterios | Desbloqueia |
|-------|------|-----------|-------------|
| 1 | Iniciante | Install | Respostas, morning brief, tarefas simples |
| 2 | Aprendiz | 7 dias + 20 interacoes | Lembra nome, preferencias, estilo |
| 3 | Assistente | 30 dias + 100 interacoes | Padroes, sugestoes, antecipacao |
| 4 | Estrategista | 90 dias + uso de skills avancadas | Ciclos autonomos, projetos, iniciativa |
| 5 | Autonoma | Config avancada + plano Business | Opera 24/7, reporta, escala |

---

## Criterios de Aceite

- [x] Modulo `src/evolution/` criado com types, tracker, progression
- [x] EvolutionState persistido em `~/.donna/evolution.json`
- [x] Stats atualizadas a cada interacao (totalInteractions, daysActive, skillsUsed)
- [x] Level up automatico quando criterios atendidos
- [ ] Notificacao de level up via Telegram
- [x] Nivel atual visivel em `donna status`
- [x] Memory Orchestrator injeta nivel no contexto do agente
- [x] Testes para cada transicao de nivel

---

## Tasks

- [x] Criar `src/evolution/level.ts` — definicao dos 5 niveis + criterios
- [x] Criar `src/evolution/tracker.ts` — tracking de stats (interacoes, dias, skills)
- [x] Criar `src/evolution/progression.ts` — logica de level up
- [x] Criar `src/evolution/index.ts` — barrel export
- [x] Persistir em `~/.donna/evolution.json`
- [x] Integrar com Memory Orchestrator (injetar nivel no contexto)
- [x] Integrar com gateway event handler (contar interacoes)
- [ ] Adicionar notificacao de level up via Telegram
- [x] Adicionar nivel em `donna status`
- [x] Testes unitarios para cada modulo
- [x] Testes de transicao de nivel (1→2, 2→3, etc)

---

## Dependencias

- **Story 5.2** (Memory Orchestrator no gateway) — necessario para injetar nivel no contexto

---

## Definition of Done

- [x] Testes passando
- [x] Level up funcional de 1→5
- [x] Stats persistidas entre sessoes
- [x] Nivel visivel em `donna status`
- [ ] Review por @qa

---

## File List

- `src/evolution/level.ts` — 5 níveis + critérios (novo)
- `src/evolution/tracker.ts` — tracking de stats + persistência (novo)
- `src/evolution/progression.ts` — lógica de level up (novo)
- `src/evolution/index.ts` — barrel export (novo)
- `src/evolution/level.test.ts` — testes de níveis (novo)
- `src/evolution/tracker.test.ts` — testes de tracker (novo)
- `src/evolution/progression.test.ts` — testes de progressão (novo)
- `src/auto-reply/reply/get-reply-run.ts` — integração evolution no pipeline (modificado)
- `src/commands/status.command.ts` — nível visível em donna status (modificado)
