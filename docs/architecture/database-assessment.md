# Database Assessment - Donna Gateway

**Projeto:** Donna (AI Gateway)
**Data:** 2026-03-08
**Fase:** Brownfield Discovery - Fase 2 (Coleta: Database)
**Agente:** @data-engineer (Dara)

---

## 1. Visao Geral

Donna **NAO utiliza banco de dados externo**. Toda persistencia e feita via:

1. **SQLite embarcado** (`node:sqlite` builtin do Node 22+)
2. **sqlite-vec** (extensao vetorial, alpha 0.1.7-alpha.2)
3. **Arquivos JSON/YAML** no filesystem (`~/.donna/`)
4. **LanceDB** (opcional, via extension `memory-lancedb`)

---

## 2. Armazenamento de Dados

### 2.1 Memoria Vetorial (SQLite + sqlite-vec)

**Modulo:** `src/memory/`

| Tipo de Memoria | Descricao | Storage |
|----------------|-----------|---------|
| Episodic | Historico de conversas | SQLite + embeddings |
| Pattern | Associacoes aprendidas | SQLite + embeddings |
| Identity | Auto-modelo do agente | SQLite |

**Busca:** Hibrida (semantica via embeddings + BM25 full-text)

### 2.2 Sessoes

**Modulo:** `src/config/sessions.ts`

- Formato: JSON files em `~/.donna/sessions/`
- Chave: `agentId + channel + sender`
- Sem expiracao automatica

### 2.3 Configuracao

- `~/.donna/donna.json` ou `donna.yaml`
- Backup rotation automatico (`src/config/backup-rotation.ts`)
- Schema validation via Zod (80+ tipos)

### 2.4 Credenciais

- `~/.donna/credentials/` (web provider)
- keytar (macOS keychain) para secrets
- Encrypted at rest

---

## 3. Debitos Identificados (Database)

| ID | Debito | Severidade | Impacto |
|----|--------|-----------|---------|
| DB-01 | sqlite-vec em alpha (0.1.7-alpha.2) | Alto | API pode mudar, bugs potenciais |
| DB-02 | Sessoes como arquivos JSON (sem cleanup) | Medio | Acumulo de arquivos ao longo do tempo |
| DB-03 | Sem backup automatizado de memoria vetorial | Medio | Perda de dados em falha de disco |
| DB-04 | keytar deprecated upstream | Alto | Sem manutencao futura para secrets |
| DB-05 | Sem migrations versionadas (SQLite) | Medio | Dificuldade em evolucao do schema |
| DB-06 | LanceDB como alternativa nao integrada ao core | Baixo | Fragmentacao de backends |

---

## 4. Recomendacoes

1. **DB-01:** Monitorar sqlite-vec releases; ter fallback para busca sem SIMD
2. **DB-02:** Implementar session cleanup (TTL + max count)
3. **DB-03:** Adicionar export/import de memoria
4. **DB-04:** Migrar keytar para alternativa mantida (ex: @aspect-build/rules_js keychain)
5. **DB-05:** Implementar sistema de migrations para SQLite schema
6. **DB-06:** Avaliar consolidacao em um unico backend vetorial

---

*Documento gerado automaticamente - Brownfield Discovery Fase 2*
