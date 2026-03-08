# ADR: Carbon Dependency Assessment

## Status

Proposed

## Date

2026-03-08

## Context

O projeto Donna utiliza `@buape/carbon` como framework para a integracao com Discord. Carbon e um framework TypeScript open-source (MIT) para construir bots Discord, desenvolvido pela Buape Studios (repositorio: github.com/buape/carbon, docs: carbon.buape.com).

A versao em uso e `0.0.0-beta-20260216184201` -- uma versao beta nightly com timestamp. O pacote depende internamente de `discord-api-types` e oferece:

- **Client/RequestClient**: cliente HTTP para a API REST do Discord
- **Gateway/WebSocket**: plugin de gateway (`GatewayPlugin`, `GatewayIntents`, `GatewayCloseCodes`) para conexao WebSocket
- **Voice**: plugin de voz (`VoicePlugin`) para canais de voz
- **UI Components (Components V2)**: classes para construir mensagens interativas do Discord -- `Button`, `LinkButton`, `Container`, `Row`, `Section`, `Separator`, `TextDisplay`, `Thumbnail`, `MediaGallery`, `File`, `Label`, `Modal`, `TextInput`, `StringSelectMenu`, `UserSelectMenu`, `RoleSelectMenu`, `MentionableSelectMenu`, `ChannelSelectMenu`, `CheckboxGroup`, `RadioGroup`
- **Types/Enums**: `ChannelType`, `MessageType`, `Message`, `Client`, `Guild`, `User`, `ReadyListener`
- **Utilities**: `serializePayload`, `parseCustomId`, `RateLimitError`, `MessagePayloadObject`
- **Interaction types**: `ButtonInteraction`, `CommandInteraction`, `CommandWithSubcommands`, `ModalInteraction`, `ComponentData`, `ComponentParserResult`

O CLAUDE.md do projeto contem a instrucao explicita: **"Never update the Carbon dependency"**, indicando que a versao atual foi estabilizada intencionalmente.

## Current Usage

### Distribuicao por area

| Area | Arquivos fonte | Arquivos teste | Total |
|------|---------------|----------------|-------|
| `src/discord/` | ~30 | ~20 | ~50 |
| `src/discord/monitor/` | ~25 | ~15 | ~40 |
| `src/discord/voice/` | 2 | 2 | 4 |
| `src/infra/` | 2 | 0 | 2 |
| `src/agents/tools/` | 1 | 1 | 2 |
| **Total** | ~60 | ~38 | ~61 arquivos unicos |

### Imports por categoria

#### 1. Core Client e HTTP (CRITICO)
| Import | Uso | Arquivos |
|--------|-----|----------|
| `RequestClient` | Cliente REST para Discord API | `client.ts`, `send.*.ts`, `voice-message.ts`, `reply-delivery.ts` |
| `Client` | Instancia principal do bot | `provider.ts`, `typing.ts`, `threading.ts`, `message-handler.ts`, ~15 mais |
| `RateLimitError` | Tratamento de rate limiting | `retry-policy.ts`, `send.creates-thread.test.ts`, `voice-message.ts` |
| `serializePayload` | Serializar payloads de mensagem | `send.outbound.ts`, `model-picker.ts` |

#### 2. Gateway WebSocket (CRITICO)
| Import | Uso | Arquivos |
|--------|-----|----------|
| `GatewayPlugin` | Plugin de conexao WebSocket | `gateway-plugin.ts`, `gateway-registry.ts`, `provider.ts` |
| `GatewayIntents` | Intents do gateway | `gateway-plugin.ts` |
| `GatewayCloseCodes` | Codigos de fechamento | `provider.ts` |
| `VoicePlugin` | Plugin de voz | `provider.ts`, `voice/manager.ts` |

#### 3. Presence/Activity (MODERADO)
| Import | Uso | Arquivos |
|--------|-----|----------|
| `Activity`, `UpdatePresenceData` | Status de presenca do bot | `presence.ts`, `auto-presence.ts`, `discord-actions-presence.ts` |

#### 4. UI Components V2 (EXTENSO)
| Import | Uso | Arquivos |
|--------|-----|----------|
| `Button`, `LinkButton` | Botoes interativos | `components.ts`, `agent-components.ts`, `exec-approvals.ts`, `native-command.ts` |
| `Container`, `Row`, `Section` | Layout de componentes | `components.ts`, `ui.ts`, `channel-adapters.ts` |
| `TextDisplay`, `Separator` | Texto e separadores | `components.ts`, `ui.ts`, `channel-adapters.ts` |
| `StringSelectMenu`, `UserSelectMenu`, `RoleSelectMenu`, `MentionableSelectMenu`, `ChannelSelectMenu` | Menus de selecao | `components.ts`, `agent-components.ts`, `model-picker.ts` |
| `Modal`, `TextInput`, `Label` | Formularios modais | `components.ts` |
| `CheckboxGroup`, `RadioGroup` | Grupos de selecao | `components.ts` |
| `MediaGallery`, `File`, `Thumbnail` | Midia e arquivos | `components.ts` |
| `parseCustomId`, `TopLevelComponents` | Utilitarios de componentes | `components.ts`, `send.components.ts`, `channel-adapters.ts` |

#### 5. Discord Types (EXTENSO)
| Import | Uso | Arquivos |
|--------|-----|----------|
| `ChannelType` | Tipo de canal Discord | ~12 arquivos |
| `MessageType` | Tipo de mensagem | `system-events.ts`, `message-handler.preflight.ts` |
| `Message` | Tipo de mensagem recebida | `message-utils.ts`, `reply-context.ts`, `system-events.ts` |
| `Guild`, `User` | Tipos de entidade | `format.ts`, `allow-list.ts`, `reply-context.ts`, `sender-identity.ts` |

#### 6. Interaction Types (MODERADO)
| Import | Uso | Arquivos |
|--------|-----|----------|
| `ButtonInteraction`, `ComponentData` | Interacoes de componentes | `agent-components.ts`, `exec-approvals.ts` |
| `CommandInteraction`, `CommandWithSubcommands` | Comandos slash | `voice/command.ts` |
| `ModalInteraction` | Interacoes de modal | `agent-components.ts` |
| `ReadyListener` | Listener de ready | `provider.ts`, `voice/manager.ts` |

## Problem

### 1. Versao beta nightly (risco alto)
A versao `0.0.0-beta-20260216184201` indica que nao e uma release estavel. Versoes beta podem ter bugs, APIs instáveis, e breaking changes sem aviso.

### 2. Lock-in profundo
Com **61 arquivos** importando diretamente de `@buape/carbon`, a dependencia esta profundamente entrelagada no subsistema Discord. Nao e possivel substituir sem reescrever todo o canal Discord.

### 3. Versao congelada intencionalmente
A regra "Never update the Carbon dependency" no CLAUDE.md sugere que:
- A versao atual funciona e foi testada
- Versoes mais novas podem introduzir breaking changes
- A equipe decidiu conscientemente congelar esta versao

### 4. Escopo limitado ao Discord
Carbon e usado **exclusivamente** para o canal Discord. Nenhum outro canal (Telegram, WhatsApp, Slack, Signal, etc.) depende dele. O impacto esta contido em `src/discord/`, `src/infra/retry-policy.ts`, `src/infra/outbound/channel-adapters.ts` e `src/agents/tools/discord-actions-presence.ts`.

## Options Considered

### Option 1: Keep as-is (aceitar o risco)

**Descricao:** Manter `@buape/carbon@0.0.0-beta-20260216184201` congelado como esta hoje.

**Prós:**
- Zero esforco de migracao
- Sistema funciona e esta testado
- A regra "Never update" ja esta em vigor
- O escopo de risco esta contido ao canal Discord

**Contras:**
- Dependencia de versao beta sem suporte
- Se um bug critico for encontrado, nao ha upgrade path testado
- Se a API do Discord mudar de forma incompativel, Carbon beta pode nao receber patch

**Esforco:** Nenhum.

### Option 2: Encapsulate (adapter pattern)

**Descricao:** Criar uma camada de abstracao (`src/discord/carbon-adapter/`) que re-exporta todos os tipos e classes usados de Carbon, para que o resto do codebase importe do adapter e nao diretamente de `@buape/carbon`.

**Prós:**
- Facilita futura migracao: so o adapter precisa mudar
- Documenta explicitamente a superficie de API usada
- Compativel com a regra "Never update" (nao altera Carbon)

**Contras:**
- Esforco significativo: ~61 arquivos precisam mudar imports
- Risco de regressao durante a refatoracao
- Sem beneficio imediato se nao houver plano de migracao
- A camada de adapter para classes com heranca (Button, Modal, etc.) seria complexa -- Donna estende essas classes via class syntax

**Esforco:** Alto (~2-3 dias de refatoracao + testes).

### Option 3: Migrate to discord.js

**Descricao:** Substituir `@buape/carbon` por `discord.js`, o framework Discord mais popular e mantido.

**Prós:**
- Framework maduro, com releases estaveis e LTS
- Comunidade grande, documentacao extensa
- Suporte ativo para novas features da API Discord

**Contras:**
- Reescrita massiva: ~61 arquivos, incluindo todo o sistema de componentes V2
- Carbon e discord.js tem arquiteturas fundamentalmente diferentes (Carbon e HTTP-first, discord.js e WebSocket-first)
- O sistema de componentes V2 de Donna (`components.ts`, 1150 linhas) usa heranca de classes de Carbon extensivamente -- nao ha mapeamento 1:1 para discord.js
- Alto risco de regressao
- Viola a filosofia "Never update the Carbon dependency" (se a intencao era estabilidade)

**Esforco:** Muito alto (~2-4 semanas).

### Option 4: Migrate to discord-api-types + custom HTTP client

**Descricao:** Remover Carbon e usar apenas `discord-api-types` (ja e dependencia) com um cliente HTTP proprio para chamadas REST, e implementar gateway WebSocket diretamente.

**Prós:**
- Dependencia minima: apenas tipos, sem framework
- Controle total sobre a implementacao
- `discord-api-types` ja e dependencia direta do projeto

**Contras:**
- Reescrita massiva de todos os componentes V2 (Button, Modal, Select, etc.)
- Reimplementar gateway WebSocket, rate limiting, serialization
- Basicamente reescrever o que Carbon ja fornece
- Esforco maior que Option 3

**Esforco:** Extremamente alto (~4-6 semanas).

## Decision

**Recomendacao: Option 1 (Keep as-is) com monitoramento.**

### Justificativa

1. **Funciona.** O sistema esta operacional, testado, e em producao.

2. **Risco contido.** Carbon e usado apenas no canal Discord. Se falhar, os outros ~15 canais continuam funcionando.

3. **Custo-beneficio.** As alternativas (Options 2-4) tem custo alto e beneficio imediato zero. A regra "Never update" sugere que a equipe upstream ja avaliou os riscos e decidiu que a estabilidade da versao congelada compensa.

4. **Superficie de API estavel.** Os tipos usados (`ChannelType`, `MessageType`, `Client`, `Message`, `Guild`, `User`) sao mapeamentos diretos da Discord API e nao devem mudar. Os componentes V2 (`Button`, `Modal`, etc.) sao wrappers sobre estruturas JSON da Discord API.

5. **Carbon e MIT.** Se o projeto Carbon for abandonado, o codigo-fonte esta disponivel e pode ser vendored.

### Acoes de monitoramento recomendadas

- Verificar periodicamente se o repositorio `buape/carbon` esta ativo
- Se a Discord API v10 for deprecada, reavaliar este ADR
- Se um bug critico for encontrado em Carbon, considerar patch pontual via `pnpm.patchedDependencies`
- Manter a regra "Never update the Carbon dependency" no CLAUDE.md

## Consequences

### Se Option 1 (decisao atual)
- Nenhuma mudanca no codebase
- Risco aceito de dependencia beta congelada
- Monitoramento passivo necessario
- Se Carbon upstream lancar versao estavel, reavaliar a regra "Never update"

### Se Option 2 (encapsulamento futuro)
- Mudanca em ~61 arquivos (apenas imports)
- Facilita futuras migracoes
- Custo de 2-3 dias

### Se Options 3-4 (migracao)
- Reescrita significativa do subsistema Discord
- 2-6 semanas de trabalho
- Alto risco de regressao
- So justificavel se Carbon se tornar inutilizavel

## Appendix: Complete Import Map

### `@buape/carbon` (main entry)
```
Button, ChannelSelectMenu, ChannelType, CheckboxGroup, Client, CommandInteraction,
CommandWithSubcommands, ComponentData, ComponentParserResult, Container, File, Guild,
Label, LinkButton, MediaGallery, MentionableSelectMenu, Message, MessagePayloadObject,
MessageType, Modal, RadioGroup, RateLimitError, ReadyListener, RequestClient,
RoleSelectMenu, Row, Section, Separator, StringSelectMenu, TextDisplay, TextInput,
Thumbnail, TopLevelComponents, User, UserSelectMenu, parseCustomId, serializePayload
```

### `@buape/carbon/gateway`
```
Activity, GatewayCloseCodes, GatewayIntents, GatewayPlugin, UpdatePresenceData
```

### `@buape/carbon/voice`
```
VoicePlugin
```
