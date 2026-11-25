// 자료 보관. Supabase 키가 있으면 Supabase, 없으면 내 PC의 .data 폴더에 둔다.
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SB_URL = process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "";
export const usingSupabase = !!(SB_URL && SB_KEY);
// Vercel에서는 파일을 쓸 수 없으므로 Supabase 설정이 반드시 있어야 한다
export const storageReady = usingSupabase || !process.env.VERCEL;
export const BUCKET = process.env.SUPABASE_BUCKET || "uploads";

export function newId() { return crypto.randomUUID(); }

/* ---------- 내 PC 보관 (개발용) ---------- */

const DIR = path.join(process.cwd(), ".data");
const DB = path.join(DIR, "db.json");
let lock = Promise.resolve();

async function readLocal() {
  try { return JSON.parse(await fs.readFile(DB, "utf8")); }
  catch { return { users: [], resumes: [], files: [] }; }
}
// 동시에 쓰면 섞이므로 차례대로 처리한다
function withLocal(fn) {
  const run = lock.then(async () => {
    const db = await readLocal();
    const out = await fn(db);
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(DB, JSON.stringify(db, null, 2));
    return out;
  });
  lock = run.catch(() => {});
  return run;
}

/* ---------- Supabase (PostgREST) ---------- */

async function sb(table, { method = "GET", query = "", body, prefer } = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer || "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${table} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const one = (rows) => (Array.isArray(rows) ? rows[0] || null : rows);
const q = (v) => encodeURIComponent(v);

/* ---------- 사용자 ---------- */

export async function listUsers() {
  if (usingSupabase) return sb("users", { query: "?select=*&order=created_at.asc" });
  return withLocal((db) => db.users.slice().sort((a, b) => (a.created_at < b.created_at ? -1 : 1)));
}
export async function getUser(id) {
  if (!id) return null;
  if (usingSupabase) return one(await sb("users", { query: `?id=eq.${q(id)}&select=*&limit=1` }));
  return withLocal((db) => db.users.find((u) => u.id === id) || null);
}
export async function getUserByEmail(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return null;
  if (usingSupabase) return one(await sb("users", { query: `?email=eq.${q(key)}&select=*&limit=1` }));
  return withLocal((db) => db.users.find((u) => u.email === key) || null);
}
export async function countUsers() {
  return (await listUsers()).length;
}
export async function createUser(user) {
  if (usingSupabase) return one(await sb("users", { method: "POST", body: user }));
  return withLocal((db) => { db.users.push(user); return user; });
}
export async function updateUser(id, patch) {
  if (usingSupabase) return one(await sb("users", { method: "PATCH", query: `?id=eq.${q(id)}`, body: patch }));
  return withLocal((db) => {
    const u = db.users.find((x) => x.id === id);
    if (u) Object.assign(u, patch);
    return u || null;
  });
}
export async function deleteUser(id) {
  if (usingSupabase) {
    await sb("files", { method: "DELETE", query: `?user_id=eq.${q(id)}`, prefer: "return=minimal" });
    await sb("resumes", { method: "DELETE", query: `?user_id=eq.${q(id)}`, prefer: "return=minimal" });
    await sb("users", { method: "DELETE", query: `?id=eq.${q(id)}`, prefer: "return=minimal" });
    return true;
  }
  return withLocal((db) => {
    db.users = db.users.filter((u) => u.id !== id);
    db.resumes = db.resumes.filter((r) => r.user_id !== id);
    db.files = db.files.filter((f) => f.user_id !== id);
    return true;
  });
}

/* ---------- 이력서 ---------- */

export async function listResumes() {
  if (usingSupabase) return sb("resumes", { query: "?select=*&order=updated_at.desc" });
  return withLocal((db) => db.resumes.slice());
}
export async function getResumeByUser(userId) {
  if (usingSupabase) return one(await sb("resumes", { query: `?user_id=eq.${q(userId)}&select=*&limit=1` }));
  return withLocal((db) => db.resumes.find((r) => r.user_id === userId) || null);
}
export async function getResumeBySlug(slug) {
  const key = String(slug || "").toLowerCase();
  if (usingSupabase) return one(await sb("resumes", { query: `?slug=eq.${q(key)}&select=*&limit=1` }));
  return withLocal((db) => db.resumes.find((r) => r.slug === key) || null);
}
export async function createResume(resume) {
  if (usingSupabase) return one(await sb("resumes", { method: "POST", body: resume }));
  return withLocal((db) => { db.resumes.push(resume); return resume; });
}
export async function updateResume(id, patch) {
  if (usingSupabase) return one(await sb("resumes", { method: "PATCH", query: `?id=eq.${q(id)}`, body: patch }));
  return withLocal((db) => {
    const r = db.resumes.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    return r || null;
  });
}

/* ---------- 첨부파일 ---------- */

export async function listFiles(userId) {
  if (usingSupabase) return sb("files", { query: `?user_id=eq.${q(userId)}&select=*&order=created_at.desc` });
  return withLocal((db) => db.files.filter((f) => f.user_id === userId));
}
export async function getFile(id) {
  if (usingSupabase) return one(await sb("files", { query: `?id=eq.${q(id)}&select=*&limit=1` }));
  return withLocal((db) => db.files.find((f) => f.id === id) || null);
}
export async function addFile(meta) {
  if (usingSupabase) return one(await sb("files", { method: "POST", body: meta }));
  return withLocal((db) => { db.files.push(meta); return meta; });
}
export async function removeFile(id) {
  if (usingSupabase) {
    await sb("files", { method: "DELETE", query: `?id=eq.${q(id)}`, prefer: "return=minimal" });
    return true;
  }
  return withLocal((db) => { db.files = db.files.filter((f) => f.id !== id); return true; });
}

/* ---------- 파일 본문 ---------- */

export async function putObject(objectPath, bytes, contentType) {
  if (usingSupabase) {
    const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": contentType, "x-upsert": "true" },
      body: bytes,
    });
    if (!res.ok) throw new Error(`Storage ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return `${SB_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  }
  const full = path.join(DIR, "uploads", objectPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes);
  return `/api/file?path=${encodeURIComponent(objectPath)}`;
}
export async function readObject(objectPath) {
  if (usingSupabase) {
    const res = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  try { return await fs.readFile(path.join(DIR, "uploads", objectPath)); } catch { return null; }
}
export async function deleteObject(objectPath) {
  if (usingSupabase) {
    await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "DELETE", headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    return true;
  }
  try { await fs.unlink(path.join(DIR, "uploads", objectPath)); } catch {}
  return true;
}
