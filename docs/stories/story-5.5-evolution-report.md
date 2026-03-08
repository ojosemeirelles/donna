# Story 5.5 — Relatorio de Evolucao Semanal

**Epic:** DONNA-v1.1 (Donna Funcional)
**Status:** [x] Done
**Prioridade:** P0 - Urgente
**Agente:** @dev (Dex)
**Estimativa:** 8-12 horas

---

## Objetivo

Implementar o relatorio semanal de evolucao que a Donna envia via Telegram todo domingo. Mostra progresso, insights sobre o usuario, proximo desbloqueio, e sugestoes de iniciativa.

---

## Formato do relatorio

```
⚔️ Donna — Relatorio de Evolucao
Semana {n} | Nivel {x} — {nome}

📈 Progresso esta semana:
• {tasks} tarefas concluidas ({delta}% vs semana anterior)
• {patterns} padroes novos identificados
• {tokensSaved} tokens economizados pelo Token Intelligence
• Cache hit rate: {cacheRate}%

🧠 O que aprendi sobre voce:
• {insight1}
• {insight2}
• {insight3}

🔓 Proximo desbloqueio:
Faltam {remaining} interacoes para desbloquear "{nextLevel}"
{tip}

💡 Iniciativa desta semana:
{initiative}
```

---

## Criterios de Aceite

- [x] Cron job `evolution-report` roda todo domingo as 10h
- [x] Relatorio enviado via Telegram
- [x] Inclui: stats da semana, insights, proximo nivel, iniciativa
- [x] Insights gerados a partir de Pattern Memory
- [x] Iniciativas sugeridas baseadas em padroes detectados
- [x] Testes

---

## Tasks

- [x] Criar `src/evolution/report.ts` — geracao do relatorio
- [x] Criar `src/evolution/insights.ts` — analise de padroes → insights legíveis
- [x] Criar `src/evolution/initiatives.ts` — sugestoes baseadas em comportamento
- [x] Registrar cron job `0 10 * * 0` (domingo 10h)
- [x] Criar hook handler `src/hooks/bundled/evolution-report/handler.ts`
- [x] Formatar para Telegram (markdown)
- [x] Testes

---

## Dependencias

- **Story 5.4** (Evolution Engine) — precisa do tracker e stats
- **Story 5.2** (Memory Orchestrator) — precisa dos padroes para insights

---

## Definition of Done

- [x] Relatorio gerado corretamente
- [x] Testes passando
- [x] Cron job registrado
- [x] Formato visual aprovado

---

## File List

- `src/evolution/report.ts` — geração e formatação do relatório (novo)
- `src/evolution/insights.ts` — geração de insights a partir de stats (novo)
- `src/evolution/initiatives.ts` — sugestões baseadas em nível e padrões (novo)
- `src/evolution/report.test.ts` — testes do relatório (novo)
- `src/hooks/bundled/evolution-report/handler.ts` — hook handler com cron job (novo)
