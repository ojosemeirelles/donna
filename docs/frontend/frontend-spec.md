# Frontend/UX Spec - Donna Gateway

**Projeto:** Donna (AI Gateway)
**Data:** 2026-03-08
**Fase:** Brownfield Discovery - Fase 3 (Coleta: Frontend/UX)
**Agente:** @ux-design-expert (Uma)

---

## 1. Visao Geral de Interfaces

Donna possui **5 superficies de UI** distintas:

| Interface | Tech Stack | Localizacao | Status |
|-----------|-----------|-------------|--------|
| **Web UI** | Lit 3.3 + Web Components | `ui/` | Ativo |
| **TUI (Terminal)** | @clack/prompts + ANSI | `src/tui/` | Ativo |
| **Desktop** | Electron 33 + React | `apps/desktop/` | Em dev |
| **iOS** | SwiftUI + Observation | `apps/ios/` | Ativo |
| **Android** | Kotlin + Compose | `apps/android/` | Ativo |
| **macOS** | SwiftUI standalone | `apps/macos/` | Ativo |

---

## 2. Web UI (Lit)

### Stack
- **Framework:** Lit 3.3.2 (Web Components)
- **State:** @lit/context 1.1.6 + @lit-labs/signals 0.2.0
- **Build:** Vite (via vitest config)
- **Testes:** Vitest (`ui/vitest.config.ts` + `ui/vitest.node.config.ts`)

### Estrutura
```
ui/
├── src/          # Lit components source
├── vitest.config.ts
└── vitest.node.config.ts
```

### Observacoes
- Web Components (shadow DOM) - boa encapsulacao
- Signals para reatividade (abordagem moderna)
- Provider web para acesso via browser

---

## 3. Terminal UI (TUI)

### Stack
- **Prompts:** @clack/prompts 1.0.1
- **Progress:** osc-progress 0.3.0
- **Colors:** Palette centralizada (`src/terminal/palette.ts`)
- **Tables:** ANSI-safe wrapping (`src/terminal/table.ts`)

### Modulos
- `src/tui/` - Interface terminal completa
- `src/cli/progress.ts` - Spinners e barras de progresso
- `src/wizard/` - Setup wizard interativo
- `src/commands/onboarding/` - Fluxo de onboarding

---

## 4. Desktop (Electron)

### Stack
- **Runtime:** Electron 33.0
- **Frontend:** React (renderer)
- **Build:** electron-builder 25.0
- **Output:** DMG (macOS), NSIS (Windows)

### Estrutura
```
apps/desktop/
├── src/
│   ├── main.ts              # Main process
│   ├── preload.ts           # IPC bridge
│   ├── gateway-manager.ts   # Gateway lifecycle
│   └── tray/                # Menubar (tray-manager.ts)
├── renderer/                # React build output
├── assets/                  # Icons
└── electron-builder.yml     # Build config
```

### Funcionalidades
- Menubar/tray app (nao janela principal)
- Gateway lifecycle management
- Auto-update via GitHub releases

---

## 5. iOS App

### Stack
- **UI:** SwiftUI + Observation framework (@Observable, @Bindable)
- **Linguagem:** Swift
- **Targets:** iPhone, iPad, Apple Watch, Widgets, Share Extension

### Modulos Principais
- Chat, Contacts, Calendar, Camera, Media
- Settings, Onboarding, Voice, Reminders
- EventKit, Location, Motion sensors
- Gateway communication service

---

## 6. Android App

### Stack
- **UI:** Kotlin + Jetpack Compose
- **Build:** Gradle (Kotlin DSL)
- **Targets:** Phone, Tablet

---

## 7. macOS App (Nativo)

### Stack
- **UI:** SwiftUI standalone
- **Updater:** Sparkle (appcast.xml)
- **Modulos:** Donna, DonnaDiscovery, DonnaIPC, DonnaMacCLI, DonnaProtocol

---

## 8. Debitos de Frontend/UX Identificados

### Criticos

| ID | Debito | Area | Impacto |
|----|--------|------|---------|
| UX-01 | Desktop (Electron) duplica macOS (SwiftUI) | Desktop | Manutencao dupla, UX inconsistente |
| UX-02 | Web UI (Lit) vs Desktop (React) - frameworks diferentes | Frontend | Fragmentacao de componentes |

### Altos

| ID | Debito | Area | Impacto |
|----|--------|------|---------|
| UX-03 | Sem design system unificado entre plataformas | All | Inconsistencia visual |
| UX-04 | Desktop renderer como build output (nao source) | Desktop | Dificuldade de desenvolvimento |
| UX-05 | 5 superficies de UI com stacks completamente diferentes | All | Custo alto de manutencao |

### Medios

| ID | Debito | Area | Impacto |
|----|--------|------|---------|
| UX-06 | Lit signals em labs (experimental) | Web UI | API pode mudar |
| UX-07 | Onboarding split entre wizard e TUI | CLI | Fluxo fragmentado |
| UX-08 | Sem testes E2E de UI (Web + Desktop) | Testing | Regressoes visuais |
| UX-09 | Electron 33 (sem auto-update nativo no Windows) | Desktop | UX de update manual |
| UX-10 | Tray icons so em PNG (sem icones vetoriais) | Desktop | Resolucao limitada |

---

## 9. Padroes Positivos Identificados

- Palette centralizada no terminal (`src/terminal/palette.ts`) - bom padrao
- Observation framework no iOS (moderno, recomendado pela Apple)
- Web Components (Lit) para encapsulacao
- Shared code entre iOS/macOS (DonnaKit)
- Signal-based reactivity (moderno)

---

*Documento gerado automaticamente - Brownfield Discovery Fase 3*
