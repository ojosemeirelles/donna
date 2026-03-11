import { describe, it, expect } from "vitest";
import { analyzeVoice, generateAdaptationHint } from "./voice-analyzer.js";

describe("analyzeVoice", () => {
  it("returns a valid VoiceSnapshot shape", () => {
    const snap = analyzeVoice("oi tudo bem");
    expect(snap).toHaveProperty("timestamp");
    expect(snap).toHaveProperty("energy");
    expect(snap).toHaveProperty("mood");
    expect(snap).toHaveProperty("stressLevel");
    expect(snap).toHaveProperty("communicationStyle");
    expect(snap).toHaveProperty("urgency");
    expect(snap).toHaveProperty("signals");
    expect(snap).toHaveProperty("messageLength");
    expect(snap).toHaveProperty("wordCount");
  });

  // Energy detection
  it("detects depleted energy", () => {
    expect(analyzeVoice("estou cansado demais hoje").energy).toBe("depleted");
    expect(analyzeVoice("dormi mal a noite toda").energy).toBe("depleted");
    expect(analyzeVoice("sem energia pra nada").energy).toBe("depleted");
  });

  it("detects high energy from signals", () => {
    expect(analyzeVoice("vamos lá, bora fazer acontecer").energy).toBe("high");
    expect(analyzeVoice("estou animado com esse projeto").energy).toBe("high");
  });

  it("detects high energy from exclamations and caps", () => {
    expect(analyzeVoice("Isso é INCRÍVEL!! VAMOS!!!").energy).toBe("high");
  });

  it("defaults to medium energy for longer normal messages", () => {
    // Messages > 40 words default to medium; shorter ones without punctuation can be low
    const longMsg =
      "preciso revisar o documento do projeto antes da reunião de amanhã para garantir que todos os pontos estão cobertos e que não esquecemos nada importante no relatório final que precisa ser enviado";
    expect(analyzeVoice(longMsg).energy).toBe("medium");
  });

  // Mood detection
  it("detects frustrated mood", () => {
    expect(analyzeVoice("droga, não funciona de novo").mood).toBe("frustrated");
    expect(analyzeVoice("merda, quebrou tudo").mood).toBe("frustrated");
  });

  it("detects excited mood", () => {
    expect(analyzeVoice("consegui!! fechei o deal!").mood).toBe("excited");
  });

  it("detects anxious mood", () => {
    expect(analyzeVoice("não sei o que fazer? será que vai dar certo?").mood).toBe("anxious");
  });

  it("detects rushed mood", () => {
    expect(analyzeVoice("faz isso agora").mood).toBe("rushed");
  });

  it("defaults to neutral mood", () => {
    expect(analyzeVoice("olá, bom dia").mood).toBe("neutral");
  });

  // Stress detection
  it("raises stress for urgency and crisis words", () => {
    const snap = analyzeVoice("urgente! o sistema caiu! estamos perdendo dinheiro!");
    expect(snap.stressLevel).toBeGreaterThanOrEqual(7);
  });

  it("lowers stress for positive words and emojis", () => {
    const snap = analyzeVoice("tudo ótimo, tranquilo 😊");
    expect(snap.stressLevel).toBeLessThanOrEqual(3);
  });

  it("keeps stress between 0 and 10", () => {
    const low = analyzeVoice("ótimo tranquilo suave beleza top 😊🎉");
    expect(low.stressLevel).toBeGreaterThanOrEqual(0);
    const high = analyzeVoice(
      "urgente deadline prazo agora emergência caiu fora do ar perdendo dinheiro desastre!!!",
    );
    expect(high.stressLevel).toBeLessThanOrEqual(10);
  });

  // Communication style
  it("detects analytical style", () => {
    expect(analyzeVoice("preciso dos dados e métricas de performance").communicationStyle).toBe(
      "analytical",
    );
  });

  it("detects assertive style", () => {
    expect(analyzeVoice("faça isso agora, preciso disso pronto").communicationStyle).toBe(
      "assertive",
    );
  });

  it("detects passive style", () => {
    expect(
      analyzeVoice("por favor, será que poderia quando puder dar uma olhada").communicationStyle,
    ).toBe("passive");
  });

  it("detects creative style", () => {
    expect(
      analyzeVoice("imagina se a gente fizesse um brainstorm, tenho uma ideia").communicationStyle,
    ).toBe("creative");
  });

  // Urgency
  it("detects crisis urgency", () => {
    expect(analyzeVoice("emergência! o sistema caiu!").urgency).toBe("crisis");
  });

  it("detects elevated urgency", () => {
    expect(analyzeVoice("isso é urgente, preciso agora").urgency).toBe("elevated");
  });

  it("defaults to normal urgency", () => {
    expect(analyzeVoice("quando puder, me ajuda com isso").urgency).toBe("normal");
  });

  // Signals
  it("collects relevant signals", () => {
    const snap = analyzeVoice("estou cansado e frustrado porque não funciona");
    expect(snap.signals).toContain("depleted-energy");
    expect(snap.signals).toContain("frustration");
  });

  // Word count and message length
  it("tracks word count and message length", () => {
    const snap = analyzeVoice("uma dois tres");
    expect(snap.wordCount).toBe(3);
    expect(snap.messageLength).toBe("uma dois tres".length);
  });
});

describe("generateAdaptationHint", () => {
  it("returns depleted hint", () => {
    const snap = analyzeVoice("estou exausto");
    expect(generateAdaptationHint(snap)).toContain("curtas");
  });

  it("returns crisis hint", () => {
    const snap = analyzeVoice("emergência o sistema caiu fora do ar");
    expect(generateAdaptationHint(snap)).toContain("emergencia");
  });

  it("returns frustrated hint", () => {
    const snap = analyzeVoice("droga, de novo esse bug");
    expect(generateAdaptationHint(snap)).toContain("frustracao");
  });

  it("returns anxious hint", () => {
    const snap = analyzeVoice("não sei o que fazer? será que funciona? e se der errado?");
    expect(generateAdaptationHint(snap)).toContain("calma");
  });

  it("returns default balanced hint for neutral messages", () => {
    const snap = analyzeVoice("olá bom dia");
    expect(generateAdaptationHint(snap)).toContain("equilibrado");
  });
});
