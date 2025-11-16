import express from "express";
import { rotateRefreshToken, signAccessToken, verifyRefreshToken } from "../service/tokens";
import { findUserByEmail } from "../service/users";

const router = express.Router();

router.post("/", async (req, res) => {
  const old = req.cookies?.refresh_token;
  if (!old) return res.status(401).json({ message: "Missing refresh token" });

  const userId = verifyRefreshToken(old);
  if (!userId) return res.status(401).json({ message: "Invalid refresh token" });

  const newToken = rotateRefreshToken(old, userId);

  // Demo user is static in this sample
  const user = await findUserByEmail("medic@example.org");
  if (!user) return res.status(500).json({ message: "Demo user missing" });

  const accessToken = await signAccessToken(user);

  res.cookie("refresh_token", newToken, {
    httpOnly: true,
    secure: false, // set true if HTTPS
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ accessToken });
});

export default router;
