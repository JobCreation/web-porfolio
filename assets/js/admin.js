// 관리자 페이지.
// 수정한 내용과 사진은 GitHub API로 이 저장소에 바로 커밋되고, 약 1분 뒤 사이트에 반영된다.
// GitHub 토큰은 관리자 비밀번호로 암호화해 data/auth.json 에 두고, 로그인할 때 브라우저 안에서만 푼다.
(function () {
  "use strict";

  var CFG = window.PORTFOLIO_CONFIG;
  var API = "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo;
  var AUTH_PATH = "data/auth.json";
  var CONTENT_PATH = "data/content.json";
  var KDF_ROUNDS = 600000;

  var token = null;       // 로그인 중에만 메모리와 sessionStorage(탭을 닫으면 사라짐)에 있다
  var content = null;     // 편집 중인 내용
  var dirty = false;
  var tab = "profile";
  var previews = {};      // 방금 올린 사진의 미리보기 (사이트 반영 전에도 보이게)
  var pendingDeletes = {}; // 저장할 때 저장소에서 지울 사진 경로

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 편집 항목 정의 ---------- */

  var SECTIONS = [
    { key: "profile", label: "프로필·사진", kind: "object", desc: "첫 화면과 소개, 연락처에 쓰입니다.", fields: [
      { key: "photo", label: "프로필 사진", type: "image", wide: true },
      { key: "name", label: "이름" },
      { key: "nameEn", label: "영문 이름" },
      { key: "role", label: "직함" },
      { key: "tagline", label: "이름 위 작은 글씨" },
      { key: "headline", label: "한 줄 소개", type: "textarea", wide: true },
      { key: "bio", label: "소개 글 (빈 줄로 문단 구분)", type: "textarea", wide: true, rows: 7 },
      { key: "email", label: "이메일" },
      { key: "resumeUrl", label: "이력서 링크 (없으면 비움)" },
      { key: "portfolioUrl", label: "포트폴리오 링크 (없으면 비움)" },
      { key: "phone", label: "전화번호 (없으면 비움)" },
      { key: "contactLine", label: "연락 섹션 문구", wide: true },
      { key: "links", label: "링크 (여러 개 가능)", type: "pairs", keys: ["label", "url"], rows: 5,
        hint: "한 줄에 하나:  이름 | 주소   (이름 없이 주소만 넣어도 됩니다)", wide: true },
    ] },
    { key: "projects", label: "프로젝트", kind: "list", title: "title", desc: "위에 있는 항목이 사이트에서도 먼저 보입니다.", fields: [
      { key: "image", label: "대표 사진", type: "image", wide: true },
      { key: "title", label: "프로젝트 이름" },
      { key: "period", label: "기간" },
      { key: "role", label: "역할" },
      { key: "tags", label: "분류 (쉼표로 구분, 필터에 쓰임)", type: "csv" },
      { key: "summary", label: "한 줄 설명", type: "textarea", wide: true, rows: 2 },
      { key: "highlights", label: "주요 내용", type: "lines", hint: "한 줄에 하나", wide: true, rows: 5 },
      { key: "stack", label: "사용 기술 (쉼표로 구분)", type: "csv", wide: true },
      { key: "metrics", label: "수치", type: "pairs", keys: ["value", "label"], hint: "한 줄에 하나:  값 | 설명", wide: true },
      { key: "links", label: "링크", type: "pairs", keys: ["label", "url"], hint: "한 줄에 하나:  이름 | 주소", wide: true },
    ] },
    { key: "capabilities", label: "핵심 역량", kind: "list", title: "title", desc: "잘하는 일과 그 근거를 짝지어 보여 줍니다. 3~4개가 보기 좋습니다.", fields: [
      { key: "title", label: "역량 이름" },
      { key: "summary", label: "한 줄 설명" },
      { key: "evidence", label: "근거", type: "lines", hint: "한 줄에 하나 (프로젝트, 수치, 경험)", wide: true, rows: 4 },
    ] },
    { key: "process", label: "업무 흐름", kind: "list", title: "title", desc: "일을 어떤 순서로 하는지 단계로 보여 줍니다. 3~4개가 보기 좋습니다.", fields: [
      { key: "title", label: "단계 이름" },
      { key: "when", label: "시점 (예: 시작 전, 개발 중)" },
      { key: "text", label: "설명", type: "textarea", wide: true },
    ] },
    { key: "experience", label: "경력·활동", kind: "list", title: "title", fields: [
      { key: "period", label: "기간" }, { key: "title", label: "직무·활동" }, { key: "org", label: "소속", wide: true },
      { key: "description", label: "설명", type: "textarea", wide: true },
    ] },
    { key: "story", label: "커리어 스토리", kind: "list", title: "title", desc: "지금까지의 흐름을 이야기로 보여 줍니다.", fields: [
      { key: "chapter", label: "장 (예: 1막)" },
      { key: "period", label: "시기" },
      { key: "title", label: "제목 (예: 시스템을 배우다)" },
      { key: "org", label: "소속·장소" },
      { key: "text", label: "설명", type: "textarea", wide: true },
    ] },
    { key: "education", label: "학력·교육", kind: "list", title: "title", fields: [
      { key: "period", label: "기간" }, { key: "title", label: "과정·학위" }, { key: "org", label: "기관", wide: true },
      { key: "description", label: "설명", type: "textarea", wide: true },
    ] },
    { key: "awards", label: "자격·수상", kind: "list", title: "title", fields: [
      { key: "date", label: "날짜" }, { key: "title", label: "자격증·상 이름" }, { key: "org", label: "발급·주최 기관", wide: true },
    ] },
    { key: "skills", label: "보유 기술", kind: "list", title: "group", fields: [
      { key: "group", label: "묶음 이름", wide: true },
      { key: "items", label: "기술", type: "lines", hint: "한 줄에 하나", wide: true },
    ] },
    { key: "contribution", label: "기여하고 싶은 일", kind: "list", title: "title", desc: "입사 후 또는 앞으로 맡고 싶은 역할입니다.", fields: [
      { key: "title", label: "영역" },
      { key: "text", label: "설명", type: "textarea", wide: true },
    ] },
    { key: "stats", label: "핵심 수치", kind: "list", title: "label", desc: "첫 화면 아래 큰 숫자입니다. 3~4개가 보기 좋습니다.", fields: [
      { key: "value", label: "값" }, { key: "label", label: "설명" },
    ] },
    { key: "principles", label: "일하는 원칙", kind: "list", title: "key", desc: "소개 글 아래 짧은 원칙입니다. 단계별 흐름은 '업무 흐름'에 적습니다.", fields: [
      { key: "key", label: "키워드" }, { key: "text", label: "문장" },
    ] },
  ];

  /* ---------- 작은 도구 ---------- */

  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) el.append(x); }); else el.append(c);
    }
    return el;
  }
  function bytesToB64(u8) {
    var s = "";
    for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    var s = atob(String(b64).replace(/\s/g, ""));
    var u8 = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }
  var enc = new TextEncoder(), dec = new TextDecoder();
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- GitHub API ---------- */

  async function gh(path, opts) {
    opts = opts || {};
    var headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    var t = opts.token === undefined ? token : opts.token;
    if (t) headers.Authorization = "Bearer " + t;
    var res = await fetch(API + path, {
      method: opts.method || "GET", headers: headers, cache: "no-store",
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      var detail = "";
      try { detail = (await res.json()).message || ""; } catch (e) {}
      var err = new Error(detail || ("GitHub 응답 " + res.status));
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  async function getFile(path, t) {
    try {
      var f = await gh("/contents/" + path + "?ref=" + CFG.branch, { token: t });
      return { sha: f.sha, text: dec.decode(b64ToBytes(f.content)) };
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }
  async function putFile(path, b64, message, t) {
    for (var attempt = 0; ; attempt++) {
      var cur = await getFile(path, t).catch(function (e) { if (e.status === 403) return null; throw e; });
      try {
        return await gh("/contents/" + path, { method: "PUT", token: t, body: {
          message: message, content: b64, branch: CFG.branch, sha: cur ? cur.sha : undefined } });
      } catch (e) {
        if (e.status === 409 && attempt < 2) { await sleep(800); continue; } // 방금 다른 커밋이 끼어든 경우
        throw e;
      }
    }
  }
  async function deleteFile(path) {
    var cur = await getFile(path);
    if (!cur) return;
    await gh("/contents/" + path, { method: "DELETE", body: { message: "사진 삭제: " + path, sha: cur.sha, branch: CFG.branch } });
  }
  function explain(e) {
    if (e.status === 401) return "토큰이 만료됐거나 올바르지 않습니다. '비밀번호를 잊었거나 토큰이 만료됐어요'에서 새 토큰으로 다시 설정해 주세요.";
    if (e.status === 403 || e.status === 404) return "이 토큰에는 저장소에 쓸 권한이 없습니다. 토큰의 저장소 선택과 Contents 권한(Read and write)을 확인해 주세요. (" + e.message + ")";
    return e.message;
  }

  /* ---------- 암호화 (토큰을 비밀번호로 잠근다) ---------- */

  async function deriveKey(password, salt, rounds) {
    var base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: rounds, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function lock(secret, password) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(password, salt, KDF_ROUNDS);
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(secret));
    return { v: 1, kdf: "PBKDF2-SHA256", rounds: KDF_ROUNDS, salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(ct)) };
  }
  async function unlock(box, password) {
    var key = await deriveKey(password, b64ToBytes(box.salt), box.rounds);
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(box.iv) }, key, b64ToBytes(box.data));
    return dec.decode(pt);
  }

  /* ---------- 로그인 화면 ---------- */

  var authBox = null;

  function gateMsg(text, ok) { var m = $("gate-msg"); m.textContent = text || ""; m.className = "msg" + (ok ? " ok" : ""); }
  function showGate(mode) {
    $("app").hidden = true; $("gate").hidden = false; gateMsg("");
    var setup = mode === "setup";
    $("login-form").hidden = setup; $("setup-form").hidden = !setup;
    $("to-login").hidden = !authBox;
    $("gate-title").textContent = setup ? (authBox ? "토큰·비밀번호 다시 설정" : "처음 설정") : "관리자 로그인";
    $("gate-desc").textContent = setup
      ? "GitHub 토큰을 한 번 등록하고 관리자 비밀번호를 정합니다. 토큰은 이 비밀번호로 암호화되어 저장됩니다."
      : "비밀번호를 입력하면 편집 화면이 열립니다.";
    (setup ? $("setup-token") : $("login-pw")).focus();
  }
  async function loadAuthBox() {
    try {
      var f = await getFile(AUTH_PATH, null);
      return f ? JSON.parse(f.text) : null;
    } catch (e) {
      // 로그인 전 API 호출 한도에 걸리면 사이트에 배포된 파일을 읽는다
      var r = await fetch("../" + AUTH_PATH + "?t=" + Date.now(), { cache: "no-store" });
      return r.ok ? r.json() : null;
    }
  }
  function busy(form, on) { form.querySelectorAll("button, input").forEach(function (el) { el.disabled = on; }); }

  $("login-form").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var form = ev.currentTarget, pw = $("login-pw").value;
    busy(form, true); gateMsg("확인하는 중…", true);
    try {
      var t;
      try { t = await unlock(authBox, pw); }
      catch (e) { await sleep(600); throw new Error("비밀번호가 맞지 않습니다."); }
      await gh("", { token: t });
      $("login-pw").value = "";
      await enter(t);
    } catch (e) { gateMsg(e.status ? explain(e) : e.message); }
    busy(form, false);
  });

  $("setup-form").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var form = ev.currentTarget;
    var t = $("setup-token").value.trim(), pw = $("setup-pw").value;
    if (pw.length < 10) return gateMsg("비밀번호는 10자 이상으로 정해 주세요.");
    if (pw !== $("setup-pw2").value) return gateMsg("두 비밀번호가 서로 다릅니다.");
    busy(form, true); gateMsg("토큰을 확인하고 저장하는 중…", true);
    try {
      await gh("", { token: t });
      var box = await lock(t, pw);
      // 이 파일을 쓸 수 있다는 것 자체가 토큰에 쓰기 권한이 있다는 확인이다
      await putFile(AUTH_PATH, bytesToB64(enc.encode(JSON.stringify(box, null, 2) + "\n")), "관리자 로그인 설정", t);
      authBox = box;
      form.reset();
      await enter(t);
    } catch (e) { gateMsg(e.status ? explain(e) : e.message); }
    busy(form, false);
  });
  $("to-setup").addEventListener("click", function () { showGate("setup"); });
  $("to-login").addEventListener("click", function () { showGate("login"); });

  /* ---------- 편집 화면 ---------- */

  function status(text, cls) { var s = $("status"); s.textContent = text || ""; s.className = "status" + (cls ? " " + cls : ""); }
  function markDirty() {
    dirty = true; $("save").disabled = false;
    status("저장하지 않은 변경이 있습니다");
  }

  async function enter(t) {
    token = t;
    try { sessionStorage.setItem("pf-token", t); } catch (e) {}
    var f = await getFile(CONTENT_PATH);
    content = f ? JSON.parse(f.text) : {};
    SECTIONS.forEach(function (s) { if (content[s.key] == null) content[s.key] = s.kind === "list" ? [] : {}; });
    dirty = false; $("save").disabled = true; previews = {}; pendingDeletes = {};
    $("view-site").href = CFG.siteUrl;
    $("gate").hidden = true; $("app").hidden = false;
    status("");
    drawTabs(); drawPanel();
  }

  function drawTabs() {
    $("tabs").replaceChildren.apply($("tabs"), SECTIONS.map(function (s) {
      return h("button", { type: "button", "aria-current": String(s.key === tab), onclick: function () { tab = s.key; drawTabs(); drawPanel(); } },
        s.label, s.kind === "list" ? h("small", null, String(content[s.key].length)) : null);
    }));
  }

  function drawPanel(openIndex) {
    var s = SECTIONS.filter(function (x) { return x.key === tab; })[0];
    var panel = $("panel");
    var head = [h("h2", null, s.label), h("p", null, s.desc || "항목을 추가·수정·삭제한 뒤 오른쪽 위 '저장'을 누르세요.")];
    if (s.kind === "object") {
      panel.replaceChildren.apply(panel, head.concat([h("div", { class: "box fields" }, s.fields.map(function (f) { return field(f, content[s.key]); }))]));
      return;
    }
    var list = content[s.key];
    function move(i, d) {
      var j = i + d; if (j < 0 || j >= list.length) return;
      var x = list[i]; list[i] = list[j]; list[j] = x;
      markDirty(); drawPanel(j);
    }
    var items = list.map(function (item, i) {
      var titleEl = h("span", { class: "t" }, item[s.title] || "(이름 없음)");
      function act(label, fn, cls, off) {
        return h("button", { class: "btn small " + (cls || "quiet"), type: "button", disabled: off, "aria-label": label + ": " + (item[s.title] || ""),
          onclick: function (ev) { ev.preventDefault(); fn(); } }, label);
      }
      return h("details", { class: "item", open: i === openIndex },
        h("summary", null, titleEl,
          act("↑", function () { move(i, -1); }, "", i === 0),
          act("↓", function () { move(i, 1); }, "", i === list.length - 1),
          act("삭제", function () {
            if (!confirm("'" + (item[s.title] || "이 항목") + "' 을(를) 삭제할까요?")) return;
            if (item.image) queueDelete(item.image);
            list.splice(i, 1); markDirty(); drawTabs(); drawPanel();
          }, "danger")),
        h("div", { class: "fields" }, s.fields.map(function (f) {
          return field(f, item, f.key === s.title ? function (v) { titleEl.textContent = v || "(이름 없음)"; } : null);
        })));
    });
    var add = h("button", { class: "btn add", type: "button", onclick: function () {
      var blank = {};
      s.fields.forEach(function (f) { blank[f.key] = /^(lines|csv|pairs)$/.test(f.type) ? [] : ""; });
      list.push(blank); markDirty(); drawTabs(); drawPanel(list.length - 1);
      var last = $("panel").querySelector(".item:last-of-type input[type=text]");
      if (last) last.focus();
    } }, "+ " + s.label + " 추가");
    panel.replaceChildren.apply(panel, head.concat(items, [add]));
  }

  // 화면에 보이는 글 <-> 저장되는 값 변환
  function toText(f, v) {
    if (f.type === "lines") return (v || []).join("\n");
    if (f.type === "csv") return (v || []).join(", ");
    if (f.type === "pairs") return (v || []).map(function (p) { return (p[f.keys[0]] || "") + " | " + (p[f.keys[1]] || ""); }).join("\n");
    return v || "";
  }
  function fromText(f, text) {
    var clean = function (s) { return s.trim(); };
    if (f.type === "lines") return text.split("\n").map(clean).filter(Boolean);
    if (f.type === "csv") return text.split(",").map(clean).filter(Boolean);
    if (f.type === "pairs") return text.split("\n").map(clean).filter(Boolean).map(function (line) {
      var i = line.indexOf("|"), o = {};
      o[f.keys[0]] = clean(i < 0 ? line : line.slice(0, i));
      o[f.keys[1]] = i < 0 ? "" : clean(line.slice(i + 1));
      return o;
    });
    return text;
  }

  function field(f, obj, onChange) {
    if (f.type === "image") return imageField(f, obj);
    var multi = /^(textarea|lines|pairs)$/.test(f.type);
    var input = multi ? h("textarea", { rows: f.rows || 3 }) : h("input", { type: "text" });
    input.value = toText(f, obj[f.key]);
    input.addEventListener("input", function () {
      obj[f.key] = fromText(f, input.value);
      if (onChange) onChange(input.value);
      markDirty();
    });
    return h("label", { class: f.wide ? "wide" : null }, f.label, input, f.hint ? h("small", null, f.hint) : null);
  }

  /* ---------- 사진 ---------- */

  function queueDelete(path) { if (/^uploads\//.test(path || "")) pendingDeletes[path] = true; }

  // 큰 사진은 긴 변 1600px 로 줄여 JPEG 로 올린다
  async function shrink(file) {
    var bmp = await createImageBitmap(file);
    var k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    var c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    var dataUrl = c.toDataURL("image/jpeg", 0.86);
    return { dataUrl: dataUrl, b64: dataUrl.split(",")[1] };
  }

  function imageField(f, obj) {
    var wrap = h("div", { class: "image" });
    var file = h("input", { type: "file", accept: "image/*", hidden: true });
    function draw() {
      var path = obj[f.key];
      var thumb = path
        ? h("img", { class: "thumb", alt: "", src: previews[path] || (/^uploads\//.test(path) ? "../" + path : path) })
        : h("div", { class: "thumb" }, "사진 없음");
      wrap.replaceChildren(thumb, h("div", { class: "acts" },
        h("button", { class: "btn small", type: "button", onclick: function () { file.click(); } }, path ? "사진 바꾸기" : "사진 올리기"),
        path ? h("button", { class: "btn small danger", type: "button", onclick: function () {
          queueDelete(path); obj[f.key] = ""; markDirty(); draw();
        } }, "사진 삭제") : null), file);
    }
    file.addEventListener("change", async function () {
      var picked = file.files[0];
      if (!picked) return;
      status("사진 올리는 중…");
      try {
        var img = await shrink(picked);
        var path = "uploads/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
        await putFile(path, img.b64, "사진 추가: " + path);
        queueDelete(obj[f.key]);
        previews[path] = img.dataUrl;
        obj[f.key] = path;
        markDirty(); draw();
        status("사진을 올렸습니다. '저장'을 눌러야 사이트에 적용됩니다.");
      } catch (e) { status("사진 올리기 실패: " + (e.status ? explain(e) : e.message), "err"); }
      file.value = "";
    });
    draw();
    return h("div", { class: "wide" }, h("label", null, f.label), wrap);
  }

  /* ---------- 저장 ---------- */

  $("save").addEventListener("click", async function () {
    var btn = $("save");
    btn.disabled = true; status("저장하는 중…");
    try {
      content.meta = { updatedAt: new Date().toISOString() };
      await putFile(CONTENT_PATH, bytesToB64(enc.encode(JSON.stringify(content, null, 2) + "\n")), "관리자 페이지에서 내용 수정");
      var del = Object.keys(pendingDeletes); pendingDeletes = {};
      for (var i = 0; i < del.length; i++) { try { await deleteFile(del[i]); } catch (e) {} }
      dirty = false;
      waitForDeploy(content.meta.updatedAt);
    } catch (e) {
      btn.disabled = false;
      status("저장 실패: " + (e.status ? explain(e) : e.message), "err");
    }
  });

  // 저장한 내용이 실제 사이트에 올라올 때까지 확인한다 (보통 1분 안팎)
  async function waitForDeploy(stamp) {
    status("저장했습니다. 사이트에 반영되는 중… (약 1분)");
    for (var i = 0; i < 40; i++) {
      await sleep(6000);
      if (dirty || !content || content.meta.updatedAt !== stamp) return;
      try {
        var r = await fetch(CFG.siteUrl + CONTENT_PATH + "?t=" + Date.now(), { cache: "no-store" });
        if (r.ok && ((await r.json()).meta || {}).updatedAt === stamp) return status("사이트에 반영되었습니다 ✓", "ok");
      } catch (e) {}
    }
    status("저장은 됐지만 반영 확인이 늦어지고 있습니다. 잠시 뒤 사이트를 새로고침해 보세요.");
  }

  $("logout").addEventListener("click", function () {
    if (dirty && !confirm("저장하지 않은 변경이 있습니다. 그래도 로그아웃할까요?")) return;
    token = null; content = null; dirty = false;
    try { sessionStorage.removeItem("pf-token"); } catch (e) {}
    showGate("login");
  });
  window.addEventListener("beforeunload", function (ev) { if (dirty) { ev.preventDefault(); ev.returnValue = ""; } });

  /* ---------- 시작 ---------- */

  (async function start() {
    try { authBox = await loadAuthBox(); } catch (e) { authBox = null; }
    var saved = null;
    try { saved = sessionStorage.getItem("pf-token"); } catch (e) {}
    if (saved && authBox) {
      try { await gh("", { token: saved }); return await enter(saved); } catch (e) {}
    }
    showGate(authBox ? "login" : "setup");
  })();
})();
