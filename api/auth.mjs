// /api/auth?action=register|login|logout|me
import { body, query, fail, ok, send, methodIs } from "./_lib/http.mjs";
import { register, login, setSession, clearSession, currentUser, publicUser, HttpError } from "./_lib/auth.mjs";
import { getResumeByUser, createResume, getResumeBySlug, newId, storageReady } from "./_lib/store.mjs";
import { blankResume, slugify } from "./_lib/defaults.mjs";

async function ensureResume(user) {
  const existing = await getResumeByUser(user.id);
  if (existing) return existing;
  // 주소에 쓰기 좋게 이메일 앞부분을 기본 주소로 쓴다 (나중에 바꿀 수 있다)
  let slug = slugify(user.email.split("@")[0], "resume");
  if (await getResumeBySlug(slug)) slug = `${slug}-${user.id.slice(0, 4)}`;
  return createResume({
    id: newId(),
    user_id: user.id,
    slug,
    template: "dense",
    published: true,
    data: blankResume(user.name),
    updated_at: new Date().toISOString(),
  });
}

export default async function handler(req, res) {
  try {
    const action = query(req).action;
    if (!storageReady && action !== "me" && action !== "logout") {
      throw new HttpError(503, "서버에 자료 보관 설정(SUPABASE_URL, SUPABASE_SERVICE_KEY)이 아직 없습니다.");
    }
    if (action === "me") {
      methodIs(req, "GET");
      const user = await currentUser(req);
      return ok(res, { user: publicUser(user) });
    }
    if (action === "logout") {
      methodIs(req, "POST", "GET");
      clearSession(res);
      return ok(res);
    }
    methodIs(req, "POST");
    const input = await body(req);
    if (action === "register") {
      const user = await register(input);
      await ensureResume(user);
      setSession(res, user);
      return send(res, 201, { user: publicUser(user) });
    }
    if (action === "login") {
      const user = await login(input);
      await ensureResume(user);
      setSession(res, user);
      return ok(res, { user: publicUser(user) });
    }
    throw new HttpError(404, "없는 기능입니다.");
  } catch (e) { fail(res, e); }
}
