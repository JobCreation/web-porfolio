// /api/meta — 화면에서 쓰는 설정값 (서식 목록, 보관 방식)
import { fail, ok, methodIs } from "./_lib/http.mjs";
import { TEMPLATES } from "./_lib/defaults.mjs";
import { usingSupabase, storageReady } from "./_lib/store.mjs";

export default async function handler(req, res) {
  try {
    methodIs(req, "GET");
    return ok(res, { templates: TEMPLATES, storage: usingSupabase ? "supabase" : "local", ready: storageReady, plan: "free" });
  } catch (e) { fail(res, e); }
}
