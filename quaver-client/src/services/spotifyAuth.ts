import { spotifyConfig } from "../config/spotify";

interface SpotifyTokenSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

const SESSION_KEY = "quaver.spotify.session";
const VERIFIER_KEY = "quaver.spotify.pkce.verifier";
const STATE_KEY = "quaver.spotify.pkce.state";

function toBase64Url(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomString(length: number) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function createCodeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return toBase64Url(digest);
}

function storeSession(session: SpotifyTokenSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getStoredSpotifySession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SpotifyTokenSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSpotifySession() {
  localStorage.removeItem(SESSION_KEY);
}

async function requestToken(body: URLSearchParams) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Spotify token request failed");
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
}

function clearPkceState() {
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
}

export async function beginSpotifyAuthorization() {
  const verifier = randomString(64);
  const state = randomString(24);
  const challenge = await createCodeChallenge(verifier);

  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", spotifyConfig.clientId);
  url.searchParams.set("scope", spotifyConfig.scopes.join(" "));
  url.searchParams.set("redirect_uri", spotifyConfig.redirectUri);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);

  window.location.assign(url.toString());
}

export async function completeSpotifyAuthorization() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  if (error) {
    url.searchParams.delete("error");
    url.searchParams.delete("state");
    window.history.replaceState({}, "", url);
    throw new Error(error);
  }

  if (!code) {
    return getStoredSpotifySession();
  }

  const storedVerifier = localStorage.getItem(VERIFIER_KEY);
  const storedState = localStorage.getItem(STATE_KEY);

  if (!storedVerifier || !storedState || storedState !== state) {
    throw new Error("Spotify authorization state mismatch");
  }

  const token = await requestToken(
    new URLSearchParams({
      client_id: spotifyConfig.clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyConfig.redirectUri,
      code_verifier: storedVerifier,
    }),
  );

  const session: SpotifyTokenSession = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    expiresAt: Date.now() + token.expires_in * 1000,
  };

  storeSession(session);
  clearPkceState();
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url);
  return session;
}

export async function getValidSpotifyAccessToken() {
  const session = getStoredSpotifySession();
  if (!session) {
    return null;
  }

  if (Date.now() < session.expiresAt - 60_000) {
    return session.accessToken;
  }

  if (!session.refreshToken) {
    clearSpotifySession();
    return null;
  }

  const token = await requestToken(
    new URLSearchParams({
      client_id: spotifyConfig.clientId,
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    }),
  );

  const refreshedSession: SpotifyTokenSession = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + token.expires_in * 1000,
  };

  storeSession(refreshedSession);
  return refreshedSession.accessToken;
}
