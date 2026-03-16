# Task: Simplify Legal Document

**Command:** `*simplify-document`
**Version:** 1.0.0
**Execution Type:** Hybrid (Agent interpretation 70% + User validation 30%)
**Responsible Executor:** @margaret-hagan
**Estimated Time:** 1-2h
**Model:** Sonnet (requer empatia linguistica e reescrita criativa)

## Description

Simplificar documento juridico para audiencia nao-juridica usando Legal Design Thinking, metodologia desenvolvida no Legal Design Lab de Stanford. O objetivo e transformar documentos complexos em versoes acessiveis sem perder precisao legal, aplicando Human-Centered Design ao universo juridico.

---

## Prerequisites

- Documento juridico original (contrato, termo, politica, regulamento, etc.)
- Definicao da audiencia-alvo (leigo, empresario, consumidor, etc.)
- Contexto de uso (assinatura, consulta, compliance, onboarding)
- Idioma de saida (pt-BR ou en)

---

## Workflow

### Step 1: Identificar Audiencia-Alvo e Contexto de Uso

Perguntar ao usuario:
- "Quem vai ler este documento? (perfil, escolaridade, familiaridade com termos juridicos)"
- "Em que situacao a pessoa vai usar este documento? (assinatura, referencia, compliance)"
- "Qual o nivel de simplificacao desejado? (resumo executivo, versao completa simplificada, ambos)"

**Output:** Perfil de audiencia e contexto documentados.

### Step 2: Mapear Pain Points do Documento Atual

Analisar o documento original identificando:

| Categoria | O que procurar |
|-----------|----------------|
| Jargao juridico | Termos tecnicos sem explicacao (e.g., "rescisao", "clausula resolutiva") |
| Extensao excessiva | Paragrafos com mais de 5 linhas, frases com mais de 30 palavras |
| Estrutura confusa | Falta de hierarquia visual, numeracao inconsistente |
| Voz passiva | Construcoes que obscurecem quem faz o que |
| Referencia circular | "Conforme clausula 3.2.1 do anexo IV..." sem contexto |
| Ambiguidade | Termos com multiplas interpretacoes possiveis |

**Output:** Mapa de pain points com localizacao no documento.

### Step 3: Aplicar Human-Centered Design (5 fases Stanford)

1. **Empatia** - Colocar-se no lugar do leitor-alvo. O que ele precisa entender? O que pode confundir?
2. **Definicao** - Quais sao os 3-5 pontos criticos que o leitor PRECISA compreender?
3. **Ideacao** - Como apresentar cada ponto de forma clara? (texto, diagrama, fluxograma, tabela, FAQ)
4. **Prototipo** - Reescrever aplicando as decisoes da ideacao
5. **Teste** - Validar com checklist de clareza (Step 6)

### Step 4: Reescrever em Linguagem Acessivel

Regras de reescrita:

```yaml
rewriting_rules:
  sentences:
    max_words: 20
    voice: "ativa (sujeito + verbo + objeto)"
    structure: "uma ideia por frase"

  vocabulary:
    replace_jargon: true
    keep_legal_terms_when: "necessario para validade juridica"
    explain_kept_terms: "sempre, entre parenteses ou em glossario"

  structure:
    use_headers: true
    use_bullets: true
    use_tables_for_comparisons: true
    highlight_obligations: "bold ou box"
    highlight_deadlines: "bold com data explicita"

  tone:
    formal_but_clear: true
    avoid_condescending: true
    direct_address: "voce/sua empresa"
```

### Step 5: Adicionar Elementos Visuais

Quando aplicavel, incluir:
- Icones para categorias (obrigacoes, proibicoes, prazos, direitos)
- Diagramas de fluxo para processos (ex: "como cancelar")
- Tabelas comparativas (ex: "o que voce pode vs nao pode")
- Destaques visuais para informacoes criticas (prazos, valores, penalidades)
- Timeline para sequencia de eventos/obrigacoes

### Step 6: Testar Compreensao (Checklist de Clareza)

```yaml
clarity_checklist:
  - question: "Um leigo consegue identificar suas obrigacoes em menos de 2 minutos?"
    pass_if: "Obrigacoes estao em secao dedicada com linguagem direta"
  - question: "Os prazos estao explicitos com datas ou periodos claros?"
    pass_if: "Nenhum prazo depende de calculo ou referencia cruzada"
  - question: "As consequencias de descumprimento estao claras?"
    pass_if: "Penalidades explicadas em linguagem simples"
  - question: "O leitor sabe o que fazer se tiver duvida?"
    pass_if: "Canal de contato ou FAQ incluido"
  - question: "O documento pode ser entendido sem ajuda de advogado?"
    pass_if: "Nenhum termo tecnico sem explicacao"
```

### Step 7: Versao Final com Ambas Versoes

Entregar:
1. **Versao simplificada** - documento completo reescrito
2. **Versao original** - mantida intacta para referencia legal
3. **Guia visual** - resumo de 1 pagina com os pontos criticos
4. **Glossario** - termos juridicos mantidos com explicacao simples

---

## Output Template

```yaml
simplified_document:
  title: "{titulo do documento}"
  original_type: "{contrato|termo|politica|regulamento|outro}"
  target_audience: "{perfil da audiencia}"
  context: "{contexto de uso}"

  pain_points_found:
    jargon_count: {n}
    long_sentences: {n}
    structural_issues: {n}

  simplified_version: |
    {documento simplificado completo}

  visual_guide: |
    {resumo visual de 1 pagina}

  glossary:
    - term: "{termo juridico}"
      plain_language: "{explicacao simples}"

  clarity_score: "{pontuacao do checklist — X/5 passed}"
```

---

## Acceptance Criteria

- [ ] Audiencia-alvo e contexto documentados antes da reescrita
- [ ] Pain points mapeados com localizacao no documento
- [ ] Linguagem acessivel — nenhuma frase com mais de 20 palavras em secoes criticas
- [ ] Elementos visuais incluidos onde aplicavel (tabelas, destaques, fluxogramas)
- [ ] Ambas versoes mantidas (original + simplificada)
- [ ] Glossario com todos os termos juridicos mantidos
- [ ] Checklist de clareza executado com minimo 4/5 passed
- [ ] Guia visual de 1 pagina entregue

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-07 | Initial version — Legal Design Thinking (Stanford) |
