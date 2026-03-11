import { createSubsystemLogger } from "../logging/subsystem.js";
import {
  detectWin,
  loadCelebrations,
  saveCelebrations,
  recordWin,
  formatCelebrationReport,
} from "./celebration.js";
import {
  detectDream,
  loadDreams,
  saveDreams,
  addDream,
  getDreamReminders,
  formatDreamReport,
} from "./dream-vault.js";
import { generateRecommendations, formatGrowthPlan } from "./growth-curator.js";
import {
  loadRhythms,
  saveRhythms,
  recordDataPoint,
  generateProductivityMap,
} from "./productivity-map.js";
import { generatePsychometricReport, loadPsychometricProfile } from "./psychometrics.js";
import {
  extractPeople,
  updateRelationship,
  loadRelationships,
  saveRelationships,
  detectSentiment,
  getRelationshipAlerts,
  formatRelationshipReport,
} from "./relational-memory.js";
import {
  analyzeFinanceSignals,
  loadFinanceProfile,
  saveFinanceProfile,
  updateFinanceProfile,
  generateFinanceReport,
} from "./shadow-finance.js";
import {
  loadSoulProfile,
  saveSoulProfile,
  appendObservation,
  buildSoulContext,
  ensureSoulDir,
} from "./soul-profile.js";
/**
 * SOUL Engine — main orchestrator that ties all soul modules together.
 * Processes every user message to build emotional intelligence context.
 * Never throws — processMessage must be fault-tolerant.
 */
import type { VoiceSnapshot, SoulContext } from "./types.js";
import { analyzeVoice } from "./voice-analyzer.js";

const log = createSubsystemLogger("soul");

/**
 * The main entry point called on every user message.
 * Analyzes voice, updates all soul subsystems, and returns context.
 * NEVER throws — all errors are caught and logged.
 */
export async function processMessage(
  message: string,
): Promise<{ snapshot: VoiceSnapshot; context: SoulContext }> {
  try {
    await ensureSoulDir();

    // 1. Analyze voice
    const snapshot = analyzeVoice(message);

    // 2. Append voice observation
    const excerpt = message.length > 100 ? message.slice(0, 97) + "..." : message;
    try {
      await appendObservation({
        timestamp: Date.now(),
        type: "voice",
        data: { ...snapshot },
        messageExcerpt: excerpt,
      });
    } catch (err) {
      log.warn("Failed to append voice observation", { error: String(err) });
    }

    // 3. Update productivity rhythms
    try {
      const rhythms = await loadRhythms();
      const updated = recordDataPoint(rhythms, snapshot);
      await saveRhythms(updated);
    } catch (err) {
      log.warn("Failed to update productivity rhythms", { error: String(err) });
    }

    // 4. Extract people and update relational memory
    try {
      const people = extractPeople(message);
      if (people.length > 0) {
        let relMap = await loadRelationships();
        for (const { name, context } of people) {
          const sentiment = detectSentiment(context);
          relMap = updateRelationship(relMap, name, "other", sentiment, context);
        }
        await saveRelationships(relMap);
      }
    } catch (err) {
      log.warn("Failed to update relational memory", { error: String(err) });
    }

    // 5. Detect dreams and update dream vault
    try {
      const dreamDetection = detectDream(message);
      if (dreamDetection) {
        let vault = await loadDreams();
        vault = addDream(vault, dreamDetection.text, dreamDetection.category, excerpt);
        await saveDreams(vault);
      }
    } catch (err) {
      log.warn("Failed to update dream vault", { error: String(err) });
    }

    // 6. Detect financial signals and update finance profile
    try {
      const financeResult = analyzeFinanceSignals(message);
      if (financeResult) {
        let finProfile = await loadFinanceProfile();
        finProfile = updateFinanceProfile(finProfile, message);
        await saveFinanceProfile(finProfile);
      }
    } catch (err) {
      log.warn("Failed to update finance profile", { error: String(err) });
    }

    // 7. Detect wins and update celebrations
    try {
      const win = detectWin(message);
      if (win) {
        let celebrations = await loadCelebrations();
        celebrations = recordWin(celebrations, win.text);
        await saveCelebrations(celebrations);
      }
    } catch (err) {
      log.warn("Failed to update celebrations", { error: String(err) });
    }

    // 8. Load profile and build soul context
    const profile = await loadSoulProfile();

    // Update current state on profile
    profile.currentState = {
      energy: snapshot.energy,
      mood: snapshot.mood,
      stressLevel: snapshot.stressLevel,
      dominantPattern: profile.currentState.dominantPattern,
    };
    profile.lastUpdated = Date.now();

    try {
      await saveSoulProfile(profile);
    } catch (err) {
      log.warn("Failed to save soul profile", { error: String(err) });
    }

    // 9. Build and return context
    const context = buildSoulContext(profile);
    return { snapshot, context };
  } catch (err) {
    // NEVER fail the main message flow
    log.error("Soul engine processMessage failed — returning defaults", { error: String(err) });

    const fallbackSnapshot: VoiceSnapshot = {
      timestamp: Date.now(),
      energy: "medium",
      mood: "neutral",
      stressLevel: 3,
      communicationStyle: "analytical",
      urgency: "normal",
      signals: [],
      messageLength: message.length,
      wordCount: message.trim().split(/\s+/).filter(Boolean).length,
    };

    const fallbackContext: SoulContext = {
      energy: "medium",
      mood: "neutral",
      stressLevel: 3,
      activePattern: null,
      recentDream: null,
      relationshipAlert: null,
      adaptationHint: "Tom equilibrado. Adapte conforme a conversa evolui.",
    };

    return { snapshot: fallbackSnapshot, context: fallbackContext };
  }
}

/** Quick read of current soul context without processing a message. */
export async function getSoulContext(): Promise<SoulContext> {
  try {
    const profile = await loadSoulProfile();
    return buildSoulContext(profile);
  } catch (err) {
    log.warn("Failed to get soul context", { error: String(err) });
    return {
      energy: "medium",
      mood: "neutral",
      stressLevel: 3,
      activePattern: null,
      recentDream: null,
      relationshipAlert: null,
      adaptationHint: "Tom equilibrado. Adapte conforme a conversa evolui.",
    };
  }
}

/** Generate comprehensive Portuguese report combining all modules. Called by "donna me analisa". */
export async function generateFullReport(): Promise<string> {
  try {
    const sections: string[] = [];

    // Psychometric profile
    const psychometrics = await loadPsychometricProfile();
    if (psychometrics) {
      sections.push(generatePsychometricReport(psychometrics));
    }

    // Relationships
    const relMap = await loadRelationships();
    if (relMap.people.length > 0) {
      sections.push(formatRelationshipReport(relMap));
    }

    // Dreams
    const vault = await loadDreams();
    if (vault.dreams.length > 0) {
      sections.push(formatDreamReport(vault));
    }

    // Finance
    const finProfile = await loadFinanceProfile();
    if (finProfile.examples.length > 0) {
      sections.push(generateFinanceReport(finProfile));
    }

    // Celebrations
    try {
      const celebrations = await loadCelebrations();
      const celebReport = formatCelebrationReport(celebrations);
      if (celebReport) {
        sections.push(celebReport);
      }
    } catch {
      // celebration module may not exist yet
    }

    // Growth plan
    const profile = await loadSoulProfile();
    const rec = generateRecommendations({
      psychometrics,
      currentSnapshot: null,
      patterns: [],
      financePattern: finProfile.dominantPattern,
      dominantTheme: profile.currentState.dominantPattern,
    });
    sections.push(formatGrowthPlan(rec));

    // Soul summary
    const summary = `\n=== RESUMO ===\n${profile.soulSummary || "Donna ainda esta aprendendo sobre voce. Continue conversando normalmente."}`;
    sections.push(summary);

    if (sections.length === 0) {
      return "Ainda nao tenho dados suficientes para uma analise completa. Continue conversando normalmente — a Donna aprende em cada mensagem.";
    }

    return sections.join("\n\n");
  } catch (err) {
    log.error("Failed to generate full report", { error: String(err) });
    return "Erro ao gerar relatorio. Tente novamente em alguns instantes.";
  }
}

/** Short status: energy, mood, active patterns. Called by "como estou". */
export async function generateQuickStatus(): Promise<string> {
  try {
    const profile = await loadSoulProfile();
    const context = buildSoulContext(profile);

    const moodLabels: Record<string, string> = {
      focused: "Focado",
      anxious: "Ansioso",
      excited: "Empolgado",
      frustrated: "Frustrado",
      reflective: "Reflexivo",
      rushed: "Apressado",
      neutral: "Neutro",
    };
    const energyLabels: Record<string, string> = {
      high: "Alta",
      medium: "Media",
      low: "Baixa",
      depleted: "Esgotada",
    };

    const lines = [
      `Energia: ${energyLabels[context.energy] ?? context.energy}`,
      `Humor: ${moodLabels[context.mood] ?? context.mood}`,
      `Estresse: ${context.stressLevel}/10`,
    ];

    if (context.activePattern) {
      lines.push(`Padrao ativo: ${context.activePattern}`);
    }
    if (context.recentDream) {
      lines.push(`Sonho ativo: ${context.recentDream}`);
    }
    if (context.relationshipAlert) {
      lines.push(`Alerta: ${context.relationshipAlert}`);
    }

    return lines.join("\n");
  } catch (err) {
    log.error("Failed to generate quick status", { error: String(err) });
    return "Nao consegui acessar seu perfil. Tente novamente.";
  }
}

/** Returns soul section for morning brief. */
export async function getMorningBriefSoul(): Promise<string | null> {
  try {
    const parts: string[] = [];

    // Yesterday's emotional state inference
    const profile = await loadSoulProfile();
    const { currentState } = profile;
    if (currentState.mood !== "neutral" || currentState.energy !== "medium") {
      const moodLabel: Record<string, string> = {
        focused: "focado",
        anxious: "ansioso",
        excited: "empolgado",
        frustrated: "frustrado",
        reflective: "reflexivo",
        rushed: "apressado",
        neutral: "estavel",
      };
      parts.push(
        `Ontem voce parecia ${moodLabel[currentState.mood] ?? currentState.mood}, energia ${currentState.energy}.`,
      );
    }

    // 1 psychometric insight
    const psychometrics = await loadPsychometricProfile();
    if (psychometrics) {
      if (psychometrics.ocean.neuroticism > 65) {
        parts.push("Seu neuroticismo esta elevado — cuide do estresse hoje.");
      } else if (psychometrics.ocean.openness > 70) {
        parts.push("Sua abertura a novas ideias esta alta — bom dia para criatividade.");
      } else if (psychometrics.disc.dominance > 70) {
        parts.push("Seu perfil de dominancia esta forte — canalize para decisoes importantes.");
      }
    }

    // Relationship reminders
    const relMap = await loadRelationships();
    const alerts = getRelationshipAlerts(relMap);
    if (alerts.length > 0) {
      parts.push(alerts[0]);
    }

    // 1 pending dream
    const vault = await loadDreams();
    const reminders = getDreamReminders(vault);
    if (reminders.length > 0) {
      parts.push(reminders[0]);
    }

    // Celebration if streak/milestone
    try {
      const celebrations = await loadCelebrations();
      if (celebrations.streaks.some((s) => s.active && s.currentCount >= 7)) {
        const streak = celebrations.streaks.find((s) => s.active && s.currentCount >= 7);
        if (streak) {
          parts.push(`Streak ativa: ${streak.label} — ${streak.currentCount} dias consecutivos!`);
        }
      }
    } catch {
      // celebration module may not exist yet
    }

    if (parts.length === 0) {
      return null;
    }

    return ["[Soul]", ...parts].join("\n  ");
  } catch (err) {
    log.warn("Failed to generate morning brief soul section", { error: String(err) });
    return null;
  }
}

/** Routes soul-related commands to the appropriate handler. */
export async function handleSoulCommand(command: string): Promise<string> {
  const normalized = command
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  try {
    if (normalized.includes("me analisa") || normalized.includes("analise completa")) {
      return await generateFullReport();
    }

    if (normalized.includes("como estou") || normalized.includes("meu estado")) {
      return await generateQuickStatus();
    }

    if (normalized.includes("meus sonhos") || normalized.includes("dream")) {
      const vault = await loadDreams();
      return formatDreamReport(vault);
    }

    if (normalized.includes("minha produtividade") || normalized.includes("productivity")) {
      try {
        const rhythms = await loadRhythms();
        return generateProductivityMap(rhythms);
      } catch {
        return "Dados de produtividade ainda insuficientes. Continue usando a Donna para coletar mais dados.";
      }
    }

    if (
      normalized.includes("o que devo ler") ||
      normalized.includes("leitura") ||
      normalized.includes("growth")
    ) {
      const finProfile = await loadFinanceProfile();
      const profile = await loadSoulProfile();
      const psychometrics = await loadPsychometricProfile();
      const rec = generateRecommendations({
        psychometrics,
        currentSnapshot: null,
        patterns: [],
        financePattern: finProfile.dominantPattern,
        dominantTheme: profile.currentState.dominantPattern,
      });
      return formatGrowthPlan(rec);
    }

    if (normalized.includes("minhas relacoes") || normalized.includes("relacionamentos")) {
      const relMap = await loadRelationships();
      return formatRelationshipReport(relMap);
    }

    if (
      normalized.includes("padrao financeiro") ||
      normalized.includes("financas") ||
      normalized.includes("finance")
    ) {
      const finProfile = await loadFinanceProfile();
      return generateFinanceReport(finProfile);
    }

    if (
      normalized.includes("minhas vitorias") ||
      normalized.includes("celebracoes") ||
      normalized.includes("wins")
    ) {
      try {
        const celebrations = await loadCelebrations();
        return (
          formatCelebrationReport(celebrations) ||
          "Nenhuma vitoria registrada ainda. Continue — a Donna vai notar."
        );
      } catch {
        return "Modulo de celebracoes ainda nao disponivel.";
      }
    }

    if (normalized.includes("o que estou evitando") || normalized.includes("evitando")) {
      const profile = await loadSoulProfile();
      if (profile.patterns.avoiding.length > 0) {
        const lines = [
          "== O que voce esta evitando ==",
          "",
          ...profile.patterns.avoiding.map((a, i) => `  ${i + 1}. ${a}`),
          "",
          "Evitar nao faz o problema sumir — so adia o desconforto.",
        ];
        return lines.join("\n");
      }
      return "Nenhum padrao de evitacao detectado no momento. Isso e positivo.";
    }

    if (normalized.includes("apaga meu perfil soul") || normalized.includes("delete soul")) {
      // Return confirmation request — actual deletion should be confirmed by caller
      return "Tem certeza que quer apagar todos os dados do Soul Engine? Isso inclui perfil psicometrico, sonhos, relacoes, padroes e historico. Essa acao e irreversivel. Confirme com 'sim, apaga'.";
    }

    return "Comando soul nao reconhecido. Opcoes: me analisa, como estou, meus sonhos, minha produtividade, o que devo ler, minhas relacoes, meu padrao financeiro, minhas vitorias, o que estou evitando, apaga meu perfil soul.";
  } catch (err) {
    log.error("Failed to handle soul command", { command, error: String(err) });
    return "Erro ao processar comando. Tente novamente.";
  }
}
