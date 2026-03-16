# Task: Structure Deal

## Metadata
```yaml
task_name: "Structure Deal"
status: pending
responsible_executor: "@tina-stark"
execution_type: Agent
estimated_time: "1-2h"
```

## Description
Estruturar deal completo utilizando o Five-Prong Framework de Tina Stark: Money, Risk, Control, Standards e Endgame. Cada prong e analisado em profundidade para garantir que a estrutura do negocio protege os interesses do cliente, aloca riscos de forma equilibrada e cria mecanismos claros de governanca, performance e saida.

## Input
- Tipo de deal (investimento, joint venture, licenciamento, M&A, partnership, SaaS)
- Partes envolvidas (nomes, papeis, poder de barganha relativo)
- Valores envolvidos (investimento, receita esperada, custos)
- Timeline do deal (fases, marcos, prazos criticos)
- Objetivos estrategicos de cada parte
- Restricoes conhecidas (regulatorias, financeiras, operacionais)
- Deals anteriores entre as partes (se houver)

## Process

### Step 1: Coletar Contexto Completo do Deal
Levantar informacoes essenciais para estruturacao:
- **Natureza do deal**: Qual tipo de transacao e por que agora
- **Partes**: Quem sao, o que cada um traz para a mesa
- **Mercado**: Contexto competitivo e regulatorio
- **Timeline**: Urgencia, fases de implementacao
- **Deal-breakers**: O que cada parte nao aceita

### Step 2: Analisar Cada Prong do Framework

#### Prong 1: Money (Dinheiro e Valor)
Estruturar todos os aspectos financeiros do deal:
- **Valor principal**: Preco, investimento, equity
- **Forma de pagamento**: A vista, parcelado, milestone-based, revenue share
- **Ajustes de preco**: Earn-outs, holdbacks, escrow
- **Multas e penalidades**: Inadimplemento, atraso, cancelamento
- **Tributacao**: Impacto fiscal para ambas as partes
- **Pergunta-chave**: "Quem paga o que, quando, e o que acontece se nao pagar?"

#### Prong 2: Risk (Alocacao de Risco)
Mapear e alocar riscos entre as partes:
- **Representacoes e garantias**: O que cada parte afirma como verdade
- **Indenizacao**: Quem cobre prejuizos e ate quanto
- **Limitacao de responsabilidade**: Caps, exclusoes, carve-outs
- **Seguros**: Exigencias de seguro para mitigar risco
- **Forca maior**: Eventos fora do controle das partes
- **Pergunta-chave**: "Se algo der errado, quem arca com o prejuizo?"

#### Prong 3: Control (Governanca e Controle)
Definir mecanismos de decisao e poder:
- **Estrutura de governanca**: Board, comites, voting rights
- **Decisoes ordinarias**: Quem decide o dia-a-dia
- **Decisoes extraordinarias**: O que requer unanimidade ou supermaioria
- **Direitos de veto**: Protective provisions, reserved matters
- **Informacao**: Reporting, auditoria, acesso a dados
- **Pergunta-chave**: "Quem decide o que, e como resolve-se um impasse?"

#### Prong 4: Standards (Padroes de Performance)
Estabelecer metricas e padroes objetivos:
- **KPIs**: Indicadores mensuráveis de performance
- **SLAs**: Niveis de servico comprometidos
- **Benchmarks**: Comparacao com mercado ou historico
- **Cura**: Prazo para corrigir descumprimento
- **Consequencias**: Penalidades graduais por nao-atingimento
- **Pergunta-chave**: "Como medimos sucesso e o que acontece se nao atingir?"

#### Prong 5: Endgame (Saida e Encerramento)
Planejar cenarios de termino do deal:
- **Prazo e renovacao**: Vigencia, renovacao automatica, opt-out
- **Rescisao por conveniencia**: Aviso previo, custos de saida
- **Rescisao por justa causa**: Eventos que permitem saida imediata
- **Transicao**: Handover de ativos, dados, conhecimento
- **Nao-compete e nao-solicitacao**: Restricoes pos-termino
- **Drag-along / Tag-along**: Direitos de venda conjunta (se equity)
- **Pergunta-chave**: "Como cada parte sai, e o que leva consigo?"

### Step 3: Identificar Gaps e Riscos
Cruzar os 5 prongs para encontrar:
- Prongs com informacao insuficiente
- Conflitos entre prongs (ex: Money vs Risk)
- Cenarios nao cobertos (e se X acontecer?)
- Assimetrias de poder que precisam de protecao

### Step 4: Recomendar Estrutura Otima
Consolidar analise em recomendacao:
- Estrutura recomendada para cada prong
- Alternativas consideradas e por que foram descartadas
- Trade-offs explicitos (ex: "mais controle = menos flexibilidade")
- Pontos que precisam de negociacao

### Step 5: Handoff para Redacao
Encaminhar deal structure para @kenneth-adams:
- Documento de estrutura completo como briefing de redacao
- Clausulas prioritarias por prong
- Pontos de atencao linguistica especificos

## Output

### Deal Structure Document
```markdown
# Estrutura do Deal

## Tipo: {tipo do deal}
## Data: {data}
## Partes: {parte_1} e {parte_2}
## Estruturado por: @tina-stark

---

## Resumo Executivo
{3-4 paragrafos com visao geral da estrutura recomendada}

## Analise por Prong

### 1. Money
| Elemento | Estrutura Recomendada |
|----------|----------------------|
| Valor | {valor} |
| Pagamento | {forma} |
| Multas | {valores/percentuais} |

### 2. Risk
| Risco | Alocacao | Mitigacao |
|-------|----------|-----------|
| {risco} | {parte responsavel} | {mecanismo} |

### 3. Control
| Decisao | Quem Decide | Mecanismo |
|---------|-------------|-----------|
| {tipo} | {parte} | {como} |

### 4. Standards
| KPI | Meta | Consequencia |
|-----|------|--------------|
| {indicador} | {valor} | {penalidade/bonus} |

### 5. Endgame
| Cenario | Mecanismo | Consequencia |
|---------|-----------|--------------|
| {cenario} | {como sair} | {custos/obrigacoes} |

## Gaps e Riscos Identificados
| # | Gap/Risco | Prong | Recomendacao |
|---|-----------|-------|--------------|
| 1 | {descricao} | {prong} | {acao} |

## Handoff
- @kenneth-adams: Redigir contrato com base nesta estrutura
- Pontos de atencao: {lista}
```

## Acceptance Criteria
- [ ] Todos os 5 prongs analisados em profundidade
- [ ] Pergunta-chave de cada prong respondida
- [ ] Gaps e riscos identificados entre prongs
- [ ] Recomendacao clara e justificada para cada prong
- [ ] Trade-offs explicitos documentados
- [ ] Handoff para @kenneth-adams com briefing completo de redacao
- [ ] Documento navegavel e compreensivel por nao-advogados
