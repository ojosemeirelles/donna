# Task: Draft Contract

## Metadata
```yaml
task_name: "Draft Contract"
status: pending
responsible_executor: "@kenneth-adams"
execution_type: Agent
estimated_time: "1-2h"
```

## Description
Redigir contrato completo utilizando as Categories of Contract Language definidas por Kenneth Adams. Cada clausula e classificada por sua funcao linguistica (obrigacao, proibicao, discricao, politica, condicao, declaracao), garantindo precisao, consistencia e eliminacao de ambiguidade no texto contratual.

## Input
- Tipo de contrato (prestacao de servicos, SaaS, NDA, sociedade, licenciamento, etc.)
- Partes envolvidas (nomes, qualificacao, CNPJ/CPF)
- Jurisdicao aplicavel (estado/pais, foro)
- Termos comerciais principais (valores, prazos, entregas)
- Requisitos especificos do cliente (clausulas obrigatorias, restricoes)
- Contratos anteriores entre as partes (se houver)

## Process

### Step 1: Coletar Requisitos do Contrato
Levantar todas as informacoes necessarias:
- **Tipo contratual**: Identificar modelo adequado
- **Partes**: Nome completo, qualificacao, representantes legais
- **Jurisdicao**: Lei aplicavel, foro de eleicao
- **Objeto**: Descricao precisa do que esta sendo contratado
- **Valores e prazos**: Remuneracao, cronograma, marcos

### Step 2: Selecionar Template Base
Escolher template adequado ao tipo contratual:
- Verificar biblioteca de templates do squad
- Adaptar estrutura ao tipo especifico de contrato
- Manter secoes padroes (preambulo, definicoes, objeto, obrigacoes, rescisao, disposicoes gerais)

### Step 3: Redigir Clausulas por Categoria
Aplicar as Categories of Contract Language de Adams para cada clausula:

| Categoria | Funcao | Exemplo de Construcao |
|-----------|--------|----------------------|
| **Obrigacao** | Impoe dever a uma parte | "O Contratado devera entregar..." |
| **Proibicao** | Veda conduta | "O Contratado nao podera divulgar..." |
| **Discricao** | Concede direito opcional | "O Contratante podera rescindir..." |
| **Politica** | Estabelece regra geral | "Os pagamentos serao realizados..." |
| **Condicao** | Define gatilho para efeito | "Caso o Contratado nao cumpra..." |
| **Declaracao** | Afirma fato como verdadeiro | "O Contratado declara que possui..." |

### Step 4: Definir Definicoes e Cross-References
- Criar secao de Definicoes com todos os termos tecnicos
- Garantir que cada termo definido e usado consistentemente
- Inserir cross-references entre clausulas relacionadas
- Verificar que nenhuma definicao circular existe

### Step 5: Aplicar Checklist de Linguagem
Revisar o contrato contra os principios Adams:
- [ ] Verbos modais usados corretamente (devera, podera, nao podera)
- [ ] Sem uso de "e/ou" (substituir por construcao precisa)
- [ ] Sem "incluindo, mas nao se limitando a" desnecessario
- [ ] Listas com estrutura paralela
- [ ] Definicoes na primeira ocorrencia ou em secao propria
- [ ] Sem redundancias linguisticas ("nulo e sem efeito")
- [ ] Numeracao consistente de clausulas e subclausalas

### Step 6: Handoff para Revisao de Deal Terms
Encaminhar contrato finalizado para @tina-stark:
- Verificar se os deal terms refletem o acordo comercial
- Confirmar alocacao de risco entre as partes (Five-Prong Framework)
- Validar mecanismos de saida e resolucao de disputas

## Output

### Contrato Completo
```markdown
# {Tipo de Contrato}

## Data: {data}
## Partes: {parte_1} e {parte_2}
## Jurisdicao: {jurisdicao}

---

## 1. Definicoes
| Termo | Definicao |
|-------|-----------|
| {termo} | {definicao} |

## 2. Objeto
{descricao do objeto contratual}

## 3. Obrigacoes das Partes
### 3.1 Obrigacoes do Contratante
### 3.2 Obrigacoes do Contratado

## 4. Remuneracao e Pagamento

## 5. Prazo e Vigencia

## 6. Confidencialidade

## 7. Propriedade Intelectual

## 8. Rescisao

## 9. Disposicoes Gerais

## 10. Foro

---

## Metadata de Redacao
- Categorias aplicadas: {lista}
- Template base: {template}
- Handoff recomendado: @tina-stark (deal terms)
```

## Acceptance Criteria
- [ ] Todas as 6 categorias de clausula (Adams) presentes e corretamente aplicadas
- [ ] Secao de definicoes completa e consistente com o corpo do contrato
- [ ] Sem ambiguidade linguistica (checklist de linguagem aprovada)
- [ ] Cross-references validas entre clausulas
- [ ] Estrutura de numeracao consistente
- [ ] Handoff para @tina-stark documentado com pontos de atencao
- [ ] Contrato legivel e navegavel por nao-advogados
