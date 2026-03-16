# Task: Legal Risk Assessment

## Metadata
```yaml
task_name: "Evaluate Legal Risk"
status: pending
responsible_executor: "@legal-chief"
execution_type: Agent
estimated_time: "30min-1h"
```

## Description
Realizar avaliacao completa de risco juridico para um projeto, operacao ou decisao de negocio.

## Input
- Descricao do projeto/operacao/decisao
- Jurisdicao aplicavel
- Contexto do negocio
- Documentos relevantes (se houver)

## Process

### Step 1: Mapeamento de Riscos
Identificar todos os riscos juridicos potenciais por categoria:
- **Contratual**: Riscos em contratos existentes ou futuros
- **Regulatorio**: Compliance com leis e regulamentos
- **Tributario**: Exposicao fiscal
- **Trabalhista**: Riscos de passivo trabalhista
- **Propriedade Intelectual**: Riscos de PI
- **Dados/LGPD**: Riscos de privacidade e dados
- **Societario**: Riscos corporativos
- **Litigioso**: Probabilidade de litigio

### Step 2: Classificacao de Riscos
Para cada risco identificado:

| Campo | Opcoes |
|-------|--------|
| Probabilidade | Baixa / Media / Alta / Muito Alta |
| Impacto | Baixo / Medio / Alto / Critico |
| Urgencia | Imediata / Curto prazo / Medio prazo / Longo prazo |

### Step 3: Matriz de Risco

```
IMPACTO
  Critico  | Monitorar | MITIGAR   | MITIGAR   | ELIMINAR
  Alto     | Aceitar   | Monitorar | MITIGAR   | MITIGAR
  Medio    | Aceitar   | Aceitar   | Monitorar | MITIGAR
  Baixo    | Aceitar   | Aceitar   | Aceitar   | Monitorar
           | Baixa     | Media     | Alta      | Muito Alta
                       PROBABILIDADE
```

### Step 4: Plano de Mitigacao
Para cada risco classificado como MITIGAR ou ELIMINAR:
1. Acao recomendada
2. Responsavel sugerido (agent do squad ou humano)
3. Prazo recomendado
4. Custo estimado (se aplicavel)

### Step 5: Roteamento para Especialistas
Baseado nos riscos identificados, recomendar handoff:
- Riscos contratuais → @kenneth-adams ou @tina-stark
- Riscos tributarios → @humberto-avila
- Riscos civis → @flavio-tartuce
- Necessidade de negociacao → @fisher-ury ou @chris-voss
- Melhoria de processos → @steven-levy
- Modernizacao → @richard-susskind

## Output

### Relatorio de Risco Juridico
```markdown
# Avaliacao de Risco Juridico

## Projeto: {nome}
## Data: {data}
## Jurisdicao: {jurisdicao}

---

## Resumo Executivo
{2-3 paragrafos com principais riscos e recomendacoes}

## Mapa de Riscos
| # | Risco | Categoria | Probabilidade | Impacto | Acao |
|---|-------|-----------|---------------|---------|------|
| 1 | ...   | ...       | ...           | ...     | ...  |

## Plano de Mitigacao
| Risco | Acao | Responsavel | Prazo | Custo |
|-------|------|-------------|-------|-------|

## Proximos Passos
1. ...
2. ...

## Handoffs Recomendados
- @{agent}: {razao}
```

## Acceptance Criteria
- [ ] Todos os riscos por categoria foram avaliados
- [ ] Matriz de risco preenchida
- [ ] Plano de mitigacao para riscos altos/criticos
- [ ] Handoffs recomendados para especialistas
- [ ] Relatorio em formato legivel para nao-advogados
