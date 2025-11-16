import express from "express";
import * as jose from "jose";
import { loadKeys } from "./keys";

const router = express.Router();

let jwkCache: any | null = null;

async function getJwk() {
  if (!jwkCache) {
    const { publicKey } = await loadKeys();
    const jwk = await jose.exportJWK(publicKey);
    (jwk as any).use = "sig";
    (jwk as any).alg = "RS256";
    (jwk as any).kid = "auth-service-key";
    jwkCache = jwk;
  }
  return jwkCache;
}

router.get("/", async (_req, res) => {
  const jwk = await getJwk();
  res.json({ keys: [jwk] });
});

export default router;
