# Task: Analise Tributaria

## Metadata
```yaml
task_name: "Analise Tributaria"
status: pending
responsible_executor: "@humberto-avila"
execution_type: Agent
estimated_time: "1-2h"
```

## Description

Analise tributaria usando o framework da Teoria dos Principios (Humberto Avila). Classifica a norma aplicavel em especie normativa (regra, principio ou postulado) e aplica o criterio adequado: regras por subsuncao, principios por ponderacao (proporcionalidade), postulados como metanormas estruturantes. Resultado: parecer tributario que distingue com rigor a especie normativa em jogo.

## Input

- Situacao fatica (o que aconteceu ou vai acontecer)
- Tributo(s) em questao ou duvida tributaria
- Legislacao aplicavel conhecida (se houver)
- Documentos fiscais relevantes (notas, guias, declaracoes)
- Regime tributario do contribuinte (Simples, Lucro Presumido, Lucro Real)

## Process

### Step 1: Identificar Tributo(s) e Fato Gerador
- Determinar tributo(s) incidente(s) e fato gerador (hipotese de incidencia)
- Verificar consumacao do fato gerador (aspecto temporal)
- Identificar sujeito passivo, base de calculo e aliquota aplicavel

### Step 2: Classificar Especie Normativa
- **Regra**: conduta descritiva, aplica-se por subsuncao (tudo ou nada)
- **Principio**: finalidade a promover, aplica-se por ponderacao (graus)
- **Postulado**: metanorma que estrutura aplicacao das demais (proporcionalidade, razoabilidade)
- Fundamentar a classificacao com criterios objetivos

### Step 3: Se Regra — Aplicar por Subsuncao
- Verificar enquadramento do fato na hipotese normativa
- Analisar elementos: material, temporal, espacial, pessoal, quantitativo
- Verificar excecoes, isencoes ou imunidades aplicaveis

### Step 4: Se Principio — Aplicar por Ponderacao
- **Adequacao**: o meio promove o fim visado?
- **Necessidade**: existe meio menos restritivo igualmente eficaz?
- **Proporcionalidade stricto sensu**: o beneficio justifica a restricao?
- Ponderar com principios colidentes e documentar pesos atribuidos

### Step 5: Verificar Razoabilidade
- **Congruencia**: relacao logica entre norma e seus motivos
- **Equivalencia**: proporcao entre medida e criterio justificador
- **Equidade**: norma nao generaliza ignorando diferencas relevantes

### Step 6: Analisar Vedacao de Confisco
- Art. 150, IV, CF — carga tributaria total confiscatoria?
- Impacto acumulado de todos os tributos incidentes

### Step 7: Emitir Conclusao Fundamentada
- Especie normativa predominante e metodo de aplicacao usado
- Recomendacao pratica (pagar, contestar, consultar, compensar)
- Riscos tributarios e probabilidade de exito

## Output

### Parecer Tributario
```markdown
# Parecer Tributario

## 1. Consulta
- Consulente: {nome/empresa} | Regime: {regime}
- Questao: {descricao}

## 2. Tributo(s) Identificado(s)
| Tributo | Fato Gerador | Base de Calculo | Aliquota |
|---------|-------------|-----------------|----------|
| {tributo} | {fato gerador} | {base} | {aliquota} |

## 3. Especie Normativa
- Norma: {dispositivo} | Classificacao: {Regra/Principio/Postulado}
- Fundamentacao: {razao da classificacao}

## 4. Analise por Especie
### Regra (Subsuncao):
- Enquadramento: {sim/nao} | Elementos: {verificados}
### Principio (Ponderacao):
- Adequacao: {analise} | Necessidade: {analise} | Stricto sensu: {analise}

## 5. Razoabilidade
- Congruencia: {analise} | Equivalencia: {analise} | Equidade: {analise}

## 6. Vedacao de Confisco
- Aplicavel: {sim/nao} | Analise: {fundamentacao}

## 7. Conclusao
- Posicao: {conclusao} | Recomendacao: {acao}
- Risco: {baixo/medio/alto} | Fundamentos: {dispositivos}
```

## Acceptance Criteria

- [ ] Especie normativa classificada corretamente (regra, principio ou postulado)
- [ ] Se regra: subsuncao completa com todos os elementos
- [ ] Se principio: proporcionalidade em tres etapas
- [ ] Razoabilidade verificada nas tres dimensoes
- [ ] Fundamentacao com dispositivos legais citados
- [ ] Conclusao objetiva com recomendacao e nivel de risco
