# Story 1.1 - Backup e Export de Memoria Vetorial

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P0 - Urgente
**Agente:** @dev (Dex)
**Estimativa:** 16-24 horas
**Debitos:** DB-03

---

## Objetivo

Implementar sistema de backup e export/import da memoria vetorial do agente, protegendo contra perda de dados antes de qualquer mudanca no sqlite-vec ou schema.

---

## Criterios de Aceite

- [x] Comando `donna memory export` gera arquivo de backup (JSON ou SQLite dump)
- [x] Comando `donna memory import` restaura backup em nova instalacao
- [x] Backup inclui: episodic, pattern e identity memories
- [x] Backup inclui embeddings vetoriais (nao recalcula)
- [x] Backup automatico antes de migrations (integrar com Story 1.2)
- [x] Roundtrip test: export -> wipe -> import -> verify data integrity
- [x] Documentacao em `docs/cli/memory.md`

---

## Tasks

- [x] Analisar schema atual em `src/memory/`
- [x] Implementar `donna memory export --output backup.json`
- [x] Implementar `donna memory import --input backup.json`
- [x] Adicionar hook pre-migration para backup automatico
- [x] Escrever testes (roundtrip, corrupted input, large dataset)
- [x] Documentar comandos

---

## File List

| Arquivo | Acao |
|---------|------|
| `src/memory/backup.ts` | CRIADO - exportMemory/importMemory/parseBackup |
| `src/memory/backup.test.ts` | CRIADO - 11 testes (roundtrip, corrupted, empty) |
| `src/cli/memory-cli.ts` | MODIFICADO - registrou `donna memory export` e `donna memory import` |
| `src/memory/manager-sync-ops.ts` | MODIFICADO - hook de backup automatico pre-migration |
| `docs/cli/memory.md` | MODIFICADO - documentacao dos comandos export/import |

---

## Notas Tecnicas

- Usar `node:sqlite` builtin para dump direto
- Embeddings sao vetores float32 - serializar como base64 para compacidade
- Considerar streaming para datasets grandes (>100MB)
- Backup pre-migration usa `fs.copyFileSync` do arquivo .db (best-effort, non-fatal)

---

## Definition of Done

- [x] Testes passando
- [x] `pnpm check` limpo
- [x] Documentacao atualizada
- [ ] Review por @qa
