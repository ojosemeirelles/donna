# Task: Legal Operations Maturity Assessment

**Command:** `*maturity-assessment`
**Version:** 1.0.0
**Execution Type:** Hybrid (Agent analysis 60% + User input 40%)
**Responsible Executor:** @richard-susskind
**Estimated Time:** 2-3h
**Model:** Sonnet (requer analise multidimensional e recomendacoes estrategicas)

## Description

Diagnostico de maturidade das operacoes juridicas usando o framework CLOC Core 12 (Corporate Legal Operations Consortium) combinado com o Susskind Evolution Model. Avalia 12 areas operacionais, classifica cada uma em estagio de maturidade (1-4), identifica gaps e gera roadmap de evolucao com acoes concretas e timeline.

---

## Prerequisites

- Acesso a informacoes sobre as operacoes juridicas atuais (processos, ferramentas, equipe)
- Stakeholder disponivel para responder perguntas sobre cada area CLOC
- Definicao do escopo (departamento juridico interno, escritorio, ou operacao hibrida)
- Objetivos estrategicos da organizacao (crescimento, reducao de custos, compliance, etc.)

---

## Workflow

### Step 1: Avaliar Cada Uma das 12 Areas CLOC

Para cada area, coletar informacoes do usuario e classificar:

| # | Area CLOC | Descricao | Perguntas-Chave |
|---|-----------|-----------|-----------------|
| 1 | Business Intelligence | Uso de dados para decisoes | "Voces medem metricas juridicas? Quais?" |
| 2 | Financial Management | Controle de custos juridicos | "Como controlam gastos com juridico? Tem budget?" |
| 3 | Vendor Management | Gestao de fornecedores juridicos | "Como selecionam e avaliam escritorios externos?" |
| 4 | Information Governance | Governanca de informacoes | "Como gerenciam documentos e dados juridicos?" |
| 5 | Knowledge Management | Gestao do conhecimento | "Tem base de conhecimento juridico? Templates?" |
| 6 | Org Optimization | Otimizacao organizacional | "Como esta estruturado o time juridico?" |
| 7 | Practice Operations | Operacoes da pratica | "Quais processos juridicos sao padronizados?" |
| 8 | Project Management | Gestao de projetos | "Como gerenciam projetos juridicos complexos?" |
| 9 | Service Delivery | Entrega de servicos | "Como o juridico atende demandas internas?" |
| 10 | Strategic Planning | Planejamento estrategico | "O juridico tem plano estrategico alinhado ao negocio?" |
| 11 | Technology | Tecnologia juridica | "Quais ferramentas/sistemas juridicos usam?" |
| 12 | Training & Development | Treinamento | "Como desenvolvem competencias do time?" |

### Step 2: Classificar Cada Area em Estagio de Maturidade

```yaml
maturity_stages:
  1_ad_hoc:
    name: "Ad Hoc"
    description: "Sem processo definido. Reativo, inconsistente."
    indicators:
      - "Nao ha processo documentado"
      - "Depende de individuos, nao de sistema"
      - "Sem metricas ou controle"

  2_basic:
    name: "Basico"
    description: "Processos iniciais. Alguma consistencia."
    indicators:
      - "Processo existe mas nao e seguido por todos"
      - "Ferramentas basicas (planilhas, email)"
      - "Metricas manuais e esporadicas"

  3_managed:
    name: "Gerenciado"
    description: "Processos definidos e seguidos. Metricas ativas."
    indicators:
      - "Processos documentados e seguidos consistentemente"
      - "Ferramentas especializadas em uso"
      - "Metricas acompanhadas regularmente"
      - "Melhoria continua iniciada"

  4_optimized:
    name: "Otimizado"
    description: "Processos otimizados com automacao. Dados orientam decisoes."
    indicators:
      - "Automacao de processos repetitivos"
      - "IA/analytics para decisoes"
      - "Benchmarking contra mercado"
      - "Inovacao continua"
```

### Step 3: Identificar Gaps (Estagio Atual vs Desejado)

Para cada area:
1. Registrar estagio atual (1-4)
2. Definir estagio desejado com o usuario (baseado em objetivos estrategicos)
3. Calcular gap (desejado - atual)
4. Documentar barreiras especificas para evolucao

### Step 4: Priorizar Areas por Impacto

```yaml
prioritization_matrix:
  high_impact_easy_win:
    criteria: "Gap >= 2 AND baixa complexidade de implementacao"
    action: "Prioridade 1 — implementar imediatamente"

  high_impact_complex:
    criteria: "Gap >= 2 AND alta complexidade"
    action: "Prioridade 2 — planejar com cuidado"

  low_impact_easy:
    criteria: "Gap = 1 AND baixa complexidade"
    action: "Prioridade 3 — quick wins oportunisticos"

  low_impact_complex:
    criteria: "Gap = 1 AND alta complexidade"
    action: "Prioridade 4 — backlog"
```

### Step 5: Gerar Roadmap de Evolucao

Criar roadmap com:
- **Curto prazo (0-3 meses):** Quick wins e fundacoes
- **Medio prazo (3-6 meses):** Implementacoes estruturais
- **Longo prazo (6-12 meses):** Otimizacao e inovacao

Cada acao deve incluir: responsavel, recurso necessario, metrica de sucesso.

### Step 6: Recomendar Ferramentas e Automacoes

Baseado nos gaps identificados, recomendar:
- Ferramentas de Legal Tech por area (CLM, e-billing, legal analytics, etc.)
- Automacoes possiveis (document assembly, workflow automation, AI review)
- Integracao com sistemas existentes
- Estimativa de ROI por implementacao

---

## Output Template

```yaml
maturity_assessment:
  organization: "{nome da organizacao}"
  scope: "{departamento juridico interno|escritorio|hibrido}"
  assessment_date: "{ISO date}"
  assessor: "@richard-susskind"

  executive_summary:
    overall_maturity: "{media ponderada — X.X/4.0}"
    strongest_area: "{area com maior score}"
    weakest_area: "{area com menor score}"
    critical_gaps: {n}
    quick_wins_identified: {n}

  area_scores:
    - area: "{nome da area CLOC}"
      current_stage: {1-4}
      desired_stage: {1-4}
      gap: {desejado - atual}
      priority: "{1-4}"
      barriers: "{barreiras identificadas}"
      evidence: "{evidencias do estagio atual}"

  roadmap:
    short_term:
      timeframe: "0-3 meses"
      actions:
        - action: "{acao concreta}"
          area: "{area CLOC}"
          responsible: "{quem}"
          metric: "{como medir sucesso}"
    medium_term:
      timeframe: "3-6 meses"
      actions:
        - action: "{acao}"
          area: "{area}"
          responsible: "{quem}"
          metric: "{metrica}"
    long_term:
      timeframe: "6-12 meses"
      actions:
        - action: "{acao}"
          area: "{area}"
          responsible: "{quem}"
          metric: "{metrica}"

  tool_recommendations:
    - area: "{area CLOC}"
      tool: "{nome da ferramenta}"
      category: "{CLM|e-billing|analytics|automation|AI}"
      estimated_roi: "{estimativa}"
      integration_notes: "{notas de integracao}"
```

---

## Acceptance Criteria

- [ ] Todas as 12 areas CLOC avaliadas com estagio de maturidade (1-4)
- [ ] Gaps identificados para cada area (atual vs desejado)
- [ ] Priorizacao por impacto documentada com matriz
- [ ] Roadmap com timeline em 3 horizontes (curto, medio, longo prazo)
- [ ] Cada acao do roadmap com responsavel e metrica de sucesso
- [ ] Recomendacoes de ferramentas e automacoes por area
- [ ] Resumo executivo com overall maturity score

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-07 | Initial version — CLOC Core 12 + Susskind Evolution Model |
