# Progress

## Feito hoje (2026-03-09)
- Shadow Army completo: Igris, Beru, Bellion, Tusk, Iron, Tank, Kaisel, Jima
- Todos os testes passando (PT-BR + EN)
- 8 shadow agents configurados no donna.json
- SOUL.md gerado para cada sombra
- Orchestrator integrado no pipeline de reply
- Rank unlock automatico no level-up
- Ralph instalado com prd.json de 4 stories
- Gateway rodando com todos os shadows carregados

## Foco de amanha — AUTONOMIA PROATIVA

### Sprint 1 — Gmail Intelligence (manha)
Donna classifica emails automaticamente e alerta sem voce pedir.
Arquivo: src/hooks/bundled/gmail-watch/
- Gmail Pub/Sub webhook listener
- Classificador: urgente / pode aguardar / lixo
- Alert automatico no Telegram para emails urgentes
- Resumo do email com acao sugerida

### Sprint 2 — Daily Brief completo (tarde)
Morning Brief com agenda + emails + contexto de reunioes.
Arquivo: src/hooks/bundled/morning-brief/ (expandir o existente)
- Tank puxa agenda do Google Calendar
- Bellion analisa emails nao lidos
- Tusk pesquisa contexto dos participantes
- Donna consolida tudo as 06:50

### Sprint 3 — Proactive Watch Loop (se sobrar tempo)
Jima em background com condicoes configuraveis.
Arquivo: src/hooks/bundled/watch-loop/
- Verifica condicoes a cada N minutos
- Dispara acoes quando condicao e verdadeira
- Config em ~/.donna/hooks/watch-loop/conditions.json

### Sprint 4 — End of Day Report (se sobrar tempo)
Bellion consolida o dia as 18:00.
Arquivo: src/hooks/bundled/end-of-day/
- Resume o que foi feito
- Lista pendentes
- Prepara agenda de amanha

## Erros conhecidos
- Electron tela preta: donna-app custom element nao registra
- Rebranding incompleto: strings OpenClaw ainda existem em src/
