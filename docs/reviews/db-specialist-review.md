# Database Specialist Review

**Projeto:** Donna (AI Gateway)
**Data:** 2026-03-08
**Fase:** Brownfield Discovery - Fase 5 (Validacao: Database)
**Agente:** @data-engineer (Dara)

---

## Debitos Validados

| ID | Debito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|-----------|-------|
| DB-01 | sqlite-vec alpha (0.1.7-alpha.2) | **Critico** (ajustado de Alto) | 12-20h | P0 | Alpha em producao e risco real. Precisa de fallback path. Node 22 `node:sqlite` builtin ajuda, mas sqlite-vec e pre-release |
| DB-02 | Sessoes JSON sem cleanup | Medio | 8-12h | P2 | Aceitavel para uso pessoal (single-user). Problema emerge com uso intensivo por meses |
| DB-03 | Sem backup de memoria vetorial | **Alto** (ajustado de Medio) | 16-24h | P1 | Memoria episodica e valiosa. Perda = perda de contexto do agente |
| DB-04 | keytar deprecated | Alto | 16-20h | P1 | Confirmo: keytar nao recebe updates. Migrar para macOS Keychain nativo via N-API |
| DB-05 | Sem migrations versionadas | Medio | 12-16h | P2 | SQLite embarcado dificulta migrations tradicionais, mas precisa de strategy |
| DB-06 | LanceDB nao integrado | Baixo | 8-12h | P3 | Manter como extension. SQLite-vec como default e correto |

## Debitos Adicionados

| ID | Debito | Severidade | Horas | Prioridade |
|----|--------|-----------|-------|-----------|
| DB-07 | Sem metricas de uso de memoria vetorial | Medio | 8-12h | P2 |
| DB-08 | Embedding model hardcoded no schema | Medio | 4-8h | P2 |
| DB-09 | Sem compactacao/pruning de memorias antigas | Baixo | 12-16h | P3 |

## Respostas ao Architect

### 1. sqlite-vec alpha e aceitavel para producao?
**Nao para uso critico.** Recomendo:
- Manter sqlite-vec como engine principal (performance e boa com SIMD)
- Implementar fallback para busca brute-force sem extensao
- Monitorar releases e atualizar assim que sair de alpha
- Considerar testes de regressao especificos para vector search

### 2. Estrategia de migrations para SQLite embarcado?
- Usar version table (`schema_version`) com migration scripts sequenciais
- Migrations devem ser idempotentes (safe to re-run)
- Backup automatico antes de cada migration
- Pattern: `src/memory/migrations/v001_initial.ts`, `v002_add_index.ts`

### 3. Sessoes JSON escalaveis para milhares de usuarios?
**Donna e single-user** (trusted-operator model), entao milhares de usuarios nao e o cenario. Mas:
- Para centenas de sessoes (um operador com muitos canais/agentes): funciona
- Para milhares: precisaria migrar para SQLite table
- Recomendacao: manter JSON para agora, planejar migracao se crescer

## Recomendacoes

### Ordem de Resolucao

1. **DB-01 (sqlite-vec):** Implementar fallback path + testes de regressao
2. **DB-04 (keytar):** Migrar para alternativa mantida
3. **DB-03 (backup):** Export/import de memoria vetorial
4. **DB-05 (migrations):** Schema versioning
5. **DB-02 (cleanup):** Session TTL + rotation
6. **DB-07/08 (metricas/config):** Observabilidade
7. **DB-09 (pruning):** Memoria aging

### Dependencias Entre Debitos
- DB-05 (migrations) bloqueia qualquer mudanca em DB-01 (schema changes)
- DB-03 (backup) deve vir antes de DB-01 (mudancas no sqlite-vec podem quebrar dados)

---

*Revisao de especialista - Brownfield Discovery Fase 5*
