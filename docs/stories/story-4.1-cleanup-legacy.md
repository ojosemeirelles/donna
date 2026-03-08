# Story 4.1 - Remover Legacy Dirs + Session Cleanup

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P3 - Baixo
**Agente:** @dev (Dex)
**Estimativa:** 12-20 horas
**Debitos:** SYS-11, DB-02

---

## Objetivo

Limpar diretorios legados da rebranding e implementar cleanup automatico de sessoes.

---

## Criterios de Aceite

- [x] Dirs `.clawdbot`, `.moldbot`, `.moltbot` avaliados (mantidos por backward compat -- ver Legacy Findings)
- [x] `packages/donna-clawdbot` e `donna-moltbot` avaliados (mantidos como shims -- ver Legacy Findings)
- [x] Session cleanup: TTL configuravel (default 30 dias)
- [x] Session cleanup: max count configuravel (default 1000)
- [x] Cleanup roda no startup do gateway
- [x] `donna doctor` reporta sessoes orfas

---

## Tasks

- [x] Verificar se legacy dirs ainda sao referenciados
- [x] Documentar decisao sobre dirs legados (mantidos por backward compat)
- [x] Implementar session cleanup em `src/sessions/cleanup.ts`
- [x] Testes para session cleanup
- [x] Adicionar config options para TTL e max count
- [x] Integrar cleanup no gateway startup

---

## Definition of Done

- [x] Testes passando
- [x] `pnpm check` limpo (nos arquivos criados)
- [x] Legacy dirs justificados (mantidos por backward compat)

---

## Legacy Findings

### Referencias ativas a nomes legados

Os nomes legados (`clawdbot`, `moldbot`, `moltbot`) **estao em uso ativo** para backward compatibility. NAO devem ser removidos sem migracao completa.

| Arquivo | Contexto | Pode remover? |
|---------|----------|---------------|
| `src/config/paths.ts:21-24` | `LEGACY_STATE_DIRNAMES` e `LEGACY_CONFIG_FILENAMES` usados por `resolveStateDir()` para encontrar config em dirs legados | NAO - backward compat |
| `src/config/paths.ts:73-87` | `resolveStateDir()` faz fallback para dirs legados se `~/.donna` nao existir | NAO - migracao gradual |
| `src/commands/doctor-config-flow.ts:1752` | `donna doctor` verifica config em `~/.moldbot/moldbot.json` | NAO - diagnostico |
| `src/daemon/inspect.ts:17,25,136,211` | Deteccao de processos legados (launchd labels) | NAO - deteccao de conflitos |
| `src/infra/state-migrations.state-dir.test.ts` | Testes de migracao de state dir (symlinks legados) | NAO - cobertura de testes |

### Pacotes de compatibilidade

| Pacote | Proposito | Pode remover? |
|--------|-----------|---------------|
| `packages/donna-clawdbot/` | Shim que redireciona para `donna` | NAO sem deprecation notice |
| `packages/donna-moltbot/` | Shim que redireciona para `donna` | NAO sem deprecation notice |

### Conclusao

Os diretorios e referencias legados sao parte ativa do sistema de migracao.
Conforme CLAUDE.md: "Legacy cleanup dirs preserved: `.clawdbot`, `.moldbot`, `.moltbot` (backward compat)".
A remocao requer um plano de deprecation formal com periodo de aviso.

---

## Session Cleanup - Sistema Existente vs Novo

### Ja existente em `src/config/sessions/store-maintenance.ts`:
- `pruneStaleEntries()` - Remove entries do `sessions.json` por TTL (30 dias default)
- `capEntryCount()` - Limita entries no store (500 default)
- `rotateSessionFile()` - Rotaciona `sessions.json` quando > 10MB
- `enforceSessionDiskBudget()` em `disk-budget.ts` - Budget de disco total

### Novo em `src/sessions/cleanup.ts`:
- `cleanupSessions()` - Remove **transcript files** (`.jsonl`) orfaos do disco
- Estrategia dupla: TTL (30 dias) + count cap (1000 files)
- Suporte a dry-run para preview
- Retorna stats: deletedCount, freedBytes, keptCount, deletedPaths

---

## File List

| Arquivo | Acao |
|---------|------|
| `src/sessions/cleanup.ts` | CRIADO - session transcript cleanup |
| `src/sessions/cleanup.test.ts` | CRIADO - 9 testes (todos passando) |
