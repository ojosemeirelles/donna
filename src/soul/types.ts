/**
 * SOUL Engine Types — Donna's emotional intelligence and human context system.
 * All data stored locally in ~/.donna/soul/
 */

// --- Voice Analyzer ---

export type EnergyLevel = "high" | "medium" | "low" | "depleted";
export type MoodState =
  | "focused"
  | "anxious"
  | "excited"
  | "frustrated"
  | "reflective"
  | "rushed"
  | "neutral";
export type CommunicationStyle = "assertive" | "passive" | "analytical" | "creative";
export type UrgencyLevel = "normal" | "elevated" | "crisis";

export type VoiceSnapshot = {
  timestamp: number;
  energy: EnergyLevel;
  mood: MoodState;
  stressLevel: number; // 0-10
  communicationStyle: CommunicationStyle;
  urgency: UrgencyLevel;
  signals: string[];
  messageLength: number;
  wordCount: number;
};

// --- Psychometrics ---

export type OceanProfile = {
  openness: number; // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

export type GeniusZone = "incompetence" | "competence" | "excellence" | "genius";

export type GeniusZoneProfile = {
  currentZone: GeniusZone;
  incompetence: string[];
  competence: string[];
  excellence: string[];
  genius: string[];
};

export type DISCProfile = {
  dominance: number; // 0-100
  influence: number;
  steadiness: number;
  conscientiousness: number;
};

export type PsychometricProfile = {
  ocean: OceanProfile;
  disc: DISCProfile;
  geniusZone: GeniusZoneProfile;
  confidence: Record<string, number>; // dimension → 0-100%
  lastUpdated: number;
  observationCount: number;
  history: Array<{ date: number; ocean: OceanProfile; disc: DISCProfile }>;
};

// --- Relational Memory ---

export type RelationshipType =
  | "family"
  | "partner"
  | "friend"
  | "colleague"
  | "client"
  | "mentor"
  | "business_partner"
  | "other";

export type Sentiment = "positive" | "neutral" | "tension" | "conflict";

export type Person = {
  name: string;
  relationship: RelationshipType;
  firstMentioned: number;
  lastMentioned: number;
  mentionCount: number;
  sentiment: Sentiment;
  importantDates: Array<{ date: string; label: string }>;
  notes: string[];
};

export type RelationshipMap = {
  people: Person[];
  lastUpdated: number;
};

// --- Dream Vault ---

export type DreamStatus = "active" | "dormant" | "achieved" | "abandoned";

export type Dream = {
  id: string;
  text: string;
  category: string;
  capturedAt: number;
  lastMentioned: number;
  mentionCount: number;
  status: DreamStatus;
  context: string;
};

export type DreamVault = {
  dreams: Dream[];
  lastUpdated: number;
};

// --- Productivity Map ---

export type HourlyEnergy = {
  hour: number; // 0-23
  avgEnergy: number; // 0-10
  avgComplexity: number; // 0-10
  messageCount: number;
};

export type DayPattern = {
  day: number; // 0=Sun, 6=Sat
  avgEnergy: number;
  avgProductivity: number;
  messageCount: number;
};

export type ProductivityRhythms = {
  hourly: HourlyEnergy[];
  daily: DayPattern[];
  peakHours: number[];
  peakDays: number[];
  currentCycle: "high" | "normal" | "low";
  cycleStartDate: number;
  dataPoints: number;
  lastUpdated: number;
};

// --- Pattern Detector ---

export type PatternType =
  | "procrastination"
  | "avoidance"
  | "perfectionism"
  | "analysis_paralysis"
  | "impulsivity"
  | "stress_loop"
  | "overcommitment";

export type DetectedPattern = {
  type: PatternType;
  subject: string;
  firstDetected: number;
  lastSeen: number;
  occurrences: number;
  examples: string[];
  severity: "mild" | "moderate" | "significant";
  addressed: boolean;
};

// --- Network Intel ---

export type RelationshipCategory =
  | "family"
  | "partners"
  | "clients"
  | "mentors"
  | "friends"
  | "team";

export type RelationshipHealth = {
  category: RelationshipCategory;
  positiveMentions: number;
  negativeMentions: number;
  healthScore: number; // 0-10
  lastContact: number;
  keyPeople: string[];
};

// --- Shadow Finance ---

export type FinancePattern =
  | "abundance"
  | "scarcity"
  | "anxiety"
  | "avoidance"
  | "confident"
  | "mixed";

export type FinanceProfile = {
  dominantPattern: FinancePattern;
  anxietySignals: number;
  abundanceSignals: number;
  avoidanceSignals: number;
  examples: Array<{ text: string; pattern: FinancePattern; date: number }>;
  lastUpdated: number;
};

// --- Celebration ---

export type Streak = {
  id: string;
  label: string;
  currentCount: number;
  longestCount: number;
  lastCheckin: number;
  startedAt: number;
  active: boolean;
};

export type Milestone = {
  id: string;
  label: string;
  date: number;
  category: string;
  celebrated: boolean;
};

export type CelebrationData = {
  streaks: Streak[];
  milestones: Milestone[];
  recentWins: Array<{ text: string; date: number }>;
  lastUpdated: number;
};

// --- Growth Curator ---

export type GrowthRecommendation = {
  book: { title: string; author: string; chapter: string; reason: string } | null;
  mentor: { name: string; insight: string; reason: string } | null;
  framework: { name: string; description: string; reason: string } | null;
  content: { title: string; source: string; reason: string } | null;
  generatedAt: number;
};

// --- Soul Profile (unified) ---

export type SoulProfile = {
  lastUpdated: number;
  psychometrics: PsychometricProfile | null;
  currentState: {
    energy: EnergyLevel;
    mood: MoodState;
    stressLevel: number;
    dominantPattern: string;
  };
  relationships: {
    healthy: string[];
    needsAttention: string[];
    avoided: string[];
  };
  dreams: {
    active: string[];
    dormant: string[];
    achieved: string[];
  };
  rhythms: {
    peakHours: number[];
    peakDays: number[];
    currentCycle: string;
  };
  patterns: {
    procrastinating: string[];
    avoiding: string[];
    strengths: string[];
  };
  milestones: {
    upcoming: Milestone[];
    recent: Milestone[];
    streaks: Streak[];
  };
  growthPlan: GrowthRecommendation | null;
  financePattern: FinancePattern;
  soulSummary: string;
};

// --- Observation Log ---

export type Observation = {
  timestamp: number;
  type: "voice" | "relationship" | "dream" | "pattern" | "finance" | "milestone" | "streak";
  data: Record<string, unknown>;
  messageExcerpt: string;
};

// --- Soul Context (injected into prompts) ---

export type SoulContext = {
  energy: EnergyLevel;
  mood: MoodState;
  stressLevel: number;
  activePattern: string | null;
  recentDream: string | null;
  relationshipAlert: string | null;
  adaptationHint: string;
};
