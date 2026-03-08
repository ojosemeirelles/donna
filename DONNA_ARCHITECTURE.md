# Donna — Arquitetura do Sistema

> Revisao do PRD + Arquitetura tecnica definida por @architect (Aria)
> Baseado em analise do codebase real em 2026-03-08

---

## Parte 1: Revisao do PRD

### O que o PRD diz vs. o que existe no codigo

| Claim do PRD | Status | Evidencia |
|---|---|---|
| 20 CVEs cobertos | ✅ Confirmado | Commits d66ff8458, bf7579be4, 8d158524b |
| Auth com OS Keychain via keytar | ⚠️ Parcial | keytar ainda usado em `src/web/auth-store.ts`, mas Story 2.1 criou `credential-store` abstractions para substituir |
| WebSocket origin validation | ✅ Confirmado | `src/gateway/server/ws-connection/connect-policy.ts` |
| DM policy enforcement | ✅ Confirmado | `src/channels/allowlists/` |
| Prompt injection web bloqueado | ✅ Confirmado | `src/infra/net/fetch-guard.ts`, CVE-2026-25157 |
| Spending limits enforçados | ✅ Confirmado | `src/infra/context-budget.ts`, CVE-2026-26134 |
| Model Router (Haiku/Sonnet/Opus) | ✅ Confirmado | `src/infra/model-router.ts` — classificacao por keywords + tokens |
| Auto-Compact 70% threshold | ✅ Confirmado | `src/infra/auto-compact.ts` — preserva ultimas 10 msgs |
| Prompt Cache Manager | ✅ Confirmado | `src/infra/prompt-cache.ts` — cache_control ephemeral + heartbeat 4min |
| Context Budget | ✅ Confirmado | `src/infra/context-budget.ts` |
| Cost Report Hook 20h | ✅ Confirmado | `src/hooks/bundled/cost-report/handler.ts` |
| Morning Brief 7h | ✅ Confirmado | `src/hooks/bundled/morning-brief/handler.ts` |
| Memory 3 camadas | ✅ Confirmado | `src/memory/identity-memory.ts`, `pattern-memory.ts`, `episodic-memory.ts` |
| Memory Orchestrator | ✅ Confirmado | `src/memory/memory-orchestrator.ts` — injeta contexto no bootstrap |
| Consolidacao semanal | ✅ Confirmado | `src/hooks/bundled/memory-consolidation/handler.ts` |
| Desktop Electron + Tray | ✅ Confirmado | `apps/desktop/src/main.ts`, `tray-manager.ts` |
| Setup Wizard 5 steps | ✅ Confirmado | `apps/desktop/src/wizard/wizard-state.ts` |
| GatewayManager auto-restart | ✅ Confirmado | `apps/desktop/src/gateway-manager.ts` |
| Build .dmg + .exe | ✅ Confirmado | `apps/desktop/electron-builder.yml` |
| **Sistema de Niveis (1-5)** | ❌ NAO EXISTE | Zero codigo. Nenhum tracking de nivel, progressao, ou XP |
| **Relatorio de Evolucao Semanal** | ❌ NAO EXISTE | Memory consolidation existe, mas nao o relatorio RPG com niveis |
| **@DonnaSetupBot Telegram** | ❌ NAO EXISTE | Pareamento via wizard usa token manual |
| **SecureHub marketplace** | ❌ NAO EXISTE | Skills existem, mas nao ha marketplace |
| **Billing Supabase + Stripe** | ❌ NAO EXISTE | Fase 2 do roadmap |
| **Autonomous Loop** | ❌ NAO EXISTE | Fase v2.0 do roadmap |

### Gaps criticos para v1.1

O PRD define o sistema de niveis como a essencia do produto ("alma de RPG"), mas tem **zero implementacao**. Isso e o gap #1 para a v1.1.

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Sistema de Niveis (tracking + progressao) | Core differentiator — sem isso Donna e "so mais um chatbot" | P0 |
| Relatorio de Evolucao Semanal | Engagement + retention — usuario ve progresso | P0 |
| Wizard HTML renderizando | First impression — onboarding quebrado = churn | P1 |
| @DonnaSetupBot Telegram | Reduce friction — pareamento sem copiar tokens | P1 |
| Gemini model fix | Margem — Gemini e mais barato que Claude | P2 |

### Correcoes ao PRD

1. **Stack tecnico**: PRD diz "Auth: keytar" — deve dizer "Auth: credential-store (macOS Keychain / AES-256-GCM file fallback)" pois keytar esta sendo substituido
2. **Stack tecnico**: Falta mencionar PI framework (`@mariozechner/pi-*`) que e o core do agent runtime
3. **Stack tecnico**: Falta mencionar Baileys (WhatsApp), grammy (Telegram), discord.js (Discord)
4. **Canal principal**: PRD diz "Telegram" mas a arquitetura suporta 7 canais nativos + 35 extensoes. Telegram e default, nao unico
5. **v1.0 implementado**: Secao diz "implementado" mas o sistema de niveis (a essencia) nao existe. Deve ser "v1.0 — Infraestrutura Implementada"

---

## Parte 2: Arquitetura do Sistema

### Visao Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        DONNA SYSTEM                         │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │  Desktop   │  │    CLI    │  │  Web UI   │   Surfaces    │
│  │ (Electron) │  │ (donna *) │  │ (:18789)  │               │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘               │
│        │               │              │                     │
│  ┌─────┴───────────────┴──────────────┴─────┐               │
│  │            GATEWAY SERVER                 │               │
│  │         HTTP + WebSocket :18789           │               │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │               │
│  │  │ Channels │ │  Agent   │ │  Cron    │  │               │
│  │  │ Manager  │ │  Runner  │ │ Service  │  │               │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘  │               │
│  └───────┼─────────────┼────────────┼────────┘               │
│          │             │            │                        │
│  ┌───────┴───┐   ┌─────┴─────┐  ┌──┴──────────────┐        │
│  │ Channels  │   │ AI Layer  │  │ Scheduled Jobs   │        │
│  │           │   │           │  │                  │        │
│  │ Telegram  │   │ PI Frmwk  │  │ Morning Brief   │        │
│  │ WhatsApp  │   │ Model Rtr │  │ Cost Report     │        │
│  │ Discord   │   │ AutoCmpct │  │ Memory Consol.  │        │
│  │ Slack     │   │ PrmptCach │  │ (Niveis - TODO) │        │
│  │ Signal    │   │ CostBudgt │  │                  │        │
│  │ iMessage  │   │           │  └──────────────────┘        │
│  │ LINE      │   │ Skills    │                              │
│  │ +35 ext   │   │ Tools     │                              │
│  └───────────┘   └─────┬─────┘                              │
│                        │                                    │
│                  ┌─────┴─────┐                              │
│                  │  Memory   │                              │
│                  │  System   │                              │
│                  │           │                              │
│                  │ Identity  │  ~/.donna/memory/             │
│                  │ Patterns  │  ~/.donna/memory/             │
│                  │ Episodic  │  ~/.donna/memory/             │
│                  │ VecSearch │  ~/.donna/memory/*.sqlite     │
│                  │ (Niveis   │                              │
│                  │  - TODO)  │                              │
│                  └───────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Camada 1: Surfaces (UI)

Tres pontos de entrada para o usuario:

| Surface | Tecnologia | Proposito |
|---------|-----------|-----------|
| Desktop App | Electron (TypeScript) | Instalar, ligar, esquecer. Gateway auto-gerido |
| CLI | Commander.js (TypeScript) | Power users, config, diagnostico |
| Web UI | Lit Components (HTML/CSS/JS) | Dashboard em `localhost:18789`, controle visual |

**Fluxo do Desktop:**
```
App abre → Wizard? → Configura API key + Telegram → Inicia Gateway → Tray icon
                                                          ↓
                                                   Auto-restart (3x backoff)
```

**Nota critica:** O Wizard HTML tem bug de renderizacao (v1.1 fix).

---

### Camada 2: Gateway Server

Processo Node.js que roda em `localhost:18789`. E o coracao da Donna.

**Startup Sequence (18 steps):**
1. Load config → validate → migrate legacy
2. Initialize auth rate limiters
3. Load channel plugins + manager
4. Initialize agent event handler
5. Create exec approval manager
6. Load TLS + HTTP server
7. Attach WebSocket handlers
8. Start channel health monitor
9. Build cron service (morning brief, cost report, consolidation)
10. Start mDNS discovery
11. Start Tailscale exposure (se configurado)
12. Start maintenance timers
13. Load + init plugins
14. Register global hook runners
15. Prime remote skills cache
16. Startup auth check
17. Schedule update checker
18. Emit "gateway ready"

**Protocolo:** JSON-RPC sobre WebSocket com schema tipado (`src/gateway/protocol/schema.ts`).

---

### Camada 3: Channel System

**Abstracoes:**
- `SessionEnvelope` — mensagem normalizada entre canais
- `ChannelManager` — broadcast/subscribe
- `Routing` — mapeia (canal + peer) → (agente + session key)

**Fluxo de mensagem (Telegram como exemplo):**
```
Usuario manda msg no Telegram
  ↓
grammy bot handler (src/telegram/bot.ts)
  ↓
Normaliza → SessionEnvelope
  ↓
Gateway server-chat.ts
  ↓
resolve-route.ts → (agent=default, session=telegram:user:123)
  ↓
PI Embedded Runner (cria sessao com model tier)
  ↓
Agent executa (tools + skills + memory context)
  ↓
Resposta via draft-stream-loop.ts
  ↓
Telegram outbound → usuario recebe
```

**Canais nativos (7):**

| Canal | Lib | Arquivo principal |
|-------|-----|-------------------|
| Telegram | grammy | `src/telegram/bot.ts` |
| WhatsApp | Baileys | `src/web/inbound.ts` |
| Discord | discord.js | `src/discord/` |
| Slack | @slack/bolt | `src/slack/` |
| Signal | signal-cli | `src/signal/` |
| iMessage | applescript | `src/imessage/` |
| LINE | @line/bot-sdk | `src/line/` (via extension) |

**Extensoes (35+):** `extensions/` — cada uma e um workspace package com `package.json` proprio.

---

### Camada 4: AI Layer (Token Intelligence)

O sistema de inteligencia que otimiza custo e performance:

**4a. Model Router** (`src/infra/model-router.ts`)
```
Mensagem chega
  ↓
Estima tokens + analisa keywords
  ↓
< 500 tokens + keyword simples → Haiku ($0.25/M)
500-2000 tokens + tarefa media   → Sonnet ($3/M)
> 2000 tokens OU keyword complexa → Opus ($15/M)
  ↓
Contexto acumulado > 50k tokens? → Promove haiku→sonnet
Cron job? → Forca Haiku (economia)
```

**4b. Auto-Compact** (`src/infra/auto-compact.ts`)
```
A cada turn do agente:
  ↓
Calcula usageRatio = currentTokens / contextWindow
  ↓
Se > 70% → Dispara compactacao:
  1. Extrai decisoes-chave
  2. Extrai tasks pendentes
  3. Extrai credenciais mencionadas
  4. Extrai fatos importantes
  5. Preserva ultimas 10 mensagens verbatim
  6. Gera prompt compacto de resumo
```

**4c. Prompt Cache** (`src/infra/prompt-cache.ts`)
```
System prompt (estatico, ~2k tokens)
  ↓
Marca com cache_control: { type: "ephemeral" }
  ↓
Anthropic cacheia no server-side (5min TTL)
  ↓
Heartbeat a cada 4min estende TTL
  ↓
Cache hit = ~90% reducao no custo do system prompt
```

**4d. Context Budget** (`src/infra/context-budget.ts`)
```
Cada sessao tem budget de tokens:
  ↓
bootstrapTier: minimal (cron) | standard (chat) | full (complex)
  ↓
Track spending por provider
  ↓
Enforce spending limits (CVE-2026-26134 fix)
```

---

### Camada 5: Memory System

Tres camadas de memoria persistente em `~/.donna/memory/`:

**5a. Identity Memory** — "Quem e o usuario?"
- Arquivo: `~/.donna/memory/identity.json`
- Conteudo: nome, idioma, timezone, preferencias, expertise
- Carregado: sempre, no inicio de cada sessao
- Atualizacao: agente pode escrever via tool

**5b. Pattern Memory** — "Como o usuario interage?"
- Arquivo: `~/.donna/memory/patterns.json`
- Conteudo: eventos (tool_use, session_start), summary (top tools, horarios ativos)
- Carregado: summary injetado no contexto
- Atualizacao: `recordEvent()` a cada interacao

**5c. Episodic Memory** — "O que aconteceu recentemente?"
- Diretorio: `~/.donna/memory/episodes/YYYY-MM-DD.json`
- Conteudo: log de interacoes do dia
- Carregado: hoje + ontem (2 dias de contexto)
- Consolidacao: hook diario gera summaries

**5d. Vector Search** — Busca semantica
- SQLite: `~/.donna/memory/{agentId}.sqlite`
- Engine: sqlite-vec (nativo) com fallback BruteForce (JS)
- Schema: versionado via MigrationRunner
- Backup: automatico antes de migrations

**Orquestrador** (`memory-orchestrator.ts`):
```
Session start
  ↓
loadIdentity() + loadPatternStore() + loadEpisodeSummary(today) + loadEpisodeSummary(yesterday)
  ↓
Monta bloco de contexto markdown:
  "## Sobre o usuario\n{identity}\n## Padroes\n{patterns}\n## Ontem\n{yesterday}\n## Hoje\n{today}"
  ↓
Injeta no MEMORY.md do agent bootstrap
  ↓
Erro em qualquer camada? → Log warning, continua sem. Memory NUNCA quebra sessao.
```

---

### Camada 6: Skills & Extensions

**Skills** = capacidades que o agente pode usar (built-in ou plugin):
- `src/agents/skills/` — carregamento, serializacao, config
- `src/agents/tools/` — 75+ tools (bash, read, write, edit, grep, glob, browser, etc.)
- Skills carregadas de `extensions/` via plugin system

**Hooks** = acoes automaticas em schedule ou evento:
- `src/hooks/bundled/morning-brief/` — Brief diario 7h
- `src/hooks/bundled/cost-report/` — Report diario 20h
- `src/hooks/bundled/memory-consolidation/` — Consolidacao diaria

**Plugin System** (`src/plugins/`):
- Registry dinamico
- Hook runner global
- Lifecycle gerenciado pelo gateway

---

### Camada 7: Cron & Jobs

**Cron Service** (`src/cron/`):
- Schedule parser (cron expressions)
- Job store persistente
- Isolated Agent Runner — roda jobs em sessoes isoladas, sempre em Haiku (economia)

| Job | Schedule | Handler |
|-----|----------|---------|
| Morning Brief | `0 7 * * *` (7h diario) | `morning-brief/handler.ts` |
| Cost Report | `0 20 * * *` (20h diario) | `cost-report/handler.ts` |
| Memory Consolidation | `0 3 * * *` (3h diario) | `memory-consolidation/handler.ts` |
| **Evolution Report** | **TODO — `0 10 * * 0` (dom 10h)** | **NAO IMPLEMENTADO** |

---

### Camada 8: Seguranca

**Defense in depth:**

| Camada | Mecanismo | Arquivo |
|--------|-----------|---------|
| Network | SSRF protection | `src/infra/net/ssrf.ts` |
| Network | Fetch guard | `src/infra/net/fetch-guard.ts` |
| Auth | Rate limiting | `src/gateway/auth-rate-limit.ts` |
| Auth | Device auth | `src/gateway/device-auth.ts` |
| Auth | Credential store | `src/secrets/credential-store.ts` |
| WebSocket | Origin validation | `ws-connection/connect-policy.ts` |
| WebSocket | Flood guard | `ws-connection/unauthorized-flood-guard.ts` |
| Channel | DM allowlist | `src/channels/allowlists/` |
| Agent | Exec approval | `src/infra/exec-approval-manager.ts` |
| Agent | Prompt injection detection | `src/infra/net/fetch-guard.ts` |
| Spending | Token budget enforcement | `src/infra/context-budget.ts` |

---

### Camada 9: Dados & Storage

Tudo local, nenhum backend cloud (Fase 1):

| Dado | Formato | Local |
|------|---------|-------|
| Config | JSON | `~/.donna/config.json` |
| Sessions | JSON | `~/.donna/sessions.json` |
| Credentials | Encrypted file / OS Keychain | `~/.donna/credentials/` |
| Memory (identity) | JSON | `~/.donna/memory/identity.json` |
| Memory (patterns) | JSON | `~/.donna/memory/patterns.json` |
| Memory (episodes) | JSON/dir | `~/.donna/memory/episodes/` |
| Memory (vectors) | SQLite | `~/.donna/memory/{agent}.sqlite` |
| Transcripts | JSONL | `~/.donna/agents/{agent}/sessions/*.jsonl` |
| Cron jobs | JSON | `~/.donna/cron/` |

---

## Parte 3: Arquitetura do Sistema de Niveis (NOVO — a implementar)

O sistema de niveis e o core differentiator da Donna. Proposta de arquitetura:

### Modulo: `src/evolution/`

```
src/evolution/
├── level.ts              # Definicao dos 5 niveis + criterios
├── tracker.ts            # Tracking de progresso (interacoes, dias, skills)
├── progression.ts        # Logica de progressao (check criteria → level up)
├── report.ts             # Geracao do relatorio semanal
├── insights.ts           # Analise de padroes para "O que aprendi sobre voce"
├── initiatives.ts        # Sugestoes autonomas baseadas em padroes
├── index.ts              # Barrel export
├── level.test.ts
├── tracker.test.ts
├── progression.test.ts
└── report.test.ts
```

### Schema de dados

```typescript
type DonnaLevel = 1 | 2 | 3 | 4 | 5;

type EvolutionState = {
  currentLevel: DonnaLevel;
  leveledUpAt: string[];           // timestamps de cada level up
  firstInteractionAt: string;      // data da primeira interacao
  stats: {
    totalInteractions: number;
    totalDaysActive: number;
    totalTasksCompleted: number;
    totalTokensUsed: number;
    totalTokensSaved: number;       // via Token Intelligence
    skillsUsed: Record<string, number>;
    activeHours: number[];          // [0-23] distribuicao
    weeklyTasks: number[];          // ultimas 12 semanas
  };
  cacheHitRate: number;
  streakDays: number;              // dias consecutivos de uso
};

type LevelCriteria = {
  level: DonnaLevel;
  name: string;
  requirements: {
    minDaysActive?: number;
    minInteractions?: number;
    minSkillsUsed?: number;
    minStreakDays?: number;
    requiresPlan?: "Business";
  };
  unlocks: string[];               // features desbloqueadas
};
```

### Storage

- Arquivo: `~/.donna/evolution.json`
- Atualizado: a cada interacao (append stats)
- Verificacao de level up: a cada interacao + no cron semanal

### Integracao

1. **Memory Orchestrator** → carrega `evolution.json` no contexto do agente
2. **Pattern Memory** → alimenta stats do tracker
3. **Cron Service** → novo job "evolution-report" todo domingo 10h
4. **Telegram** → envia relatorio formatado com emojis
5. **Model Router** → pode usar nivel para decidir tier (Nivel 4+ = mais Opus)

---

## Parte 4: Decisoes Arquiteturais (ADRs)

### ADR-001: Local-first, nenhum backend cloud

**Decisao:** Toda data fica no filesystem do usuario (`~/.donna/`).
**Motivo:** Privacidade, zero infra cost na Fase 1, simplicidade.
**Consequencia:** Limita multi-device. Resolvido na v1.3 com Donna Cloud.

### ADR-002: PI Framework como agent runtime

**Decisao:** Manter `@mariozechner/pi-*` com adapter pattern.
**Motivo:** Funciona, tem 75+ tools, session management maduro.
**Risco:** Pre-1.0, API pode mudar. Adapter (`src/agents/runtime/`) mitiga.
**Consequencia:** 144 arquivos importam PI diretamente (migracao gradual).

### ADR-003: Telegram como canal primario

**Decisao:** Telegram e o default, outros canais sao bonus.
**Motivo:** Ubiquito, API rica (bots, inline, formatting), sem custo.
**Consequencia:** Morning brief, cost report, evolution report — tudo via Telegram.

### ADR-004: Model stack Claude + Gemini

**Decisao:** Claude para qualidade (Opus/Sonnet), Gemini para margem (Flash/Pro).
**Motivo:** Token Intelligence roteia automaticamente. Claude custa mais mas e melhor para raciocinio.
**Consequencia:** Na v1.3, comprar API em volume e revender com markup viavel.

### ADR-005: Electron para desktop (Windows), SwiftUI para macOS

**Decisao:** Convergir para SwiftUI no macOS (33+ features), Electron so Windows.
**Motivo:** SwiftUI e nativo, melhor UX, menor overhead. Electron duplica esforco.
**Referencia:** `docs/architecture/desktop-convergence-plan.md`

### ADR-006: Carbon framework frozen

**Decisao:** Manter @buape/carbon na versao atual, nao atualizar.
**Motivo:** 61 arquivos dependem, beta 0.0.0, migracao impraticavel.
**Referencia:** `docs/architecture/adr-carbon.md`

---

## Parte 5: Diagramas de Fluxo

### Fluxo principal: Usuario → Donna → Resposta

```
[Usuario]
    │
    │ "Donna, agenda uma reuniao amanha as 10h"
    ▼
[Telegram Bot] ─── grammy handler
    │
    │ SessionEnvelope { text, peerId, channelId }
    ▼
[Gateway Server] ─── server-chat.ts
    │
    │ resolveRoute() → agent: "default", session: "tg:user:123"
    ▼
[Model Router] ─── classifica: < 500 tokens, keyword simples → Haiku
    │
    ▼
[PI Embedded Runner] ─── cria sessao com Haiku
    │
    │ Bootstrap: system prompt + MEMORY.md (identity + patterns + episodic)
    │            + evolution level context (TODO)
    ▼
[Agent executa]
    │ Tool: calendar_create(title="Reuniao", time="2026-03-09T10:00")
    │ → Resposta: "Reuniao agendada para amanha 10h ✓"
    ▼
[draft-stream-loop] ─── streaming response
    │
    ▼
[Telegram outbound] ─── envia para usuario
    │
    ▼
[Tracker] ─── recordInteraction() → evolution.json (TODO)
    │         recordEvent() → pattern-memory
    │         appendEpisodeEntry() → episodic-memory
```

### Fluxo: Morning Brief (Cron)

```
[Cron Service] ─── 7:00 AM dispara
    │
    ▼
[Isolated Agent Runner] ─── sessao isolada, Model: Haiku
    │
    │ Prompt: "Generate morning brief for {user.name}"
    │ Context: identity + patterns + today's calendar + unread emails
    ▼
[Agent executa com tools]
    │ → email_list(unread=true)
    │ → calendar_today()
    │ → task_list(pending=true)
    ▼
[Format brief]
    │
    │ "☀️ Bom dia Jose! Hoje voce tem..."
    ▼
[Telegram send] ─── envia para telegramChatId configurado
```

### Fluxo: Evolution Report (TODO — Semanal)

```
[Cron Service] ─── Domingo 10:00 AM
    │
    ▼
[Evolution Tracker] ─── carrega evolution.json
    │
    │ Calcula: tasks desta semana, padroes novos, tokens salvos
    │ Verifica: criterios do proximo nivel atendidos?
    │   Se sim → level up! Novo nivel desbloqueado
    ▼
[Report Generator]
    │
    │ Monta relatorio formatado (markdown → Telegram)
    │ Inclui: progresso, insights, proximo desbloqueio, iniciativa sugerida
    ▼
[Telegram send] ─── envia relatorio semanal
```

---

## Parte 6: Prioridades de Implementacao para v1.1

Baseado na revisao do PRD, os gaps ordenados por impacto:

| # | Item | Esforco | Impacto | Dependencia |
|---|------|---------|---------|-------------|
| 1 | Sistema de Niveis (`src/evolution/`) | 20-30h | Critico — core do produto | Memory System |
| 2 | Relatorio de Evolucao Semanal | 8-12h | Alto — engagement/retention | #1 |
| 3 | Wizard HTML fix | 4-8h | Alto — onboarding | Nenhuma |
| 4 | @DonnaSetupBot Telegram | 12-16h | Medio — reduz friction | Telegram bot |
| 5 | Gemini model integration fix | 8-12h | Medio — margem financeira | Model Router |
| 6 | Memory Orchestrator no gateway startup | 4-8h | Medio — memory consistency | Memory System |
| 7 | Token Intelligence no pipeline | 4-8h | Medio — custo otimizado | Model Router |

**Estimativa total v1.1: 60-94 horas**

---

## Parte 7: Stack Tecnico Corrigido

| Componente | Tecnologia | Versao |
|-----------|-----------|--------|
| Runtime | Node.js | 22+ |
| Linguagem | TypeScript (ESM) | 5.x |
| Monorepo | pnpm workspaces | 10.x |
| Desktop macOS | SwiftUI (primario) | - |
| Desktop Windows | Electron | 34.x |
| Desktop mobile | iOS SwiftUI, Android Kotlin | - |
| Gateway | HTTP + WebSocket | porta 18789 |
| Agent Framework | @mariozechner/pi-* (pre-1.0) | via adapter |
| Auth | credential-store (Keychain / AES-256-GCM) | custom |
| Telegram | grammy | - |
| WhatsApp | Baileys (RC) | - |
| Discord | discord.js + @buape/carbon (frozen) | - |
| Slack | @slack/bolt | - |
| DB | SQLite (node:sqlite builtin) | - |
| Vector Search | sqlite-vec + BruteForce fallback | 0.1.7-alpha |
| Testes | Vitest | 4.x |
| Lint/Format | oxlint + oxfmt (Rust-based) | - |
| Build | tsdown (rolldown) | 0.21.x |
| Modelos AI | Claude (Anthropic), Gemini (Google), GPT-4 (OpenAI) | - |
| Distribuicao | GitHub Releases (.dmg + .exe) | - |

---

*— Aria, arquitetando o futuro 🏗️*
