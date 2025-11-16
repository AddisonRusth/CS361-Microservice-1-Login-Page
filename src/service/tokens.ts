import * as jose from "jose";
import { loadKeys } from "../security/keys";
import { v4 as uuid } from "uuid";

const refreshStore = new Map<string, { userId: string; exp: number }>();

const ACCESS_MIN = Number(process.env.ACCESS_TOKEN_TTL_MIN || 15);
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);

function minutesToSeconds(m: number) { return m * 60; }
function daysToSeconds(d: number) { return d * 24 * 60 * 60; }

export async function signAccessToken(user: { id: string; email: string }) {
  const { privateKey } = await loadKeys();
  const exp = Math.floor(Date.now() / 1000) + minutesToSeconds(ACCESS_MIN);
  return new jose.SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer("auth-service")
    .setAudience("medic-logger")
    .setExpirationTime(exp)
    .sign(privateKey);
}

export function issueRefreshToken(userId: string) {
  const token = uuid();
  const exp = Math.floor(Date.now() / 1000) + daysToSeconds(REFRESH_DAYS);
  refreshStore.set(token, { userId, exp });
  return token;
}

export function verifyRefreshToken(token: string) {
  const entry = refreshStore.get(token);
  if (!entry) return null;
  if (entry.exp < Math.floor(Date.now() / 1000)) {
    refreshStore.delete(token);
    return null;
  }
  return entry.userId;
}

export function rotateRefreshToken(oldToken: string, userId: string) {
  refreshStore.delete(oldToken);
  return issueRefreshToken(userId);
}

export function deleteRefreshToken(token: string) {
  refreshStore.delete(token);
}
