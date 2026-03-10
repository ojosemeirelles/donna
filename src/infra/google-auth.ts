/**
 * Google OAuth2 — handles auth flow for Gmail API access.
 * Reads client credentials from ~/.donna/google-oauth.json
 * Stores tokens at ~/.donna/google-tokens.json
 */

import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { URL } from "node:url";

const DONNA_DIR = path.join(os.homedir(), ".donna");
const OAUTH_PATH = path.join(DONNA_DIR, "google-oauth.json");
const TOKENS_PATH = path.join(DONNA_DIR, "google-tokens.json");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.labels",
];

const REDIRECT_PORT = 18799;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

export type GoogleTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expiry_date: number;
  scope: string;
};

type OAuthClientConfig = {
  installed?: { client_id: string; client_secret: string; auth_uri: string; token_uri: string };
  web?: { client_id: string; client_secret: string; auth_uri: string; token_uri: string };
};

async function loadClientConfig() {
  const raw = await fs.readFile(OAUTH_PATH, "utf-8");
  const config = JSON.parse(raw) as OAuthClientConfig;
  const creds = config.installed ?? config.web;
  if (!creds) {
    throw new Error("Invalid google-oauth.json: missing installed or web key");
  }
  return creds;
}

async function saveTokens(tokens: GoogleTokens): Promise<void> {
  await fs.writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2) + "\n", "utf-8");
}

export async function loadTokens(): Promise<GoogleTokens | null> {
  try {
    const raw = await fs.readFile(TOKENS_PATH, "utf-8");
    return JSON.parse(raw) as GoogleTokens;
  } catch {
    return null;
  }
}

async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  tokenUri: string,
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    token_type: (data.token_type as string) ?? "Bearer",
    expiry_date: Date.now() + ((data.expires_in as number) ?? 3600) * 1000,
    scope: (data.scope as string) ?? SCOPES.join(" "),
  };
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tokenUri: string,
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    access_token: data.access_token as string,
    refresh_token: refreshToken,
    token_type: (data.token_type as string) ?? "Bearer",
    expiry_date: Date.now() + ((data.expires_in as number) ?? 3600) * 1000,
    scope: (data.scope as string) ?? SCOPES.join(" "),
  };
}

/** Get a valid access token, refreshing if needed. */
export async function getAccessToken(): Promise<string> {
  const tokens = await loadTokens();
  if (!tokens) {
    throw new Error("Not authenticated. Run: npx tsx src/infra/google-auth.ts");
  }

  // Refresh 5 minutes before expiry
  if (Date.now() > tokens.expiry_date - 5 * 60 * 1000) {
    const creds = await loadClientConfig();
    const refreshed = await refreshAccessToken(
      tokens.refresh_token,
      creds.client_id,
      creds.client_secret,
      creds.token_uri ?? "https://oauth2.googleapis.com/token",
    );
    await saveTokens(refreshed);
    return refreshed.access_token;
  }

  return tokens.access_token;
}

/** Interactive OAuth2 flow — opens browser, waits for callback. */
export async function runOAuthFlow(): Promise<GoogleTokens> {
  const creds = await loadClientConfig();
  const authUri = creds.auth_uri ?? "https://accounts.google.com/o/oauth2/auth";
  const tokenUri = creds.token_uri ?? "https://oauth2.googleapis.com/token";

  const authUrl = new URL(authUri);
  authUrl.searchParams.set("client_id", creds.client_id);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log("\n📧 Gmail OAuth — Authorize Donna to read your emails:\n");
  console.log(authUrl.toString());
  console.log("\nWaiting for callback on port", REDIRECT_PORT, "...\n");

  // Try to open browser
  try {
    const { exec } = await import("node:child_process");
    exec(`open "${authUrl.toString()}"`);
  } catch {
    /* manual open */
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<h1>Authorization failed: ${error}</h1>`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>Missing authorization code</h1>");
        return;
      }

      try {
        const tokens = await exchangeCode(code, creds.client_id, creds.client_secret, tokenUri);
        await saveTokens(tokens);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>✅ Donna Gmail authorized! You can close this tab.</h1>");
        server.close();
        resolve(tokens);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`<h1>Token exchange failed</h1><pre>${String(err)}</pre>`);
        server.close();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT);
  });
}

/** List recent unread emails (for testing). */
export async function listRecentEmails(maxResults = 10) {
  const token = await getAccessToken();
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=is:unread&labelIds=INBOX`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { messages?: Array<{ id: string; threadId: string }> };
  if (!data.messages?.length) {
    console.log("No unread emails.");
    return [];
  }

  const emails = [];
  for (const msg of data.messages.slice(0, maxResults)) {
    const detail = await fetchEmailDetail(token, msg.id);
    emails.push(detail);
    console.log(`• ${detail.from} — ${detail.subject}`);
  }
  return emails;
}

export type EmailDetail = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  labels: string[];
};

export async function fetchEmailDetail(token: string, messageId: string): Promise<EmailDetail> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Gmail detail error (${res.status})`);
  }

  const data = (await res.json()) as {
    id: string;
    snippet: string;
    labelIds?: string[];
    payload?: { headers?: Array<{ name: string; value: string }> };
  };

  const headers = data.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  return {
    id: data.id,
    from: getHeader("From"),
    subject: getHeader("Subject"),
    snippet: data.snippet ?? "",
    date: getHeader("Date"),
    labels: data.labelIds ?? [],
  };
}

// CLI entrypoint
if (
  process.argv[1] &&
  (process.argv[1].endsWith("google-auth.ts") || process.argv[1].endsWith("google-auth.js"))
) {
  runOAuthFlow()
    .then((tokens) => {
      console.log("\n✅ Tokens saved to ~/.donna/google-tokens.json");
      console.log(`   Access token expires: ${new Date(tokens.expiry_date).toLocaleString()}`);
    })
    .catch((err) => {
      console.error("OAuth failed:", err);
      process.exit(1);
    });
}
