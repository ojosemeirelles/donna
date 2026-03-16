# Task: Write Legal Memo

## Metadata
```yaml
task_name: "Write Legal Memo"
status: pending
responsible_executor: "@bryan-garner"
execution_type: Agent
estimated_time: "1-2h"
```

## Description
Redigir memorando ou parecer juridico utilizando Plain English e frameworks estruturados de argumentacao. Para pareceres objetivos (analise de questao juridica), aplicar IRAC (Issue, Rule, Application, Conclusion). Para pecas persuasivas (peticoes, defesas), aplicar CREAC (Conclusion, Rule, Explanation, Application, Conclusion). O memo deve ser claro, fundamentado e acessivel a audiencia-alvo.

## Input
- Questao juridica a ser analisada
- Audiencia-alvo (interno/cliente/tribunal/regulador)
- Contexto fatual completo
- Documentos de suporte (contratos, correspondencias, decisoes)
- Prazo e urgencia
- Objetivo do memo (informar, recomendar, persuadir)

## Process

### Step 1: Identificar Questao e Audiencia
Definir escopo e tom do memo:

| Audiencia | Tom | Framework Recomendado |
|-----------|-----|----------------------|
| **Interno** (equipe juridica) | Tecnico, direto | IRAC |
| **Cliente** (empresario/gestor) | Acessivel, pratico | IRAC com linguagem simplificada |
| **Tribunal** (juiz/desembargador) | Formal, persuasivo | CREAC |
| **Regulador** (agencia, ministerio) | Tecnico, fundamentado | IRAC |

Definir:
- Qual e a questao juridica central?
- Quem vai ler este documento?
- Qual acao esperada apos a leitura?

### Step 2: Selecionar Framework de Argumentacao

#### IRAC (Pareceres Objetivos)
Estrutura para analise neutra de questao juridica:
- **Issue**: Qual a questao juridica em disputa?
- **Rule**: Qual a regra aplicavel (lei, jurisprudencia, doutrina)?
- **Application**: Como a regra se aplica aos fatos do caso?
- **Conclusion**: Qual a conclusao e recomendacao?

#### CREAC (Pecas Persuasivas)
Estrutura para argumentacao direcionada:
- **Conclusion**: Afirmacao clara da posicao defendida
- **Rule**: Fundamento legal que suporta a posicao
- **Explanation**: Como tribunais interpretaram a regra
- **Application**: Por que os fatos do caso se encaixam na regra
- **Conclusion**: Reafirmacao da posicao com pedido especifico

### Step 3: Pesquisar Fundamentacao
Levantar base juridica solida para o memo:
- **Legislacao**: Artigos de lei diretamente aplicaveis
- **Jurisprudencia**: Decisoes de tribunais superiores (STF, STJ, TST)
- **Doutrina**: Posicoes de autores reconhecidos
- **Precedentes**: Casos analogos com desfechos relevantes
- **Normas infralegais**: Resolucoes, portarias, instrucoes normativas

Para cada fonte, registrar:
- Referencia completa (numero, data, orgao)
- Trecho relevante (citacao direta quando possivel)
- Relevancia para o caso (por que esta fonte importa)

### Step 4: Redigir Seguindo o Framework
Aplicar o framework escolhido mantendo:
- Paragrafos focados (uma ideia por paragrafo)
- Transicoes logicas entre secoes
- Citacoes integradas no fluxo do texto
- Conclusoes parciais ao final de cada secao
- Recomendacao pratica e acionavel na conclusao

### Step 5: Aplicar Plain English Rules
Revisar o texto contra os principios de Bryan Garner:

#### Regras de Clareza
- [ ] Frases curtas (media de 20-25 palavras, maximo 35)
- [ ] Voz ativa predominante ("O contrato estabelece..." nao "Foi estabelecido pelo contrato...")
- [ ] Sem legalese desnecessario (substituir "destarte" por "portanto", "outrossim" por "alem disso")
- [ ] Palavras concretas no lugar de abstratas
- [ ] Sujeito proximo do verbo (sem intercalacoes longas)

#### Regras de Estrutura
- [ ] Topic sentence na primeira frase de cada paragrafo
- [ ] Informacao mais importante primeiro (piramide invertida)
- [ ] Listas numeradas para sequencias de argumentos
- [ ] Subtitulos descritivos para navegacao
- [ ] Conclusao que responde diretamente a questao levantada

#### Regras de Fundamentacao
- [ ] Toda afirmacao juridica com fonte (lei, jurisprudencia ou doutrina)
- [ ] Citacoes com referencia completa
- [ ] Distincao clara entre fato, norma e opiniao
- [ ] Contra-argumentos reconhecidos e refutados

### Step 6: Revisar contra Checklist de Qualidade
Revisao final antes da entrega:
- [ ] Questao juridica respondida de forma clara e direta
- [ ] Framework (IRAC/CREAC) aplicado consistentemente
- [ ] Fundamentacao com pelo menos 3 fontes distintas
- [ ] Recomendacao pratica e acionavel
- [ ] Texto compreensivel pela audiencia-alvo
- [ ] Sem erros de referencia ou citacao

## Output

### Memo/Parecer Juridico
```markdown
# {Tipo: Memorando Juridico / Parecer / Nota Tecnica}

## Questao: {questao juridica}
## Data: {data}
## Autor: @bryan-garner
## Audiencia: {audiencia-alvo}
## Framework: {IRAC / CREAC}

---

## Resumo Executivo
{2-3 paragrafos com conclusao principal e recomendacao}

## Contexto Fatual
{Descricao objetiva dos fatos relevantes}

## Analise Juridica

### {Issue / Conclusion} — {titulo descritivo}
{Desenvolvimento seguindo IRAC ou CREAC}

### {Issue 2 / Conclusion 2} — {titulo descritivo}
{Se houver multiplas questoes}

## Conclusao e Recomendacao
{Resposta direta a questao + acao recomendada}

## Fontes
| # | Tipo | Referencia | Relevancia |
|---|------|------------|------------|
| 1 | {Lei/Jurisprudencia/Doutrina} | {referencia completa} | {por que importa} |

## Ressalvas
{Limitacoes da analise, cenarios nao cobertos}

## Handoffs Recomendados
- @{agent}: {se precisar aprofundar em area especifica}
```

## Acceptance Criteria
- [ ] Framework IRAC ou CREAC corretamente aplicado e identificado
- [ ] Plain English aplicado (frases curtas, voz ativa, sem legalese)
- [ ] Fundamentacao com no minimo 3 fontes juridicas distintas
- [ ] Cada fonte com referencia completa e relevancia explicada
- [ ] Questao juridica respondida de forma clara na conclusao
- [ ] Recomendacao pratica e acionavel para a audiencia-alvo
- [ ] Texto compreensivel por nao-advogados quando audiencia e cliente
