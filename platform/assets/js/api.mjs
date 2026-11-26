// 서버와 주고받기. 모든 화면이 함께 쓴다.
async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  let data = null;
  try { data = await res.json(); } catch { /* 본문이 없을 수 있다 */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `요청 실패 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  meta: () => call("/api/meta"),
  me: () => call("/api/auth?action=me"),
  register: (input) => call("/api/auth?action=register", { method: "POST", body: input }),
  login: (input) => call("/api/auth?action=login", { method: "POST", body: input }),
  logout: () => call("/api/auth?action=logout", { method: "POST" }),

  resume: (userId) => call("/api/resume" + (userId ? `?user=${encodeURIComponent(userId)}` : "")),
  publicResume: (slug) => call(`/api/resume?slug=${encodeURIComponent(slug)}`),
  saveResume: (patch, userId) => call("/api/resume" + (userId ? `?user=${encodeURIComponent(userId)}` : ""), { method: "PUT", body: patch }),

  files: (userId) => call("/api/files" + (userId ? `?user=${encodeURIComponent(userId)}` : "")),
  upload: (file, userId) => call("/api/upload", { method: "POST", body: { ...file, user: userId } }),
  removeFile: (id) => call(`/api/files?id=${encodeURIComponent(id)}`, { method: "DELETE" }),

  users: () => call("/api/users"),
  updateUser: (id, patch) => call(`/api/users?id=${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
  deleteUser: (id) => call(`/api/users?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// 사진은 긴 변 1400px로 줄여 올린다. 그 밖의 파일은 그대로.
export async function readFileForUpload(file, { shrinkImages = true } = {}) {
  const isImage = file.type.startsWith("image/") && file.type !== "image/gif";
  if (isImage && shrinkImages) {
    let bmp;
    try {
      bmp = await createImageBitmap(file);
    } catch {
      throw new Error("사진 파일을 읽을 수 없습니다. 다른 사진으로 해 보세요.");
    }
    const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.86);
    return { name: file.name.replace(/\.[^.]+$/, "") + ".jpg", type: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl };
  }
  const buf = await file.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { name: file.name, type: file.type || "application/octet-stream", data: btoa(bin) };
}

export function setupTheme(button) {
  if (!button) return;
  button.addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* 저장 못 해도 동작엔 지장 없다 */ }
  });
}

export const THEME_BUTTON = `
  <button class="theme" id="theme" type="button" aria-label="밝은 화면 / 어두운 화면 전환">
    <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>
  </button>`;
