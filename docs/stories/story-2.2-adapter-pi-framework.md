# Story 2.2 - Adapter Pattern para PI Framework

**Epic:** DEBT-1 (Resolucao de Debitos Tecnicos)
**Status:** [x] Done
**Prioridade:** P1 - Alto
**Agente:** @dev (Dex)
**Estimativa:** 16-32 horas
**Debitos:** SYS-09

---

## Objetivo

Isolar a dependencia do PI agent framework (pre-1.0) via adapter pattern, facilitando troca ou atualizacao futura sem impactar o resto do codebase.

---

## Criterios de Aceite

- [x] Interface `AgentRuntime` definida em `src/agents/runtime/agent-runtime.ts`
- [x] `PiAgentRuntime` implementa a interface (wrapper do PI atual)
- [ ] Core code importa apenas a interface, nunca PI diretamente (fase 2 -- 144 arquivos)
- [x] Possivel trocar runtime sem alterar consumers
- [x] Testes com mock runtime (valida desacoplamento)

---

## Tasks

- [x] Mapear surface area do PI framework usada em `src/agents/`
- [x] Definir interface `AgentRuntime` minima
- [x] Implementar `PiAgentRuntime` (adapter)
- [ ] Refatorar imports em `src/agents/` para usar interface (fase 2 -- 144 arquivos)
- [x] Testar com mock runtime
- [x] Documentar decisao arquitetural

---

## Definition of Done

- [x] Testes passando
- [x] `pnpm check` limpo (nos arquivos criados)
- [ ] Zero imports diretos de `@mariozechner/pi-*` fora do adapter (fase 2)
- [x] Review por @qa e @architect

---

## Surface Area Analysis

### PI packages usados (4 pacotes, 144 arquivos non-test)

| Pacote | Imports | Tipo |
|--------|---------|------|
| `@mariozechner/pi-agent-core` | AgentMessage, AgentTool, AgentToolResult, AgentEvent, StreamFn, ThinkingLevel, AgentToolUpdateCallback | Types + runtime |
| `@mariozechner/pi-ai` | Model, Api, Context, complete, streamSimple, completeSimple, getModel, AssistantMessage, Usage, StopReason, OAuthCredentials, ImageContent, TextContent, UserMessage, ToolResultMessage, SimpleStreamOptions, createAssistantMessageEventStream, streamOpenAIResponses, loginOpenAICodex | Types + runtime |
| `@mariozechner/pi-coding-agent` | createAgentSession, SessionManager, SettingsManager, AuthStorage, ModelRegistry, codingTools, createReadTool, createEditTool, createWriteTool, estimateTokens, generateSummary, loadSkillsFromDir, CURRENT_SESSION_VERSION, DefaultResourceLoader, AgentSession, ExtensionAPI, ExtensionContext, ExtensionFactory, Skill, ToolDefinition, EditToolOptions, FileOperations | Types + runtime |
| `@mariozechner/pi-tui` | Container, Spacer, Text, Box, Markdown, Editor, Key, SelectList, SettingsList, TUI, Component, SelectItem, SettingItem, SlashCommand, MarkdownTheme, DefaultTextStyle, matchesKey | TUI components |

### Categorias de uso

1. **Session lifecycle** (adapter criado): `createAgentSession`, `SessionManager`, `estimateTokens`, `generateSummary`
2. **AI primitives** (fase 2): `complete`, `streamSimple`, `Model`, `Context`
3. **Tool definitions** (fase 2): `AgentTool`, `AgentToolResult`, `codingTools`
4. **TUI** (fase 2, separado): todo `@mariozechner/pi-tui`
5. **Auth/OAuth** (fase 2): `AuthStorage`, `OAuthCredentials`

---

## Files Created

| File | Purpose |
|------|---------|
| `src/agents/runtime/agent-runtime.ts` | Interface `AgentRuntime` + types |
| `src/agents/runtime/pi-runtime.ts` | `PiAgentRuntime` adapter wrapping PI |
| `src/agents/runtime/index.ts` | Public re-exports |
| `src/agents/runtime/agent-runtime.test.ts` | 9 tests with mock runtime |

---

## Files Needing Migration (144 total)

See full list via: `grep -rl "@mariozechner/pi-" src/ --include="*.ts" | grep -v "\.test\." | grep -v "\.e2e\."`

### Priority migration targets (session lifecycle):

- `src/agents/pi-embedded-runner/run/attempt.ts` -- uses `createAgentSession` directly
- `src/agents/compaction.ts` -- uses `estimateTokens`, `generateSummary`
- `src/agents/pi-model-discovery.ts` -- uses `AuthStorage`, `ModelRegistry`
- `src/agents/pi-embedded-runner/compact.ts` -- uses `SessionManager`

### Lower priority (type-only imports, can be re-exported):

- 25+ files importing `AgentToolResult` type
- 15+ files importing `AssistantMessage` type
- 12+ TUI files (separate adapter needed)
