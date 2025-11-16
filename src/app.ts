import express from "express";
import cookieParser from "cookie-parser";
import { corsMiddleware } from "./middleware/cors";
import loginRouter from "./routes/login";
import refreshRouter from "./routes/refresh";
import logoutRouter from "./routes/logout";
import validateRouter from "./routes/validate";
import healthRouter from "./routes/health";
import jwksRouter from "./security/jwks";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(corsMiddleware);

  app.use("/login", loginRouter);
  app.use("/token/refresh", refreshRouter);
  app.use("/logout", logoutRouter);
  app.use("/token/validate", validateRouter);
  app.use("/health", healthRouter);
  app.use("/.well-known/jwks.json", jwksRouter);

  return app;
}
