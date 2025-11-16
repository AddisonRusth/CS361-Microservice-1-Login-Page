import fs from "fs";
import path from "path";
import * as jose from "jose";

function mustGet(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

function unquote(p: string) {
    return p.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

// Cached keys
let _privateKey: jose.KeyLike | undefined;
let _publicKey: jose.KeyLike | undefined;
let _alg = "RS256";

/** Node 16-safe: load keys lazily, after dotenv has run */
export async function loadKeys() {
    if (_privateKey && _publicKey) {
        return { privateKey: _privateKey, publicKey: _publicKey, alg: _alg };
}

    const alg = process.env.JWT_ALG || "RS256";
    const privPathRaw = mustGet("JWT_PRIVATE_KEY_FILE");
    const pubPathRaw  = mustGet("JWT_PUBLIC_KEY_FILE");

    const privPath = path.resolve(unquote(privPathRaw));
    const pubPath  = path.resolve(unquote(pubPathRaw));

    if (!fs.existsSync(privPath)) throw new Error(`Private key not found at: ${privPath}`);
    if (!fs.existsSync(pubPath))  throw new Error(`Public key not found at: ${pubPath}`);

    const privateKeyPem = fs.readFileSync(privPath, "utf8");
    const publicKeyPem  = fs.readFileSync(pubPath, "utf8");

    _privateKey = await jose.importPKCS8(privateKeyPem, alg);
    _publicKey  = await jose.importSPKI(publicKeyPem, alg);
    _alg = alg;

    return { privateKey: _privateKey, publicKey: _publicKey, alg: _alg };
}
