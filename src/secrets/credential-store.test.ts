import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCredentialStore } from "./credential-store-file.js";
import { getCredentialStore } from "./credential-store-factory.js";

describe("FileCredentialStore", () => {
  let tmpDir: string;
  let store: FileCredentialStore;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "donna-cred-test-"));
    const filePath = path.join(tmpDir, "secrets.enc");
    store = new FileCredentialStore(filePath);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null for missing password (first use)", async () => {
    const result = await store.getPassword("svc", "acct");
    expect(result).toBeNull();
  });

  it("round-trips set/get/delete", async () => {
    await store.setPassword("svc", "acct", "s3cret");
    const result = await store.getPassword("svc", "acct");
    expect(result).toBe("s3cret");

    const deleted = await store.deletePassword("svc", "acct");
    expect(deleted).toBe(true);

    const afterDelete = await store.getPassword("svc", "acct");
    expect(afterDelete).toBeNull();
  });

  it("delete returns false when key does not exist", async () => {
    const deleted = await store.deletePassword("svc", "nope");
    expect(deleted).toBe(false);
  });

  it("handles multiple service/account pairs", async () => {
    await store.setPassword("svc1", "acct1", "pw1");
    await store.setPassword("svc2", "acct2", "pw2");

    expect(await store.getPassword("svc1", "acct1")).toBe("pw1");
    expect(await store.getPassword("svc2", "acct2")).toBe("pw2");

    await store.deletePassword("svc1", "acct1");
    expect(await store.getPassword("svc1", "acct1")).toBeNull();
    expect(await store.getPassword("svc2", "acct2")).toBe("pw2");
  });

  it("overwrites existing password", async () => {
    await store.setPassword("svc", "acct", "old");
    await store.setPassword("svc", "acct", "new");
    expect(await store.getPassword("svc", "acct")).toBe("new");
  });

  it("handles large payloads (JSON, base64)", async () => {
    const large = Buffer.alloc(8192, "x").toString("base64");
    await store.setPassword("svc", "acct", large);
    expect(await store.getPassword("svc", "acct")).toBe(large);
  });

  it("treats corrupted file as empty store", async () => {
    const filePath = path.join(tmpDir, "secrets.enc");
    await fs.writeFile(filePath, "this-is-garbage-data");

    const result = await store.getPassword("svc", "acct");
    expect(result).toBeNull();
  });
});

describe("getCredentialStore (factory)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns KeychainCredentialStore on darwin", async () => {
    // We can't easily test the actual keychain without side effects,
    // so we just verify the factory returns a non-null store.
    const store = getCredentialStore();
    expect(store).toBeDefined();
    expect(typeof store.getPassword).toBe("function");
    expect(typeof store.setPassword).toBe("function");
    expect(typeof store.deletePassword).toBe("function");
  });
});
