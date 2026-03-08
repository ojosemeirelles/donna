# Technical Debt Assessment - FINAL

**Projeto:** Donna (AI Gateway)
**Data:** 2026-03-08
**Versao:** 1.0
**Fase:** Brownfield Discovery - Fase 8 (Assessment Final)
**Agente:** @architect (Aria)
**QA Gate:** APPROVED

---

## Executive Summary

Donna e um gateway de IA multi-canal com ~30,900 arquivos TypeScript, 40+ extensoes, 4 apps nativos e 52 skills comunitarias. Este assessment identifica **34 debitos tecnicos** validados por especialistas em 3 areas.

| Metrica | Valor |
|---------|-------|
| Total de Debitos | 34 |
| Criticos | 5 |
| Altos | 11 |
| Medios | 14 |
| Baixos | 4 |
| Esforco Total Estimado | 640 - 1,180 horas |
| Custo Estimado (R$150/h) | R$ 96.000 - R$ 177.000 |

---

## Inventario Completo de Debitos

### Sistema (validado por @architect)

| ID | Debito | Sev. | Horas | Prior. | Status |
|----|--------|------|-------|--------|--------|
| SYS-01 | Baileys RC (7.0.0-rc.9) - WhatsApp instavel | Critico | 8-16 | P0 | Monitorar release stable |
| SYS-02 | Carbon custom (0.0.0-beta) - lock-in | Critico | 40-80 | P1 | Avaliar alternativa |
| SYS-03 | Express 5 (novo em producao) | Medio | 4-8 | P2 | Monitorar |
| SYS-04 | 11 pnpm overrides (security risk) | Critico | 16-24 | P0 | Auditar cada override |
| SYS-05 | Codebase 30,900 arquivos | Alto | 40-80 | P2 | Modularizacao gradual |
| SYS-06 | sqlite-vec alpha | Critico | 12-20 | P0 | (= DB-01, consolidado) |
| SYS-07 | keytar deprecated | Alto | 16-20 | P1 | (= DB-04, consolidado) |
| SYS-08 | node-pty beta | Alto | 8-16 | P2 | Monitorar release |
| SYS-09 | PI agent framework pre-1.0 | Alto | 16-32 | P1 | Adapter pattern |
| SYS-10 | 9 configs Vitest | Medio | 8-16 | P2 | Consolidar |
| SYS-11 | Legacy dirs (.clawdbot, .moltbot) | Medio | 4-8 | P3 | Remover |
| SYS-12 | 40+ extensoes no monorepo | Medio | 40-80 | P3 | Avaliar split |
| SYS-13 | tsdown beta | Medio | 4-8 | P3 | Monitorar |
| SYS-14 | pnpm-lock 12,636 linhas | Medio | 4-8 | P3 | Normal para monorepo |
| SYS-15 | Electron + SwiftUI duplicados | Alto | 80-120 | P2 | Convergir |

### Database (validado por @data-engineer)

| ID | Debito | Sev. | Horas | Prior. | Status |
|----|--------|------|-------|--------|--------|
| DB-01 | sqlite-vec alpha em producao | Critico | 12-20 | P0 | Fallback path |
| DB-02 | Sessoes JSON sem cleanup | Medio | 8-12 | P2 | TTL + rotation |
| DB-03 | Sem backup de memoria vetorial | Alto | 16-24 | P1 | Export/import |
| DB-04 | keytar deprecated | Alto | 16-20 | P1 | Migrar keychain nativo |
| DB-05 | Sem migrations versionadas | Medio | 12-16 | P1 | Schema versioning |
| DB-06 | LanceDB nao integrado | Baixo | 8-12 | P3 | Manter extension |
| DB-07 | Sem metricas de memoria | Medio | 8-12 | P2 | Observabilidade |
| DB-08 | Embedding model hardcoded | Medio | 4-8 | P2 | Configuravel |
| DB-09 | Sem pruning de memorias | Baixo | 12-16 | P3 | Aging policy |

### Frontend/UX (validado por @ux-design-expert)

| ID | Debito | Sev. | Horas | Prior. | Status |
|----|--------|------|-------|--------|--------|
| UX-01 | Desktop duplica macOS | Alto | 80-120 | P2 | SwiftUI macOS + Electron Windows |
| UX-02 | Lit vs React (frameworks) | Medio | 20-40 | P2 | Aceitavel (audiences diferentes) |
| UX-03 | Sem design system | Alto | 40-60 | P1 | Design tokens primeiro |
| UX-04 | Renderer como build output | Medio | 8-12 | P2 | Reestruturar |
| UX-05 | 5 stacks UI diferentes | Alto | N/A | P1 | Decisao arquitetural |
| UX-06 | Lit signals experimental | Baixo | 4-8 | P3 | Direcao correta |
| UX-07 | Onboarding fragmentado | Alto | 12-20 | P1 | Unificar fluxo |
| UX-08 | Sem testes E2E UI | Medio | 24-40 | P2 | Visual regression |
| UX-09 | Sem auto-update Windows | Medio | 8-16 | P2 | NSIS auto-updater |
| UX-10 | Tray icons PNG only | Baixo | 2-4 | P3 | SVG/icns |
| UX-11 | Sem dark mode consistente | Medio | 16-24 | P2 | Design tokens |
| UX-12 | TUI sem acessibilidade | Medio | 12-16 | P2 | Screen reader support |
| UX-13 | Sem loading states padrao | Medio | 8-12 | P2 | Componentes shared |

---

## Matriz de Priorizacao Final

### P0 - Urgente (Semanas 1-2)

| ID | Debito | Horas | Justificativa |
|----|--------|-------|---------------|
| DB-03 | Backup de memoria | 16-24 | Desbloqueia DB-01, protege dados |
| DB-05 | Migrations versionadas | 12-16 | Desbloqueia schema changes |
| SYS-04 | Auditar pnpm overrides | 16-24 | Security risk ativo |
| DB-01/SYS-06 | sqlite-vec fallback | 12-20 | Alpha em producao |
| **Subtotal** | | **56-84** | |

### P1 - Alto (Semanas 3-6)

| ID | Debito | Horas | Justificativa |
|----|--------|-------|---------------|
| DB-04/SYS-07 | Migrar keytar | 16-20 | Deprecated, sem manutencao |
| SYS-09 | Adapter para PI | 16-32 | API instavel pre-1.0 |
| SYS-02 | Avaliar Carbon | 40-80 | Lock-in critico |
| UX-03 | Design tokens | 40-60 | Base do design system |
| UX-07 | Unificar onboarding | 12-20 | First impression |
| UX-05 | Decisao arquitetural UI | 8-16 | Define roadmap |
| **Subtotal** | | **132-228** | |

### P2 - Medio (Semanas 7-12)

| ID | Debito | Horas | Justificativa |
|----|--------|-------|---------------|
| SYS-01 | Monitor Baileys stable | 8-16 | Quando sair de RC |
| SYS-05 | Modularizar codebase | 40-80 | Produtividade |
| SYS-10 | Consolidar Vitest | 8-16 | DX |
| SYS-15/UX-01 | Convergir Desktop | 80-120 | Manutencao dupla |
| UX-08 | Testes E2E UI | 24-40 | Regressoes |
| UX-11 | Dark mode | 16-24 | UX consistente |
| DB-02 | Session cleanup | 8-12 | Higiene |
| DB-07/08 | Metricas + config | 12-20 | Observabilidade |
| **Subtotal** | | **196-328** | |

### P3 - Baixo (Backlog)

| ID | Debito | Horas |
|----|--------|-------|
| SYS-11 | Remover legacy dirs | 4-8 |
| SYS-12 | Avaliar split extensoes | 40-80 |
| SYS-13/14 | tsdown + lock | 8-16 |
| UX-06/10 | Signals + icons | 6-12 |
| UX-12/13 | A11y + loading | 20-28 |
| DB-06/09 | LanceDB + pruning | 20-28 |
| **Subtotal** | **98-172** |

---

## Plano de Resolucao

```
Semanas 1-2: FUNDACAO
├── Backup de memoria vetorial (DB-03)
├── Schema migrations (DB-05)
├── Audit pnpm overrides (SYS-04)
├── sqlite-vec fallback (DB-01)
└── Baseline de cobertura de testes

Semanas 3-4: ESTABILIZACAO
├── Migrar keytar (DB-04)
├── PI adapter pattern (SYS-09)
├── Design tokens (UX-03)
└── Unificar onboarding (UX-07)

Semanas 5-6: DECISOES
├── Avaliar Carbon alternatives (SYS-02)
├── Decisao Desktop: SwiftUI macOS / Electron Windows (UX-05)
├── Monitor Baileys stable release (SYS-01)
└── Consolidar Vitest configs (SYS-10)

Semanas 7-10: CONSOLIDACAO
├── Convergir Desktop apps (SYS-15/UX-01)
├── Modularizar codebase (SYS-05)
├── Testes E2E UI (UX-08)
└── Dark mode consistente (UX-11)

Semanas 11-12: OTIMIZACAO
├── Session cleanup (DB-02)
├── Metricas de memoria (DB-07/08)
├── Quick wins restantes (P3)
└── Documentacao final
```

---

## Riscos e Mitigacoes

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|----------|
| sqlite-vec alpha quebra dados | Media | Critico | DB-03 (backup) ANTES de qualquer change |
| PI framework muda API | Alta | Alto | Adapter pattern (SYS-09) |
| Baileys RC tem breaking change | Alta | Alto | Pin version + test suite E2E |
| Remocao Electron impacta Windows | Baixa | Alto | Manter Electron para Windows |
| Carbon lock-in sem alternativa | Media | Critico | Pesquisa de alternativas (SYS-02) |
| Overrides mascaram CVEs | Alta | Critico | Audit imediato (SYS-04) |

---

## Criterios de Sucesso

| Metrica | Baseline | Alvo (12 semanas) |
|---------|----------|-------------------|
| Debitos criticos | 5 | 0 |
| Debitos altos | 11 | <= 3 |
| Deps deprecated | 3 | 0 |
| pnpm overrides | 11 | <= 5 |
| Cobertura testes | ~70% | >= 75% |
| Configs Vitest | 9 | <= 5 |
| Tempo cold start gateway | TBD | < 3s |

---

*Assessment Final - Brownfield Discovery Fase 8*
