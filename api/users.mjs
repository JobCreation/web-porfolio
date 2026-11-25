// /api/users — 운영자 전용. 전체 사용자와 이력서 목록, 권한 변경, 삭제
import { body, query, fail, ok, methodIs } from "./_lib/http.mjs";
import { currentUser, HttpError, hashPassword } from "./_lib/auth.mjs";
import { listUsers, listResumes, updateUser, deleteUser, getUser } from "./_lib/store.mjs";

export default async function handler(req, res) {
  try {
    methodIs(req, "GET", "PATCH", "DELETE");
    const me = await currentUser(req);
    if (!me) throw new HttpError(401, "로그인이 필요합니다.");
    if (me.role !== "owner") throw new HttpError(403, "운영자만 쓸 수 있습니다.");

    if (req.method === "GET") {
      const [users, resumes] = await Promise.all([listUsers(), listResumes()]);
      const byUser = new Map(resumes.map((r) => [r.user_id, r]));
      return ok(res, {
        users: users.map((u) => {
          const r = byUser.get(u.id);
          return {
            id: u.id, email: u.email, name: u.name, role: u.role, plan: u.plan, created_at: u.created_at,
            resume: r ? { slug: r.slug, template: r.template, published: r.published, updated_at: r.updated_at } : null,
          };
        }),
      });
    }

    const id = query(req).id;
    const target = await getUser(id);
    if (!target) throw new HttpError(404, "없는 사용자입니다.");

    if (req.method === "DELETE") {
      if (target.id === me.id) throw new HttpError(400, "자기 계정은 지울 수 없습니다.");
      await deleteUser(target.id);
      return ok(res);
    }

    const patch = await body(req);
    const next = {};
    if (patch.name) next.name = String(patch.name).trim();
    if (patch.role === "owner" || patch.role === "user") {
      if (target.id === me.id && patch.role !== "owner") throw new HttpError(400, "자기 권한은 내릴 수 없습니다.");
      next.role = patch.role;
    }
    if (patch.password) {
      if (String(patch.password).length < 8) throw new HttpError(400, "비밀번호는 8자 이상이어야 합니다.");
      const { salt, hash } = hashPassword(patch.password);
      next.pw_salt = salt; next.pw_hash = hash;
    }
    const saved = await updateUser(target.id, next);
    const { pw_hash, pw_salt, ...safe } = saved || {};
    return ok(res, { user: safe });
  } catch (e) { fail(res, e); }
}
