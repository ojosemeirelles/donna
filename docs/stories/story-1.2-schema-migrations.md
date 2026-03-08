# Story 1.2 - Schema Migrations para SQLite

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P0 - Urgente
**Agente:** @dev (Dex)
**Estimativa:** 12-16 horas
**Debitos:** DB-05

---

## Objetivo

Implementar sistema de migrations versionadas para o SQLite embarcado, permitindo evolucao controlada do schema da memoria vetorial.

---

## Criterios de Aceite

- [x] Tabela `schema_version` criada automaticamente na primeira execucao
- [x] Migration runner executa scripts pendentes em ordem
- [x] Migrations sao idempotentes (safe to re-run)
- [x] Backup automatico antes de cada migration (depende de Story 1.1)
- [x] Migrations vivem em `src/memory/migrations/v001_*.ts`
- [x] Comando `donna doctor` mostra versao do schema
- [x] Migration v001 reflete o schema atual (baseline)
- [x] Testes: up, re-run idempotente, versao invalida

---

## Tasks

- [x] Criar tabela `schema_version` com campos: version, applied_at, description
- [x] Implementar migration runner em `src/memory/migrations/runner.ts`
- [x] Criar migration v001 (baseline do schema atual)
- [x] Integrar com startup do gateway (auto-migrate on boot)
- [x] Adicionar check ao `donna doctor`
- [x] Escrever testes

---

## Dependencias

- **Story 1.1** (backup) deve estar completa antes de rodar migrations que alteram dados

---

## File List

| Arquivo | Acao |
|---------|------|
| `src/memory/migrations/types.ts` | CRIADO - Migration e SchemaVersionRow interfaces |
| `src/memory/migrations/v001-baseline.ts` | CRIADO - Baseline migration (CREATE TABLE IF NOT EXISTS) |
| `src/memory/migrations/runner.ts` | CRIADO - MigrationRunner com transacoes e rollback |
| `src/memory/migrations/index.ts` | CRIADO - Registry de migrations |
| `src/memory/migrations/runner.test.ts` | CRIADO - 10 testes |
| `src/memory/manager-sync-ops.ts` | MODIFICADO - integrou MigrationRunner no ensureSchema() + backup pre-migration |
| `src/commands/doctor-memory-search.ts` | MODIFICADO - noteMemorySchemaVersion() para donna doctor |
| `src/commands/doctor.ts` | MODIFICADO - chamada a noteMemorySchemaVersion() |

---

## Definition of Done

- [x] Testes passando
- [x] `pnpm check` limpo
- [x] Documentacao atualizada
- [ ] Review por @qa
