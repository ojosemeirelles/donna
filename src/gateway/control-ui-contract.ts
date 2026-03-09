export const CONTROL_UI_BOOTSTRAP_CONFIG_PATH = "/__donna/control-ui-config.json";

export type ControlUiBootstrapConfig = {
  basePath: string;
  assistantName: string;
  assistantAvatar: string;
  assistantAgentId: string;
  /** Injected only for loopback requests so the UI can auto-connect. */
  loopbackToken?: string;
};
