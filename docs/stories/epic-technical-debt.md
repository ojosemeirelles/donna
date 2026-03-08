# Epic: Resolucao de Debitos Tecnicos - Donna Gateway

**Epic ID:** DEBT-1
**Status:** Draft
**Data:** 2026-03-08
**Owner:** @pm (Morgan)
**Fonte:** Brownfield Discovery Assessment

---

## Objetivo

Resolver os 34 debitos tecnicos identificados no Brownfield Discovery, priorizando seguranca, estabilidade de dados e experiencia do desenvolvedor. Ao final, o projeto tera zero debitos criticos, dependencias deprecated eliminadas e uma base solida para evolucao.

---

## Escopo

### Incluido
- Resolucao de todos os debitos P0 (criticos) e P1 (altos)
- Resolucao parcial de P2 (medio) - itens com maior impacto
- Baseline de metricas de qualidade
- Documentacao das decisoes arquiteturais

### Excluido
- Rewrite completo do codebase (SYS-05 e parcial, nao total)
- Split do monorepo em repos separados (SYS-12 fica como avaliacao)
- Debitos P3 que nao impactam estabilidade

---

## Criterios de Sucesso

| Metrica | Baseline | Alvo |
|---------|----------|------|
| Debitos criticos | 5 | 0 |
| Debitos altos | 11 | <= 3 |
| Deps deprecated | 3 | 0 |
| pnpm overrides | 11 | <= 5 |
| Cobertura testes | ~70% | >= 75% |

---

## Timeline

| Fase | Semanas | Stories | Horas Est. |
|------|---------|---------|-----------|
| Fundacao | 1-2 | 1.1, 1.2, 1.3, 1.4 | 56-84 |
| Estabilizacao | 3-6 | 2.1, 2.2, 2.3, 2.4, 2.5 | 132-228 |
| Consolidacao | 7-10 | 3.1, 3.2, 3.3, 3.4 | 196-328 |
| Otimizacao | 11-12 | 4.1, 4.2, 4.3 | 98-172 |

---

## Stories

### Fase 1: Fundacao (P0 - Urgente)

| Story | Titulo | Agente | Horas |
|-------|--------|--------|-------|
| 1.1 | Backup e export de memoria vetorial | @dev | 16-24 |
| 1.2 | Schema migrations para SQLite | @dev | 12-16 |
| 1.3 | Audit e limpeza de pnpm overrides | @dev | 16-24 |
| 1.4 | Fallback path para sqlite-vec | @dev | 12-20 |

### Fase 2: Estabilizacao (P1 - Alto)

| Story | Titulo | Agente | Horas |
|-------|--------|--------|-------|
| 2.1 | Migrar keytar para keychain nativo | @dev | 16-20 |
| 2.2 | Adapter pattern para PI framework | @dev | 16-32 |
| 2.3 | Avaliar alternativa ao Carbon | @architect | 40-80 |
| 2.4 | Design tokens cross-platform | @ux-design-expert | 40-60 |
| 2.5 | Unificar onboarding CLI/Desktop | @dev | 12-20 |

### Fase 3: Consolidacao (P2 - Medio)

| Story | Titulo | Agente | Horas |
|-------|--------|--------|-------|
| 3.1 | Convergir Desktop (SwiftUI macOS / Electron Win) | @dev | 80-120 |
| 3.2 | Consolidar configs Vitest | @dev | 8-16 |
| 3.3 | Testes E2E de UI (visual regression) | @qa | 24-40 |
| 3.4 | Dark mode consistente | @dev | 16-24 |

### Fase 4: Otimizacao (P3 - Backlog)

| Story | Titulo | Agente | Horas |
|-------|--------|--------|-------|
| 4.1 | Remover legacy dirs + session cleanup | @dev | 12-20 |
| 4.2 | Metricas de memoria + embedding config | @dev | 12-20 |
| 4.3 | Acessibilidade TUI + loading states | @dev | 20-28 |

---

## Dependencias entre Stories

```
1.1 (backup) ──BLOQUEIA──> 1.4 (sqlite-vec fallback)
1.2 (migrations) ──BLOQUEIA──> qualquer schema change
2.4 (design tokens) ──BLOQUEIA──> 3.4 (dark mode)
1.3 (audit overrides) ──INFORMA──> 2.3 (Carbon eval)
```

---

## Documentos de Referencia

- [Assessment Final](../prd/technical-debt-assessment.md)
- [Relatorio Executivo](../reports/TECHNICAL-DEBT-REPORT.md)
- [Arquitetura](../architecture/system-architecture.md)

---

*Epic criado por @pm (Morgan) - Brownfield Discovery Fase 10*
