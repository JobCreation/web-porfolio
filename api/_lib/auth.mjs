// 로그인 처리. 비밀번호는 scrypt로 해시해 보관하고, 로그인 상태는 서명한 쿠키로 유지한다.
import crypto from "node:crypto";
import { getUser, getUserByEmail, createUser, countUsers, newId } from "./store.mjs";

const COOKIE = "rp_session";
const DAYS = 14;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.VERCEL) throw new Error("SESSION_SECRET 환경변수가 필요합니다.");
  return "dev-only-secret";             // 내 PC 개발용
}
const b64u = (buf) => Buffer.from(buf).toString("base64url");

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 32).toString("hex");
  return { salt, hash };
}
export function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const got = Buffer.from(crypto.scryptSync(String(password), salt, 32).toString("hex"), "hex");
  const want = Buffer.from(hash, "hex");
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}
function unsign(token) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const want = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}

export function setSession(res, user) {
  const token = sign({ uid: user.id, exp: Date.now() + DAYS * 864e5 });
  const bits = [`${COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${DAYS * 86400}`];
  if (process.env.VERCEL) bits.push("Secure");
  res.setHeader("Set-Cookie", bits.join("; "));
}
export function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
export async function currentUser(req) {
  const raw = req.cookies?.[COOKIE] || readCookie(req.headers.cookie, COOKIE);
  const payload = unsign(raw);
  return payload ? getUser(payload.uid) : null;
}
function readCookie(header, name) {
  for (const part of String(header || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

export function publicUser(u) {
  if (!u) return null;
  const { pw_hash, pw_salt, ...rest } = u;
  return rest;
}

export async function register({ email, password, name }) {
  const mail = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw new HttpError(400, "이메일 주소를 확인해 주세요.");
  if (String(password || "").length < 8) throw new HttpError(400, "비밀번호는 8자 이상으로 정해 주세요.");
  if (await getUserByEmail(mail)) throw new HttpError(409, "이미 가입된 이메일입니다.");
  const { salt, hash } = hashPassword(password);
  const owner = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
  const first = (await countUsers()) === 0;
  return createUser({
    id: newId(),
    email: mail,
    name: String(name || "").trim() || mail.split("@")[0],
    pw_salt: salt,
    pw_hash: hash,
    role: owner ? (mail === owner ? "owner" : "user") : first ? "owner" : "user",
    plan: "free",
    created_at: new Date().toISOString(),
  });
}

export async function login({ email, password }) {
  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(password, user.pw_salt, user.pw_hash)) {
    // 비밀번호를 기계로 계속 찍어 보는 것을 조금이라도 늦춘다
    await new Promise((r) => setTimeout(r, 400));
    throw new HttpError(401, "이메일 또는 비밀번호가 맞지 않습니다.");
  }
  return user;
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
