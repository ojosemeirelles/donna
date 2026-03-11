import { describe, it, expect } from "vitest";
import { classifyIntent, isSoulIntent } from "./orchestrator.js";

describe("classifyIntent", () => {
  it("classifies exec intents", () => {
    expect(classifyIntent("run ls -la")).toBe("exec");
    expect(classifyIntent("executa esse comando")).toBe("exec");
    expect(classifyIntent("abre o terminal")).toBe("exec");
    expect(classifyIntent("roda o script")).toBe("exec");
    expect(classifyIntent("open app Safari")).toBe("exec");
  });

  it("classifies research intents", () => {
    expect(classifyIntent("pesquisa sobre AI trends")).toBe("research");
    expect(classifyIntent("search for TypeScript docs")).toBe("research");
    expect(classifyIntent("busca informacoes sobre X")).toBe("research");
    expect(classifyIntent("investigate this error")).toBe("research");
  });

  it("classifies write intents", () => {
    expect(classifyIntent("escreve um email")).toBe("write");
    expect(classifyIntent("write a document")).toBe("write");
    expect(classifyIntent("draft a proposal")).toBe("write");
    expect(classifyIntent("redige um texto")).toBe("write");
  });

  it("classifies schedule intents", () => {
    // "agenda uma reuniao" now matches calendar (higher priority) — correct behavior
    expect(classifyIntent("agenda uma reuniao")).toBe("calendar");
    expect(classifyIntent("schedule a reminder")).toBe("schedule");
    expect(classifyIntent("lembra-me amanha")).toBe("schedule");
    expect(classifyIntent("set a cron job")).toBe("schedule");
  });

  it("classifies analyze intents", () => {
    expect(classifyIntent("analisa os dados")).toBe("analyze");
    expect(classifyIntent("generate a report")).toBe("analyze");
    expect(classifyIntent("relatorio semanal")).toBe("analyze");
    expect(classifyIntent("dashboard de metricas")).toBe("analyze");
  });

  it("classifies browse intents", () => {
    expect(classifyIntent("navega para a pagina")).toBe("browse");
    expect(classifyIntent("take a screenshot")).toBe("browse");
    expect(classifyIntent("scrape this page")).toBe("browse");
    expect(classifyIntent("open the canvas")).toBe("browse");
  });

  it("classifies monitor intents", () => {
    expect(classifyIntent("monitor the logs")).toBe("monitor");
    expect(classifyIntent("watch for changes")).toBe("monitor");
    expect(classifyIntent("vigia o sistema")).toBe("monitor");
  });

  it("classifies soul intents", () => {
    expect(classifyIntent("me analisa")).toBe("soul");
    expect(classifyIntent("como estou")).toBe("soul");
    expect(classifyIntent("meu estado")).toBe("soul");
    expect(classifyIntent("o que estou evitando")).toBe("soul");
    expect(classifyIntent("minhas vitorias")).toBe("soul");
    expect(classifyIntent("padrao financeiro")).toBe("soul");
    expect(classifyIntent("o que devo ler")).toBe("soul");
    expect(classifyIntent("apaga meu perfil soul")).toBe("soul");
  });

  it("classifies soul-dreams intents", () => {
    expect(classifyIntent("meus sonhos")).toBe("soul-dreams");
    expect(classifyIntent("quero realizar algo grande")).toBe("soul-dreams");
    expect(classifyIntent("dream vault")).toBe("soul-dreams");
  });

  it("classifies soul-productivity intents", () => {
    expect(classifyIntent("minha produtividade")).toBe("soul-productivity");
    expect(classifyIntent("meu ritmo de trabalho")).toBe("soul-productivity");
    expect(classifyIntent("quando sou mais produtivo")).toBe("soul-productivity");
  });

  it("classifies soul-relationships intents", () => {
    expect(classifyIntent("minhas relacoes")).toBe("soul-relationships");
    expect(classifyIntent("meus relacionamentos")).toBe("soul-relationships");
    expect(classifyIntent("quem tenho negligenciado")).toBe("soul-relationships");
  });

  it("isSoulIntent helper works", () => {
    expect(isSoulIntent("soul")).toBe(true);
    expect(isSoulIntent("soul-dreams")).toBe(true);
    expect(isSoulIntent("soul-productivity")).toBe(true);
    expect(isSoulIntent("soul-relationships")).toBe(true);
    expect(isSoulIntent("exec")).toBe(false);
    expect(isSoulIntent("complex")).toBe(false);
  });

  it("defaults to complex for unknown intents", () => {
    expect(classifyIntent("oi tudo bem")).toBe("complex");
    expect(classifyIntent("hello")).toBe("complex");
    expect(classifyIntent("obrigado")).toBe("complex");
  });
});
