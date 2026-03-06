import type {
  AnyAgentTool,
  DonnaPluginApi,
  DonnaPluginToolFactory,
} from "donna/plugin-sdk/lobster";
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: DonnaPluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as DonnaPluginToolFactory,
    { optional: true },
  );
}
