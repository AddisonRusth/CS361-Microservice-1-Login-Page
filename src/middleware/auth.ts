import { Request, Response, NextFunction } from "express";

export function extractBearer(req: Request): string | null {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
        return header.substring(7);
    }
    return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = extractBearer(req);
    if (!token) return res.status(401).json({ message: "Missing access token" });
    (req as any).token = token;
    next();
}
