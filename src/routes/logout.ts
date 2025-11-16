import express from "express";
import { deleteRefreshToken } from "../service/tokens";

const router = express.Router();

router.post("/", (req, res) => {
    const token = req.cookies?.refresh_token;
    if (token) deleteRefreshToken(token);
    res.clearCookie("refresh_token", { path: "/" });
    res.json({ ok: true });
});

export default router;
