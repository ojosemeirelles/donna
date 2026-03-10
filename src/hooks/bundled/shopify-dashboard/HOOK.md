---
name: shopify-dashboard
description: "Monitor Shopify store orders, revenue, and inventory with Telegram alerts"
homepage: https://docs.donna.ai/automation/hooks#shopify-dashboard
metadata:
  donna:
    emoji: "\U0001F6D2"
    events: ["gateway:startup"]
    install: [{ id: "bundled", kind: "bundled" }]
---

# Shopify Dashboard Hook

Monitors a Shopify store for orders, revenue, and inventory levels. Sends daily summaries and low stock alerts to Telegram.

## What It Does

1. Periodically checks inventory for low stock items
2. Sends daily summaries with order count, revenue, and fulfillment status
3. Alerts immediately when products fall below the stock threshold

## Configuration

Create `~/.donna/hooks/shopify-dashboard/config.json`:

```json
{
  "enabled": true,
  "shopDomain": "your-store.myshopify.com",
  "telegramChatId": "YOUR_CHAT_ID",
  "checkIntervalMinutes": 30,
  "lowStockThreshold": 5,
  "dailySummaryTime": "0 9 * * *"
}
```

Create `~/.donna/shopify-token.json`:

```json
{
  "accessToken": "shpat_your_access_token"
}
```

## Disabling

```bash
donna hooks disable shopify-dashboard
```
