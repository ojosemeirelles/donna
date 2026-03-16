# Task: Review Contract

## Metadata
```yaml
task_name: "Review Contract"
status: pending
responsible_executor: "@kenneth-adams"
execution_type: Agent
estimated_time: "30min-1h"
```

## Description
Revisar contrato existente aplicando o checklist completo de revisao contratual do squad. A revisao cruza multiplas perspectivas: estrutura linguistica (Adams), deal terms (Stark), clareza (Garner), risco juridico, compliance regulatorio e adequacao ao direito brasileiro. Cada issue encontrada e classificada por severidade para facilitar priorizacao de correcoes.

## Input
- Contrato a ser revisado (texto completo)
- Contexto do negocio (tipo de operacao, partes envolvidas)
- Jurisdicao aplicavel
- Preocupacoes especificas do cliente (se houver)
- Historico de versoes anteriores do contrato (se houver)

## Process

### Step 1: Carregar e Mapear o Contrato
Preparar o contrato para revisao sistematica:
- Identificar tipo contratual e jurisdicao
- Mapear estrutura do documento (secoes, clausulas, anexos)
- Listar partes envolvidas e seus papeis
- Identificar a versao do contrato e se ha alteracoes pendentes

### Step 2: Aplicar Checklist de Revisao Completa
Revisar cada dimensao do checklist (`contract-review-checklist.md`):

#### 2a. Estrutura Adams (Linguagem Contratual)
- [ ] Categorias de clausula corretamente aplicadas (obrigacao, proibicao, discricao, politica, condicao, declaracao)
- [ ] Verbos modais consistentes (devera vs. podera vs. nao podera)
- [ ] Sem construcoes ambiguas ("e/ou", "razoavel" sem parametro)
- [ ] Definicoes completas e sem circularidade
- [ ] Listas com estrutura paralela
- [ ] Numeracao e cross-references validas

#### 2b. Deal Terms Stark (Termos Comerciais)
- [ ] Money: Valores, formas de pagamento e multas claros
- [ ] Risk: Alocacao de risco explicita entre as partes
- [ ] Control: Mecanismos de governanca e decisao definidos
- [ ] Standards: KPIs e padroes de performance mensuráveis
- [ ] Endgame: Clausulas de rescisao, renovacao e transicao

#### 2c. Linguagem Garner (Plain English)
- [ ] Frases com extensao razoavel (max 30-35 palavras por frase)
- [ ] Voz ativa predominante
- [ ] Sem legalese desnecessario (doravante, outrossim, destarte)
- [ ] Termos tecnicos definidos na primeira ocorrencia
- [ ] Estrutura logica e sequencial

#### 2d. Analise de Risco
- [ ] Clausulas de limitacao de responsabilidade presentes
- [ ] Clausula de forca maior adequada
- [ ] Mecanismos de resolucao de disputas (mediacao, arbitragem, judicial)
- [ ] Penalidades proporcionais ao risco
- [ ] Seguros exigidos quando aplicavel

#### 2e. Compliance e Regulatorio
- [ ] Adequacao a LGPD (se envolve dados pessoais)
- [ ] Compliance setorial (saude, financeiro, educacao)
- [ ] Clausulas anticorrupcao (quando aplicavel)
- [ ] Obrigacoes tributarias corretamente alocadas

#### 2f. Adequacao ao Direito Brasileiro
- [ ] Clausulas compativeis com Codigo Civil
- [ ] Foro de eleicao valido
- [ ] Clausulas abusivas identificadas (CDC se aplicavel)
- [ ] Requisitos de forma atendidos (testemunhas, reconhecimento)

### Step 3: Gerar Relatorio de Issues
Para cada issue encontrada, classificar:

| Severidade | Criterio | Acao |
|------------|----------|------|
| **Critico** | Invalida clausula ou gera risco legal imediato | Correcao obrigatoria antes de assinatura |
| **Alto** | Ambiguidade significativa ou gap de protecao | Correcao fortemente recomendada |
| **Medio** | Melhoria de clareza ou best practice nao seguida | Correcao recomendada |
| **Baixo** | Ajuste estetico ou preferencia de estilo | Correcao opcional |

### Step 4: Recomendar Handoffs
Baseado nas issues encontradas, recomendar especialistas:
- Issues em deal terms ou alocacao de risco → @tina-stark
- Issues tributarias → @humberto-avila
- Issues civis ou consumeristas → @flavio-tartuce
- Necessidade de negociacao de termos → @fisher-ury ou @chris-voss
- Risco juridico sistemico → @legal-chief (risk assessment)

## Output

### Relatorio de Revisao Contratual
```markdown
# Revisao Contratual

## Contrato: {nome/tipo do contrato}
## Data da Revisao: {data}
## Revisor: @kenneth-adams
## Jurisdicao: {jurisdicao}

---

## Resumo Executivo
{2-3 paragrafos com principais achados e recomendacao geral}

## Score por Dimensao
| Dimensao | Score (1-5) | Status |
|----------|-------------|--------|
| Estrutura Adams | {score} | {OK/Atencao/Critico} |
| Deal Terms Stark | {score} | {OK/Atencao/Critico} |
| Linguagem Garner | {score} | {OK/Atencao/Critico} |
| Risco | {score} | {OK/Atencao/Critico} |
| Compliance | {score} | {OK/Atencao/Critico} |
| Direito BR | {score} | {OK/Atencao/Critico} |

## Issues Encontradas
| # | Clausula | Issue | Severidade | Recomendacao |
|---|----------|-------|------------|--------------|
| 1 | {ref} | {descricao} | {Critico/Alto/Medio/Baixo} | {acao} |

## Handoffs Recomendados
- @{agent}: {razao e contexto}

## Veredicto
{APROVADO / APROVADO COM RESSALVAS / REPROVADO}
```

## Acceptance Criteria
- [ ] Todas as 6 dimensoes do checklist avaliadas e pontuadas
- [ ] Issues classificadas por severidade (Critico/Alto/Medio/Baixo)
- [ ] Cada issue com clausula referenciada e recomendacao de correcao
- [ ] Handoffs recomendados para especialistas quando aplicavel
- [ ] Veredicto final claro (Aprovado / Ressalvas / Reprovado)
- [ ] Relatorio legivel por nao-advogados
