/**
 * notarize.js — macOS notarization script for electron-builder afterSign hook.
 *
 * Requires environment variables:
 *   APPLE_ID            — your Apple ID email
 *   APPLE_APP_SPECIFIC_PASSWORD — app-specific password from appleid.apple.com
 *   APPLE_TEAM_ID       — your Apple Developer Team ID
 *
 * Skips notarization when not on macOS or when APPLE_ID is not set.
 */

"use strict";

const { notarize } = require("@electron/notarize");

/**
 * @param {import("electron-builder").AfterPackContext} context
 */
async function notarizeApp(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize on macOS
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId) {
    console.log("Skipping notarization: APPLE_ID not set");
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}…`);

  await notarize({
    tool: "notarytool",
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });

  console.log(`Notarization complete for ${appName}`);
}

module.exports = notarizeApp;
