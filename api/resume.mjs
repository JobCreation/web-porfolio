// /api/resume — 내 이력서 읽기·저장, 공개 이력서 읽기, 운영자는 남의 이력서도 수정
import { body, query, fail, ok, methodIs } from "./_lib/http.mjs";
import { currentUser, HttpError } from "./_lib/auth.mjs";
import { getResumeByUser, getResumeBySlug, updateResume, getUser } from "./_lib/store.mjs";
import { TEMPLATE_IDS, slugify } from "./_lib/defaults.mjs";

export default async function handler(req, res) {
  try {
    methodIs(req, "GET", "PUT");
    const { slug, user: userParam } = query(req);

    // 공개 이력서 (로그인 없이)
    if (req.method === "GET" && slug) {
      const resume = await getResumeBySlug(slug);
      if (!resume || !resume.published) throw new HttpError(404, "이력서를 찾을 수 없습니다.");
      const owner = await getUser(resume.user_id);
      return ok(res, { resume: { slug: resume.slug, template: resume.template, data: resume.data, updated_at: resume.updated_at }, name: owner?.name || "" });
    }

    const me = await currentUser(req);
    if (!me) throw new HttpError(401, "로그인이 필요합니다.");
    const targetId = userParam && userParam !== me.id ? userParam : me.id;
    if (targetId !== me.id && me.role !== "owner") throw new HttpError(403, "다른 사용자의 이력서는 운영자만 열 수 있습니다.");

    const resume = await getResumeByUser(targetId);
    if (!resume) throw new HttpError(404, "이력서가 아직 없습니다.");

    if (req.method === "GET") return ok(res, { resume, editingOther: targetId !== me.id });

    const patch = await body(req);
    const next = { updated_at: new Date().toISOString() };
    if (patch.data && typeof patch.data === "object") next.data = patch.data;
    if (patch.template) {
      if (!TEMPLATE_IDS.includes(patch.template)) throw new HttpError(400, "없는 서식입니다.");
      next.template = patch.template;
    }
    if (typeof patch.published === "boolean") next.published = patch.published;
    if (patch.slug) {
      const wanted = slugify(patch.slug, resume.slug);
      if (wanted !== resume.slug) {
        const taken = await getResumeBySlug(wanted);
        if (taken && taken.id !== resume.id) throw new HttpError(409, "이미 쓰고 있는 주소입니다.");
        next.slug = wanted;
      }
    }
    const saved = await updateResume(resume.id, next);
    return ok(res, { resume: saved });
  } catch (e) { fail(res, e); }
}
