import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#donna",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#donna",
      rawTarget: "#donna",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "donna-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "donna-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "donna-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "donna-bot",
      rawTarget: "donna-bot",
    });
  });
});
