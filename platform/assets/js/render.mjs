// 이력서 그리기. 같은 자료로 서식 5가지를 만든다. 미리보기와 공개 화면이 함께 쓴다.
export const TEMPLATE_NAMES = { dense: "밀집형", modern: "모던", timeline: "타임라인", compact: "한 장", card: "카드" };

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  add(el, kids);
  return el;
}
function add(el, kid) {
  if (kid == null || kid === false) return;
  if (Array.isArray(kid)) kid.forEach((k) => add(el, k));
  else el.append(kid);
}
const has = (a) => Array.isArray(a) && a.length > 0;
const txt = (s) => String(s == null ? "" : s).trim();

function safeUrl(u) {
  let raw = txt(u);
  if (!raw) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && /^[\w-]+(\.[\w-]+)+([/?#]|$)/.test(raw)) raw = "https://" + raw;
  try {
    const p = new URL(raw, location.href);
    return /^(https?|mailto|tel):$/.test(p.protocol) ? p.href : null;
  } catch { return null; }
}
function hostLabel(href) {
  try {
    const u = new URL(href);
    return /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\./, "") : u.pathname;
  } catch { return "링크"; }
}
export function link(label, url, cls) {
  let href = safeUrl(url);
  let text = txt(label);
  if (!href && (/^(https?:\/\/|mailto:|tel:)/i.test(text) || /^[\w-]+(\.[\w-]+)+([/?#]|$)/.test(text))) {
    href = safeUrl(text);
    text = "";
  }
  if (!href) return null;
  if (!text) text = hostLabel(href);
  const ext = /^https?:/.test(href) && !href.startsWith(location.origin);
  return h("a", { class: cls, href, target: ext ? "_blank" : null, rel: ext ? "noopener" : null }, text);
}
function paragraphs(text) {
  return txt(text).split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean).map((s) => h("p", null, s));
}
const num = (i) => String(i + 1).padStart(2, "0");

// 사진 주소. 올린 파일은 전체 주소로 오고, 예전 자료는 uploads/... 같은 상대 경로일 수 있다.
function imgSrc(v) {
  const raw = txt(v);
  if (!raw) return "";
  if (/^(https?:|data:|\/)/i.test(raw)) return raw;
  return "/" + raw.replace(/^\.?\//, "");
}

/* ---------- 머리글 ---------- */

function header(d, opts) {
  const p = d.profile || {};
  const name = txt(p.name) || "이름";
  const photo = p.photo
    ? h("img", { class: "photo", src: imgSrc(p.photo), alt: name + " 사진", loading: "lazy" })
    : h("div", { class: "photo ph", "aria-hidden": "true" }, name.slice(0, 1));
  const contacts = [
    link(p.email, "mailto:" + p.email, "c"),
    p.phone && link(p.phone, "tel:" + txt(p.phone).replace(/[^0-9+]/g, ""), "c"),
    link("이력서", p.resumeUrl, "c"),
    link("포트폴리오", p.portfolioUrl, "c"),
    ...(p.links || []).map((l) => link(l.label, l.url, "c")),
  ].filter(Boolean);
  return h("header", { class: "r-head" },
    photo,
    h("div", { class: "who" },
      p.tagline && h("div", { class: "label" }, p.tagline),
      h("h1", null, name, p.nameEn && h("small", null, p.nameEn)),
      p.role && h("p", { class: "role" }, p.role),
      p.headline && h("p", { class: "headline" }, p.headline),
      contacts.length ? h("div", { class: "contacts" }, contacts) : null),
    has(d.stats) && opts.stats !== false
      ? h("div", { class: "r-stats" }, d.stats.map((s) => h("div", null, h("b", null, s.value), h("span", null, s.label))))
      : null);
}

/* ---------- 토막 ---------- */

function block(title, inner, cls) {
  if (!inner) return null;
  return h("section", { class: "blk " + (cls || "") }, h("h2", null, title), inner);
}

function rows(items, whenKey) {
  return h("div", { class: "rows" }, items.map((x) => h("div", { class: "row" },
    h("div", { class: "when" }, x[whenKey]),
    h("div", null,
      h("h3", null, x.title),
      x.org && h("span", { class: "org" }, x.org),
      x.description && h("p", null, x.description)))));
}

const B = {
  about: (d) => {
    const p = d.profile || {};
    if (!txt(p.bio) && !has(d.principles)) return null;
    return block("소개", h("div", null,
      txt(p.bio) && h("div", { class: "prose" }, paragraphs(p.bio)),
      has(d.principles) && h("ul", { class: "chips" }, d.principles.map((x) =>
        h("li", null, h("b", null, x.key), x.text)))));
  },
  capabilities: (d) => !has(d.capabilities) ? null : block("핵심 역량",
    h("div", { class: "caps" }, d.capabilities.map((c, i) => h("article", null,
      h("h3", null, h("i", null, num(i)), c.title),
      c.summary && h("p", null, c.summary),
      has(c.evidence) && h("ul", null, c.evidence.map((t) => h("li", null, t))))))),
  projects: (d) => !has(d.projects) ? null : block("프로젝트",
    h("div", { class: "projects" }, d.projects.map((p) => h("article", null,
      p.image && h("img", { class: "shot", src: imgSrc(p.image), alt: "", loading: "lazy" }),
      h("div", { class: "pb" },
        h("div", { class: "label" }, [p.period, p.role].filter(Boolean).join(" · ")),
        h("h3", null, p.title),
        p.summary && h("p", { class: "sum" }, p.summary),
        has(p.highlights) && h("ul", null, p.highlights.map((t) => h("li", null, t))),
        has(p.metrics) && h("div", { class: "metrics" }, p.metrics.map((m) =>
          h("div", null, h("b", null, m.value), h("span", null, m.label)))),
        has(p.stack) && h("div", { class: "tags" }, p.stack.map((t) => h("span", null, t))),
        has(p.links) && h("div", { class: "links" }, p.links.map((l) => link(l.label, l.url, "btn-s")))))))),
  experience: (d) => !has(d.experience) ? null : block("경력·활동", rows(d.experience, "period")),
  education: (d) => !has(d.education) ? null : block("학력·교육", rows(d.education, "period")),
  awards: (d) => !has(d.awards) ? null : block("자격·수상", rows(d.awards, "date")),
  skills: (d) => !has(d.skills) ? null : block("보유 기술",
    h("div", { class: "skills" }, d.skills.map((g) => h("div", null,
      h("h3", null, g.group),
      h("ul", null, (g.items || []).map((t) => h("li", null, t))))))),
  process: (d) => !has(d.process) ? null : block("업무 흐름",
    h("ol", { class: "flow" }, d.process.map((s, i) => h("li", null,
      h("div", { class: "label" }, num(i) + (s.when ? " · " + s.when : "")),
      h("h3", null, s.title),
      s.text && h("p", null, s.text))))),
  story: (d) => !has(d.story) ? null : block("커리어 스토리",
    h("div", { class: "story" }, d.story.map((s) => h("article", null,
      h("div", { class: "label" }, [s.chapter, s.period].filter(Boolean).join(" · ")),
      h("h3", null, s.title),
      s.text && h("p", null, s.text),
      s.org && h("span", { class: "who" }, s.org))))),
  contribution: (d) => !has(d.contribution) ? null : block("기여하고 싶은 일",
    h("div", { class: "contrib" }, d.contribution.map((c, i) => h("div", null,
      h("b", null, num(i)), h("h3", null, c.title), c.text && h("p", null, c.text))))),
};

/* ---------- 서식 ---------- */

const LAYOUTS = {
  // 두 단: 왼쪽은 이야기, 오른쪽은 목록
  dense: { cols: [["about", "capabilities", "projects", "experience"], ["skills", "education", "awards", "process", "story", "contribution"]] },
  modern: { single: ["about", "capabilities", "projects", "process", "experience", "story", "education", "awards", "skills", "contribution"] },
  timeline: { single: ["about", "story", "experience", "education", "projects", "capabilities", "awards", "skills"] },
  compact: { cols: [["capabilities", "experience", "projects"], ["skills", "education", "awards"]], noBio: true },
  card: { single: ["about", "capabilities", "projects", "experience", "education", "awards", "skills", "contribution"] },
};

export function renderResume(root, data, template) {
  const d = data || {};
  const key = LAYOUTS[template] ? template : "dense";
  const layout = LAYOUTS[key];
  const view = h("div", { class: "resume t-" + key });
  view.append(header(d, { stats: key !== "compact" }));

  const make = (name) => {
    if (layout.noBio && name === "about") {
      return has(d.principles) ? B.about({ profile: {}, principles: d.principles }) : null;
    }
    return B[name] ? B[name](d) : null;
  };

  if (layout.single) {
    view.append(h("div", { class: "r-body one" }, layout.single.map(make).filter(Boolean)));
  } else {
    const [a, b] = layout.cols;
    view.append(h("div", { class: "r-body two" },
      h("div", { class: "col main" }, a.map(make).filter(Boolean)),
      h("div", { class: "col side" }, b.map(make).filter(Boolean))));
  }
  root.replaceChildren(view);
  return view;
}
