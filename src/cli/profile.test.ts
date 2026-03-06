import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs(["node", "donna", "gateway", "--dev", "--allow-unconfigured"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "donna", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "donna", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "donna", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "donna", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "donna", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "donna", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "donna", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "donna", "--profile", "work", "--dev", "status"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".donna-dev");
    expect(env.DONNA_PROFILE).toBe("dev");
    expect(env.DONNA_STATE_DIR).toBe(expectedStateDir);
    expect(env.DONNA_CONFIG_PATH).toBe(path.join(expectedStateDir, "donna.json"));
    expect(env.DONNA_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      DONNA_STATE_DIR: "/custom",
      DONNA_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.DONNA_STATE_DIR).toBe("/custom");
    expect(env.DONNA_GATEWAY_PORT).toBe("19099");
    expect(env.DONNA_CONFIG_PATH).toBe(path.join("/custom", "donna.json"));
  });

  it("uses DONNA_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      DONNA_HOME: "/srv/donna-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/donna-home");
    expect(env.DONNA_STATE_DIR).toBe(path.join(resolvedHome, ".donna-work"));
    expect(env.DONNA_CONFIG_PATH).toBe(path.join(resolvedHome, ".donna-work", "donna.json"));
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "donna doctor --fix",
      env: {},
      expected: "donna doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "donna doctor --fix",
      env: { DONNA_PROFILE: "default" },
      expected: "donna doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "donna doctor --fix",
      env: { DONNA_PROFILE: "Default" },
      expected: "donna doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "donna doctor --fix",
      env: { DONNA_PROFILE: "bad profile" },
      expected: "donna doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "donna --profile work doctor --fix",
      env: { DONNA_PROFILE: "work" },
      expected: "donna --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "donna --dev doctor",
      env: { DONNA_PROFILE: "dev" },
      expected: "donna --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("donna doctor --fix", { DONNA_PROFILE: "work" })).toBe(
      "donna --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("donna doctor --fix", { DONNA_PROFILE: "  jbdonna  " })).toBe(
      "donna --profile jbdonna doctor --fix",
    );
  });

  it("handles command with no args after donna", () => {
    expect(formatCliCommand("donna", { DONNA_PROFILE: "test" })).toBe("donna --profile test");
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm donna doctor", { DONNA_PROFILE: "work" })).toBe(
      "pnpm donna --profile work doctor",
    );
  });
});
