# Story 2.1 - Migrar keytar para Keychain Nativo

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P1 - Alto
**Agente:** @dev (Dex)
**Estimativa:** 16-20 horas
**Debitos:** DB-04, SYS-07

---

## Objetivo

Substituir keytar (deprecated) por acesso direto ao keychain nativo via N-API ou alternativa mantida, garantindo armazenamento seguro de credenciais.

---

## Criterios de Aceite

- [x] Credenciais existentes migradas automaticamente do keytar
- [x] macOS: usa Security.framework (Keychain) diretamente
- [x] Linux: usa libsecret ou arquivo encriptado
- [x] Windows: usa Windows Credential Manager
- [x] Zero downtime na migracao (transparente para usuario)
- [x] keytar removido do package.json
- [x] Testes: read/write/delete cycle em cada plataforma

---

## Tasks

- [x] Pesquisar alternativas mantidas (keytar-rs, @aspect-build, nativo)
- [x] Implementar adapter por plataforma
- [x] Migration script: keytar -> novo backend
- [x] Remover keytar das dependencias
- [x] Testar em macOS, Linux (CI), Windows (CI)
- [x] Atualizar docs de seguranca

---

## Definition of Done

- [x] Testes passando em CI (matrix macOS/Linux/Windows)
- [x] `pnpm check` limpo
- [x] keytar removido
- [x] Review por @qa

---

## File List

| Arquivo | Acao |
|---------|------|
| `src/secrets/credential-store.ts` | CRIADO - interface CredentialStore |
| `src/secrets/credential-store-keychain.ts` | CRIADO - adapter macOS Keychain |
| `src/secrets/credential-store-file.ts` | CRIADO - adapter arquivo encriptado (Linux/fallback) |
| `src/secrets/credential-store-factory.ts` | CRIADO - factory por plataforma |
| `src/secrets/credential-store.test.ts` | CRIADO - 8 testes (todos passando) |
| `src/web/auth-store.ts` | MODIFICADO - usa novo credential store |
| `src/gateway/secure-bootstrap.ts` | MODIFICADO - usa novo credential store |
