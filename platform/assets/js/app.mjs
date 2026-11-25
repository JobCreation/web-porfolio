// 개인 admin: 이력 내용 편집, 서식 고르기, 첨부파일, 미리보기.
// 운영자는 주소에 ?user=<번호>를 붙여 다른 사람의 이력서도 같은 화면에서 고칠 수 있다.
import { api, readFileForUpload, setupTheme, THEME_BUTTON } from "./api.mjs";
import { SECTIONS, toText, fromText, blankItem } from "./fields.mjs";
import { renderResume, h } from "./render.mjs";

const $ = (id) => document.getElementById(id);
const targetUser = new URLSearchParams(location.search).get("user") || "";

let me = null;
let resume = null;       // { id, slug, template, published, data }
let templates = [];
let files = [];
let dirty = false;
let tab = "profile";
let editingOther = false;

const EXTRA_TABS = [{ key: "__setup", label: "서식·공개" }, { key: "__files", label: "첨부파일" }];

/* ---------- 공통 ---------- */

function say(text, cls) {
  const s = $("status");
  s.textContent = text || "";
  s.className = "status" + (cls ? " " + cls : "");
}
function markDirty() {
  dirty = true;
  $("save").disabled = false;
  say("저장하지 않은 변경이 있습니다");
}
function countOf(key) {
  const v = resume.data[key];
  return Array.isArray(v) ? v.length : null;
}

/* ---------- 시작 ---------- */

(async function start() {
  $("theme-slot").innerHTML = THEME_BUTTON;
  setupTheme($("theme"));
  try {
    const [{ user }, meta] = await Promise.all([api.me(), api.meta()]);
    if (!user) return location.replace("/");
    me = user;
    templates = meta.templates;

    const res = await api.resume(targetUser);
    resume = res.resume;
    editingOther = !!res.editingOther;
    files = (await api.files(targetUser).catch(() => ({ files: [] }))).files || [];

    $("who").innerHTML = "";
    $("who").append(editingOther ? "편집 중: " : "", h("b", null, editingOther ? resume.slug : me.name));
    $("nav-owner").hidden = me.role !== "owner";
    $("boot").hidden = true;
    $("editor").hidden = false;
    drawTabs();
    drawPane();
    drawPreview();
  } catch (e) {
    $("boot").textContent = "불러오지 못했습니다: " + e.message;
  }
})();

$("logout").addEventListener("click", async () => {
  if (dirty && !confirm("저장하지 않은 변경이 있습니다. 그래도 나갈까요?")) return;
  await api.logout().catch(() => {});
  location.href = "/";
});
$("print").addEventListener("click", () => window.open(publicUrl(), "_blank", "noopener"));
window.addEventListener("beforeunload", (ev) => { if (dirty) { ev.preventDefault(); ev.returnValue = ""; } });

function publicUrl() { return `${location.origin}/r/${resume.slug}`; }

/* ---------- 왼쪽 목록 ---------- */

function drawTabs() {
  const items = [
    ...SECTIONS.map((s) => ({ key: s.key, label: s.label, count: countOf(s.key) })),
    ...EXTRA_TABS.map((t) => ({ ...t, count: t.key === "__files" ? files.length : null })),
  ];
  $("tabs").replaceChildren(...items.map((it) =>
    h("button", { type: "button", "aria-current": String(it.key === tab), onclick: null },
      it.label, it.count != null ? h("small", null, String(it.count)) : null)
  ));
  [...$("tabs").children].forEach((btn, i) => {
    btn.addEventListener("click", () => { tab = items[i].key; drawTabs(); drawPane(); });
  });
}

/* ---------- 가운데 입력 ---------- */

function drawPane(openIndex) {
  const pane = $("pane");
  if (tab === "__setup") return drawSetup(pane);
  if (tab === "__files") return drawFiles(pane);

  const section = SECTIONS.find((s) => s.key === tab);
  const head = [
    h("h2", null, section.label),
    h("p", { class: "hint" }, section.desc || "고친 뒤 오른쪽 위 ‘저장’을 누르세요."),
  ];
  if (!resume.data[section.key]) resume.data[section.key] = section.kind === "list" ? [] : {};

  if (section.kind === "object") {
    pane.replaceChildren(...head, h("div", { class: "fields" },
      section.fields.map((f) => field(f, resume.data[section.key]))));
    return;
  }

  const list = resume.data[section.key];
  const items = list.map((item, i) => {
    const title = h("span", { class: "t" }, item[section.title] || "(이름 없음)");
    const act = (label, cls, disabled, fn) => {
      const b = h("button", { class: "btn tiny " + cls, type: "button", disabled }, label);
      b.addEventListener("click", (ev) => { ev.preventDefault(); fn(); });
      return b;
    };
    const move = (d) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      markDirty(); drawPane(j); drawPreview();
    };
    return h("details", { class: "item", open: i === openIndex },
      h("summary", null, title,
        act("↑", "quiet", i === 0, () => move(-1)),
        act("↓", "quiet", i === list.length - 1, () => move(1)),
        act("삭제", "danger", false, () => {
          if (!confirm(`'${item[section.title] || "이 항목"}' 을(를) 삭제할까요?`)) return;
          list.splice(i, 1);
          markDirty(); drawTabs(); drawPane(); drawPreview();
        })),
      h("div", { class: "fields" }, section.fields.map((f) =>
        field(f, item, f.key === section.title ? (v) => { title.textContent = v || "(이름 없음)"; } : null))));
  });

  const add = h("button", { class: "btn add", type: "button" }, "+ " + section.label + " 추가");
  add.addEventListener("click", () => {
    list.push(blankItem(section));
    markDirty(); drawTabs(); drawPane(list.length - 1); drawPreview();
    pane.querySelector(".item:last-of-type input")?.focus();
  });
  pane.replaceChildren(...head, ...items, add);
}

function field(f, obj, onTitle) {
  if (f.type === "photo") return photoField(f, obj);
  const multi = /^(textarea|lines|pairs)$/.test(f.type);
  const input = multi ? h("textarea", { rows: String(f.rows || 3) }) : h("input", { type: "text" });
  input.value = toText(f, obj[f.key]);
  input.addEventListener("input", () => {
    obj[f.key] = fromText(f, input.value);
    if (onTitle) onTitle(input.value);
    markDirty();
    schedulePreview();
  });
  return h("label", { class: f.wide ? "wide" : null }, f.label, input, f.hint ? h("small", null, f.hint) : null);
}

/* ---------- 사진 ---------- */

function photoField(f, obj) {
  const box = h("div", { class: "pick" });
  const picker = h("input", { type: "file", accept: "image/*", hidden: true });
  const draw = () => {
    const url = obj[f.key];
    const thumb = url ? h("img", { class: "thumb", src: url, alt: "" }) : h("div", { class: "thumb" }, "사진 없음");
    const pickBtn = h("button", { class: "btn tiny", type: "button" }, url ? "바꾸기" : "올리기");
    pickBtn.addEventListener("click", () => picker.click());
    const kids = [thumb, h("div", { class: "pick" }, pickBtn)];
    if (url) {
      const del = h("button", { class: "btn tiny danger", type: "button" }, "지우기");
      del.addEventListener("click", () => { obj[f.key] = ""; markDirty(); draw(); drawPreview(); });
      kids[1].append(del);
    }
    box.replaceChildren(...kids, picker);
  };
  picker.addEventListener("change", async () => {
    const file = picker.files[0];
    picker.value = "";
    if (!file) return;
    say("사진 올리는 중…");
    try {
      const payload = await readFileForUpload(file);
      const { file: saved } = await api.upload({ ...payload, kind: "photo" }, targetUser);
      obj[f.key] = saved.url;
      files.unshift(saved);
      markDirty(); draw(); drawPreview(); drawTabs();
      say("사진을 올렸습니다. ‘저장’을 눌러야 반영됩니다.");
    } catch (e) { say("사진 올리기 실패: " + e.message, "err"); }
  });
  draw();
  return h("div", { class: "wide" }, h("label", null, f.label), box);
}

/* ---------- 서식·공개 설정 ---------- */

function drawSetup(pane) {
  const tpl = h("div", { class: "tpl" });
  const drawTpl = () => {
    tpl.replaceChildren(...templates.map((t) => {
      const b = h("button", { type: "button", "aria-pressed": String(t.id === resume.template) },
        h("b", null, t.name), h("span", null, t.hint));
      b.addEventListener("click", () => {
        resume.template = t.id;
        markDirty(); drawTpl(); drawPreview();
      });
      return b;
    }));
  };
  drawTpl();

  const slug = h("input", { type: "text", value: resume.slug });
  slug.addEventListener("input", () => { resume.slug = slug.value.trim(); markDirty(); });

  const pub = h("input", { type: "checkbox" });
  pub.checked = !!resume.published;
  pub.addEventListener("change", () => { resume.published = pub.checked; markDirty(); });

  const openLink = h("a", { class: "btn tiny quiet", href: publicUrl(), target: "_blank", rel: "noopener" }, "공개 주소 열기");

  pane.replaceChildren(
    h("h2", null, "서식·공개"),
    h("p", { class: "hint" }, "서식을 바꾸면 오른쪽 미리보기가 바로 바뀝니다."),
    tpl,
    h("div", { class: "fields", style: "margin-top:14px" },
      h("label", { class: "wide" }, "공개 주소", slug, h("small", null, `${location.origin}/r/` + (resume.slug || ""))),
      h("label", { class: "wide", style: "grid-template-columns:auto 1fr;align-items:center;gap:8px" }, pub, "공개 주소로 보이게 하기"),
      h("div", { class: "wide" }, openLink)));
}

/* ---------- 첨부파일 ---------- */

function drawFiles(pane) {
  const picker = h("input", { type: "file", accept: "image/*,application/pdf,.doc,.docx,.ppt,.pptx,.txt", hidden: true });
  const addBtn = h("button", { class: "btn", type: "button" }, "+ 파일 올리기");
  addBtn.addEventListener("click", () => picker.click());
  picker.addEventListener("change", async () => {
    const file = picker.files[0];
    picker.value = "";
    if (!file) return;
    say("올리는 중…");
    try {
      const payload = await readFileForUpload(file, { shrinkImages: false });
      const { file: saved } = await api.upload(payload, targetUser);
      files.unshift(saved);
      drawTabs(); drawFiles(pane);
      say("올렸습니다.", "ok");
    } catch (e) { say("올리기 실패: " + e.message, "err"); }
  });

  const rows = files.map((f) => {
    const del = h("button", { class: "btn tiny danger", type: "button" }, "삭제");
    del.addEventListener("click", async () => {
      if (!confirm(`'${f.name}' 을(를) 지울까요?`)) return;
      try {
        await api.removeFile(f.id);
        files = files.filter((x) => x.id !== f.id);
        drawTabs(); drawFiles(pane);
        say("지웠습니다.", "ok");
      } catch (e) { say("삭제 실패: " + e.message, "err"); }
    });
    return h("div", { class: "f" },
      h("span", { class: "ic" }, (f.name.split(".").pop() || "?").slice(0, 4)),
      h("a", { class: "nm", href: f.url, target: "_blank", rel: "noopener" }, f.name),
      h("span", { class: "sz" }, Math.max(1, Math.round(f.size / 1024)) + "KB"),
      del);
  });

  pane.replaceChildren(
    h("h2", null, "첨부파일"),
    h("p", { class: "hint" }, "증명서, 포트폴리오 PDF 등을 올려 둡니다. 사진은 각 항목의 ‘사진’에서 올리면 이력서에 바로 나옵니다. 한 개당 6MB까지."),
    addBtn, picker,
    rows.length ? h("div", { class: "filelist" }, rows) : h("p", { class: "hint" }, "아직 올린 파일이 없습니다."));
}

/* ---------- 미리보기 ---------- */

let previewTimer = null;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(drawPreview, 250);
}
function drawPreview() {
  renderResume($("paper"), resume.data, resume.template);
  const t = templates.find((x) => x.id === resume.template);
  $("tpl-name").textContent = t ? t.name + " 서식" : "";
  $("nav-public").href = publicUrl();
}

/* ---------- 저장 ---------- */

$("save").addEventListener("click", async () => {
  $("save").disabled = true;
  say("저장하는 중…");
  try {
    const { resume: saved } = await api.saveResume({
      data: resume.data, template: resume.template, slug: resume.slug, published: resume.published,
    }, targetUser);
    resume = saved;
    dirty = false;
    drawPreview();
    if (tab === "__setup") drawPane();
    say("저장했습니다 ✓", "ok");
  } catch (e) {
    $("save").disabled = false;
    say("저장 실패: " + e.message, "err");
  }
});
