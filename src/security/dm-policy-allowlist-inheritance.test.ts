import { describe, expect, it, vi } from "vitest";
import {
  readStoreAllowFromForDmPolicy,
  resolveDmAllowState,
  resolveDmGroupAccessDecision,
} from "./dm-policy-shared.js";

// ---------------------------------------------------------------------------
// readStoreAllowFromForDmPolicy — store gate by dmPolicy
// ---------------------------------------------------------------------------
describe("readStoreAllowFromForDmPolicy", () => {
  const readStore = vi.fn().mockResolvedValue(["paired-user"]);

  it("reads the store for dmPolicy=pairing", async () => {
    const result = await readStoreAllowFromForDmPolicy({
      provider: "telegram",
      accountId: "acc1",
      dmPolicy: "pairing",
      readStore,
    });
    expect(result).toEqual(["paired-user"]);
    expect(readStore).toHaveBeenCalled();
  });

  it("reads the store when dmPolicy is omitted (legacy path)", async () => {
    readStore.mockClear();
    const result = await readStoreAllowFromForDmPolicy({
      provider: "telegram",
      accountId: "acc1",
      readStore,
    });
    expect(result).toEqual(["paired-user"]);
    expect(readStore).toHaveBeenCalled();
  });

  it("skips the store for dmPolicy=allowlist", async () => {
    readStore.mockClear();
    const result = await readStoreAllowFromForDmPolicy({
      provider: "telegram",
      accountId: "acc1",
      dmPolicy: "allowlist",
      readStore,
    });
    expect(result).toEqual([]);
    expect(readStore).not.toHaveBeenCalled();
  });

  it("skips the store for dmPolicy=disabled", async () => {
    readStore.mockClear();
    const result = await readStoreAllowFromForDmPolicy({
      provider: "telegram",
      accountId: "acc1",
      dmPolicy: "disabled",
      readStore,
    });
    expect(result).toEqual([]);
    expect(readStore).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resolveDmAllowState — dmPolicy gates store reads via the inherited logic
// ---------------------------------------------------------------------------
describe("resolveDmAllowState — dmPolicy inheritance", () => {
  const storeUser = "store-user";
  const configUser = "config-user";
  const readStore = vi.fn().mockResolvedValue([storeUser]);

  it("includes store entries for dmPolicy=pairing", async () => {
    const result = await resolveDmAllowState({
      provider: "telegram",
      accountId: "acc1",
      dmPolicy: "pairing",
      allowFrom: [configUser],
      readStore,
    });
    // Both config and store entries contribute to the count
    expect(result.allowCount).toBe(2);
  });

  it("excludes store entries for dmPolicy=allowlist", async () => {
    readStore.mockClear();
    const result = await resolveDmAllowState({
      provider: "telegram",
      accountId: "acc1",
      dmPolicy: "allowlist",
      allowFrom: [configUser],
      readStore,
    });
    // Store is not consulted; only the config entry counts
    expect(result.allowCount).toBe(1);
    expect(readStore).not.toHaveBeenCalled();
  });

  it("excludes store entries for dmPolicy=disabled", async () => {
    readStore.mockClear();
    const result = await resolveDmAllowState({
      provider: "telegram",
      accountId: "acc1",
      dmPolicy: "disabled",
      allowFrom: [],
      readStore,
    });
    expect(result.allowCount).toBe(0);
    expect(readStore).not.toHaveBeenCalled();
  });

  it("returns zero allowCount for allowlist with empty allowFrom (triggers doctor warning)", async () => {
    readStore.mockClear();
    const result = await resolveDmAllowState({
      provider: "slack",
      accountId: "acc2",
      dmPolicy: "allowlist",
      allowFrom: [],
      readStore,
    });
    expect(result.allowCount).toBe(0);
    expect(result.isMultiUserDm).toBe(false);
    expect(readStore).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resolveDmGroupAccessDecision — allowlist policy blocks non-listed senders
// ---------------------------------------------------------------------------
describe("resolveDmGroupAccessDecision — allowlist enforcement", () => {
  const allowedSender = ["alice"];
  const isSenderAllowed = (list: string[]) => list.includes("alice");
  const isSenderNotAllowed = () => false;

  it("allows DM for a sender on the allowlist", () => {
    const result = resolveDmGroupAccessDecision({
      isGroup: false,
      dmPolicy: "allowlist",
      effectiveAllowFrom: allowedSender,
      effectiveGroupAllowFrom: [],
      isSenderAllowed,
    });
    expect(result.decision).toBe("allow");
    expect(result.reasonCode).toBe("dm_policy_allowlisted");
  });

  it("blocks DM for a sender NOT on the allowlist (no pairing code)", () => {
    const result = resolveDmGroupAccessDecision({
      isGroup: false,
      dmPolicy: "allowlist",
      effectiveAllowFrom: allowedSender,
      effectiveGroupAllowFrom: [],
      isSenderAllowed: isSenderNotAllowed,
    });
    // Must be "block", not "pairing" — allowlist never issues pairing codes
    expect(result.decision).toBe("block");
    expect(result.reasonCode).toBe("dm_policy_not_allowlisted");
  });

  it("blocks DM for dmPolicy=disabled regardless of allowlist", () => {
    const result = resolveDmGroupAccessDecision({
      isGroup: false,
      dmPolicy: "disabled",
      effectiveAllowFrom: allowedSender,
      effectiveGroupAllowFrom: [],
      isSenderAllowed,
    });
    expect(result.decision).toBe("block");
    expect(result.reasonCode).toBe("dm_policy_disabled");
  });

  it("returns pairing decision only for dmPolicy=pairing with non-listed sender", () => {
    const result = resolveDmGroupAccessDecision({
      isGroup: false,
      dmPolicy: "pairing",
      effectiveAllowFrom: allowedSender,
      effectiveGroupAllowFrom: [],
      isSenderAllowed: isSenderNotAllowed,
    });
    expect(result.decision).toBe("pairing");
    expect(result.reasonCode).toBe("dm_policy_pairing_required");
  });

  it("allows open policy regardless of allowFrom", () => {
    const result = resolveDmGroupAccessDecision({
      isGroup: false,
      dmPolicy: "open",
      effectiveAllowFrom: [],
      effectiveGroupAllowFrom: [],
      isSenderAllowed: isSenderNotAllowed,
    });
    expect(result.decision).toBe("allow");
    expect(result.reasonCode).toBe("dm_policy_open");
  });
});
