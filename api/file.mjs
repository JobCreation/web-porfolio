// /api/file?path=... — 내 PC 개발용 파일 전달 (Supabase에서는 공개 주소를 바로 쓴다)
import { query, fail, methodIs } from "./_lib/http.mjs";
import { readObject, usingSupabase } from "./_lib/store.mjs";
import { HttpError } from "./_lib/auth.mjs";

const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf", txt: "text/plain; charset=utf-8" };

export default async function handler(req, res) {
  try {
    methodIs(req, "GET");
    const p = String(query(req).path || "");
    if (!/^[\w-]+\/[\w-]+\.[a-z0-9]+$/i.test(p)) throw new HttpError(400, "경로가 올바르지 않습니다.");
    const bytes = await readObject(p);
    if (!bytes) throw new HttpError(404, "파일이 없습니다.");
    const ext = p.split(".").pop().toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", TYPES[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", usingSupabase ? "public, max-age=3600" : "no-store");
    res.end(bytes);
  } catch (e) { fail(res, e); }
}
