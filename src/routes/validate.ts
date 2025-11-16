import express from "express";
import { jwtVerify } from "jose";
import { loadKeys } from "../security/keys";
import { extractBearer } from "../middleware/auth";

const router = express.Router();

router.get("/", async (req, res) => {
  const token = extractBearer(req);
  if (!token) return res.json({ valid: false });
  try {
    const { publicKey } = await loadKeys();
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: "auth-service",
      audience: "medic-logger"
    });
    res.json({ valid: true, email: (payload as any).email });
  } catch {
    res.json({ valid: false });
  }
});

export default router;
