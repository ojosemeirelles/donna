/**
 * Donna Desktop — Electron main process entry point.
 *
 * Lifecycle:
 *   1. App ready → check if setup wizard needed.
 *   2. If wizard needed → open wizard window.
 *   3. After wizard complete → open main window + create tray.
 *   4. Start GatewayManager.
 *   5. Register IPC handlers.
 */

import path from "node:path";
import {
  BrowserWindow,
  app,
  ipcMain,
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

const gateway = new GatewayManager({ port: 18789 });
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
    },
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
    height: 520,
    resizable: false,
    center: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void win.loadFile(path.join(__dirname, "..", "renderer", "wizard.html"));
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
  ipcMain.handle("wizard:complete", () => {
    wizardWindow?.close();
    wizardWindow = null;
    mainWindow = createMainWindow();
    // Update tray to reference the now-created main window
    trayManager?.setMainWindow(mainWindow);
  });

  // App
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("app:open-external", (_event: Electron.IpcMainInvokeEvent, url: string) => {
    if (url.startsWith("https://")) {
      void shell.openExternal(url);
    }
  });
}

// Forward gateway status changes to all renderer windows
gateway.on("status", (status: string) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("gateway:status-changed", status);
  });
});

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

void app.whenReady().then(async () => {
  registerIpcHandlers();

  // Create tray immediately so the icon appears in the menu bar on launch
  trayManager = new TrayManager({ assetsDir: ASSETS_DIR, mainWindow: null, gateway });
  trayManager.create();

  // Open wizard on first launch; skip if already configured
  wizardWindow = createWizardWindow();

  await gateway.start();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
  } else if (!wizardWindow) {
    mainWindow = createMainWindow();
  }
});

app.on("before-quit", () => {
  isQuiting = true;
  trayManager?.destroy();
  gateway.stop().catch(() => {});
});
