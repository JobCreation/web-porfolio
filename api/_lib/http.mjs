// 요청/응답 도우미. Vercel과 내 PC 개발 서버 양쪽에서 같은 방식으로 쓴다.
import { HttpError } from "./auth.mjs";

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}
export const ok = (res, data = { ok: true }) => send(res, 200, data);
export function fail(res, e) {
  const status = e instanceof HttpError ? e.status : 500;
  if (status >= 500) console.error(e);
  send(res, status, { error: e.message || "서버 오류" });
}
export async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 12 * 1024 * 1024) throw new HttpError(413, "보낸 자료가 너무 큽니다.");
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new HttpError(400, "형식이 올바르지 않습니다."); }
}
export function query(req) {
  if (req.query) return req.query;
  const url = new URL(req.url, "http://x");
  return Object.fromEntries(url.searchParams);
}
export function methodIs(req, ...allowed) {
  if (!allowed.includes(req.method)) throw new HttpError(405, "허용하지 않는 요청입니다.");
}
