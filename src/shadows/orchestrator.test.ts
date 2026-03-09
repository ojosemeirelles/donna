import { describe, it, expect } from "vitest";
import { classifyIntent } from "./orchestrator.js";

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
    expect(classifyIntent("agenda uma reuniao")).toBe("schedule");
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

  it("defaults to complex for unknown intents", () => {
    expect(classifyIntent("oi tudo bem")).toBe("complex");
    expect(classifyIntent("hello")).toBe("complex");
    expect(classifyIntent("obrigado")).toBe("complex");
  });
});
