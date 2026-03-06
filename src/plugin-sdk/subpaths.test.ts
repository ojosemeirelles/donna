import * as compatSdk from "donna/plugin-sdk/compat";
import * as discordSdk from "donna/plugin-sdk/discord";
import * as imessageSdk from "donna/plugin-sdk/imessage";
import * as lineSdk from "donna/plugin-sdk/line";
import * as msteamsSdk from "donna/plugin-sdk/msteams";
import * as signalSdk from "donna/plugin-sdk/signal";
import * as slackSdk from "donna/plugin-sdk/slack";
import * as whatsappSdk from "donna/plugin-sdk/whatsapp";
import { describe, expect, it } from "vitest";

const bundledExtensionSubpathLoaders = [
  { id: "acpx", load: () => import("donna/plugin-sdk/acpx") },
  { id: "bluebubbles", load: () => import("donna/plugin-sdk/bluebubbles") },
  { id: "copilot-proxy", load: () => import("donna/plugin-sdk/copilot-proxy") },
  { id: "device-pair", load: () => import("donna/plugin-sdk/device-pair") },
  { id: "diagnostics-otel", load: () => import("donna/plugin-sdk/diagnostics-otel") },
  { id: "diffs", load: () => import("donna/plugin-sdk/diffs") },
  { id: "feishu", load: () => import("donna/plugin-sdk/feishu") },
  {
    id: "google-gemini-cli-auth",
    load: () => import("donna/plugin-sdk/google-gemini-cli-auth"),
  },
  { id: "googlechat", load: () => import("donna/plugin-sdk/googlechat") },
  { id: "irc", load: () => import("donna/plugin-sdk/irc") },
  { id: "llm-task", load: () => import("donna/plugin-sdk/llm-task") },
  { id: "lobster", load: () => import("donna/plugin-sdk/lobster") },
  { id: "matrix", load: () => import("donna/plugin-sdk/matrix") },
  { id: "mattermost", load: () => import("donna/plugin-sdk/mattermost") },
  { id: "memory-core", load: () => import("donna/plugin-sdk/memory-core") },
  { id: "memory-lancedb", load: () => import("donna/plugin-sdk/memory-lancedb") },
  {
    id: "minimax-portal-auth",
    load: () => import("donna/plugin-sdk/minimax-portal-auth"),
  },
  { id: "nextcloud-talk", load: () => import("donna/plugin-sdk/nextcloud-talk") },
  { id: "nostr", load: () => import("donna/plugin-sdk/nostr") },
  { id: "open-prose", load: () => import("donna/plugin-sdk/open-prose") },
  { id: "phone-control", load: () => import("donna/plugin-sdk/phone-control") },
  { id: "qwen-portal-auth", load: () => import("donna/plugin-sdk/qwen-portal-auth") },
  { id: "synology-chat", load: () => import("donna/plugin-sdk/synology-chat") },
  { id: "talk-voice", load: () => import("donna/plugin-sdk/talk-voice") },
  { id: "test-utils", load: () => import("donna/plugin-sdk/test-utils") },
  { id: "thread-ownership", load: () => import("donna/plugin-sdk/thread-ownership") },
  { id: "tlon", load: () => import("donna/plugin-sdk/tlon") },
  { id: "twitch", load: () => import("donna/plugin-sdk/twitch") },
  { id: "voice-call", load: () => import("donna/plugin-sdk/voice-call") },
  { id: "zalo", load: () => import("donna/plugin-sdk/zalo") },
  { id: "zalouser", load: () => import("donna/plugin-sdk/zalouser") },
] as const;

describe("plugin-sdk subpath exports", () => {
  it("exports compat helpers", () => {
    expect(typeof compatSdk.emptyPluginConfigSchema).toBe("function");
    expect(typeof compatSdk.resolveControlCommandGate).toBe("function");
  });

  it("exports Discord helpers", () => {
    expect(typeof discordSdk.resolveDiscordAccount).toBe("function");
    expect(typeof discordSdk.discordOnboardingAdapter).toBe("object");
  });

  it("exports Slack helpers", () => {
    expect(typeof slackSdk.resolveSlackAccount).toBe("function");
    expect(typeof slackSdk.handleSlackMessageAction).toBe("function");
  });

  it("exports Signal helpers", () => {
    expect(typeof signalSdk.resolveSignalAccount).toBe("function");
    expect(typeof signalSdk.signalOnboardingAdapter).toBe("object");
  });

  it("exports iMessage helpers", () => {
    expect(typeof imessageSdk.resolveIMessageAccount).toBe("function");
    expect(typeof imessageSdk.imessageOnboardingAdapter).toBe("object");
  });

  it("exports WhatsApp helpers", () => {
    expect(typeof whatsappSdk.resolveWhatsAppAccount).toBe("function");
    expect(typeof whatsappSdk.whatsappOnboardingAdapter).toBe("object");
  });

  it("exports LINE helpers", () => {
    expect(typeof lineSdk.processLineMessage).toBe("function");
    expect(typeof lineSdk.createInfoCard).toBe("function");
  });

  it("exports Microsoft Teams helpers", () => {
    expect(typeof msteamsSdk.resolveControlCommandGate).toBe("function");
    expect(typeof msteamsSdk.loadOutboundMediaFromUrl).toBe("function");
  });

  it("resolves bundled extension subpaths", async () => {
    for (const { id, load } of bundledExtensionSubpathLoaders) {
      const mod = await load();
      expect(typeof mod).toBe("object");
      expect(mod, `subpath ${id} should resolve`).toBeTruthy();
    }
  });
});
