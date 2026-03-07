---
name: cost-report
description: "Format and deliver a daily AI usage cost report with model breakdown, cache stats, and trends"
---

# Cost Report Skill

When generating a cost report:

1. **Start with a summary line**: total cost today, with emoji indicator (green if < yesterday, red if higher)
2. **Model breakdown section**: list each model used with token counts and cost, sorted by cost descending
3. **Cache efficiency section**: show cache hit rate percentage and estimated token savings
4. **Top operations**: up to 3 most expensive operations (if available)
5. **Day-over-day change**: show % difference from yesterday with arrow indicator

## Format (Portuguese)

```
💰 Relatório de Custo — 07/03/2026

📊 Total hoje: $0.42 ↓ -12% vs ontem

🤖 Por modelo:
• claude-sonnet-4-6: 45k tokens — $0.28
• claude-haiku-4-5: 12k tokens — $0.09
• claude-opus-4-6: 2k tokens — $0.05

⚡ Cache:
• Hit rate: 68% | Economia estimada: 23k tokens

📈 Variação: -$0.06 vs ontem ($0.48)
```

## Format (English)

```
💰 Cost Report — 03/07/2026

📊 Total today: $0.42 ↓ -12% vs yesterday

🤖 By model:
• claude-sonnet-4-6: 45k tokens — $0.28
• claude-haiku-4-5: 12k tokens — $0.09
• claude-opus-4-6: 2k tokens — $0.05

⚡ Cache:
• Hit rate: 68% | Estimated savings: 23k tokens

📈 Change: -$0.06 vs yesterday ($0.48)
```

Keep the report concise — aim for under 20 lines total.
Use `k` suffix for thousands of tokens.
Round costs to 2 decimal places.
