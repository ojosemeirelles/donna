import { vi } from "vitest";
import { installChromeUserDataDirHooks } from "./chrome-user-data-dir.test-harness.js";

const chromeUserDataDir = { dir: "/tmp/donna" };
installChromeUserDataDirHooks(chromeUserDataDir);

vi.mock("./chrome.js", () => ({
  isChromeCdpReady: vi.fn(async () => true),
  isChromeReachable: vi.fn(async () => true),
  launchDonnaChrome: vi.fn(async () => {
    throw new Error("unexpected launch");
  }),
  resolveDonnaUserDataDir: vi.fn(() => chromeUserDataDir.dir),
  stopDonnaChrome: vi.fn(async () => {}),
}));
