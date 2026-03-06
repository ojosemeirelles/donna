import type { DonnaPluginApi } from "donna/plugin-sdk/synology-chat";
import { emptyPluginConfigSchema } from "donna/plugin-sdk/synology-chat";
import { createSynologyChatPlugin } from "./src/channel.js";
import { setSynologyRuntime } from "./src/runtime.js";

const plugin = {
  id: "synology-chat",
  name: "Synology Chat",
  description: "Native Synology Chat channel plugin for Donna",
  configSchema: emptyPluginConfigSchema(),
  register(api: DonnaPluginApi) {
    setSynologyRuntime(api.runtime);
    api.registerChannel({ plugin: createSynologyChatPlugin() });
  },
};

export default plugin;
