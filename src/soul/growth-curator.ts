/**
 * Growth Curator — hyper-personalized growth recommendations.
 * Maps emotional patterns, psychometric profiles, and financial behavior
 * to curated books, mentors, and frameworks.
 */
import type {
  GrowthRecommendation,
  PsychometricProfile,
  VoiceSnapshot,
  DetectedPattern,
  FinancePattern,
} from "./types.js";

interface GrowthContext {
  psychometrics: PsychometricProfile | null;
  currentSnapshot: VoiceSnapshot | null;
  patterns: DetectedPattern[];
  financePattern: FinancePattern;
  dominantTheme: string;
}

// --- Book recommendations mapped to patterns ---

interface BookRec {
  title: string;
  author: string;
  chapter: string;
  reason: string;
}

const PATTERN_BOOKS: Record<string, BookRec> = {
  procrastination: {
    title: "The War of Art",
    author: "Steven Pressfield",
    chapter: "Part 1",
    reason: "Identifica a Resistencia como a forca invisivel que te impede de comecar.",
  },
  delegation: {
    title: "The E-Myth Revisited",
    author: "Michael Gerber",
    chapter: "Chapter 7",
    reason: "Mostra por que voce precisa parar de trabalhar NO negocio e trabalhar PELO negocio.",
  },
  analysis_paralysis: {
    title: "The Lean Startup",
    author: "Eric Ries",
    chapter: "Chapter 4 (Build-Measure-Learn)",
    reason: "Ensina a validar rapido em vez de planejar infinitamente.",
  },
  stress: {
    title: "Essentialism",
    author: "Greg McKeown",
    chapter: "Chapter 1",
    reason: "A arte disciplinada de eliminar o que nao e essencial.",
  },
  financial_anxiety: {
    title: "A Psicologia Financeira",
    author: "Morgan Housel",
    chapter: "Capitulos 1-3",
    reason: "Seu medo com dinheiro nao e racional — e emocional. Este livro explica por que.",
  },
  leadership: {
    title: "Extreme Ownership",
    author: "Jocko Willink",
    chapter: "Chapter 1",
    reason: "Lideranca comeca assumindo responsabilidade total pelos resultados.",
  },
  creativity_block: {
    title: "Steal Like an Artist",
    author: "Austin Kleon",
    chapter: "Capitulos 1-3",
    reason: "Criatividade nao e inventar do zero — e combinar influencias de forma unica.",
  },
  default: {
    title: "Atomic Habits",
    author: "James Clear",
    chapter: "Chapter 1",
    reason: "Mudancas pequenas e consistentes geram resultados extraordinarios.",
  },
};

// --- Mentor recommendations ---

interface MentorRec {
  name: string;
  insight: string;
  reason: string;
}

const THEME_MENTORS: Record<string, MentorRec> = {
  stress: {
    name: "Marcus Aurelius",
    insight:
      "O obstaculo e o caminho. O que te bloqueia hoje e exatamente o que precisa ser enfrentado.",
    reason: "Estoicismo pratico para lidar com pressao sem perder a cabeca.",
  },
  entrepreneurship: {
    name: "Naval Ravikant",
    insight:
      "Alavancagem vem de codigo, capital e midia. Trabalho sem alavancagem e trocar tempo por dinheiro.",
    reason: "Repense como voce gera valor — nem todo esforco e igual.",
  },
  focus: {
    name: "Cal Newport",
    insight:
      "Deep work e a capacidade de focar sem distracao em tarefas cognitivamente exigentes. E a nova vantagem competitiva.",
    reason: "No mundo das distracoes, foco profundo e um superpoder.",
  },
  financial: {
    name: "Ray Dalio",
    insight:
      "Princípios claros para decisoes financeiras eliminam emocao da equacao. Diversifique, mantenha liquidez, pense em ciclos.",
    reason: "Decisoes financeiras precisam de framework, nao de instinto.",
  },
  leadership: {
    name: "Simon Sinek",
    insight: "Pessoas nao compram o que voce faz, compram por que voce faz. Comece pelo proposito.",
    reason: "Lideranca eficaz comeca com clareza de proposito.",
  },
  creativity: {
    name: "Leonardo da Vinci",
    insight:
      "Pensamento interdisciplinar — conectar arte, ciencia e engenharia — e a fonte da inovacao verdadeira.",
    reason: "As melhores ideias nascem na interseccao de disciplinas diferentes.",
  },
};

// --- Framework recommendations ---

interface FrameworkRec {
  name: string;
  description: string;
  reason: string;
}

const THEME_FRAMEWORKS: Record<string, FrameworkRec> = {
  overwhelmed: {
    name: "Eisenhower Matrix",
    description:
      "Classifique tarefas em 4 quadrantes: urgente+importante, importante, urgente, nenhum. Delegue ou elimine os ultimos dois.",
    reason:
      "Voce esta sobrecarregado porque trata tudo como prioridade. Isso elimina 50% da sua lista.",
  },
  no_clarity: {
    name: "First Principles Thinking",
    description:
      "Decomponha o problema ate os fundamentos. Remonte de baixo pra cima sem premissas herdadas.",
    reason: "Quando nao sabe por onde comecar, volte aos fundamentos.",
  },
  stuck: {
    name: "Jobs-to-be-Done",
    description:
      "Em vez de perguntar 'o que devo fazer?', pergunte 'que trabalho o usuario/situacao precisa que eu faca?'",
    reason: "Muda o frame de 'estou travado' para 'qual o job a ser feito aqui?'",
  },
  decision_fatigue: {
    name: "Regret Minimization (Bezos)",
    description:
      "Projete-se aos 80 anos. A decisao que minimiza arrependimento e a certa. Use para decisoes grandes, nao para triviais.",
    reason:
      "Fadiga de decisao vem de tratar decisoes pequenas e grandes igual. Esse framework separa.",
  },
  productivity: {
    name: "Pomodoro + Deep Work blocks",
    description:
      "25 min focado + 5 min pausa. Combine com blocos de 2-4h sem interrupcao para trabalho profundo.",
    reason: "Estrutura temporal transforma intencao em execucao.",
  },
};

function resolveBookKey(context: GrowthContext): string {
  // Check patterns first
  for (const p of context.patterns) {
    if (p.type === "procrastination") {
      return "procrastination";
    }
    if (p.type === "analysis_paralysis") {
      return "analysis_paralysis";
    }
    if (p.type === "stress_loop") {
      return "stress";
    }
    if (p.type === "avoidance" && p.subject.toLowerCase().includes("deleg")) {
      return "delegation";
    }
  }

  // Finance pattern
  if (context.financePattern === "anxiety" || context.financePattern === "scarcity") {
    return "financial_anxiety";
  }

  // Dominant theme
  const theme = context.dominantTheme.toLowerCase();
  if (theme.includes("lider") || theme.includes("leader")) {
    return "leadership";
  }
  if (theme.includes("criat") || theme.includes("creat")) {
    return "creativity_block";
  }
  if (theme.includes("stress") || theme.includes("burnout")) {
    return "stress";
  }
  if (theme.includes("delega")) {
    return "delegation";
  }
  if (theme.includes("paralis") || theme.includes("analys")) {
    return "analysis_paralysis";
  }

  // Snapshot-based fallback
  if (context.currentSnapshot) {
    if (context.currentSnapshot.stressLevel >= 7) {
      return "stress";
    }
    if (context.currentSnapshot.mood === "frustrated") {
      return "procrastination";
    }
  }

  return "default";
}

function resolveMentorKey(context: GrowthContext): string {
  if (context.currentSnapshot?.stressLevel && context.currentSnapshot.stressLevel >= 7) {
    return "stress";
  }

  const theme = context.dominantTheme.toLowerCase();
  if (theme.includes("empreend") || theme.includes("negocio") || theme.includes("startup")) {
    return "entrepreneurship";
  }
  if (theme.includes("foco") || theme.includes("focus") || theme.includes("distrac")) {
    return "focus";
  }
  if (theme.includes("financ") || theme.includes("dinheiro")) {
    return "financial";
  }
  if (theme.includes("lider") || theme.includes("leader") || theme.includes("equipe")) {
    return "leadership";
  }
  if (theme.includes("criat") || theme.includes("creat") || theme.includes("ideia")) {
    return "creativity";
  }

  if (context.financePattern === "anxiety" || context.financePattern === "scarcity") {
    return "financial";
  }

  for (const p of context.patterns) {
    if (p.type === "stress_loop") {
      return "stress";
    }
    if (p.type === "analysis_paralysis") {
      return "focus";
    }
  }

  return "entrepreneurship";
}

function resolveFrameworkKey(context: GrowthContext): string {
  if (context.currentSnapshot?.stressLevel && context.currentSnapshot.stressLevel >= 7) {
    return "overwhelmed";
  }

  for (const p of context.patterns) {
    if (p.type === "overcommitment") {
      return "overwhelmed";
    }
    if (p.type === "analysis_paralysis") {
      return "no_clarity";
    }
    if (p.type === "procrastination") {
      return "stuck";
    }
    if (p.type === "impulsivity") {
      return "decision_fatigue";
    }
  }

  const theme = context.dominantTheme.toLowerCase();
  if (theme.includes("sobrecarr") || theme.includes("overwhelm")) {
    return "overwhelmed";
  }
  if (theme.includes("clarez") || theme.includes("clarity")) {
    return "no_clarity";
  }
  if (theme.includes("trav") || theme.includes("stuck")) {
    return "stuck";
  }
  if (theme.includes("decisao") || theme.includes("decision")) {
    return "decision_fatigue";
  }
  if (theme.includes("produtiv") || theme.includes("product")) {
    return "productivity";
  }

  return "productivity";
}

/** Generate hyper-personalized growth recommendations based on context. */
export function generateRecommendations(context: GrowthContext): GrowthRecommendation {
  const bookKey = resolveBookKey(context);
  const book = PATTERN_BOOKS[bookKey] ?? PATTERN_BOOKS["default"];

  const mentorKey = resolveMentorKey(context);
  const mentor = THEME_MENTORS[mentorKey] ?? THEME_MENTORS["entrepreneurship"];

  const frameworkKey = resolveFrameworkKey(context);
  const framework = THEME_FRAMEWORKS[frameworkKey] ?? THEME_FRAMEWORKS["productivity"];

  return {
    book: { ...book },
    mentor: { ...mentor },
    framework: { ...framework },
    content: null,
    generatedAt: Date.now(),
  };
}

/** Format growth recommendations as a Portuguese report with justifications. */
export function formatGrowthPlan(rec: GrowthRecommendation): string {
  const lines: string[] = ["== Plano de Crescimento ==", ""];

  if (rec.book) {
    lines.push("--- Leitura Recomendada ---");
    lines.push(`  Livro: "${rec.book.title}" de ${rec.book.author}`);
    lines.push(`  Capitulo: ${rec.book.chapter}`);
    lines.push(`  Por que: ${rec.book.reason}`);
    lines.push("");
  }

  if (rec.mentor) {
    lines.push("--- Mentor de Referencia ---");
    lines.push(`  ${rec.mentor.name}`);
    lines.push(`  Insight: "${rec.mentor.insight}"`);
    lines.push(`  Relevancia: ${rec.mentor.reason}`);
    lines.push("");
  }

  if (rec.framework) {
    lines.push("--- Framework Recomendado ---");
    lines.push(`  ${rec.framework.name}`);
    lines.push(`  ${rec.framework.description}`);
    lines.push(`  Relevancia: ${rec.framework.reason}`);
    lines.push("");
  }

  if (rec.content) {
    lines.push("--- Conteudo Extra ---");
    lines.push(`  ${rec.content.title} (${rec.content.source})`);
    lines.push(`  ${rec.content.reason}`);
    lines.push("");
  }

  return lines.join("\n");
}
