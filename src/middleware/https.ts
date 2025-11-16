import https from "https";
import { Express } from "express";
import fs from "fs";
import path from "path";

function unquote(p: string) {
  return p ? p.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1") : p;
}

export function createHttpsServer(app: Express) {
  const certFile = process.env.HTTPS_CERT_FILE ? path.resolve(unquote(process.env.HTTPS_CERT_FILE)) : undefined;
  const keyFile  = process.env.HTTPS_KEY_FILE  ? path.resolve(unquote(process.env.HTTPS_KEY_FILE))  : undefined;

  if (!certFile || !keyFile) {
    throw new Error("USE_HTTPS=true but HTTPS_CERT_FILE / HTTPS_KEY_FILE are not set.");
  }
  const cert = fs.readFileSync(certFile);
  const key  = fs.readFileSync(keyFile);
  return https.createServer({ key, cert }, app);
}
