import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LLMClient, detectProvider, LLMError } from "./llm-client.js";

// ─── detectProvider ───────────────────────────────────────────────────────────

describe("detectProvider", () => {
  it("detects anthropic from claude-*", () => {
    expect(detectProvider("claude-sonnet-4-5")).toBe("anthropic");
    expect(detectProvider("claude-opus-4-5")).toBe("anthropic");
    expect(detectProvider("claude-haiku-3-5")).toBe("anthropic");
  });

  it("detects anthropic from anthropic/*", () => {
    expect(detectProvider("anthropic/claude-sonnet")).toBe("anthropic");
  });

  it("detects google from gemini-*", () => {
    expect(detectProvider("gemini-2.0-flash")).toBe("google");
    expect(detectProvider("gemini-pro")).toBe("google");
  });

  it("detects google from google/*", () => {
    expect(detectProvider("google/gemini-pro")).toBe("google");
  });

  it("detects openai from gpt-*", () => {
    expect(detectProvider("gpt-4o")).toBe("openai");
    expect(detectProvider("gpt-4-turbo")).toBe("openai");
  });

  it("detects openai from o1/o3/o4 models", () => {
    expect(detectProvider("o1-preview")).toBe("openai");
    expect(detectProvider("o3-mini")).toBe("openai");
    expect(detectProvider("o4-mini")).toBe("openai");
  });

  it("detects openai from openai/*", () => {
    expect(detectProvider("openai/gpt-4o")).toBe("openai");
  });

  it("defaults to openrouter for unknown models", () => {
    expect(detectProvider("mistral-large")).toBe("openrouter");
    expect(detectProvider("llama-3-70b")).toBe("openrouter");
    expect(detectProvider("deepseek-v3")).toBe("openrouter");
  });

  it("is case-insensitive", () => {
    expect(detectProvider("Claude-Sonnet-4-5")).toBe("anthropic");
    expect(detectProvider("GPT-4o")).toBe("openai");
    expect(detectProvider("Gemini-Pro")).toBe("google");
  });
});

// ─── LLMClient ────────────────────────────────────────────────────────────────

describe("LLMClient", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("detectProvider delegates to module function", () => {
    const client = new LLMClient();
    expect(client.detectProvider("claude-sonnet-4-5")).toBe("anthropic");
  });

  it("availableProviders returns providers with keys", () => {
    const client = new LLMClient({
      apiKeys: { anthropic: "sk-ant-test", google: "AIzaSy-test" },
    });
    const providers = client.availableProviders();
    expect(providers).toContain("anthropic");
    expect(providers).toContain("google");
    expect(providers).not.toContain("openai");
  });

  it("availableProviders reads from env when no config keys", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const client = new LLMClient();
    expect(client.availableProviders()).toContain("openai");
  });

  it("throws LLMError when no API key available", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const client = new LLMClient({ apiKeys: {} });

    await expect(
      client.call({ model: "claude-sonnet-4-5", messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(LLMError);

    try {
      await client.call({ model: "claude-sonnet-4-5", messages: [{ role: "user", content: "hi" }] });
    } catch (err) {
      expect(err).toBeInstanceOf(LLMError);
      expect((err as LLMError).code).toBe("MISSING_API_KEY");
      expect((err as LLMError).provider).toBe("anthropic");
    }
  });

  it("calls anthropic provider correctly", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        content: [{ text: "Hello from Claude" }],
        model: "claude-sonnet-4-5",
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as unknown as Response);

    const client = new LLMClient({ apiKeys: { anthropic: "sk-ant-test" } });
    const result = await client.call({
      model: "claude-sonnet-4-5",
      system: "You are helpful",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("Hello from Claude");
    expect(result.provider).toBe("anthropic");
    expect(result.usage?.inputTokens).toBe(10);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calls google provider correctly", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Hello from Gemini" }] } }],
        usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 4 },
      }),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as unknown as Response);

    const client = new LLMClient({ apiKeys: { google: "AIzaSy-test" } });
    const result = await client.call({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("Hello from Gemini");
    expect(result.provider).toBe("google");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.anything(),
    );
  });

  it("calls openai provider correctly", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hello from GPT" } }],
        model: "gpt-4o",
        usage: { prompt_tokens: 12, completion_tokens: 3 },
      }),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as unknown as Response);

    const client = new LLMClient({ apiKeys: { openai: "sk-test" } });
    const result = await client.call({
      model: "gpt-4o",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("Hello from GPT");
    expect(result.provider).toBe("openai");
  });

  it("calls openrouter provider correctly", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hello from OpenRouter" } }],
        model: "mistral-large",
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as unknown as Response);

    const client = new LLMClient({ apiKeys: { openrouter: "sk-or-test" } });
    const result = await client.call({
      model: "mistral-large",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("Hello from OpenRouter");
    expect(result.provider).toBe("openrouter");
  });

  it("handles API error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    } as unknown as Response);

    const client = new LLMClient({ apiKeys: { anthropic: "bad-key" } });

    await expect(
      client.call({ model: "claude-sonnet-4-5", messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(LLMError);
  });

  it("respects explicit provider override", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "via openrouter" } }],
        model: "claude-sonnet-4-5",
      }),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as unknown as Response);

    const client = new LLMClient({ apiKeys: { openrouter: "sk-or-test" } });
    const result = await client.call({
      provider: "openrouter",
      model: "claude-sonnet-4-5",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.provider).toBe("openrouter");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("openrouter.ai"),
      expect.anything(),
    );
  });

  it("uses default maxTokens and temperature", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ content: [{ text: "ok" }], model: "claude-sonnet-4-5" }),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse as unknown as Response);

    const client = new LLMClient({ apiKeys: { anthropic: "sk-ant-test" } });
    await client.call({ model: "claude-sonnet-4-5", messages: [{ role: "user", content: "hi" }] });

    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.max_tokens).toBe(2048);
    expect(body.temperature).toBe(0.7);
  });
});
