# Desktop Convergence Plan

> Autor: @architect (Aria)
> Data: 2026-03-08
> Status: DRAFT
> Story: 3.1 - Convergir Desktop Apps

---

## Current State

O projeto Donna possui **dois apps desktop para macOS** rodando em paralelo:

1. **Electron Desktop** (`apps/desktop/`) - App cross-platform (macOS + Windows) recente, criado como instalador zero-friction. Usa Electron + TypeScript + HTML renderer.

2. **SwiftUI macOS** (`apps/macos/`) - App nativo macOS maduro, com SwiftUI + Swift. Centenas de arquivos fonte, integrado profundamente com APIs nativas do macOS (launchd, Sparkle, Speech Recognition, UNNotifications, etc.).

Essa duplicidade causa:
- Confusao para usuarios macOS sobre qual app usar
- Manutencao duplicada de features (gateway lifecycle, tray, onboarding)
- Divergencia inevitavel de funcionalidades

---

## Feature Comparison Matrix

| Feature | Electron macOS | SwiftUI macOS | Gap? |
|---------|---------------|---------------|------|
| **Menu Bar / Tray Icon** | Sim (basico: status + start/stop) | Sim (avancado: animated critter, hover HUD, status pill, context cards) | Electron e muito mais simples |
| **Gateway Lifecycle** | Sim (spawn child process, health check, auto-restart com backoff) | Sim (launchd integration, attach existing, port guardian, environment check) | Electron usa child_process; SwiftUI usa launchd (mais robusto) |
| **Gateway Status Display** | 5 estados (idle/starting/running/stopped/error) | 5+ estados (stopped/starting/running/attachedExisting/failed) + health probe detalhado | SwiftUI mais detalhado |
| **Setup Wizard / Onboarding** | Sim (5-step wizard: welcome, api-key, channel, preferences, done) | Sim (multi-page onboarding com chat embed, wizard steps, workspace config) | Ambos tem, SwiftUI mais completo |
| **Settings Window** | Nao (apenas wizard) | Sim (11 tabs: General, Channels, Voice Wake, Config, Instances, Sessions, Cron, Skills, Permissions, Debug, About) | **GAP CRITICO no Electron** |
| **Auto-Update (Sparkle)** | Nao (usa electron-builder publish + github releases) | Sim (Sparkle framework, Developer ID signed, appcast.xml) | Electron usa mecanismo proprio |
| **Voice Wake / Speech Recognition** | Nao | Sim (VoiceWakeRuntime, trigger words, multi-locale, mic selection, chimes) | **GAP CRITICO no Electron** |
| **Talk Mode** | Nao | Sim (TalkModeController, TalkModeRuntime, push-to-talk) | **GAP CRITICO no Electron** |
| **Canvas / Web Panel** | Nao | Sim (CanvasManager, CanvasWindow, A2UI integration, scheme handler) | **GAP CRITICO no Electron** |
| **Web Chat Panel** | Nao | Sim (WebChatManager, session keys, panel anchored to status item) | **GAP CRITICO no Electron** |
| **Notifications** | Nao | Sim (UNNotifications, time-sensitive, sound customization) | **GAP CRITICO no Electron** |
| **Deep Links** | Nao | Sim (DeepLinkHandler, URL scheme donna://) | Gap no Electron |
| **Channel Configuration** | Nao (apenas escolha no wizard) | Sim (ChannelsSettings, ChannelConfigForm, lifecycle management) | **GAP CRITICO no Electron** |
| **Connection Modes** | Nao (apenas local) | Sim (local/remote/unconfigured, SSH tunnel, Tailscale, direct URL) | **GAP CRITICO no Electron** |
| **Exec Approvals** | Nao | Sim (ExecApprovals system, allowlist, security policies, gateway prompter) | **GAP CRITICO no Electron** |
| **Cron Jobs** | Nao | Sim (CronSettings, CronJobEditor, CronJobsStore) | **GAP CRITICO no Electron** |
| **Skills Management** | Nao | Sim (SkillsSettings, SkillsModels) | Gap no Electron |
| **Sessions Management** | Nao | Sim (SessionsSettings, SessionData, menu preview) | Gap no Electron |
| **Instances / Nodes** | Nao | Sim (InstancesSettings, NodesStore, NodeMode, pairing approval) | Gap no Electron |
| **Health Monitoring** | HTTP poll basico (/health) | Sim (HealthStore, heartbeats, degraded state detection, control channel) | Electron muito basico |
| **Launch at Login** | Nao | Sim (LaunchAgentManager, launchd plist) | Gap no Electron |
| **Dock Icon Control** | Nao | Sim (DockIconManager, show/hide dock icon) | Gap no Electron |
| **Icon Customization** | Nao | Sim (IconState, CritterIconRenderer, animated states, overrides) | Gap no Electron |
| **Tailscale Integration** | Nao | Sim (TailscaleService, TailscaleIntegrationSection) | Gap no Electron |
| **CLI Integration** | Nao | Sim (DonnaMacCLI package: connect, discover, gateway config, wizard commands) | Gap no Electron |
| **Peekaboo Bridge** | Nao | Sim (PeekabooBridgeHostCoordinator) | Gap no Electron |
| **Presence Reporting** | Nao | Sim (PresenceReporter) | Gap no Electron |
| **Remote Tunnel** | Nao | Sim (RemoteTunnelManager, RemotePortTunnel) | Gap no Electron |
| **Config File Watcher** | Nao | Sim (ConfigFileWatcher, live reload) | Gap no Electron |
| **Screen Recording** | Nao | Sim (ScreenRecordService, CameraCaptureService) | Gap no Electron |
| **Permission Management** | Nao | Sim (PermissionManager, PermissionsSettings, monitoring) | Gap no Electron |
| **Diagnostics / Logging** | console.log basico | Sim (OSLog subsystem, DiagnosticsFileLog, log levels, clawlog.sh) | Gap no Electron |
| **Single Instance Lock** | Sim (app.requestSingleInstanceLock) | Sim (isDuplicateInstance check) | Ambos |
| **Cross-Platform (Windows)** | Sim (NSIS installer, x64) | Nao (macOS only) | **GAP CRITICO no SwiftUI** |
| **Preload / IPC Bridge** | Sim (contextBridge, typed API) | N/A (nativo, nao precisa) | N/A |

---

## Decisao

**SwiftUI macOS e o app principal para macOS. Electron deve ser mantido APENAS para Windows.**

### Justificativa

1. **Maturidade**: O SwiftUI app tem ~200+ arquivos fonte contra ~5 do Electron. A diferenca de features e abismal: 25+ funcionalidades criticas existem apenas no SwiftUI.

2. **Impossibilidade pratica de paridade**: Tentar trazer Voice Wake, Talk Mode, Canvas, Exec Approvals, Cron Jobs, launchd integration, Sparkle updates, etc. para o Electron no macOS seria reescrever o app SwiftUI inteiro em TypeScript/HTML, o que nao faz sentido.

3. **Integracao nativa**: O SwiftUI app usa APIs que nao tem equivalente no Electron sem hacks pesados: launchd (gateway lifecycle), Speech framework (Voice Wake), NSStatusItem com tracking areas, Sparkle (auto-update), etc.

4. **Performance e UX**: App nativo SwiftUI consome menos memoria e CPU que Electron, e respeita convencoes macOS (menubar extra, settings tabs, keyboard shortcuts).

### Alternativas descartadas

| Alternativa | Por que descartada |
|------------|-------------------|
| Manter ambos para macOS | Confunde usuarios, duplica manutencao, Electron nunca alcancara paridade |
| Migrar tudo para Electron | Perde integracoes nativas criticas, performance pior, regressao massiva |
| Usar Tauri ao inves de Electron | Mudanca de framework nao resolve o gap de features, e Tauri no Windows ainda e menos maduro que Electron |

---

## Impacto

### O que muda
- Electron target `mac` sera removido do `electron-builder.yml`
- Build pipeline macOS usara apenas SwiftUI app
- Documentacao atualizada para apontar ao SwiftUI app no macOS
- Electron fica dedicado exclusivamente a Windows

### O que NAO muda
- SwiftUI app (zero alteracoes necessarias, ja e completo)
- Electron para Windows (continua como esta)
- Gateway core (ambos os apps ja usam o mesmo gateway CLI)
- Nenhum codigo fonte e deletado nesta fase

---

## Convergence Strategy

### Phase 1: Documentar e Marcar (esta story - sem mudanca de codigo)
- [x] Explorar ambos os apps
- [x] Criar feature comparison matrix
- [x] Documentar decisao arquitetural
- [ ] Adicionar comentario no `electron-builder.yml` sobre direcao futura

**Risco:** Nenhum. E apenas documentacao.

### Phase 2: Remover macOS do Electron Build
- Remover target `mac` do `electron-builder.yml`
- Atualizar CI/CD para nao gerar `.dmg` via Electron
- Atualizar docs de instalacao macOS para apontar apenas ao SwiftUI app
- Mover wizard HTML/renderer para contexto Windows-only

**Risco:** Baixo. Usuarios macOS que usem o Electron app precisam migrar.

### Phase 3: Migrar Wizard para Windows-Only
- Adaptar wizard UX para contexto Windows (remover macOS-specific como `titleBarStyle: hiddenInset`)
- Considerar se o wizard do Electron e suficiente para Windows ou se precisa ser expandido
- Avaliar quais features do SwiftUI sao relevantes para Windows (Settings, Channels, etc.)

**Risco:** Medio. Requer decisoes de produto sobre scope do app Windows.

### Phase 4: Expandir Electron Windows (se necessario)
- Baseado nas decisoes da Phase 3, adicionar features ao Electron para Windows
- Features candidatas: Settings basico, Channel config, Health monitoring melhorado
- Voice Wake e Talk Mode NAO sao viaves no Windows via Electron (dependeriam de APIs nativas)

**Risco:** Alto. Scope pode crescer. Precisa de story separada com PRD.

---

## Riscos & Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Usuarios macOS usando Electron app ficam sem suporte | Media | Medio | Comunicar deprecacao com antecedencia, incluir link para SwiftUI app no Electron |
| Windows users esperando paridade com macOS | Alta | Alto | Definir claramente o scope do app Windows na Phase 3, documentar diferencias |
| Electron Windows nao recebe atencao apos convergencia | Media | Medio | Manter como target ativo no CI, incluir em release checklist |

---

## Timeline Estimate

| Phase | Esforco | Dependencias |
|-------|---------|-------------|
| Phase 1 (esta story) | 1 dia | Nenhuma |
| Phase 2 | 2-3 dias | Decisao de produto aprovada |
| Phase 3 | 3-5 dias | Phase 2 completa |
| Phase 4 | 1-2 sprints | PRD para Windows app scope |

---

## Spec para Implementacao

### Para o @dev (Phase 2, quando aprovada):

1. Em `apps/desktop/electron-builder.yml`:
   - Remover bloco `mac:` inteiro (target dmg, icon, category, entitlements)
   - Manter bloco `win:` e `nsis:` intactos
   - Atualizar `publish` se necessario

2. Em `apps/desktop/src/main.ts`:
   - Remover condicional `process.platform === "darwin"` no `titleBarStyle`
   - Remover handler `window-all-closed` com check `darwin`
   - Remover handler `activate` (macOS-only)

3. Em CI/CD:
   - Remover job de build macOS Electron
   - Manter job de build Windows Electron

4. Em docs:
   - Atualizar `docs/platforms/` para refletir: macOS = SwiftUI, Windows = Electron
   - Atualizar instalacao macOS para apontar ao `.app` / `brew` / download direto

5. NAO deletar arquivos - apenas desabilitar targets e atualizar docs.
