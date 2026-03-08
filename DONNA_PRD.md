# Donna — Product Requirements Document

## Origem

Donna nasceu como um fork hardened do OpenClaw — o projeto open source de AI agent mais crescido da história do GitHub (271k stars em menos de 4 meses). O OpenClaw tem poder, mas tem dois problemas críticos: segurança catastrófica (20+ CVEs em 60 dias) e complexidade que exige desenvolvedor para instalar.

Donna resolve os dois. É a evolução do OpenClaw: mesma fundação, segurança enterprise, e um produto que qualquer pessoa consegue usar.

Mas Donna não para aí.

---

## Visão do Produto

Donna é uma secretária inteligente e autônoma inspirada na jornada de Sung Jin-Woo em Solo Leveling.

Assim como Jin-Woo começa fraco e evolui continuamente até se tornar o ser mais poderoso do mundo, a Donna começa simples e evolui sem parar — aprendendo com cada interação, ficando mais capaz a cada semana, desbloqueando novas habilidades com o tempo.

Donna não é uma ferramenta estática. Ela tem uma jornada de evolução.

**Posicionamento:** "A secretária que aprende, evolui e nunca para de crescer."

**Diferencial central:** Donna não é uma ferramenta de developer — é um produto de consumo com alma de RPG. Instala como o Chrome, funciona como um assistente pessoal real, e sobe de nível a cada semana.

---

## A Essência: Sistema de Evolução

Inspirado em Solo Leveling, Donna tem um sistema de progressão contínua:

### Níveis de Donna

Cada instância da Donna evolui individualmente baseada no uso real:

**Nível 1 — Iniciante**
Responde perguntas, envia morning brief, executa tarefas simples.
Desbloqueado: no install.

**Nível 2 — Aprendiz**
Lembra nome, preferências, estilo de comunicação.
Desbloqueado: após 7 dias de uso.

**Nível 3 — Assistente**
Reconhece padrões de comportamento, sugere automações, antecipa necessidades.
Desbloqueado: após 30 dias e 100 interações.

**Nível 4 — Estrategista**
Executa ciclos autônomos, gerencia projetos, toma iniciativa sem ser perguntada.
Desbloqueado: após 90 dias e uso consistente de skills avançadas.

**Nível 5 — Autônoma**
Opera 24/7 de forma independente, reporta resultados, escala capacidades conforme demanda.
Desbloqueado: configuração avançada + plano Business.

### Relatório de Evolução Semanal

Todo domingo a Donna envia um relatório de evolução via Telegram:

```
⚔️ Donna — Relatório de Evolução
Semana 12 | Nível 3 — Assistente

📈 Progresso esta semana:
• 47 tarefas concluídas (+12% vs semana anterior)
• 3 padrões novos identificados
• 2.3M tokens economizados pelo Token Intelligence
• Cache hit rate: 78%

🧠 O que aprendi sobre você:
• Você trabalha melhor entre 9h e 12h
• Segunda é seu dia de planning
• Você prefere respostas diretas sem rodeios

🔓 Próximo desbloqueio:
Faltam 23 interações para desbloquear "Modo Estrategista"
Continue usando skills avançadas para evoluir mais rápido.

💡 Iniciativa desta semana:
Percebi que você agenda reuniões manualmente toda segunda.
Posso automatizar isso. Quer ativar?
```

---

## O Produto Hoje (v1.0 — implementado)

### Segurança

- 20 CVEs cobertos ou auditados (base OpenClaw hardened)
- Auth obrigatório com OS Keychain via keytar
- WebSocket origin validation
- Credenciais criptografadas (sem plaintext)
- DM policy enforcement (allowlist por padrão)
- Prompt injection web bloqueado
- Spending limits enforçados
- Log poisoning corrigido
- Pre-commit hook seguro

### Token Intelligence

- Model Router: classifica tarefas → Haiku/Sonnet/Opus automaticamente
- Auto-Compact: compacta sessão ao atingir 70% do context window
- Prompt Cache Manager: cache_control Anthropic + heartbeat de 4min
- Context Budget: bootstrapTier (minimal/standard/full) por tipo de sessão
- Cost Report Hook: relatório diário de custo às 20h via Telegram

### Memory System (3 camadas)

- Identity Memory: nome, idioma, timezone, estilo de comunicação
- Pattern Memory: comportamento ao longo do tempo, top skills, horários de uso
- Episodic Memory: log diário de tarefas, busca nos últimos 30 dias
- Memory Orchestrator: coordena as 3 camadas, injeta contexto no prompt
- Consolidação semanal: relatório de insights via Telegram toda domingo

### Features de Uso

- Morning Brief: resumo inteligente todo dia às 7h via Telegram
- Cost Report: breakdown de custo diário às 20h via Telegram
- Telegram como canal principal de comunicação

### Desktop App

- Electron — roda como app nativo no macOS e Windows
- System Tray: ícone na menu bar, menu de status
- Setup Wizard: 5 steps (Welcome → API Key → Telegram → Morning Brief → Done)
- GatewayManager: inicia/monitora/reinicia o gateway automaticamente
- Auto-restart: 3 tentativas com backoff exponencial se gateway crasha
- Build Pipeline: .dmg (x64 + arm64) para macOS, .exe para Windows
- Auto-update via electron-updater

---

## Roadmap

### v1.1 — Donna Funcional

- Wizard HTML renderizando corretamente
- Ícone real da Donna (identidade visual)
- Modelo Gemini corrigido
- @DonnaSetupBot no Telegram para pareamento no wizard
- Integração profunda do Memory Orchestrator no gateway startup
- Integração do Token Intelligence no pipeline de agent turns
- Sistema de níveis implementado (tracking de progresso)

### v1.2 — Donna Inteligente (Nível 3)

- Aprendizado ativo: Donna sugere automações baseadas em padrões
- Iniciativas autônomas: Donna toma ação sem ser perguntada
- Multi-agent: subagentes isolados para tarefas pesadas
- SecureHub: marketplace de skills verificadas
- Relatório de evolução semanal com progressão de nível

### v1.3 — Donna como Plataforma

- Backend de billing próprio (Supabase + Stripe)
- API proxy: Donna Cloud → Anthropic/Google
- Planos:
  - Free: Nível 1-2, 100k tokens/mês, Gemini Flash
  - Pro ($19/mês): Nível 1-4, 2M tokens, Claude + Gemini
  - Business ($49/mês): Nível 1-5, ilimitado, multi-dispositivo
- Model stack: Claude para qualidade, Gemini para margem

### v2.0 — Donna Autônoma (Nível 5)

- Autonomous Loop: observa → planeja → executa → reporta → dorme
- Skills de alto valor: email completo, agenda, pesquisa, financeiro
- Donna para equipes: instância compartilhada, múltiplos usuários
- API pública: desenvolvedores constroem skills para a SecureHub
- Donna opera 24/7 e reporta o que fez

---

## Modelo de Negócio

### Fase 1 — Validação (agora)

- Produto gratuito, usuário traz API key própria
- Foco: crescer base de usuários, validar retenção
- Meta: 500 usuários ativos em 60 dias

### Fase 2 — Monetização (v1.3)

- Plano Pro com billing próprio
- Compra API em volume, revende com markup
- Token Intelligence garante margem
- Meta: 100 usuários pagantes, $2k MRR

### Fase 3 — Escala (v2.0)

- SecureHub: 30% revenue share nas skills pagas
- API pública para desenvolvedores
- Enterprise: contratos anuais
- Meta: $50k MRR

---

## Stack Técnico

- Runtime: Node.js 22+
- Linguagem: TypeScript
- Monorepo: pnpm workspaces
- Desktop: Electron + electron-builder
- Gateway: HTTP + WebSocket (porta 18789, bind 127.0.0.1)
- Auth: keytar (OS Keychain)
- Modelos: Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google)
- Canal principal: Telegram
- Testes: Vitest
- Distribuição: GitHub Releases (.dmg + .exe)

---

## Métricas de Sucesso

- DAU/MAU ratio > 40%
- Retenção D30 > 60%
- NPS > 50
- Custo médio de tokens por usuário < $5/mês
- Taxa de upgrade Free→Pro > 8%
- Usuários atingindo Nível 3+ em 30 dias > 40%

---

## Princípios de Design

1. Zero terminal — qualquer pessoa instala e usa
2. Evolui como Jin-Woo — cada semana mais forte, mais capaz
3. Toma iniciativa — não espera ser perguntada
4. Comunica pelo Telegram — onde o usuário já está
5. Transparente — mostra o que faz, quanto custa, o que aprendeu
6. Segura por padrão — hardened desde o primeiro dia
7. Nasceu do OpenClaw — respeita a origem, supera o original
