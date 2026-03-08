# System Architecture - Donna Gateway

**Projeto:** Donna (AI Gateway)
**Data:** 2026-03-08
**Fase:** Brownfield Discovery - Fase 1 (Coleta: Sistema)
**Agente:** @architect (Aria)

---

## 1. Executive Summary

Donna e um gateway de IA multi-canal, local-first, que conecta modelos de linguagem a plataformas de mensageria. Arquitetura de daemon single-process com sistema de plugins extensivel, agentes com memoria vetorial e suporte a 40+ canais de comunicacao.

**Metricas do Projeto:**
- ~30,900 arquivos TypeScript
- `src/`: 4,454 arquivos (35MB) - Core gateway
- `apps/`: 1,312 arquivos (1GB) - Apps nativos (Electron, iOS, Android, macOS)
- `extensions/`: 752 arquivos (16MB) - 40 plugins
- `skills/`: 52 skills comunitarias bundled

---

## 2. Tech Stack

### Runtime & Tooling

| Componente | Tecnologia | Versao |
|-----------|-----------|--------|
| Runtime | Node.js | >= 22.12.0 |
| Linguagem | TypeScript (ESM) | 5.9.3 |
| Package Manager | pnpm | 10.23.0 |
| Bundler | tsdown | 0.21.0-beta.2 |
| TS Executor | tsx | 4.21.0 |
| Linter | oxlint (Rust) | 1.50.0 |
| Formatter | oxfmt (Rust) | 0.35.0 |
| Test Runner | Vitest | 4.0.18 |
| Coverage | V8 | 70% threshold |
| Browser Automation | Playwright | 1.58.2 |

### Frameworks & Libs Principais

| Categoria | Lib | Versao |
|-----------|-----|--------|
| HTTP Server | Express | 5.2.1 |
| WebSocket | ws | 8.19.0 |
| CLI | Commander | 14.0.3 |
| Prompt TUI | @clack/prompts | 1.0.1 |
| Validacao | Zod | 4.3.6 |
| Schema | @sinclair/typebox | 0.34.48 (pinned) |
| Agentes | @mariozechner/pi-agent-core | 0.55.3 |
| ACP | @agentclientprotocol/sdk | 0.14.1 |
| Imagens | sharp | 0.34.5 |
| PDF | pdfjs-dist | 5.5.207 |
| TTS | node-edge-tts | 1.2.10 |
| Web UI | Lit | 3.3.2 |

### Messaging SDKs

| Canal | SDK | Versao |
|-------|-----|--------|
| Telegram | grammy | 1.41.0 |
| Slack | @slack/bolt | 4.6.0 |
| LINE | @line/bot-sdk | 10.6.0 |
| Discord Voice | @discordjs/voice | 0.19.0 |
| WhatsApp | @whiskeysockets/baileys | 7.0.0-rc.9 |
| AWS Bedrock | @aws-sdk/client-bedrock | 3.1000.0 |

---

## 3. Arquitetura de Alto Nivel

### Modelo de 3 Camadas

```
+--------------------------------------------------+
|                  CLI Layer                         |
|  (Commander.js, donna.mjs -> entry.ts -> program)  |
+--------------------------------------------------+
                        |
+--------------------------------------------------+
|              Gateway Server (Daemon)               |
|  Express + WebSocket (127.0.0.1:18789)            |
|  Config, Auth, Routing, Session Management         |
+--------------------------------------------------+
                        |
+--------------------------------------------------+
|          Channel & Agent Runtimes                  |
|  7 core channels + 35+ extension channels          |
|  PI Agent Framework + 75+ built-in tools           |
|  Memory (SQLite/LanceDB) + Skills System           |
+--------------------------------------------------+
```

### Fluxo de Mensagem

```
Inbound (Webhook/Socket por canal)
    |
Channel Parser (normaliza -> SessionEnvelope)
    |
Routing: Session Key -> Agent Resolution
    |
Agent Execution (LLM call + skill execution)
    |
Outbound Delivery (sender especifico por canal)
    |
Status Reactions (checkmark, hourglass, error)
```

---

## 4. Estrutura do Monorepo

### Workspace (pnpm)

```yaml
packages:
  - .              # Root: CLI binary (donna)
  - ui             # Web UI (Lit components)
  - packages/*     # Legacy compat (donna-clawdbot, donna-moltbot)
  - extensions/*   # 40 plugin extensions
```

### Diretorios Principais

```
donna/
├── src/                   # Core gateway (4,454 files, 35MB)
│   ├── agents/           # Agent runtime, 75+ tools, skills (760 files)
│   ├── gateway/          # Server, protocol, WebSocket (326 files)
│   ├── channels/         # Channel abstractions, allowlists (160 files)
│   ├── plugins/          # Plugin SDK & runtime (80 files)
│   ├── acp/              # Access Control Policy (43 files)
│   ├── cli/              # CLI commands & routing
│   ├── commands/         # High-level command implementations
│   ├── config/           # Configuration system (Zod schemas)
│   ├── routing/          # Message routing engine
│   ├── memory/           # Vector memory (SQLite + embeddings)
│   ├── media/            # Media pipeline (audio, image, PDF)
│   ├── security/         # Audit, SSRF, skill scanner
│   ├── telegram/         # Telegram (core)
│   ├── discord/          # Discord (core)
│   ├── slack/            # Slack (core)
│   ├── signal/           # Signal (core)
│   ├── imessage/         # iMessage (core, macOS only)
│   ├── web/              # WhatsApp Web (core)
│   ├── line/             # LINE (core)
│   └── ...               # +30 outros modulos
├── extensions/            # 40 plugins (752 files, 16MB)
├── apps/                  # Apps nativos (1,312 files, 1GB)
│   ├── desktop/          # Electron (macOS + Windows)
│   ├── ios/              # SwiftUI
│   ├── android/          # Kotlin + Compose
│   ├── macos/            # SwiftUI standalone
│   └── shared/           # DonnaKit (iOS/macOS shared)
├── skills/                # 52 community skills bundled
├── docs/                  # Mintlify docs (EN + zh-CN + ja-JP)
├── scripts/               # Build & automation
├── patches/               # pnpm patches
├── packages/              # Legacy compat packages
└── ui/                    # Web UI (Lit)
```

---

## 5. Subsistemas Detalhados

### 5.1 Gateway Server

- **Porta:** `127.0.0.1:18789` (default, configuravel)
- **Protocolo:** HTTP + WebSocket
- **Auth:** Token-based + per-method operator scopes
- **Config reload:** Hot-reload sem restart (file watcher)
- **Health checks:** `/healthz` (liveness), `/readyz` (readiness)
- **Session management:** File-based (`~/.donna/sessions/`)

### 5.2 Sistema de Canais

**7 canais core** (em `src/`):

| Canal | Diretorio | SDK |
|-------|-----------|-----|
| Telegram | `src/telegram/` | grammy |
| Discord | `src/discord/` | discord.js |
| Slack | `src/slack/` | @slack/bolt |
| Signal | `src/signal/` | signal-cli |
| iMessage | `src/imessage/` | Messages.app (macOS) |
| WhatsApp | `src/web/` + `src/whatsapp/` | Baileys |
| LINE | `src/line/` | @line/bot-sdk |

**35+ canais via extensoes** (em `extensions/`):
MS Teams, Matrix, IRC, Feishu, Google Chat, Synology Chat, Tlon, Twitch, Nextcloud Talk, Zalo, Nostr, BlueBubbles, Mattermost, etc.

### 5.3 Sistema de Agentes

- **PI Framework:** `@mariozechner/pi-agent-core` (0.55.3)
- **Workspace isolation:** Cada agente tem `~/.donna/agents/<id>/`
- **75+ tools built-in:** web-fetch, memory, sessions, browser, canvas, TTS, PDF, etc.
- **Skills:** Markdown-based (`SKILL.md`), carregadas de workspace + bundled
- **Runners:** CLI runner, PI embedded runner, Remote runner (WebSocket)

### 5.4 Memoria & Database

- **Tipo:** SQLite embarcado (`node:sqlite` builtin)
- **Vector search:** `sqlite-vec` (SIMD-accelerated)
- **Alternativa:** LanceDB (extension `memory-lancedb`)
- **Tipos de memoria:** Episodic, Pattern, Identity
- **Busca:** Hibrida (semantica + BM25)
- **SEM banco de dados externo** - tudo local no host

### 5.5 Sistema de Plugins

- **SDK:** `donna/plugin-sdk` (35+ subpath exports)
- **Lifecycle:** onLoad, onUnload, registerHttpHandlers, hooks
- **Hooks:** before-agent-start, model-override, message-transform
- **Install:** `npm install --omit=dev` no dir do plugin
- **Registro:** `package.json` com campo `donna.extensions`

### 5.6 Seguranca

- **Modelo:** Single-user, trusted-operator (NAO multi-tenant)
- **CVEs corrigidos:** CVE-2026-25157, CVE-2026-26134, CVE-2026-24763
- **Modulos:** audit, dm-policy, safe-regex, skill-scanner, temp-path-guard, SSRF detection
- **Secrets:** keytar (macOS keychain), encrypted store
- **Allowlists:** Per-channel, inheritance via dmPolicy

### 5.7 Media Pipeline

- **Imagens:** sharp (resize, format conversion)
- **Audio:** ffmpeg (transcoding), opusscript (Opus codec)
- **PDF:** pdfjs-dist (text extraction)
- **TTS:** node-edge-tts (text-to-speech)
- **Path validation:** Previne directory traversal

---

## 6. Apps Nativos

| App | Tech | Status |
|-----|------|--------|
| Desktop (Electron) | TypeScript + React | Em desenvolvimento (DMG + NSIS) |
| iOS | SwiftUI + Observation | Ativo (Watch, Widgets, Share Extension) |
| Android | Kotlin + Compose | Ativo (Gradle) |
| macOS | SwiftUI standalone | Ativo (Sparkle updater) |
| Shared | DonnaKit (Swift) | Framework compartilhado iOS/macOS |

---

## 7. CI/CD & Deploy

### GitHub Actions

| Workflow | Funcao |
|----------|--------|
| ci.yml | Lint, build, test, E2E, Docker (matrix macOS/Win/Ubuntu) |
| docker-release.yml | Build & publish Docker images |
| install-smoke.yml | Installation smoke tests |
| labeler.yml | Auto-label PRs |
| stale.yml | Auto-close stale issues |

### Deployment Models

1. **Local:** macOS (launchd), Linux (systemd)
2. **Docker:** Multi-stage build, compose
3. **Fly.io:** Cloud deployment (fly.toml)
4. **Render:** PaaS deployment (render.yaml)
5. **Mobile:** Apps conectam ao gateway via WebSocket

---

## 8. Debitos Tecnicos Identificados (Sistema)

### Criticos

| ID | Debito | Area | Impacto |
|----|--------|------|---------|
| SYS-01 | Baileys em RC (7.0.0-rc.9) | WhatsApp | Instabilidade, breaking changes |
| SYS-02 | Carbon dependency custom (0.0.0-beta) | Core | Lock-in, sem updates |
| SYS-03 | Express 5 (^5.2.1) - ainda relativamente novo | Server | Potenciais bugs em producao |
| SYS-04 | 11 pnpm overrides ativos | Deps | Manutencao complexa |

### Altos

| ID | Debito | Area | Impacto |
|----|--------|------|---------|
| SYS-05 | 30,900 arquivos TS - codebase muito grande | Geral | Build lento, complexidade |
| SYS-06 | sqlite-vec alpha (0.1.7-alpha.2) | Memory | API instavel |
| SYS-07 | keytar 7.9.0 (deprecated upstream) | Security | Sem manutencao futura |
| SYS-08 | node-pty beta (1.2.0-beta.3) | Terminal | Instabilidade nativa |
| SYS-09 | PI agent framework (0.55.3) - pre-1.0 | Agents | API instavel |
| SYS-10 | 9 configs Vitest diferentes | Testing | Fragmentacao |

### Medios

| ID | Debito | Area | Impacto |
|----|--------|------|---------|
| SYS-11 | Legacy compat dirs (.clawdbot, .moltbot) | Migration | Complexidade desnecessaria |
| SYS-12 | 40+ extensoes no mesmo repo | Monorepo | Build/test lento |
| SYS-13 | tsdown beta (0.21.0-beta.2) | Build | Potenciais bugs |
| SYS-14 | pnpm-lock.yaml com 12,636 linhas | Deps | Merge conflicts frequentes |
| SYS-15 | Electron 33 + React no desktop | Desktop | Duplica o macOS SwiftUI nativo |

---

## 9. Dependencias & Patches

### pnpm Overrides (11)

| Pacote | Versao Forcada | Motivo Provavel |
|--------|---------------|-----------------|
| hono | 4.11.10 | Compat fix |
| fast-xml-parser | 5.3.8 | Security fix |
| request | @cypress/request@3.0.10 | Deprecated replacement |
| form-data | 2.5.4 | Compat fix |
| minimatch | 10.2.4 | Security fix |
| qs | 6.14.2 | Security fix |
| @sinclair/typebox | 0.34.48 | Plugin SDK pinning |
| tar | 7.5.9 | Security fix |
| tough-cookie | 4.1.3 | Security fix |

### Native Dependencies (require build)

- @lydell/node-pty, @matrix-org/matrix-sdk-crypto-nodejs, @napi-rs/canvas
- @whiskeysockets/baileys, authenticate-pam, esbuild, keytar, koffi
- node-llama-cpp, protobufjs, sharp

---

## 10. Configuracao

- **Formato:** YAML5 / JSON5
- **Local:** `~/.donna/donna.json` ou `~/.donna/donna.yaml`
- **Schema:** Zod-based com 80+ tipos
- **Secoes:** channels, agents, models, spending, tools, hooks, memory, logging
- **Hot-reload:** Sim, sem restart
- **Env substitution:** `${{ env.VAR }}`
- **Secrets:** `${{ secret.name }}`
- **Backup rotation:** Automatico

---

## 11. Versionamento

| Aspecto | Valor |
|---------|-------|
| Formato | Date-based: YYYY.M.D |
| Versao atual | 2026.3.3 |
| Canais | stable (latest), beta (-beta.N), dev (main) |
| Node minimo | >= 22.12.0 |
| pnpm | 10.23.0 |

---

*Documento gerado automaticamente - Brownfield Discovery Fase 1*
