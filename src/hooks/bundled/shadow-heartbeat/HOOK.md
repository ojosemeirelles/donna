# Shadow Heartbeat

Periodic wake cycle for the Shadow Army. Every 30 minutes, dispatches a heartbeat prompt to each active shadow so they can check their WORKING.md and resume pending tasks.

## Behavior

- Loads shadow registry from `~/.donna/shadows/registry.json`
- Filters to `status: "active"` shadows only
- Sends heartbeat prompt to each shadow sequentially
- Shadow checks WORKING.md and either works or responds "SLEEP"
- Jima logs all results to `~/.donna/shadows/Jima/heartbeat.log.jsonl`

## Configuration

Set `shadowHeartbeat` in donna.json to customize the cron expression (default: `*/30 * * * *`).

## Monitoring

Jima's heartbeat log contains full cycle reports with status per shadow (awake/sleep/failed).
