# Task: Tactical Negotiation Strategy

## Metadata
```yaml
task_name: "Tactical Negotiation Strategy"
status: pending
responsible_executor: "@chris-voss"
execution_type: Agent
estimated_time: "30min-1h"
```

## Description

Preparar negociacao tatica usando Tactical Empathy (Never Split the Difference — Chris Voss). Foco na dimensao emocional e psicologica: entender o mundo da outra parte antes de tentar mudar sua posicao. Produz playbook tatico com scripts de abertura, labels, calibrated questions e estrategia para Black Swans.

## Input

- Contexto da negociacao (partes, objeto, stakes)
- Perfil da outra parte (cargo, personalidade, historico)
- Emocoes provaveis da outra parte (medos, frustracoes, desejos)
- Resultado desejado e limites inegociaveis

## Process

### Step 1: Accusation Audit
- Listar TUDO que a outra parte pode pensar/sentir negativamente sobre voce ou sua proposta
- Incluir medos, desconfiancas, frustracoes e objecoes provaveis
- Nao minimizar — exagerar levemente para desarmar
- Ordenar do mais leve ao mais grave (minimo 5 itens)

### Step 2: Definir Labels
- Transformar cada item do Accusation Audit em label: "Parece que..." / "Soa como se..."
- Labels validam a emocao sem concordar com a posicao
- Preparar 5-8 labels, sequenciados do leve ao grave
- Regra: apos cada label, esperar em silencio (nao preencher)

### Step 3: Preparar Calibrated Questions
- Comecam com "Como" ou "O que" — nunca "Por que"
- Forcam a outra parte a resolver seu problema por voce
- Essenciais: "Como posso fazer isso funcionar para voce?", "O que faz isso ser importante?", "Como devo proceder se nao funcionar?", "O que acontece se nao chegarmos a acordo?"
- Preparar 6-10 calibrated questions especificas para o contexto

### Step 4: Identificar Black Swans
- Informacoes ocultas que mudam completamente a dinamica
- Tres tipos: Positivos (algo valioso que voce pode oferecer barato), Negativos (algo que limita opcoes deles), Contextuais (regras internas, pressoes de terceiros, deadlines ocultos)
- Formular hipoteses e planejar perguntas indiretas para descobri-los

### Step 5: Estrategia de Ancoragem
- Decidir: ancorar (primeira oferta) ou deixar ancorar
- Se ancorar: Ackerman model — 65% → 85% → 95% → 100% do alvo
- Numero final nao-redondo (parece calculado, gera credibilidade)

### Step 6: Script de Abertura
- Tom "DJ de FM noturna" (calmo, grave, lento)
- Sequencia: Mirror (repetir 1-3 palavras) → Label → Pausa 4s → Calibrated Question
- Escrever script palavra por palavra para os primeiros 3-5 minutos

## Output

### Tactical Negotiation Playbook
```markdown
# Tactical Negotiation Playbook

## 1. Contexto Tatico
- Negociacao: {descricao} | Outra parte: {perfil}
- Objetivo: {resultado desejado} | Limite: {inegociavel}

## 2. Accusation Audit
1. "Voce provavelmente acha que {acusacao 1}..."
2. "Voce deve estar pensando que {acusacao 2}..."
3. {continuar ate esgotar — minimo 5}

## 3. Labels Preparados
1. "Parece que {emocao 1}..." | 2. "Soa como se {emocao 2}..."
3. {5-8 labels no total}

## 4. Calibrated Questions
1. "Como {question 1}?" | 2. "O que {question 2}?"
3. {6-10 questions no total}

## 5. Hipoteses de Black Swans
| Tipo | Hipotese | Pergunta para Descobrir |
|------|----------|------------------------|
| Positivo | {hipotese} | {pergunta indireta} |
| Negativo | {hipotese} | {pergunta indireta} |
| Contextual | {hipotese} | {pergunta indireta} |

## 6. Ancoragem
- Abordagem: {ancorar / deixar ancorar}
- Ackerman: {65% → 85% → 95% → 100%} | Final: {valor nao-redondo}

## 7. Script de Abertura
"{Mirror + Label + Pausa + Question — primeiros minutos}"
```

## Acceptance Criteria

- [ ] Accusation Audit completo com minimo de 5 itens
- [ ] Labels preparados no formato correto (minimo 5)
- [ ] Calibrated Questions definidas com "Como"/"O que" (minimo 6)
- [ ] Black Swans hipoteses formuladas nos 3 tipos
- [ ] Estrategia de ancoragem definida com modelo Ackerman
- [ ] Script de abertura com mirror + label + pausa + question
