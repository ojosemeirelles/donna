import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-donna writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.donna.mac"
let gatewayLaunchdLabel = "ai.donna.gateway"
let onboardingVersionKey = "donna.onboardingVersion"
let onboardingSeenKey = "donna.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "donna.pauseEnabled"
let iconAnimationsEnabledKey = "donna.iconAnimationsEnabled"
let swabbleEnabledKey = "donna.swabbleEnabled"
let swabbleTriggersKey = "donna.swabbleTriggers"
let voiceWakeTriggerChimeKey = "donna.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "donna.voiceWakeSendChime"
let showDockIconKey = "donna.showDockIcon"
let defaultVoiceWakeTriggers = ["donna"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "donna.voiceWakeMicID"
let voiceWakeMicNameKey = "donna.voiceWakeMicName"
let voiceWakeLocaleKey = "donna.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "donna.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "donna.voicePushToTalkEnabled"
let talkEnabledKey = "donna.talkEnabled"
let iconOverrideKey = "donna.iconOverride"
let connectionModeKey = "donna.connectionMode"
let remoteTargetKey = "donna.remoteTarget"
let remoteIdentityKey = "donna.remoteIdentity"
let remoteProjectRootKey = "donna.remoteProjectRoot"
let remoteCliPathKey = "donna.remoteCliPath"
let canvasEnabledKey = "donna.canvasEnabled"
let cameraEnabledKey = "donna.cameraEnabled"
let systemRunPolicyKey = "donna.systemRunPolicy"
let systemRunAllowlistKey = "donna.systemRunAllowlist"
let systemRunEnabledKey = "donna.systemRunEnabled"
let locationModeKey = "donna.locationMode"
let locationPreciseKey = "donna.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "donna.peekabooBridgeEnabled"
let deepLinkKeyKey = "donna.deepLinkKey"
let modelCatalogPathKey = "donna.modelCatalogPath"
let modelCatalogReloadKey = "donna.modelCatalogReload"
let cliInstallPromptedVersionKey = "donna.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "donna.heartbeatsEnabled"
let debugPaneEnabledKey = "donna.debugPaneEnabled"
let debugFileLogEnabledKey = "donna.debug.fileLogEnabled"
let appLogLevelKey = "donna.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
