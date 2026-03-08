/**
 * Donna Desktop — Electron main process entry point.
 *
 * Lifecycle:
 *   1. App ready → open wizard window.
 *   2. After wizard complete → open main window + start gateway.
 *   3. Create tray icon.
 *   4. Register IPC handlers.
 */

import path from "node:path";
import {
  BrowserWindow,
  app,
  ipcMain,
  session,
  shell,
} from "electron";
import { GatewayManager } from "./gateway-manager.js";
import { TrayManager } from "./tray/tray-manager.js";
import {
  createInitialWizardState,
  advanceWizard,
  goBackWizard,
  updateWizardData,
  type WizardState,
  type WizardData,
} from "./wizard/wizard-state.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ASSETS_DIR = path.join(__dirname, "..", "assets");
const PRELOAD_PATH = path.join(__dirname, "preload.js");

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------

// Gateway is initialized after app.whenReady() so we can access app.isPackaged
let gateway: GatewayManager;
let mainWindow: BrowserWindow | null = null;
let wizardWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let wizardState: WizardState = createInitialWizardState();
let isQuiting = false;

// ---------------------------------------------------------------------------
// Window factories
// ---------------------------------------------------------------------------

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 700,
    minHeight: 500,
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  // Strip CSP and X-Frame-Options from gateway responses so Lit/ES modules load
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    // Remove all CSP and framing headers (case-insensitive keys)
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (
        lower === "content-security-policy" ||
        lower === "content-security-policy-report-only" ||
        lower === "x-frame-options"
      ) {
        delete headers[key];
      }
    }
    callback({ responseHeaders: headers });
  });

  void win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  win.once("ready-to-show", () => win.show());

  // Keep app running in tray when window is closed
  win.on("close", (e) => {
    if (!isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  return win;
}

function createWizardWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 640,
    height: 560,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  void win.loadFile(path.join(__dirname, "..", "renderer", "wizard.html"));
  win.once("ready-to-show", () => win.show());

  // Clear reference when the user closes the wizard window (e.g. via the X button)
  win.on("closed", () => {
    wizardWindow = null;
  });

  return win;
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

function registerIpcHandlers(): void {
  // Gateway
  ipcMain.handle("gateway:status", () => gateway.getStatus());
  ipcMain.handle("gateway:start", () => gateway.start());
  ipcMain.handle("gateway:stop", () => gateway.stop());

  // Wizard
  ipcMain.handle("wizard:state", () => wizardState);
  ipcMain.handle("wizard:advance", () => {
    wizardState = advanceWizard(wizardState);
    return wizardState;
  });
  ipcMain.handle("wizard:back", () => {
    wizardState = goBackWizard(wizardState);
    return wizardState;
  });
  ipcMain.handle("wizard:update", (_event: Electron.IpcMainInvokeEvent, patch: Partial<WizardData>) => {
    wizardState = updateWizardData(wizardState, patch);
    return wizardState;
  });
  ipcMain.handle("wizard:complete", async () => {
    // Mark wizard as completed before closing
    wizardState = { ...wizardState, completed: true };

    // Close wizard
    wizardWindow?.close();
    wizardWindow = null;

    // Open main window
    mainWindow = createMainWindow();
    trayManager?.setMainWindow(mainWindow);

    // Start gateway only after wizard is done
    await gateway.start();
  });

  // Telegram token validation — runs in main process to avoid token leak from renderer
  ipcMain.handle("wizard:validate-telegram", async (_event: Electron.IpcMainInvokeEvent, token: string) => {
    if (!token || typeof token !== "string") {
      return { ok: false, error: "Token vazio" };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = (await res.json()) as { ok?: boolean; result?: { username?: string } };
      if (data.ok && data.result?.username) {
        return { ok: true, username: data.result.username };
      }
      return { ok: false, error: "Token não reconhecido pelo Telegram" };
    } catch {
      return { ok: false, error: "Não foi possível verificar (sem internet?)" };
    }
  });

  // App
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("app:open-external", (_event: Electron.IpcMainInvokeEvent, url: string) => {
    if (url.startsWith("https://")) {
      void shell.openExternal(url);
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

void app.whenReady().then(() => {
  console.log("[DONNA-MAIN] whenReady resolved");

  // Initialize gateway — uses shell-based spawn (source nvm + pnpm donna gateway)
  gateway = new GatewayManager({
    port: 18789,
  });

  // Forward gateway status changes to all renderer windows
  gateway.on("status", (status: string) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("gateway:status-changed", status);
    });

    // When gateway is running, navigate main window to gateway web UI
    if (status === "running" && mainWindow && !mainWindow.isDestroyed()) {
      const gatewayUrl = `http://127.0.0.1:${gateway.getPort()}`;
      console.log("[DONNA-MAIN] Gateway running — loading", gatewayUrl);
      void mainWindow.loadURL(gatewayUrl);
    }
  });

  registerIpcHandlers();

  // Create tray immediately so the icon appears in the menu bar on launch
  trayManager = new TrayManager({ assetsDir: ASSETS_DIR, mainWindow: null, gateway });
  trayManager.create();

  // Always open wizard — gateway starts only after wizard completes
  console.log("[DONNA-MAIN] Creating wizard window");
  wizardWindow = createWizardWindow();
  console.log("[DONNA-MAIN] Wizard window created, id:", wizardWindow.id);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  console.log("[DONNA-MAIN] activate event — mainWindow:", !!mainWindow, "wizardWindow:", !!wizardWindow, "wizardCompleted:", wizardState.completed);
  if (mainWindow) {
    mainWindow.show();
  } else if (wizardWindow && !wizardWindow.isDestroyed()) {
    wizardWindow.show();
  } else if (wizardState.completed) {
    // Only create main window if wizard was already completed
    mainWindow = createMainWindow();
  } else {
    // Wizard not yet completed — reopen it
    console.log("[DONNA-MAIN] activate: recreating wizard");
    wizardWindow = createWizardWindow();
  }
});

app.on("before-quit", () => {
  isQuiting = true;
  trayManager?.destroy();
  gateway.stop().catch(() => {});
});
