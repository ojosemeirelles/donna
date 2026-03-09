/**
 * LLMClient — Unified multi-provider wrapper for executing squad agents.
 *
 * Providers: Anthropic (Claude), Google (Gemini), OpenAI (GPT), OpenRouter.
 * All calls use fetch — no SDK dependency.
 */

import { getLogger } from "../logging/logger.js";

const log = getLogger();

// ─── Types ────────────────────────────────────────────────────────────────────

export type LLMProvider = "anthropic" | "google" | "openai" | "openrouter";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMCallOptions {
  provider?: LLMProvider;
  model: string;
  system?: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMClientConfig {
  defaultProvider?: LLMProvider;
  apiKeys?: {
    anthropic?: string;
    google?: string;
    openai?: string;
    openrouter?: string;
  };
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class LLMError extends Error {
  code: string;
  provider: LLMProvider;
  statusCode?: number;

  constructor(message: string, code: string, provider: LLMProvider, statusCode?: number) {
    super(message);
    this.name = "LLMError";
    this.code = code;
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

// ─── Provider Detection ───────────────────────────────────────────────────────

/**
 * Detects the LLM provider from a model name string.
 *
 * - claude-* or anthropic/* → 'anthropic'
 * - gemini-* or google/*    → 'google'
 * - gpt-* or openai/*       → 'openai'
 * - anything else            → 'openrouter'
 */
export function detectProvider(model: string): LLMProvider {
  const m = model.toLowerCase();
  if (m.startsWith("claude") || m.startsWith("anthropic/")) {
    return "anthropic";
  }
  if (m.startsWith("gemini") || m.startsWith("google/")) {
    return "google";
  }
  if (
    m.startsWith("gpt") ||
    m.startsWith("openai/") ||
    m.startsWith("o1") ||
    m.startsWith("o3") ||
    m.startsWith("o4")
  ) {
    return "openai";
  }
  return "openrouter";
}

// ─── Provider Endpoints ───────────────────────────────────────────────────────

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const GOOGLE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─── Provider Callers ─────────────────────────────────────────────────────────

async function callAnthropic(apiKey: string, options: LLMCallOptions): Promise<LLMResponse> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new LLMError(
      `Anthropic API error: ${res.status} — ${body}`,
      "ANTHROPIC_API_ERROR",
      "anthropic",
      res.status,
    );
  }

  const data = (await res.json()) as {
    content: Array<{ text: string }>;
    model: string;
    usage?: { input_tokens: number; output_tokens: number };
  };

  return {
    content: data.content.map((c) => c.text).join(""),
    model: data.model,
    provider: "anthropic",
    usage: data.usage
      ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
      : undefined,
  };
}

async function callGoogle(apiKey: string, options: LLMCallOptions): Promise<LLMResponse> {
  const url = `${GOOGLE_URL}/${options.model}:generateContent?key=${apiKey}`;

  // Gemini uses contents array; system prompt goes as first user message
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (options.system) {
    contents.push({ role: "user", parts: [{ text: options.system }] });
    contents.push({ role: "model", parts: [{ text: "Entendido. Estou pronto." }] });
  }

  for (const msg of options.messages) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new LLMError(
      `Google API error: ${res.status} — ${body}`,
      "GOOGLE_API_ERROR",
      "google",
      res.status,
    );
  }

  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";

  return {
    content: text,
    model: options.model,
    provider: "google",
    usage: data.usageMetadata
      ? {
          inputTokens: data.usageMetadata.promptTokenCount,
          outputTokens: data.usageMetadata.candidatesTokenCount,
        }
      : undefined,
  };
}

async function callOpenAICompatible(
  apiKey: string,
  options: LLMCallOptions,
  provider: "openai" | "openrouter",
): Promise<LLMResponse> {
  const url = provider === "openai" ? OPENAI_URL : OPENROUTER_URL;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://donna.nova";
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) {
    messages.push({ role: "system", content: options.system });
  }
  for (const msg of options.messages) {
    messages.push({ role: msg.role, content: msg.content });
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: options.model,
      messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new LLMError(
      `${provider} API error: ${res.status} — ${body}`,
      `${provider.toUpperCase()}_API_ERROR`,
      provider,
      res.status,
    );
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    content: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? options.model,
    provider,
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined,
  };
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export class LLMClient {
  private readonly config: LLMClientConfig;

  constructor(config?: LLMClientConfig) {
    this.config = config ?? {};
  }

  detectProvider(model: string): LLMProvider {
    return detectProvider(model);
  }

  availableProviders(): LLMProvider[] {
    const keys = this.resolveKeys();
    const providers: LLMProvider[] = [];
    if (keys.anthropic) {
      providers.push("anthropic");
    }
    if (keys.google) {
      providers.push("google");
    }
    if (keys.openai) {
      providers.push("openai");
    }
    if (keys.openrouter) {
      providers.push("openrouter");
    }
    return providers;
  }

  async call(options: LLMCallOptions): Promise<LLMResponse> {
    const provider =
      options.provider ?? this.config.defaultProvider ?? detectProvider(options.model);
    const keys = this.resolveKeys();
    const apiKey = keys[provider];

    if (!apiKey) {
      throw new LLMError(
        `No API key configured for provider "${provider}". Set the corresponding environment variable or pass it in config.`,
        "MISSING_API_KEY",
        provider,
      );
    }

    log.debug(`[squads/llm] Calling ${provider}/${options.model}`);

    switch (provider) {
      case "anthropic":
        return callAnthropic(apiKey, options);
      case "google":
        return callGoogle(apiKey, options);
      case "openai":
        return callOpenAICompatible(apiKey, options, "openai");
      case "openrouter":
        return callOpenAICompatible(apiKey, options, "openrouter");
      default:
        throw new LLMError(`Unknown provider: ${provider}`, "UNKNOWN_PROVIDER", provider);
    }
  }

  private resolveKeys(): Record<LLMProvider, string | undefined> {
    return {
      anthropic: this.config.apiKeys?.anthropic ?? process.env.ANTHROPIC_API_KEY,
      google: this.config.apiKeys?.google ?? process.env.GEMINI_API_KEY,
      openai: this.config.apiKeys?.openai ?? process.env.OPENAI_API_KEY,
      openrouter: this.config.apiKeys?.openrouter ?? process.env.OPENROUTER_API_KEY,
    };
  }
}
