import type { PluginRuntime } from "donna/plugin-sdk/irc";

let runtime: PluginRuntime | null = null;

export function setIrcRuntime(next: PluginRuntime) {
  runtime = next;
}

export function getIrcRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("IRC runtime not initialized");
  }
  return runtime;
}
