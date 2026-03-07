/**
 * Preload script — runs in renderer process with Node.js access.
 * Exposes a typed bridge (contextBridge) between main and renderer.
 */

import { contextBridge, ipcRenderer } from "electron";
import type { GatewayStatus } from "./gateway-manager.js";
import type { WizardData, WizardState } from "./wizard/wizard-state.js";

export type DonnaAPI = {
  // Gateway
  gateway: {
    getStatus: () => Promise<GatewayStatus>;
    start: () => Promise<void>;
    stop: () => Promise<void>;
    onStatusChange: (cb: (status: GatewayStatus) => void) => () => void;
  };
  // Wizard
  wizard: {
    getState: () => Promise<WizardState>;
    advance: () => Promise<WizardState>;
    back: () => Promise<WizardState>;
    updateData: (patch: Partial<WizardData>) => Promise<WizardState>;
    complete: () => Promise<void>;
  };
  // App
  app: {
    getVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
  };
};

contextBridge.exposeInMainWorld("donna", {
  gateway: {
    getStatus: () => ipcRenderer.invoke("gateway:status"),
    start: () => ipcRenderer.invoke("gateway:start"),
    stop: () => ipcRenderer.invoke("gateway:stop"),
    onStatusChange: (cb: (status: GatewayStatus) => void) => {
      const listener = (_: Electron.IpcRendererEvent, status: GatewayStatus) => cb(status);
      ipcRenderer.on("gateway:status-changed", listener);
      return () => ipcRenderer.off("gateway:status-changed", listener);
    },
  },
  wizard: {
    getState: () => ipcRenderer.invoke("wizard:state"),
    advance: () => ipcRenderer.invoke("wizard:advance"),
    back: () => ipcRenderer.invoke("wizard:back"),
    updateData: (patch: Partial<WizardData>) => ipcRenderer.invoke("wizard:update", patch),
    complete: () => ipcRenderer.invoke("wizard:complete"),
  },
  app: {
    getVersion: () => ipcRenderer.invoke("app:version"),
    openExternal: (url: string) => ipcRenderer.invoke("app:open-external", url),
  },
} satisfies DonnaAPI);
