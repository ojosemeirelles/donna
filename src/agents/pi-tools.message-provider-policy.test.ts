import { describe, expect, it } from "vitest";
import { createDonnaCodingTools } from "./pi-tools.js";

describe("createDonnaCodingTools message provider policy", () => {
  it.each(["voice", "VOICE", " Voice "])(
    "does not expose tts tool for normalized voice provider: %s",
    (messageProvider) => {
      const tools = createDonnaCodingTools({ messageProvider });
      const names = new Set(tools.map((tool) => tool.name));
      expect(names.has("tts")).toBe(false);
    },
  );

  it("keeps tts tool for non-voice providers", () => {
    const tools = createDonnaCodingTools({ messageProvider: "discord" });
    const names = new Set(tools.map((tool) => tool.name));
    expect(names.has("tts")).toBe(true);
  });
});
