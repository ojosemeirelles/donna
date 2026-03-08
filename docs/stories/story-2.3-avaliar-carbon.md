# Story 2.3 - Avaliar Alternativa ao Carbon

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P1 - Alto
**Agente:** @architect (Aria)
**Estimativa:** 40-80 horas
**Debitos:** SYS-02

---

## Objetivo

Avaliar a dependencia Carbon (0.0.0-beta, custom) e determinar se pode ser substituida, encapsulada ou se o lock-in e aceitavel.

---

## Criterios de Aceite

- [x] Documentar: o que Carbon faz, onde e usado, quais features sao essenciais
- [x] Listar alternativas viaveis (se existirem)
- [x] Analise de esforco para cada alternativa
- [x] Decisao documentada: manter, migrar ou encapsular
- [x] Se migrar: plano de migracao com timeline
- [x] Se manter: documentar riscos aceitos

---

## Tasks

- [x] Grep todos os imports de `@carbon` no codebase
- [x] Catalogar features usadas
- [x] Pesquisar alternativas (open source, mantidas)
- [x] POC com alternativa mais promissora
- [x] Documentar decisao em ADR (Architecture Decision Record)

---

## Notas

- CLAUDE.md diz: "Never update the Carbon dependency"
- Isso sugere que Carbon e sensivel - investigar por que

---

## Definition of Done

- [x] ADR documentado em `docs/architecture/adr-carbon.md`
- [x] Decisao aprovada por stakeholder

---

## File List

| Arquivo | Acao |
|---------|------|
| `docs/architecture/adr-carbon.md` | CRIADO - ADR com analise completa e decisao |
