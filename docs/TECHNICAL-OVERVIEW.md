# Donna — Technical Overview

> AI gateway pessoal que conecta modelos de linguagem a canais de mensagem, com sistema de evolucao, sub-agentes autonomos e inteligencia emocional.

**Versao:** 2026.3.3 | **Stack:** TypeScript, Node 22, pnpm monorepo, Vitest
**Origem:** Fork security-hardened de OpenClaw/MoltBot
**Data:** 2026-03-16

---

## Numeros do Projeto

| Metrica | Valor |
|---------|-------|
| Arquivos fonte (src/) | ~2.800 .ts |
| Testes | ~1.760 .test.ts |
| Extensions/plugins | ~500 .ts em 40+ plugins |
| Canais suportados | 15+ (Telegram, WhatsApp, Discord, Slack, Signal, iMessage, Line, Matrix, Teams, IRC, etc.) |
| CVEs corrigidos | 6 (auth, WebSocket, keychain, prompt injection, spending limits, DM policy) |

---

## Arquitetura de Alto Nivel

```
Usuario (Telegram/WhatsApp/Discord/...)
  |
  v
[Gateway :18789] ── Health Monitor (5min check, stale-socket detection)
  |
  ├── Channel Plugins (extensions/*) ── polling/webhook/websocket
  |
  ├── Auto-Reply Pipeline (src/auto-reply/)
  |     ├── Intent Classification (Shadow Orchestrator)
  |     ├── SOUL Engine (emotional context injection)
  |     ├── Evolution Engine (rank/XP tracking)
  |     ├── Memory Orchestrator (identity + patterns + episodic)
  |     ├── Gmail/Calendar on-demand queries
  |     └── LLM call (Claude/GPT/Gemini) com system prompt enriquecido
  |
  ├── Shadow Army (src/shadows/) ── 8 sub-agentes especializados
  |     └── Delegation via Pi embedded runner
  |
  ├── Hook System (src/hooks/bundled/) ── 24 hooks nativos
  |     └── Morning Brief, Gmail Watch, Cron jobs, etc.
  |
  └── Config (~/.donna/donna.json)
```

---

## Sistemas Implementados

### 1. Shadow Army (src/shadows/)

Sistema de sub-agentes inspirado em Solo Leveling. 8 shadows com roles especificos, desbloqueados por rank.

| Shadow | Role | Especialidade |
|--------|------|---------------|
| **Igris** | Commander | Orquestracao geral, soul commands |
| **Tusk** | Researcher | Pesquisa web, contexto |
| **Jima** | Monitor | Monitoramento, watch loop |
| **Iron** | Writer | Geracao de texto, reports |
| **Tank** | Scheduler | Agenda, calendar, cron |
| **Bellion** | Analyst | Analise de dados, email triage |
| **Kaisel** | Browser | Automacao web, scraping |
| **Beru** | Executor | Execucao de comandos, shell |

**Arquitetura:**
- `orchestrator.ts` — classifica intent via regex (PT+EN), despacha para shadow correto
- `session-manager.ts` — gerencia sessoes de shadow via Pi embedded runner
- `rank-unlock.ts` — desbloqueia shadows conforme o rank do usuario sobe
- `extractor.ts` — gera SOUL.md (personalidade) para cada shadow

### 2. Evolution Engine (src/evolution/)

Sistema de progressao gamificado com 8 ranks (E → SSS).

| Rank | Titulo | XP Necessario |
|------|--------|---------------|
| E | Iniciante | 0 |
| D | Aprendiz | 100 |
| C | Assistente | 500 |
| B | Estrategista | 2000 |
| A | Autonoma | 5000 |
| S | Mestre | 15000 |
| SS | Lenda | 50000 |
| SSS | Transcendente | 150000 |

**Tracking:** interacoes, dias ativos, tasks, erros resolvidos, skills usadas, streak.
**Persistencia:** `~/.donna/evolution.json`
**Integracao:** cada resposta inclui `[Evolution] Rank X: Titulo | XP: N/M | Streak: Nd`

### 3. SOUL Engine (src/soul/) — 15 modulos

Inteligencia emocional que analisa CADA mensagem do usuario.

| Modulo | Funcao |
|--------|--------|
| `voice-analyzer.ts` | Energia, humor, estresse por mensagem |
| `psychometrics.ts` | Big Five (OCEAN), DISC, Zona de Genialidade |
| `relational-memory.ts` | Tracking de pessoas mencionadas, sentimentos |
| `dream-vault.ts` | Captura sonhos e aspiracoes |
| `productivity-map.ts` | Mapa de energia por hora/dia da semana |
| `pattern-detector.ts` | Procrastinacao, evitacao, vieses cognitivos |
| `network-intel.ts` | Saude relacional por categoria |
| `growth-curator.ts` | Recomendacoes de livros, mentores |
| `shadow-finance.ts` | Padroes emocionais com dinheiro |
| `celebration.ts` | Vitorias, streaks, marcos |
| `soul-profile.ts` | Perfil unificado + observations.jsonl |
| `engine.ts` | Orquestrador (processMessage, handleSoulCommand) |

**Pipeline:** `processMessage()` roda em toda mensagem → injeta `[Soul] Energia: X | Humor: Y | Estresse: Z/10` no system prompt.

### 4. Memory System (src/memory/)

3 camadas de memoria vetorial com embeddings.

| Camada | Funcao | Exemplo |
|--------|--------|---------|
| **Identity** | Quem e o usuario | Nome, preferencias, tom |
| **Pattern** | Padroes recorrentes | "Sempre pede resumo as 7h" |
| **Episodic** | Eventos especificos | "Reuniao com X em 2026-03-10" |

**Backend:** SQLite + sqlite-vec (vector search local)
**Embeddings:** OpenAI, Gemini, Voyage, Ollama, Mistral (multi-provider)
**Orquestrador:** `memory-orchestrator.ts` injeta contexto em cada sessao

### 5. Hook System (src/hooks/bundled/) — 24 hooks

Skills proativas que a Donna executa automaticamente ou sob demanda.

**Tier 1 (Core):**
- `morning-brief` — Resumo diario as 7h (email, agenda, soul, foco)
- `gmail-watch` — Monitoramento de emails
- `evolution-report` — Relatorio semanal de evolucao

**Tier 2 (Produtividade):**
- `google-calendar` — Agenda, conflitos, queries
- `stripe-monitor` — Alertas de pagamento, MRR
- `notion-sync` — CRUD de tasks, sync periodico
- `google-drive` — Monitoramento de arquivos

**Tier 3 (Automacao):**
- `browser-agent` — Automacao web conversacional
- `whatsapp-send` — Envio proativo com confirmacao
- `social-poster` — Posting Instagram/LinkedIn/Twitter
- `analytics-report` — Relatorio GA4 com deteccao de queda
- `google-ads-monitor` — Campanhas com alertas CPC
- `airtable-crm` — Gestao de leads
- `slack-bridge` — Forwarding urgente
- `github-monitor` — PR/issue tracking
- `shopify-dashboard` — Pedidos e estoque
- `home-assistant` — Smart home por linguagem natural

### 6. Token Intelligence (src/infra/)

Otimizacao de custos por modelo.

| Componente | Funcao |
|-----------|--------|
| `model-router.ts` | Classifica haiku/sonnet/opus por complexidade |
| `auto-compact.ts` | Compacta sessao quando contexto fica grande |
| `prompt-cache.ts` | cache_control ephemeral para reducao de custo |

### 7. Channel Health Monitor (src/gateway/)

Monitoramento automatico de canais com auto-recovery.

- Check a cada 5 minutos
- Stale socket detection (30min threshold)
- Rate limiting: max 10 restarts/hora
- Backoff exponencial: 5s → 10s → 20s → 40s (max 5min)
- Suporta: Telegram (polling), Discord (WebSocket), Slack (WebSocket), WhatsApp (Baileys)

---

## Stories Concluidas

| ID | Titulo | Status |
|----|--------|--------|
| DONNA-001 | Rebranding OpenClaw → Donna | Done |
| DONNA-002 | Shadow Army System | Done |
| DONNA-003 | Electron Desktop App Fixes | Done |
| DONNA-004 | Shadow Sessions — Real Agent Delegation | Done |
| Epic 5.1 | Token Intelligence no pipeline | Done |
| Epic 5.2 | Memory Orchestrator no gateway | Done |
| Epic 5.3 | Fix Wizard HTML | Done |
| Epic 5.4 | Evolution Engine (8 ranks) | Done |
| Epic 5.5 | Evolution Report semanal | Done |
| Epic 5.6 | Gemini model integration | Done |
| Epic 5.7 | Telegram pairing no Wizard | Done |
| Story 6.1 | Estabilizacao para producao | Em progresso |

## Backlog

| ID | Titulo | Descricao |
|----|--------|-----------|
| DONNA-005 | Gmail Intelligence | Alerta automatico de emails urgentes via Pub/Sub |
| DONNA-006 | Daily Brief completo | Agenda + emails + contexto dos participantes |
| DONNA-007 | Proactive Watch Loop | Jima monitorando condicoes configuraveis em background |
| DONNA-008 | End of Day Report | Bellion consolida dia as 18:00 |

---

## Seguranca

- 6 CVEs corrigidos (auth bypass, WebSocket hijack, keychain leak, prompt injection, spending limits, DM policy)
- DM policy per-channel (pairing, open, allowlist)
- Rate limiting no gateway
- Allowlists por grupo e por usuario
- Credenciais em `~/.donna/credentials/` (gitignored)

---

## Como Rodar

```bash
# Instalar dependencias
pnpm install

# Dev mode
pnpm donna gateway --port 18789 --force

# Testes
pnpm test

# Lint + format
pnpm check

# Typecheck
pnpm tsgo
```

**Config:** `~/.donna/donna.json`
**Gateway:** porta 18789 (local)
**Telegram bot:** @CarmeliaBybot

---

## Decisoes Tecnicas Relevantes

1. **ESM puro** — sem CommonJS, import maps via jiti para plugins
2. **Oxlint + Oxfmt** — substituiu ESLint/Prettier (10x mais rapido)
3. **Grammy** — framework Telegram (polling + webhook + runner concorrente)
4. **SQLite + sqlite-vec** — vector search local sem servidor externo
5. **Multi-provider embeddings** — graceful fallback entre OpenAI, Gemini, Voyage, Ollama
6. **Hook system** — plugins declarativos com HOOK.md + handler.ts
7. **Shadow delegation via Pi runner** — cada shadow executa em sessao isolada
8. **Channel health monitor** — auto-recovery sem intervenção humana
