/**
 * TrayManager — system tray icon with gateway status menu.
 *
 * Manages the Tray instance, its context menu, and responds to
 * GatewayManager status updates.
 */

import path from "node:path";
import { type BrowserWindow, Menu, Tray, app, nativeImage, shell } from "electron";
import type { GatewayManager, GatewayStatus } from "../gateway-manager.js";

export type TrayManagerOptions = {
  /** Path to the assets directory. */
  assetsDir: string;
  /** Reference to the main browser window for show/hide (can be set later). */
  mainWindow: BrowserWindow | null;
  /** GatewayManager instance for status display and controls. */
  gateway: GatewayManager;
};

const ICON_FILE = "tray-icon.png";
const ICON_FILE_2X = "tray-icon@2x.png";

/** Returns the human-readable label for a gateway status. */
export function statusLabel(status: GatewayStatus): string {
  switch (status) {
    case "idle": {
      return "⏸ Donna — não iniciada";
    }
    case "starting": {
      return "⏳ Donna — iniciando…";
    }
    case "running": {
      return "🟢 Donna — online";
    }
    case "stopped": {
      return "🔴 Donna — parada";
    }
    case "error": {
      return "❌ Donna — erro";
    }
    default: {
      return "Donna";
    }
  }
}

/** Returns the tooltip string for the tray icon. */
export function buildTrayTooltip(status: GatewayStatus, port: number): string {
  return `Donna Gateway (porta ${port}) — ${status}`;
}

/**
 * TrayManager — manages the system tray icon and menu.
 */
export class TrayManager {
  private tray: Tray | null = null;
  private options: TrayManagerOptions;

  constructor(options: TrayManagerOptions) {
    this.options = options;
  }

  /** Updates the main window reference after wizard completion. */
  setMainWindow(win: BrowserWindow): void {
    this.options = { ...this.options, mainWindow: win };
  }

  /** Creates and shows the tray icon. Call once after app is ready. */
  create(): void {
    const icon1x = path.join(this.options.assetsDir, ICON_FILE);
    const icon2x = path.join(this.options.assetsDir, ICON_FILE_2X);
    // Build a nativeImage with @1x and @2x representations for Retina displays
    const img = nativeImage.createFromPath(icon1x);
    try {
      const img2x = nativeImage.createFromPath(icon2x);
      if (!img2x.isEmpty()) {
        img.addRepresentation({ scaleFactor: 2.0, ...img2x.getSize(), buffer: img2x.toBitmap() });
      }
    } catch { /* ignore — @2x is optional */ }
    this.tray = new Tray(img);
    this.tray.setToolTip(
      buildTrayTooltip(this.options.gateway.getStatus(), this.options.gateway.getPort()),
    );

    this._rebuildMenu();

    // Update menu on gateway status changes
    this.options.gateway.on("status", () => {
      this._rebuildMenu();
      this.tray?.setToolTip(
        buildTrayTooltip(this.options.gateway.getStatus(), this.options.gateway.getPort()),
      );
    });

    // Show main window on tray click (macOS double-click, Windows single-click)
    this.tray.on("click", () => {
      this._showMainWindow();
    });
    this.tray.on("double-click", () => {
      this._showMainWindow();
    });
  }

  /** Destroys the tray icon. Call on app quit. */
  destroy(): void {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
    }
    this.tray = null;
  }

  private _showMainWindow(): void {
    const win = this.options.mainWindow;
    if (!win) {return;}
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.focus();
  }

  private _rebuildMenu(): void {
    const gateway = this.options.gateway;
    const status = gateway.getStatus();
    const isRunning = status === "running";
    const isStarting = status === "starting";

    const menu = Menu.buildFromTemplate([
      { label: statusLabel(status), enabled: false },
      { type: "separator" },
      {
        label: "Mostrar Donna",
        click: () => this._showMainWindow(),
      },
      { type: "separator" },
      {
        label: isRunning || isStarting ? "Parar gateway" : "Iniciar gateway",
        click: async () => {
          if (isRunning || isStarting) {
            await gateway.stop();
          } else {
            await gateway.start();
          }
        },
      },
      { type: "separator" },
      {
        label: "Abrir docs",
        click: () => shell.openExternal("https://docs.donna.ai"),
      },
      { type: "separator" },
      {
        label: "Sair",
        click: () => app.quit(),
      },
    ]);

    this.tray?.setContextMenu(menu);
  }
}
