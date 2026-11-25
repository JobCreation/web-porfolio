// 운영자 화면: 모든 사용자의 이력서를 열어 고치고, 권한·비밀번호·삭제를 처리한다.
import { api, setupTheme, THEME_BUTTON } from "./api.mjs";
import { h } from "./render.mjs";

const $ = (id) => document.getElementById(id);
$("theme-slot").innerHTML = THEME_BUTTON;
setupTheme($("theme"));

let me = null;

function say(text, cls) {
  const m = $("msg");
  m.textContent = text || "";
  m.className = "msg" + (cls ? " " + cls : "");
}
const when = (iso) => (iso ? new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "—");

async function load() {
  $("status").textContent = "불러오는 중…";
  try {
    const [{ user }, { users }] = await Promise.all([api.me(), api.users()]);
    me = user;
    $("status").textContent = "";
    $("count").textContent = `${users.length}명 · 이력서 ${users.filter((u) => u.resume).length}개`;
    draw(users);
  } catch (e) {
    $("status").textContent = "";
    if (e.status === 401) return location.replace("/");
    if (e.status === 403) {
      $("count").textContent = "";
      return say("이 화면은 운영자만 볼 수 있습니다.");
    }
    say(e.message);
  }
}

function draw(users) {
  $("rows").replaceChildren(...users.map((u) => {
    const btn = (label, cls, fn) => {
      const b = h("button", { class: "btn tiny " + cls, type: "button" }, label);
      b.addEventListener("click", fn);
      return b;
    };
    const acts = h("div", { class: "acts" },
      h("a", { class: "btn tiny primary", href: `/app?user=${encodeURIComponent(u.id)}` }, "이력서 편집"),
      u.resume ? h("a", { class: "btn tiny quiet", href: `/r/${u.resume.slug}`, target: "_blank", rel: "noopener" }, "공개 보기") : null,
      btn(u.role === "owner" ? "운영자 해제" : "운영자로", "quiet", async () => {
        const next = u.role === "owner" ? "user" : "owner";
        if (!confirm(`${u.name} 님을 ${next === "owner" ? "운영자로 올릴까요" : "일반 사용자로 내릴까요"}?`)) return;
        await act(() => api.updateUser(u.id, { role: next }), "권한을 바꿨습니다.");
      }),
      btn("이름 바꾸기", "quiet", async () => {
        const name = prompt("새 이름", u.name || "");
        if (name == null || !name.trim()) return;
        await act(() => api.updateUser(u.id, { name: name.trim() }), "이름을 바꿨습니다.");
      }),
      btn("비밀번호 재설정", "quiet", async () => {
        const pw = prompt(`${u.name} 님의 새 비밀번호 (8자 이상)`);
        if (!pw) return;
        await act(() => api.updateUser(u.id, { password: pw }), "비밀번호를 바꿨습니다. 본인에게 알려 주세요.");
      }),
      u.id === me?.id ? null : btn("삭제", "danger", async () => {
        if (!confirm(`${u.name}(${u.email}) 계정과 이력서, 올린 파일을 모두 지울까요? 되돌릴 수 없습니다.`)) return;
        await act(() => api.deleteUser(u.id), "계정을 지웠습니다.");
      }));

    return h("tr", null,
      h("td", null, h("b", null, u.name || "—")),
      h("td", null, u.email),
      h("td", null, h("span", { class: "tag " + (u.role === "owner" ? "owner" : "") }, u.role === "owner" ? "운영자" : "사용자")),
      h("td", null, u.resume ? h("span", null, "/r/" + u.resume.slug, u.resume.published ? "" : " (비공개)") : "—"),
      h("td", null, u.resume ? u.resume.template : "—"),
      h("td", null, when(u.resume?.updated_at)),
      h("td", null, acts));
  }));
}

async function act(fn, done) {
  say("처리하는 중…", "ok");
  try {
    await fn();
    say(done, "ok");
    await load();
  } catch (e) { say(e.message); }
}

$("reload").addEventListener("click", load);
load();
