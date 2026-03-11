/**
 * Shadow Orchestrator — routes messages to the right shadow based on intent.
 */

import type { Rank } from "../evolution/level.js";
import { loadRegistry, getShadowByRole } from "./extractor.js";
import type { ShadowDefinition, ShadowIntent, ShadowRegistry } from "./types.js";

/** Classify a user message into a shadow intent. */
export function classifyIntent(message: string): ShadowIntent {
  const lower = message.toLowerCase();

  // SOUL Engine intents (checked first — personal/introspective commands)

  // Soul dreams: "meus sonhos", "dream", "quero realizar", "aspirações"
  if (/(meus? sonhos?|my dreams?|quero realizar|aspira[cç][oõ]|dream vault)/.test(lower)) {
    return "soul-dreams";
  }
  // Soul productivity: "minha produtividade", "meu ritmo", "energy map"
  if (
    /(minha produtividade|meu ritmo|productivity map|mapa de energia|quando sou mais produtiv)/.test(
      lower,
    )
  ) {
    return "soul-productivity";
  }
  // Soul relationships: "minhas relações", "relacionamentos", "quem tenho negligenciado"
  if (
    /(minhas? rela[cç][oõ]|relacionamento|quem.*negligenci|network.*relacion|rela[cç][oõ].*alert)/.test(
      lower,
    )
  ) {
    return "soul-relationships";
  }
  // Soul general: "me analisa", "como estou", "meu estado", "soul", "o que estou evitando",
  // "minhas vitórias", "padrão financeiro", "o que devo ler"
  if (
    /(me analisa|como estou|meu estado|soul\b|o que estou evitando|minhas? vit[oó]ria|padr[aã]o financeiro|o que devo ler|celebra[cç][oõ]|apaga meu perfil soul)/.test(
      lower,
    )
  ) {
    return "soul";
  }

  // Hook-specific intents (checked after SOUL for precision)

  // Calendar patterns
  if (
    /(calend|agenda.*hoje|compromiss|reuni[aã]o|evento.*dia|tenho tempo|pr[oó]xim[oa]s? compromiss)/.test(
      lower,
    )
  ) {
    return "calendar";
  }
  // Finance / Stripe patterns
  if (/(pagamento|payment|receita|revenue|mrr\b|stripe|chargeback|fatura|cobran[cç])/.test(lower)) {
    return "finance";
  }
  // Shopping / Browser-agent patterns
  if (/(compr[aeo]|buy\b|shopping|pre[cç]o|price|amazon|cart|carrinho|produto.*site)/.test(lower)) {
    return "shopping";
  }
  // Notion patterns
  if (/(notion\b|task.*notion|nota.*notion|minhas tasks|meus to.?do)/.test(lower)) {
    return "notion";
  }
  // Drive patterns
  if (
    /(drive\b|google drive|arquivo.*drive|encontra.*arquivo|salva.*drive|contrato|documento.*drive)/.test(
      lower,
    )
  ) {
    return "drive";
  }
  // WhatsApp patterns
  if (/(whatsapp|manda.*whats|envia.*whats|zap\b|mensagem.*whats)/.test(lower)) {
    return "whatsapp";
  }
  // Social posting patterns
  if (
    /(posta\b|post.*linkedin|post.*instagram|post.*twitter|agenda.*post|publica\b|social.*media)/.test(
      lower,
    )
  ) {
    return "social";
  }
  // Analytics patterns
  if (/(analytics|tr[aá]fego|traffic|pageview|visit.*site|google analytics|ga4\b)/.test(lower)) {
    return "analytics";
  }
  // Google Ads patterns
  if (/(google ads|an[uú]ncio|campanha.*ads|cpc\b|ad.*perform|meus? an[uú]ncios)/.test(lower)) {
    return "ads";
  }
  // CRM / Airtable patterns
  if (/(lead\b|crm\b|airtable|prospect|pipeline.*vend|funnel|client.*novo)/.test(lower)) {
    return "crm";
  }
  // Slack patterns
  if (/(slack\b|canal.*slack|#\w+|perdi.*slack|responde.*slack)/.test(lower)) {
    return "slack";
  }
  // GitHub patterns
  if (
    /(github\b|pull.?request|pr.*pendente|issue.*cr[ií]tica|ci.*fail|repo\b.*status)/.test(lower)
  ) {
    return "github";
  }
  // Shopify patterns
  if (/(shopify|pedido.*loja|estoque|vendas.*hoje|loja.*online)/.test(lower)) {
    return "shopify";
  }
  // Home Assistant patterns
  if (
    /(luz|luzes|apaga\b|liga.*ar|temperatura.*casa|home.?assistant|\bha\b.*casa|automa[cç][aã]o.*casa)/.test(
      lower,
    )
  ) {
    return "home";
  }

  // Original generic intents

  // Exec patterns
  if (/(exec|run\b|execute|roda\b|terminal|shell|comando|command|abr[ae]|open\s+app)/.test(lower)) {
    return "exec";
  }
  // Research patterns
  if (/(pesquis|search\b|busca\b|find out|look up|investig|googl[aei])/.test(lower)) {
    return "research";
  }
  // Write patterns
  if (/(escrev|write\b|draft\b|redigi|email\b|document|texto|content\b|artigo)/.test(lower)) {
    return "write";
  }
  // Schedule patterns
  if (/(agenda|schedul|remind|lembr|cron\b|timer|alarm|horario)/.test(lower)) {
    return "schedule";
  }
  // Analyze patterns
  if (/(analis|analyz|report\b|relatorio|dashboard|metric|insight|estrateg)/.test(lower)) {
    return "analyze";
  }
  // Browse patterns
  if (/(browse|navega?|screenshot|pagina|website|url|scrape|canvas)/.test(lower)) {
    return "browse";
  }
  // Monitor patterns
  if (/(monitor|watch\b|vigia?|vigil|log\b|observ|track\b|silent)/.test(lower)) {
    return "monitor";
  }

  // Default: no shadow delegation
  return "complex";
}

/** Returns true if the intent should be handled by the SOUL engine instead of a shadow. */
export function isSoulIntent(intent: ShadowIntent): boolean {
  return intent === "soul" || intent.startsWith("soul-");
}

const RANK_ORDER: Rank[] = ["E", "D", "C", "B", "A", "S", "SS", "SSS"];

function rankMeetsRequirement(currentRank: Rank, required: Rank): boolean {
  return RANK_ORDER.indexOf(currentRank) >= RANK_ORDER.indexOf(required);
}

export type OrchestrateResult = {
  delegated: boolean;
  shadow: ShadowDefinition | null;
  intent: ShadowIntent;
  reason: string;
};

/** Determine which shadow (if any) should handle a message. */
export async function orchestrate(message: string, donnaRank: Rank): Promise<OrchestrateResult> {
  const intent = classifyIntent(message);
  let registry: ShadowRegistry;

  try {
    registry = await loadRegistry();
  } catch {
    return {
      delegated: false,
      shadow: null,
      intent,
      reason: "Shadow registry not found",
    };
  }

  const shadow = getShadowByRole(intent, registry);

  if (!shadow) {
    return {
      delegated: false,
      shadow: null,
      intent,
      reason: `No active shadow for intent "${intent}"`,
    };
  }

  if (!rankMeetsRequirement(donnaRank, shadow.rank_required)) {
    return {
      delegated: false,
      shadow,
      intent,
      reason: `Rank ${donnaRank} insufficient for ${shadow.name} (requires ${shadow.rank_required})`,
    };
  }

  return {
    delegated: true,
    shadow,
    intent,
    reason: `Delegated to ${shadow.name} (${shadow.role})`,
  };
}

/** Get a summary of all shadows and their status. */
export async function getShadowArmyStatus(): Promise<string> {
  let registry: ShadowRegistry;
  try {
    registry = await loadRegistry();
  } catch {
    return "Shadow Army: registry not found";
  }

  const lines: string[] = [];
  lines.push(`Shadow Army do Monarca ${registry.monarch}`);
  lines.push("");

  const active = registry.shadows.filter((s) => s.status === "active");
  const locked = registry.shadows.filter((s) => s.status === "locked");

  if (active.length > 0) {
    lines.push(`Sombras ativas (${active.length}):`);
    for (const s of active) {
      lines.push(`  ${s.name} — ${s.role}`);
    }
  }

  if (locked.length > 0) {
    lines.push(`Sombras bloqueadas (${locked.length}):`);
    for (const s of locked) {
      lines.push(`  ${s.name} [Rank ${s.rank_required}] — ${s.role}`);
    }
  }

  return lines.join("\n");
}
