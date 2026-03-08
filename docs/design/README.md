# Donna Design Tokens

Cross-platform design tokens extracted from the existing Donna codebase.
These tokens document the current visual language and provide a single source
of truth that can be consumed by Web (Lit/CSS), Terminal (Node), SwiftUI
(iOS/macOS), and Compose (Android).

## Files

| File | Format | Purpose |
|------|--------|---------|
| `tokens.json` | Style Dictionary-compatible JSON | Canonical token definitions with descriptions |
| `tokens.css` | CSS custom properties | Ready-to-import for any web surface |

## Token categories

| Category | Examples |
|----------|---------|
| **color** | `primary`, `surface`, `on-surface`, `success`, `error` |
| **color-light** | Light-mode overrides for all color tokens |
| **color-terminal** | LOBSTER_PALETTE values for CLI output |
| **spacing** | `xs` (4px) through `2xl` (48px) |
| **typography** | `body`, `heading`, `caption`, `mono` font stacks and weights |
| **radius** | `sm` (6px) through `full` (9999px) |
| **shadow** | `sm`, `md`, `lg` elevation levels |
| **motion** | Duration (`fast`/`normal`/`slow`) and easing curves |

## How to consume per platform

### Web (Lit / HTML / CSS)

Import the CSS file and use the `--donna-*` custom properties:

```css
@import "docs/design/tokens.css";

.my-component {
  background: var(--donna-color-surface-card);
  color: var(--donna-color-on-surface);
  border-radius: var(--donna-radius-md);
  padding: var(--donna-spacing-md);
}
```

Light theme activates automatically with `[data-theme="light"]` on a parent element.

### Terminal (Node.js)

Use `src/terminal/palette.ts` (the LOBSTER_PALETTE) directly.
The `color-terminal` section in `tokens.json` documents the same values:

```ts
import { LOBSTER_PALETTE } from "./src/terminal/palette.ts";

// LOBSTER_PALETTE.accent  => #FF5A2D (tokens.json color-terminal.accent)
// LOBSTER_PALETTE.success => #2FBF71 (tokens.json color-terminal.success)
```

### SwiftUI (iOS / macOS)

Map tokens to SwiftUI `Color` values. Example extension:

```swift
import SwiftUI

extension Color {
    static let donnaPrimary = Color(hex: 0xFF5C5C)
    static let donnaSuccess = Color(hex: 0x22C55E)
    static let donnaWarning = Color(hex: 0xF59E0B)
    static let donnaError   = Color(hex: 0xEF4444)
    static let donnaInfo    = Color(hex: 0x3B82F6)
    static let donnaSurface = Color(hex: 0x12141A)
}
```

For iOS status colors, the existing `StatusPill.GatewayState.color` already
uses `.green`, `.yellow`, `.red`, `.gray` which map closely to the semantic
tokens (`success`, `warning`, `error`, `on-surface-muted`).

### Compose (Android)

Map tokens to a Compose `ColorScheme`:

```kotlin
val DonnaDarkColors = darkColorScheme(
    primary = Color(0xFFFF5C5C),
    secondary = Color(0xFF14B8A6),
    background = Color(0xFF12141A),
    surface = Color(0xFF181B22),
    error = Color(0xFFEF4444),
    onPrimary = Color(0xFFFFFFFF),
    onBackground = Color(0xFFE4E4E7),
    onSurface = Color(0xFFE4E4E7),
)
```

## Existing source mapping

| Token | Web UI (`base.css`) | Terminal (`palette.ts`) | Android | iOS/macOS |
|-------|--------------------|-----------------------|---------|-----------|
| `primary` | `--accent` / `--primary` (#ff5c5c) | `accent` (#FF5A2D) | -- | -- |
| `success` | `--ok` (#22c55e) | `success` (#2FBF71) | -- | `.green` |
| `warning` | `--warn` (#f59e0b) | `warn` (#FFB020) | -- | `.yellow` |
| `error` | `--destructive` (#ef4444) | `error` (#E23D2D) | -- | `.red` |
| `info` | `--info` (#3b82f6) | `info` (#FF8A5B) | -- | -- |
| `surface` | `--bg` (#12141a) | -- | `#0A0A0A` (launcher) | -- |

### Known inconsistencies

1. **Primary/accent colors differ between Web and Terminal.** Web uses `#ff5c5c` (pinkish red),
   Terminal uses `#FF5A2D` (orange-red). Both are "lobster" variants; the terminal palette
   is optimized for ANSI contrast.
2. **Info color diverges.** Web uses standard blue (`#3b82f6`), Terminal uses warm
   orange (`#FF8A5B`) for better terminal readability.
3. **Android has minimal color definitions.** Only the launcher background (`#0A0A0A`)
   is defined; the app uses Material3 defaults.
4. **iOS/macOS use SwiftUI system colors** (`.green`, `.yellow`, `.red`) rather than
   exact hex values, which means they adapt to system appearance automatically.

## Guidelines for extending

1. Add new tokens to `tokens.json` first (canonical source).
2. Regenerate `tokens.css` to match (or update manually).
3. Follow naming convention: `category.name` in JSON, `--donna-category-name` in CSS.
4. Keep semantic meaning clear: prefer `success`/`error`/`warning` over `green`/`red`/`yellow`.
5. Do not remove existing tokens without updating all consuming platforms.
6. Terminal colors are intentionally different from Web colors for readability; do not force them to match.
