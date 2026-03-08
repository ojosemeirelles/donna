# Technical Debt Assessment - DRAFT

**Projeto:** Donna (AI Gateway)
**Data:** 2026-03-08
**Fase:** Brownfield Discovery - Fase 4 (Consolidacao Inicial)
**Agente:** @architect (Aria)
**Status:** DRAFT - Para Revisao dos Especialistas

---

## 1. Executive Summary

O projeto Donna e um gateway de IA maduro, com ~30,900 arquivos TypeScript, 40+ extensoes de canais, 4 apps nativos e 52 skills comunitarias. A analise identificou **31 debitos tecnicos** em 3 areas: Sistema (15), Database (6) e Frontend/UX (10).

**Distribuicao por Severidade:**

| Severidade | Quantidade | % |
|-----------|-----------|---|
| Critico | 6 | 19% |
| Alto | 10 | 32% |
| Medio | 15 | 49% |

---

## 2. Debitos de Sistema

*Fonte: docs/architecture/system-architecture.md*

### Criticos

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| SYS-01 | Baileys em RC (7.0.0-rc.9) para WhatsApp | Instabilidade, breaking changes | 8-16h |
| SYS-02 | Carbon dependency custom (0.0.0-beta) | Lock-in total, sem updates | 40-80h |
| SYS-03 | Express 5 (^5.2.1) - relativamente novo | Potenciais bugs em producao | 4-8h (monitoramento) |
| SYS-04 | 11 pnpm overrides ativos | Manutencao complexa, security risk | 16-24h |

### Altos

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| SYS-05 | Codebase com 30,900 arquivos TS | Build lento, complexidade | 40-80h (refactor) |
| SYS-06 | sqlite-vec alpha (0.1.7-alpha.2) | API instavel | 8-16h |
| SYS-07 | keytar 7.9.0 (deprecated) | Sem manutencao futura | 16-24h |
| SYS-08 | node-pty beta (1.2.0-beta.3) | Instabilidade nativa | 8-16h |
| SYS-09 | PI agent framework pre-1.0 (0.55.3) | API instavel | 16-32h |
| SYS-10 | 9 configs Vitest diferentes | Fragmentacao de testes | 8-16h |

### Medios

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| SYS-11 | Legacy compat dirs (.clawdbot, .moltbot) | Complexidade | 4-8h |
| SYS-12 | 40+ extensoes no mesmo repo | Build/test lento | 40-80h |
| SYS-13 | tsdown beta (0.21.0-beta.2) | Build instavel | 4-8h |
| SYS-14 | pnpm-lock.yaml com 12,636 linhas | Merge conflicts | 4-8h |
| SYS-15 | Electron + macOS SwiftUI duplicados | Manutencao dupla | 40-80h |

---

## 3. Debitos de Database

*Fonte: docs/architecture/database-assessment.md*
**PENDENTE: Revisao do @data-engineer**

| ID | Debito | Severidade | Esforco Est. |
|----|--------|-----------|-------------|
| DB-01 | sqlite-vec em alpha | Alto | 8-16h |
| DB-02 | Sessoes JSON sem cleanup | Medio | 8-16h |
| DB-03 | Sem backup de memoria vetorial | Medio | 16-24h |
| DB-04 | keytar deprecated | Alto | 16-24h |
| DB-05 | Sem migrations versionadas | Medio | 16-24h |
| DB-06 | LanceDB nao integrado ao core | Baixo | 8-16h |

---

## 4. Debitos de Frontend/UX

*Fonte: docs/frontend/frontend-spec.md*
**PENDENTE: Revisao do @ux-design-expert**

### Criticos

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| UX-01 | Desktop (Electron) duplica macOS (SwiftUI) | Manutencao dupla | 80-160h |
| UX-02 | Web UI (Lit) vs Desktop (React) - stacks diferentes | Fragmentacao | 40-80h |

### Altos

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| UX-03 | Sem design system unificado | Inconsistencia visual | 40-80h |
| UX-04 | Desktop renderer como build output | Dev experience ruim | 8-16h |
| UX-05 | 5 superficies UI com stacks diferentes | Custo alto manutencao | 80-160h |

### Medios

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| UX-06 | Lit signals experimental | API pode mudar | 4-8h |
| UX-07 | Onboarding fragmentado | UX confuso | 8-16h |
| UX-08 | Sem testes E2E de UI | Regressoes | 24-40h |
| UX-09 | Sem auto-update nativo Windows | UX manual | 8-16h |
| UX-10 | Tray icons so PNG | Resolucao limitada | 2-4h |

---

## 5. Matriz Preliminar de Priorizacao

| Prioridade | IDs | Justificativa |
|-----------|-----|---------------|
| P0 - Urgente | SYS-01, SYS-04, DB-04 | Security + estabilidade |
| P1 - Alto | SYS-02, SYS-07, SYS-09, DB-01 | Dependencias instáveis/deprecated |
| P2 - Medio | UX-01, UX-03, SYS-05, SYS-10 | Produtividade + manutencao |
| P3 - Baixo | SYS-11, SYS-13, SYS-14, UX-06, UX-10 | Quick wins, baixo impacto |

---

## 6. Estimativa Total

| Categoria | Horas Min | Horas Max |
|-----------|----------|----------|
| Sistema | 232 | 448 |
| Database | 72 | 120 |
| Frontend/UX | 294 | 580 |
| **TOTAL** | **598** | **1,148** |

---

## 7. Perguntas para Especialistas

### Para @data-engineer:
1. O sqlite-vec alpha e aceitavel para producao ou devemos manter fallback?
2. Qual estrategia de migrations recomenda para SQLite embarcado?
3. O modelo de sessoes JSON e escalavel para milhares de usuarios?

### Para @ux-design-expert:
1. Manter Electron + SwiftUI ou convergir para uma solucao?
2. Lit 3 + signals e uma boa aposta a longo prazo para Web UI?
3. Design system cross-platform e viavel com stacks tao diferentes?

---

*DRAFT - Pendente revisao dos especialistas*
