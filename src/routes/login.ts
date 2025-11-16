import express from "express";
import { findUserByEmail, verifyPassword } from "../service/users";
import { issueRefreshToken, signAccessToken } from "../service/tokens";

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Missing credentials" });

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await verifyPassword(user, password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = await signAccessToken(user);
  const refreshToken = issueRefreshToken(user.id);

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: false, // set true if you switch to HTTPS
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ accessToken, email: user.email });
});

export default router;
