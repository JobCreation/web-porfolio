// /api/files — 내 첨부파일 목록과 삭제
import { query, fail, ok, methodIs } from "./_lib/http.mjs";
import { currentUser, HttpError } from "./_lib/auth.mjs";
import { listFiles, getFile, removeFile, deleteObject } from "./_lib/store.mjs";

export default async function handler(req, res) {
  try {
    methodIs(req, "GET", "DELETE");
    const me = await currentUser(req);
    if (!me) throw new HttpError(401, "로그인이 필요합니다.");
    const { id, user: userParam } = query(req);

    if (req.method === "GET") {
      const targetId = userParam && userParam !== me.id ? userParam : me.id;
      if (targetId !== me.id && me.role !== "owner") throw new HttpError(403, "운영자만 볼 수 있습니다.");
      return ok(res, { files: await listFiles(targetId) });
    }

    const file = await getFile(id);
    if (!file) throw new HttpError(404, "없는 파일입니다.");
    if (file.user_id !== me.id && me.role !== "owner") throw new HttpError(403, "내 파일만 지울 수 있습니다.");
    await deleteObject(file.path);
    await removeFile(file.id);
    return ok(res);
  } catch (e) { fail(res, e); }
}
