// 내 PC에서 플랫폼을 돌리는 서버. Vercel과 같은 주소 규칙을 흉내 낸다.
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8030);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8",
};

const REWRITES = [
  [/^\/$/, "/platform/index.html"],
  [/^\/login$/, "/platform/index.html"],
  [/^\/app\/?$/, "/platform/app/index.html"],
  [/^\/owner\/?$/, "/platform/owner/index.html"],
  [/^\/r\/[^/]+$/, "/platform/r/index.html"],
  [/^\/me\/?$/, "/index.html"],
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith("/api/")) {
    const name = pathname.slice(5).replace(/\/$/, "");
    if (!/^[\w/-]+$/.test(name)) return notFound(res);
    try {
      const mod = await import(pathToFileURL(path.join(ROOT, "api", `${name}.mjs`)).href);
      await mod.default(req, res);
    } catch (e) {
      if (e.code === "ERR_MODULE_NOT_FOUND") return notFound(res);
      console.error(e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: String(e.message || e) }));
    }
    return;
  }

  for (const [re, to] of REWRITES) if (re.test(pathname)) { pathname = to; break; }
  const file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT)) return notFound(res);
  try {
    const stat = await fs.stat(file);
    const target = stat.isDirectory() ? path.join(file, "index.html") : file;
    const data = await fs.readFile(target);
    res.statusCode = 200;
    res.setHeader("Content-Type", TYPES[path.extname(target).toLowerCase()] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(data);
  } catch { notFound(res); }
});

function notFound(res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("404");
}

server.listen(PORT, "127.0.0.1", () => console.log(`이력서 플랫폼: http://127.0.0.1:${PORT}/`));
