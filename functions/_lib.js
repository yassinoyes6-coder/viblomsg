// Shared helpers for Cloudflare Pages Functions
const SECRET = "viblo-msg-cloudflare-secret-key-2026-super-secure-token";

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export function randomId(len = 16) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, len * 2);
}

// Password hashing using Web Crypto PBKDF2 (100,000 iterations SHA-256)
export async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt, (b) => b.toString(16).padStart(2, '0')).join('');
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(derivedBits), (b) => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$${saltHex}$${hashHex}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
  const [, saltHex, expectedHash] = parts;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const actualHash = Array.from(new Uint8Array(derivedBits), (b) => b.toString(16).padStart(2, '0')).join('');
  return actualHash === expectedHash;
}

// JWT-style token signing with HMAC-SHA256
export async function signToken(userId) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const payloadObj = { u: userId, exp: Date.now() + 30 * 24 * 3600 * 1000 };
  const payloadStr = btoa(JSON.stringify(payloadObj));
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payloadStr));
  const sigHex = Array.from(new Uint8Array(sigBuf), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${payloadStr}.${sigHex}`;
}

export async function verifyToken(token, db) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadStr, sigHex] = token.split('.');
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const expectedSig = new Uint8Array(sigHex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
    const valid = await crypto.subtle.verify("HMAC", key, expectedSig, enc.encode(payloadStr));
    if (!valid) return null;
    const payload = JSON.parse(atob(payloadStr));
    if (!payload.u || payload.exp < Date.now()) return null;
    const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(payload.u).first();
    return user || null;
  } catch {
    return null;
  }
}

export function publicUser(u) {
  if (!u) return null;
  const now = Date.now();
  const isOnline = u.lastSeen && (now - u.lastSeen < 60000);
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    picture: u.picture || null,
    online: !!isOnline,
    lastSeen: u.lastSeen || null,
    createdAt: u.createdAt
  };
}
