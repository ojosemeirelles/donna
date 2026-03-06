import type { DonnaPluginApi } from "donna/plugin-sdk/googlechat";
import { emptyPluginConfigSchema } from "donna/plugin-sdk/googlechat";
import { googlechatDock, googlechatPlugin } from "./src/channel.js";
import { setGoogleChatRuntime } from "./src/runtime.js";

const plugin = {
  id: "googlechat",
  name: "Google Chat",
  description: "Donna Google Chat channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: DonnaPluginApi) {
    setGoogleChatRuntime(api.runtime);
    api.registerChannel({ plugin: googlechatPlugin, dock: googlechatDock });
  },
};

export default plugin;
