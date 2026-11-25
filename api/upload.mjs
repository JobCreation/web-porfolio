// /api/upload — 사진·첨부파일 올리기 (브라우저에서 base64로 보낸다)
import { body, fail, ok, methodIs } from "./_lib/http.mjs";
import { currentUser, HttpError } from "./_lib/auth.mjs";
import { addFile, putObject, newId, getUser } from "./_lib/store.mjs";

const ALLOWED = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
};
const MAX = 6 * 1024 * 1024;

export default async function handler(req, res) {
  try {
    methodIs(req, "POST");
    const me = await currentUser(req);
    if (!me) throw new HttpError(401, "로그인이 필요합니다.");

    const { name = "file", type = "", data = "", kind = "attachment", user: userParam } = await body(req);
    const ext = ALLOWED[type];
    if (!ext) throw new HttpError(400, "사진(jpg·png·webp·gif), PDF, 워드, 파워포인트, 텍스트만 올릴 수 있습니다.");

    const targetId = userParam && userParam !== me.id ? userParam : me.id;
    if (targetId !== me.id && me.role !== "owner") throw new HttpError(403, "다른 사용자의 파일은 운영자만 올릴 수 있습니다.");
    if (!(await getUser(targetId))) throw new HttpError(404, "없는 사용자입니다.");

    const bytes = Buffer.from(String(data).split(",").pop() || "", "base64");
    if (!bytes.length) throw new HttpError(400, "파일이 비어 있습니다.");
    if (bytes.length > MAX) throw new HttpError(413, "파일은 6MB까지 올릴 수 있습니다.");

    const id = newId();
    const objectPath = `${targetId}/${id}.${ext}`;
    const url = await putObject(objectPath, bytes, type);
    const meta = await addFile({
      id, user_id: targetId, name: String(name).slice(0, 120), type, size: bytes.length,
      kind: kind === "photo" ? "photo" : "attachment", path: objectPath, url,
      created_at: new Date().toISOString(),
    });
    return ok(res, { file: meta });
  } catch (e) { fail(res, e); }
}
