# Task: Legal Project Plan

**Command:** `*legal-project-plan`
**Version:** 1.0.0
**Execution Type:** Hybrid (Agent structuring 60% + User input 40%)
**Responsible Executor:** @steven-levy
**Estimated Time:** 1-2h
**Model:** Sonnet (requer estruturacao de projeto e analise de risco)

## Description

Criar plano de projeto juridico completo usando Legal Project Management (LPM) combinado com principios de Lean Legal. O plano cobre escopo, WBS, orcamento, timeline, riscos, metricas e comunicacao, otimizando para eficiencia e eliminacao de desperdicio em projetos juridicos.

---

## Prerequisites

- Definicao do projeto juridico (tipo: contencioso, transacional, regulatorio, compliance, etc.)
- Stakeholders identificados (cliente, equipe juridica, areas envolvidas)
- Restricoes conhecidas (prazo, budget, recursos)
- Contexto do caso/projeto (complexidade, jurisdicao, urgencia)

---

## Workflow

### Step 1: Definir Escopo

Coletar com o usuario:

```yaml
scope_definition:
  objective: "{O que este projeto juridico deve alcançar?}"
  deliverables:
    - "{Entregavel 1 — ex: parecer juridico, contrato assinado, defesa protocolada}"
    - "{Entregavel 2}"
  exclusions:
    - "{O que NAO esta no escopo — ex: execucao fiscal, recurso em segunda instancia}"
  assumptions:
    - "{Premissa 1 — ex: documentacao completa disponivel}"
    - "{Premissa 2}"
  constraints:
    deadline: "{data limite}"
    budget: "{valor disponivel ou 'a definir'}"
    team_size: "{tamanho da equipe}"
    jurisdiction: "{jurisdicao aplicavel}"
```

### Step 2: Criar WBS (Work Breakdown Structure) Juridica

Decompor o projeto em fases e tarefas:

```yaml
wbs_template:
  phase_1_discovery:
    name: "Analise e Discovery"
    tasks:
      - "Coleta e revisao de documentos"
      - "Pesquisa juridica (legislacao, jurisprudencia)"
      - "Analise de fatos e evidencias"
      - "Mapeamento de riscos preliminar"

  phase_2_strategy:
    name: "Estrategia"
    tasks:
      - "Definicao de tese/estrategia juridica"
      - "Validacao com stakeholders"
      - "Plano de contingencia"

  phase_3_execution:
    name: "Execucao"
    tasks:
      - "Elaboracao de documentos juridicos"
      - "Revisao interna (peer review)"
      - "Negociacao/protocolo/filing"

  phase_4_closure:
    name: "Encerramento"
    tasks:
      - "Documentacao final"
      - "Licoes aprendidas"
      - "Arquivamento"
```

Adaptar fases conforme tipo de projeto (contencioso, transacional, regulatorio).

### Step 3: Estimar Orcamento

```yaml
budget_estimation:
  labor_costs:
    - role: "{socio|associado|paralegal|estagiario}"
      hourly_rate: "{valor/hora}"
      estimated_hours: "{horas estimadas}"
      subtotal: "{rate x hours}"

  fixed_costs:
    - item: "{custas judiciais|taxas|peritos|traducoes}"
      amount: "{valor}"

  contingency:
    percentage: "10-15%"
    amount: "{valor de contingencia}"

  total_estimated: "{soma de tudo}"

  billing_model: "{hourly|fixed_fee|success_fee|hybrid}"
```

### Step 4: Definir Timeline com Milestones

```yaml
timeline:
  start_date: "{data inicio}"
  end_date: "{data fim}"

  milestones:
    - name: "{nome do milestone}"
      date: "{data}"
      deliverable: "{o que sera entregue}"
      gate: "{criterio para considerar completo}"

  critical_path:
    - "{tarefa que se atrasar atrasa o projeto todo}"

  buffer_days: {n}
```

### Step 5: Mapear Riscos do Projeto

| # | Risco | Probabilidade | Impacto | Score | Mitigacao |
|---|-------|---------------|---------|-------|-----------|
| 1 | {descricao} | Alta/Media/Baixa | Alto/Medio/Baixo | {P x I} | {acao} |
| 2 | {descricao} | {prob} | {imp} | {score} | {acao} |

```yaml
risk_categories:
  legal: "Mudanca de jurisprudencia, nova legislacao, decisao desfavoravel"
  operational: "Atraso de documentos, indisponibilidade de testemunhas"
  financial: "Estouro de orcamento, custas inesperadas"
  stakeholder: "Mudanca de posicao do cliente, conflito de interesses"
  timeline: "Prazos judiciais, agenda de tribunais"
```

### Step 6: Aplicar Lean Legal (Eliminar Desperdicio)

Revisar o plano identificando e eliminando:

| Desperdicio | Exemplo | Acao |
|-------------|---------|------|
| Superproduccao | Documentos que ninguem le | Eliminar ou consolidar |
| Espera | Aguardando aprovacao sem deadline | Definir SLAs internos |
| Transporte | Informacao passando por muitas maos | Reduzir handoffs |
| Processamento excessivo | Revisao tripla do mesmo documento | Definir niveis de revisao por risco |
| Inventario | Backlog de demandas sem priorizacao | Priorizar por impacto |
| Movimento | Reunioes desnecessarias | Substituir por async quando possivel |
| Defeitos | Erros em documentos que geram retrabalho | Templates e checklists |

### Step 7: Definir Metricas de Sucesso (KPIs)

```yaml
kpis:
  efficiency:
    - name: "Cycle Time"
      description: "Tempo total do projeto (inicio ao fim)"
      target: "{X dias/semanas}"
    - name: "Budget Variance"
      description: "Diferenca entre orcado e realizado"
      target: "< 10%"

  quality:
    - name: "Rework Rate"
      description: "Percentual de tarefas refeitas"
      target: "< 5%"
    - name: "Stakeholder Satisfaction"
      description: "Nota de satisfacao do cliente interno"
      target: ">= 4/5"

  compliance:
    - name: "Deadline Adherence"
      description: "Prazos cumpridos vs total"
      target: "100% para prazos judiciais"
```

### Step 8: Criar Plano de Comunicacao

```yaml
communication_plan:
  stakeholders:
    - name: "{stakeholder}"
      role: "{papel no projeto}"
      frequency: "{diaria|semanal|quinzenal|por milestone}"
      format: "{email|reuniao|relatorio|dashboard}"
      content: "{o que comunicar}"

  escalation:
    level_1: "{issue operacional → gerente de projeto}"
    level_2: "{issue estrategico → socio responsavel}"
    level_3: "{issue critico → comite juridico}"

  templates:
    status_update: "Progresso, riscos, proximos passos, decisoes necessarias"
    milestone_report: "Entregaveis, KPIs, orcamento, timeline atualizada"
```

---

## Output Template

```yaml
legal_project_plan:
  project_name: "{nome do projeto}"
  project_type: "{contencioso|transacional|regulatorio|compliance|outro}"
  created_date: "{ISO date}"
  planner: "@steven-levy"

  scope:
    objective: "{objetivo}"
    deliverables: ["{lista}"]
    exclusions: ["{lista}"]

  wbs:
    phases:
      - name: "{fase}"
        tasks: ["{tarefas}"]
        duration: "{duracao}"

  budget:
    total_estimated: "{valor}"
    contingency: "{valor}"
    billing_model: "{modelo}"

  timeline:
    start: "{data}"
    end: "{data}"
    milestones: ["{lista com datas}"]
    critical_path: ["{tarefas criticas}"]

  risks:
    - description: "{risco}"
      probability: "{alta|media|baixa}"
      impact: "{alto|medio|baixo}"
      mitigation: "{acao}"

  kpis: ["{lista de metricas com targets}"]

  communication:
    stakeholders: ["{lista com frequencia e formato}"]
    escalation: "{niveis definidos}"

  lean_improvements:
    - waste_type: "{tipo de desperdicio}"
      action: "{acao tomada}"
      expected_savings: "{economia esperada}"
```

---

## Acceptance Criteria

- [ ] Escopo definido com objetivo, entregaveis e exclusoes claras
- [ ] WBS criada com fases e tarefas decompostas
- [ ] Orcamento estimado com labor, custos fixos e contingencia
- [ ] Timeline com milestones e critical path identificado
- [ ] Riscos mapeados com probabilidade, impacto e mitigacao
- [ ] Lean Legal aplicado — pelo menos 3 desperdicios identificados e endereçados
- [ ] KPIs definidos com targets para eficiencia, qualidade e compliance
- [ ] Plano de comunicacao com stakeholders, frequencia e escalation

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-07 | Initial version — LPM + Lean Legal |
