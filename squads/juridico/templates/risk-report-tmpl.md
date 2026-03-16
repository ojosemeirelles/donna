# Relatorio de Avaliacao de Riscos Juridicos

> Projeto/Operacao: {nome_projeto}
> Data: {data}
> Elaborado por: {autor}
> Versao: {versao}
> Status: {Draft|Em Revisao|Aprovado}
> Classificacao: {Confidencial|Interno}

---

## Resumo Executivo

{resumo_executivo — visao geral da avaliacao em 3-5 linhas. Quantos riscos identificados, distribuicao por severidade, e recomendacao principal.}

| Metrica | Valor |
|---------|-------|
| Total de riscos identificados | {total_riscos} |
| Riscos criticos | {n_criticos} |
| Riscos altos | {n_altos} |
| Riscos medios | {n_medios} |
| Riscos baixos | {n_baixos} |
| Score geral de risco | {score_geral}/100 |

---

## Escopo da Avaliacao

**Objetivo:** {objetivo_da_avaliacao}

**Abrangencia:**
- Areas avaliadas: {areas_avaliadas}
- Periodo de referencia: {periodo}
- Jurisdicoes consideradas: {jurisdicoes}
- Limitacoes: {limitacoes_da_avaliacao}

**Metodologia:**
- {metodologia_utilizada — ex: ISO 31000, COSO ERM, framework proprio}
- Fontes consultadas: {fontes}

---

## Mapa de Riscos

| # | Risco | Categoria | Probabilidade | Impacto | Severidade | Status |
|---|-------|-----------|---------------|---------|------------|--------|
| R01 | {descricao_risco_1} | {categoria_1} | {1-5} | {1-5} | {P x I} | {Aberto|Mitigado|Aceito} |
| R02 | {descricao_risco_2} | {categoria_2} | {1-5} | {1-5} | {P x I} | {status} |
| R03 | {descricao_risco_3} | {categoria_3} | {1-5} | {1-5} | {P x I} | {status} |
| R04 | {descricao_risco_4} | {categoria_4} | {1-5} | {1-5} | {P x I} | {status} |
| R05 | {descricao_risco_5} | {categoria_5} | {1-5} | {1-5} | {P x I} | {status} |

**Categorias de risco:** Regulatorio | Contratual | Trabalhista | Tributario | Propriedade Intelectual | Dados e Privacidade | Contencioso | Societario | Compliance | Ambiental

**Escala de Probabilidade:**
- 1 = Raro | 2 = Improvavel | 3 = Possivel | 4 = Provavel | 5 = Quase Certo

**Escala de Impacto:**
- 1 = Insignificante | 2 = Menor | 3 = Moderado | 4 = Maior | 5 = Catastrofico

---

## Matriz de Risco

```
IMPACTO
  5 |  5  | 10  | 15  | 20  | 25  |
  4 |  4  |  8  | 12  | 16  | 20  |
  3 |  3  |  6  |  9  | 12  | 15  |
  2 |  2  |  4  |  6  |  8  | 10  |
  1 |  1  |  2  |  3  |  4  |  5  |
     ---------------------------------
       1     2     3     4     5
                              PROBABILIDADE

Legenda:
  1-4   = Baixo (aceitavel)
  5-9   = Medio (monitorar)
  10-16 = Alto (mitigar)
  17-25 = Critico (acao imediata)

Posicionamento dos riscos:
  {risco_id}: ({probabilidade}, {impacto})
```

---

## Detalhamento dos Riscos Criticos e Altos

### {risco_id}: {titulo_risco}

- **Categoria:** {categoria}
- **Descricao:** {descricao_detalhada}
- **Probabilidade:** {valor} — {justificativa}
- **Impacto:** {valor} — {justificativa}
- **Severidade:** {P x I}
- **Cenario de materializacao:** {o_que_acontece_se_o_risco_se_concretizar}
- **Impacto financeiro estimado:** R$ {valor_estimado}
- **Base legal:** {legislacao_ou_regulamentacao_relevante}
- **Precedentes:** {casos_similares_se_houver}

---

## Plano de Mitigacao

| # | Risco | Acao de Mitigacao | Responsavel | Prazo | Custo Estimado | Risco Residual |
|---|-------|-------------------|-------------|-------|----------------|----------------|
| R01 | {risco_1} | {acao_mitigacao_1} | {responsavel} | {prazo} | R$ {custo} | {baixo|medio} |
| R02 | {risco_2} | {acao_mitigacao_2} | {responsavel} | {prazo} | R$ {custo} | {residual} |
| R03 | {risco_3} | {acao_mitigacao_3} | {responsavel} | {prazo} | R$ {custo} | {residual} |

### Estrategias por Tipo

| Estrategia | Quando Usar | Exemplo |
|------------|-------------|---------|
| Evitar | Risco inaceitavel | {exemplo_evitar} |
| Mitigar | Risco alto, acao possivel | {exemplo_mitigar} |
| Transferir | Risco seguravel | {exemplo_transferir — seguro, clausula contratual} |
| Aceitar | Risco baixo, custo alto de mitigacao | {exemplo_aceitar} |

---

## Handoffs Recomendados

| Risco | Handoff Para | Motivo | Urgencia |
|-------|-------------|--------|----------|
| {risco_que_requer_especialista} | {especialista_ou_area} | {por_que_precisa_de_handoff} | {imediata|curto_prazo|medio_prazo} |
| {risco_2} | {destino} | {motivo} | {urgencia} |

---

## Proximos Passos

- [ ] {acao_1} — Responsavel: {quem} | Prazo: {quando}
- [ ] {acao_2} — Responsavel: {quem} | Prazo: {quando}
- [ ] {acao_3} — Responsavel: {quem} | Prazo: {quando}
- [ ] Proxima revisao do mapa de riscos: {data_proxima_revisao}
- [ ] Monitoramento continuo de riscos criticos: {frequencia}

---

## Anexos

- Anexo A: {descricao_anexo_1}
- Anexo B: {descricao_anexo_2}

---

*Template: risk-report-tmpl.md v1.0.0*
*LegalOS Squad — Risk Assessment Framework*
