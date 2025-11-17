// server.js
// Auth Microservice – Node.js + Express + SQLite + JWT (RS256)
// -----------------------------------------------------------------------------
// Endpoints:
// - POST /auth/register   (dev/demo user registration)
// - POST /auth/login      (issue access + refresh token)
// - POST /auth/refresh    (get new access token)
// - POST /auth/logout     (revoke one or all refresh tokens)
// - GET  /auth/me         (whoami, requires Authorization: Bearer <access_token>)
// - GET  /auth/health     (simple health check)
// - GET  /.well-known/jwks.json  (public key for JWT verification)
// -----------------------------------------------------------------------------
// Quick start:
// 1) In auth-service/:
//      npm init -y
//      npm i express better-sqlite3 bcrypt jose cors morgan dotenv
// 2) Create .env (optional, see defaults below)
// 3) node server.js
// 4) Create a demo user:
//      curl -X POST http://localhost:8080/auth/register \
//        -H "Content-Type: application/json" \
//        -d '{"email":"medic@example.org","password":"safePass123"}'
// 5) Login:
//      curl -X POST http://localhost:8080/auth/login \
//        -H "Content-Type: application/json" \
//        -d '{"email":"medic@example.org","password":"safePass123"}'
// -----------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import cors from 'cors';
import morgan from 'morgan';
import https from 'https';
import {
  generateKeyPair,
  exportJWK,
  importJWK,
  SignJWT,
  jwtVerify,
} from 'jose';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5047;

const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || "./certs/key.pem";
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || "./certs/cert.pem";

const ACCESS_TTL_MIN = Number(process.env.ACCESS_TTL_MIN || 15); // 15 min
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TTL_DAYS || 7); // 7 days
const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, 'data', 'auth.db');
const KEYS_DIR =
  process.env.KEYS_DIR || path.join(__dirname, 'keys');
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(KEYS_DIR, { recursive: true });


// -----------------------------------------------------------------------------
// Key material (RS256) – persisted as JWKS on disk
// -----------------------------------------------------------------------------
const JWKS_PATH = path.join(KEYS_DIR, 'jwks.json');
let jwkPrivate; // signing key (private)
let jwkPublic; // verification key (public)
let kid; // key id

async function loadOrCreateKeys() {
  if (fs.existsSync(JWKS_PATH)) {
    const raw = JSON.parse(fs.readFileSync(JWKS_PATH, 'utf8'));
    const key = raw.keys?.[0];
    if (!key) {
      throw new Error('Invalid jwks.json: no keys');
    }
    kid = key.kid;
    jwkPublic = key;
    const privPath = path.join(KEYS_DIR, `${kid}.private.json`);
    if (!fs.existsSync(privPath)) {
      throw new Error('Missing private key file');
    }
    jwkPrivate = JSON.parse(fs.readFileSync(privPath, 'utf8'));
    console.log('Loaded existing JWKS/keypair');
    return;
  }

  console.log('Generating new RSA keypair for JWT...');
  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    modulusLength: 2048,
  });

  const pubJwk = await exportJWK(publicKey);
  const privJwk = await exportJWK(privateKey);

  kid = `k-${Date.now()}`;

  jwkPublic = {
    ...pubJwk,
    kid,
    alg: 'RS256',
    use: 'sig',
  };
  jwkPrivate = {
    ...privJwk,
    kid,
    alg: 'RS256',
    use: 'sig',
  };

  fs.writeFileSync(
    JWKS_PATH,
    JSON.stringify({ keys: [jwkPublic] }, null, 2)
  );
  fs.writeFileSync(
    path.join(KEYS_DIR, `${kid}.private.json`),
    JSON.stringify(jwkPrivate, null, 2)
  );

  console.log('New JWKS/keypair generated.');
}

// -----------------------------------------------------------------------------
// Database (SQLite via better-sqlite3)
// -----------------------------------------------------------------------------
const db = new Database(DB_PATH);

db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  revoked INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

const qUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const qUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const insUser = db.prepare(
  'INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)'
);

const insRefresh = db.prepare(
  'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)'
);
const getRefresh = db.prepare(
  'SELECT * FROM refresh_tokens WHERE token = ?'
);
const revokeRefresh = db.prepare(
  'UPDATE refresh_tokens SET revoked = 1 WHERE token = ?'
);
const revokeAllForUser = db.prepare(
  'UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?'
);

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function nowIso() {
  return new Date().toISOString();
}
function minutesFromNow(min) {
  return new Date(Date.now() + min * 60_000);
}
function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60_000);
}

async function signAccessToken(user) {
  const privateKey = await importJWK(jwkPrivate, 'RS256');
  const exp = Math.floor(minutesFromNow(ACCESS_TTL_MIN).getTime() / 1000);

  return new SignJWT({
    sub: String(user.id),
    email: user.email,
    typ: 'access',
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuedAt()
    .setExpirationTime(exp)
    .setAudience('medic-logger')
    .setIssuer('auth-service')
    .sign(privateKey);
}

async function signRefreshToken(user) {
  const privateKey = await importJWK(jwkPrivate, 'RS256');
  const exp = Math.floor(
    daysFromNow(REFRESH_TTL_DAYS).getTime() / 1000
  );

  const jwt = await new SignJWT({
    sub: String(user.id),
    email: user.email,
    typ: 'refresh',
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuedAt()
    .setExpirationTime(exp)
    .setAudience('medic-logger')
    .setIssuer('auth-service')
    .sign(privateKey);

  insRefresh.run(
    user.id,
    jwt,
    new Date(exp * 1000).toISOString(),
    nowIso()
  );

  return jwt;
}

async function verifyAccessToken(token) {
  const publicKey = await importJWK(jwkPublic, 'RS256');
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: 'auth-service',
    audience: 'medic-logger',
  });
  return payload; // { sub, email, iat, exp, ... }
}

function maskUser(u) {
  return {
    id: u.id,
    email: u.email,
    created_at: u.created_at,
  };
}

// -----------------------------------------------------------------------------
// Express app
// -----------------------------------------------------------------------------
const app = express();

app.use(morgan("dev"));
app.use(express.json());

// Allow all origins for this project
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);



// Health check
app.get('/auth/health', (_req, res) => {
  res.json({ ok: true, time: nowIso() });
});

// JWKS endpoint
app.get('/.well-known/jwks.json', (_req, res) => {
  const jwks = JSON.parse(fs.readFileSync(JWKS_PATH, 'utf8'));
  res.json(jwks);
});

// -----------------------------------------------------------------------------
// Auth routes
// -----------------------------------------------------------------------------

// DEV: register a user (email/password)
// You can disable this in production if you seed users manually.
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'email and password required' });
    }

    const existing = qUserByEmail.get(email);
    if (existing) {
      return res.status(409).json({ error: 'user already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const createdAt = nowIso();
    const info = insUser.run(email, hash, createdAt);

    const user = {
      id: info.lastInsertRowid,
      email,
      created_at: createdAt,
    };

    res.status(201).json({ user: maskUser(user) });
  } catch (e) {
    console.error('register error', e);
    res.status(500).json({ error: 'registration_failed' });
  }
});

// Login: issue access + refresh token
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'email and password required' });
    }

    const user = qUserByEmail.get(email);
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const access_token = await signAccessToken(user);
    const refresh_token = await signRefreshToken(user);

    res.json({
      user: maskUser(user),
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_MIN * 60,
    });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ error: 'login_failed' });
  }
});

// Refresh access token
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) {
      return res
        .status(400)
        .json({ error: 'refresh_token required' });
    }

    const row = getRefresh.get(refresh_token);
    if (!row || row.revoked) {
      return res
        .status(401)
        .json({ error: 'invalid_refresh_token' });
    }

    const publicKey = await importJWK(jwkPublic, 'RS256');
    let payload;
    try {
      ({ payload } = await jwtVerify(refresh_token, publicKey, {
        issuer: 'auth-service',
        audience: 'medic-logger',
      }));
    } catch (e) {
      console.warn('refresh token invalid/expired, revoking', e);
      revokeRefresh.run(refresh_token);
      return res.status(401).json({
        error: 'expired_or_invalid_refresh_token',
      });
    }

    const user = qUserById.get(Number(payload.sub));
    if (!user) {
      return res.status(401).json({ error: 'user_not_found' });
    }

    const access_token = await signAccessToken(user);
    res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_MIN * 60,
    });
  } catch (e) {
    console.error('refresh error', e);
    res.status(500).json({ error: 'refresh_failed' });
  }
});

// Logout: revoke a single refresh token or all for this user
app.post('/auth/logout', async (req, res) => {
  try {
    const { refresh_token, all } = req.body || {};

    if (all) {
      // Revoke all tokens for user derived from access token
      const auth =
        req.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!auth) {
        return res.status(400).json({
          error: 'access token required for all=true',
        });
      }

      try {
        const payload = await verifyAccessToken(auth);
        revokeAllForUser.run(Number(payload.sub));
        return res.json({ revoked: 'all' });
      } catch (e) {
        console.error('logout all error', e);
        return res
          .status(401)
          .json({ error: 'invalid_access_token' });
      }
    }

    if (!refresh_token) {
      return res
        .status(400)
        .json({ error: 'refresh_token required' });
    }

    revokeRefresh.run(refresh_token);
    res.json({ revoked: true });
  } catch (e) {
    console.error('logout error', e);
    res.status(500).json({ error: 'logout_failed' });
  }
});

// Whoami: requires Authorization: Bearer <access_token>
app.get('/auth/me', async (req, res) => {
  try {
    const auth =
      req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!auth) {
      return res
        .status(401)
        .json({ error: 'missing_authorization' });
    }

    const payload = await verifyAccessToken(auth);
    const user = qUserById.get(Number(payload.sub));
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    res.json({ user: maskUser(user) });
  } catch (e) {
    console.error('me error', e);
    res
      .status(401)
      .json({ error: 'invalid_or_expired_access_token' });
  }
});

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------
loadOrCreateKeys()
  .then(() => {
    const httpsOptions = {
      key: fs.readFileSync(HTTPS_KEY_PATH),
      cert: fs.readFileSync(HTTPS_CERT_PATH),
    };

    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`Auth service listening on https://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize keys:", err);
    process.exit(1);
  });


