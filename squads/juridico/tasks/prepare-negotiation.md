# Task: Prepare Principled Negotiation

## Metadata
```yaml
task_name: "Prepare Principled Negotiation"
status: pending
responsible_executor: "@fisher-ury"
execution_type: Agent
estimated_time: "1-2h"
```

## Description

Preparar negociacao usando Principled Negotiation (Getting to Yes — Fisher & Ury) + Seven Elements (Harvard Negotiation Project). Estruturar preparacao completa: interesses, alternativas e opcoes de ganho mutuo — separando pessoas do problema e focando em criterios objetivos.

## Input

- Contexto da negociacao (partes, objeto, stakes)
- Posicoes declaradas de cada parte
- Historico do relacionamento entre as partes (se existir)
- Restricoes conhecidas (tempo, orcamento, regulatorias)
- Documentos relevantes (contratos, propostas, correspondencias)

## Process

### Step 1: Mapear Interesses (Nao Posicoes)
- Para cada parte, separar a posicao declarada dos interesses subjacentes
- Perguntar "por que?" e "por que nao?" para descobrir interesses reais
- Classificar interesses por prioridade: essenciais, importantes, desejaveis
- Identificar interesses compartilhados entre as partes

### Step 2: Calcular BATNA de Cada Lado
- BATNA = Best Alternative To a Negotiated Agreement
- Listar alternativas caso a negociacao fracasse, avaliar cada uma (viabilidade, custo, risco)
- Selecionar a melhor alternativa como BATNA de cada lado

### Step 3: Definir ZOPA
- ZOPA = Zone of Possible Agreement
- Determinar ponto de reserva de cada lado (limite minimo aceitavel)
- Se existe ZOPA: mapear onde maximizar valor para ambos
- Se nao existe: reavaliar se a negociacao vale a pena

### Step 4: Aplicar Seven Elements
- **Interests**: Ja mapeados no Step 1
- **Options**: Gerar opcoes criativas de ganho mutuo (Step 5)
- **Alternatives**: BATNA ja calculado (Step 2)
- **Legitimacy**: Identificar criterios objetivos e precedentes
- **Communication**: Planejar como comunicar propostas de forma clara
- **Relationship**: Avaliar impacto na relacao de longo prazo
- **Commitment**: Definir que compromissos sao realistas e executaveis

### Step 5: Gerar Opcoes de Ganho Mutuo
- Brainstorm sem julgamento: listar todas as opcoes possiveis
- Expandir o "bolo" antes de dividir (criar valor, nao so distribuir)
- Buscar trocas de valor (o que e barato pra mim e valioso pra voce)
- Selecionar 3-5 opcoes mais promissoras

### Step 6: Preparar Criterios Objetivos
- Identificar padroes de mercado, benchmarks, precedentes
- Buscar referencias independentes (tabelas, indices, laudos)
- Preparar argumentos baseados em criterios, nao em vontade
- Antecipar quais criterios a outra parte pode trazer

### Step 7: Definir Estrategia de Abertura
- Decidir quem faz a primeira oferta (ancoragem)
- Preparar a narrativa de abertura (framing)
- Definir concessoes planejadas e ordem de apresentacao
- Preparar resposta para taticas competitivas

## Output

### Negotiation Preparation Brief
```markdown
# Negotiation Preparation Brief

## 1. Contexto
- Partes envolvidas: {partes}
- Objeto da negociacao: {objeto}
- Prazo/urgencia: {prazo}

## 2. Mapa de Interesses
| Parte | Posicao Declarada | Interesses Reais | Prioridade |
|-------|-------------------|------------------|------------|
| {A}   | {posicao}         | {interesses}     | {P1/P2/P3} |
| {B}   | {posicao}         | {interesses}     | {P1/P2/P3} |

## 3. Analise BATNA
- BATNA Parte A: {descricao e avaliacao}
- BATNA Parte B: {descricao e avaliacao}
- Poder relativo: {quem tem BATNA mais forte}

## 4. ZOPA
- Ponto de reserva A: {valor/condicao}
- Ponto de reserva B: {valor/condicao}
- ZOPA identificada: {sim/nao — descricao da zona}

## 5. Opcoes de Ganho Mutuo
1. {opcao 1 — descricao e beneficio para cada parte}
2. {opcao 2}
3. {opcao 3}

## 6. Criterios Objetivos
- {criterio 1 — fonte}
- {criterio 2 — fonte}

## 7. Estrategia de Abertura
- Primeira oferta: {quem faz, valor/proposta}
- Narrativa: {framing principal}
- Concessoes planejadas: {ordem e limites}
```

## Acceptance Criteria

- [ ] BATNA calculado para ambas as partes com avaliacao de alternativas
- [ ] Interesses mapeados e separados das posicoes para cada parte
- [ ] ZOPA identificada ou justificativa de por que nao existe
- [ ] Opcoes de ganho mutuo geradas (minimo 3)
- [ ] Criterios objetivos identificados com fontes
- [ ] Estrategia de abertura definida com concessoes planejadas
- [ ] Seven Elements todos endereçados no brief
