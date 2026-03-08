# UX Specialist Review

**Projeto:** Donna (AI Gateway)
**Data:** 2026-03-08
**Fase:** Brownfield Discovery - Fase 6 (Validacao: UX/Frontend)
**Agente:** @ux-design-expert (Uma)

---

## Debitos Validados

| ID | Debito | Severidade | Horas | Prioridade | Impacto UX |
|----|--------|-----------|-------|-----------|-----------|
| UX-01 | Electron duplica macOS SwiftUI | **Alto** (ajustado de Critico) | 80-120h | P2 | Confuso para usuario macOS: qual app usar? |
| UX-02 | Lit (Web) vs React (Desktop) | Medio (ajustado de Critico) | 20-40h | P2 | Desenvolvedores confusos, nao usuario final |
| UX-03 | Sem design system unificado | Alto | 40-60h | P1 | Inconsistencia visual entre plataformas |
| UX-04 | Desktop renderer como build output | Medio | 8-12h | P2 | Afeta DX, nao UX |
| UX-05 | 5 superficies UI com stacks diferentes | Alto | N/A (decisao arquitetural) | P1 | Custo de manutencao limita features novas |
| UX-06 | Lit signals experimental | Baixo | 4-8h | P3 | Signals sao direcao da web platform |
| UX-07 | Onboarding fragmentado | **Alto** (ajustado de Medio) | 12-20h | P1 | First impression do usuario |
| UX-08 | Sem testes E2E de UI | Medio | 24-40h | P2 | Regressoes visuais nao detectadas |
| UX-09 | Sem auto-update Windows | Medio | 8-16h | P2 | Fricao na atualizacao |
| UX-10 | Tray icons so PNG | Baixo | 2-4h | P3 | Menor impacto visual |

## Debitos Adicionados

| ID | Debito | Severidade | Horas | Prioridade | Impacto UX |
|----|--------|-----------|-------|-----------|-----------|
| UX-11 | Sem dark mode consistente entre plataformas | Medio | 16-24h | P2 | Experiencia visual fragmentada |
| UX-12 | TUI nao tem modo acessivel (screen readers) | Medio | 12-16h | P2 | Acessibilidade |
| UX-13 | Sem loading states padronizados | Medio | 8-12h | P2 | Feedback visual inconsistente |

## Respostas ao Architect

### 1. Manter Electron + SwiftUI ou convergir?
**Recomendo convergir para SwiftUI no macOS.** Razoes:
- SwiftUI e nativo, melhor performance e UX
- Electron e redundante se ja existe macOS SwiftUI app
- Manter Electron **apenas para Windows** (onde SwiftUI nao existe)
- Resultado: SwiftUI (macOS) + Electron (Windows only) + iOS SwiftUI + Android Compose

### 2. Lit 3 + signals e boa aposta?
**Sim.** Signals sao a direcao da web platform (TC39 proposal). Lit e mantido pelo Google e usa Web Components standard. Boa escolha para Web UI. O `@lit-labs/signals` vai migrar para `@lit/signals` quando estabilizar.

### 3. Design system cross-platform e viavel?
**Parcialmente.** Recomendo:
- **Design tokens** (cores, espacamento, tipografia) compartilhados via JSON
- **Componentes nativos** por plataforma (SwiftUI, Compose, Lit)
- **NAO tentar** componentes cross-platform (React Native, Flutter) - cada plataforma tem idiomas proprios
- **Documentar** o design system em Figma ou similar

## Recomendacoes de Design

### Prioridade 1: Onboarding Unificado
O primeiro contato do usuario define a retencao. Recomendo:
- Fluxo unico: CLI → wizard → QR scan (WhatsApp) → done
- Mesmo fluxo visual no TUI e Desktop
- Progress indicator claro (etapas numeradas)

### Prioridade 2: Design Tokens
Antes de qualquer componente:
- Definir palette (light/dark), spacing scale, typography scale
- Exportar como JSON consumivel por todas as plataformas
- Lit, SwiftUI e Compose podem consumir tokens

### Prioridade 3: Resolver Duplicacao Desktop
- macOS: Migrar para SwiftUI app (ja existe!)
- Windows: Manter Electron (unica opcao)
- Resultado: 1 codebase a menos para manter

---

*Revisao de especialista - Brownfield Discovery Fase 6*
