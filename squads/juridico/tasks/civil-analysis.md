# Task: Analise Civil

## Metadata
```yaml
task_name: "Analise Civil"
status: pending
responsible_executor: "@flavio-tartuce"
execution_type: Agent
estimated_time: "1-2h"
```

## Description

Parecer de direito civil usando sistematizacao do CC/2002 com enfase nos tres pilares: eticidade (boa-fe objetiva), socialidade (funcao social) e operabilidade. Segue a abordagem do Manual de Direito Civil (Flavio Tartuce): analisa a partir dos dispositivos do CC/2002, verifica clausulas gerais (funcao social e boa-fe) e fundamenta com doutrina e jurisprudencia.

## Input

- Situacao fatica detalhada (o que aconteceu entre as partes)
- Area do direito civil (contratos, responsabilidade, reais, obrigacoes, familia, sucessoes)
- Documentos relevantes (contratos, notificacoes, laudos, recibos)
- Pretensao do consulente (o que quer alcancar)
- Relacao entre as partes (B2B, consumidor, familiar, vizinhanca)

## Process

### Step 1: Identificar Questao e Area
- Classificar na parte geral ou especial do CC/2002
- Identificar questoes prejudiciais ou conexas com outras areas
- Verificar se relacao e paritaria ou ha vulnerabilidade
- Se relacao de consumo: CDC aplica-se prioritariamente (Step 6)

### Step 2: Localizar Dispositivos no CC/2002
- Artigos diretamente aplicaveis ao caso
- Clausulas gerais incidentes (Arts. 113, 187, 421, 422)
- Norma especial prevalece sobre geral
- Enunciados CJF e legislacao extravagante aplicavel

### Step 3: Funcao Social (Art. 421 CC)
- "A liberdade contratual sera exercida nos limites da funcao social do contrato"
- Verificar efeitos perante terceiros, bem comum, impacto ambiental
- Art. 421-A: intervencao minima em contratos paritarios
- Avaliar se funcao social limita direito no caso concreto

### Step 4: Boa-Fe Objetiva (Art. 422 CC)
- **Interpretativa** (Art. 113): declaracoes conforme boa-fe
- **Limitativa** (Art. 187): exercicio abusivo de direito
- **Integrativa** (Art. 422): deveres anexos — lealdade, informacao, cooperacao
- Figuras parcelares: venire contra factum proprium, supressio, surrectio, tu quoque

### Step 5: Equilibrio Contratual e Abusividade
- Desequilibrio objetivo entre prestacoes
- Contrato de adesao: Art. 423-424 CC (pro-aderente, nulidade de renuncia)
- Onerosidade excessiva (Art. 478-480), lesao (Art. 157), estado de perigo (Art. 156)

### Step 6: CDC se Relacao de Consumo
- Fornecedor + consumidor + produto/servico = CDC prevalece
- Art. 51 CDC: clausulas abusivas | Art. 12/14: responsabilidade objetiva
- Art. 6, VIII: inversao do onus da prova

### Step 7: Doutrina e Jurisprudencia
- Posicao majoritaria, jurisprudencia STJ, sumulas, enunciados CJF

### Step 8: Conclusao
- Tese principal e subsidiaria, recomendacao pratica, risco, provas sugeridas

## Output

### Parecer Civil
```markdown
# Parecer Civil

## 1. Consulta
- Consulente: {nome} | Area: {area do direito civil}
- Questao: {descricao}

## 2. Situacao Fatica
{Resumo objetivo dos fatos relevantes}

## 3. Dispositivos Aplicaveis
| Dispositivo | Conteudo | Aplicacao ao Caso |
|-------------|----------|-------------------|
| Art. {X} CC | {texto} | {como se aplica} |

## 4. Funcao Social (Art. 421)
- Incide: {sim/nao} | Analise: {impacto} | Limitacao: {se aplicavel}

## 5. Boa-Fe Objetiva (Art. 422)
- Interpretativa (113): {analise} | Limitativa (187): {analise}
- Integrativa (422): {deveres verificados}
- Figuras parcelares: {aplicaveis}

## 6. Equilibrio Contratual
- Desequilibrio: {sim/nao} | Instituto: {lesao/onerosidade/nenhum}

## 7. CDC
- Relacao de consumo: {sim/nao} | Impacto: {analise}

## 8. Fundamentacao
- Doutrina: {autores} | Jurisprudencia: {julgados} | CJF: {enunciados}

## 9. Conclusao
- Tese: {conclusao} | Recomendacao: {acao} | Risco: {nivel}
```

## Acceptance Criteria

- [ ] Dispositivos do CC/2002 citados com artigos especificos
- [ ] Funcao social analisada (Art. 421) com posicao fundamentada
- [ ] Boa-fe objetiva verificada nas tres funcoes (interpretativa, limitativa, integrativa)
- [ ] Equilibrio contratual avaliado com identificacao de vicios
- [ ] CDC verificado e aplicado se relacao de consumo
- [ ] Fundamentacao com doutrina e jurisprudencia (minimo 2 referencias)
- [ ] Conclusao objetiva com recomendacao e nivel de risco
