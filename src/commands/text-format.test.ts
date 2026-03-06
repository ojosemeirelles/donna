import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("donna", 16)).toBe("donna");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("donna-status-output", 10)).toBe("donna-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});
