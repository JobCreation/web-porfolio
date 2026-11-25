// 포트폴리오 화면: data/content.json 을 읽어 그린다. 내용 수정은 관리자 페이지에서 한다.
(function () {
  "use strict";

  // h("div", {class: "x"}, 자식...) 형태로 요소를 만든다. 문자열은 항상 텍스트로 들어간다.
  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) child.forEach(function (c) { append(el, c); });
    else el.append(child);
  }

  // http(s), mailto, tel 주소와 사이트 안 경로만 링크로 허용한다. 빈 칸은 링크가 아니다.
  function safeUrl(u) {
    var raw = String(u == null ? "" : u).trim();
    if (!raw) return null;
    // example.com 처럼 http 없이 적어도 주소로 본다
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && /^[\w-]+(\.[\w-]+)+([/?#]|$)/.test(raw)) raw = "https://" + raw;
    try {
      var p = new URL(raw, location.href);
      return /^(https?|mailto|tel):$/.test(p.protocol) ? p.href : null;
    } catch (e) { return null; }
  }
  // 이름 없이 주소만 넣어도 되고, 이름 칸에 주소를 넣어도 링크가 된다
  function link(label, url, cls) {
    var href = safeUrl(url);
    var text = String(label == null ? "" : label).trim();
    if (!href && looksLikeUrl(text)) { href = safeUrl(text); text = ""; }
    if (!href) return null;
    if (!text) text = hostLabel(href);
    var ext = /^https?:/.test(href) && href.indexOf(location.origin) !== 0;
    return h("a", { class: cls, href: href, target: ext ? "_blank" : null, rel: ext ? "noopener" : null }, text, ext ? " ↗" : null);
  }
  // 이름 칸에 들어온 글이 주소인지 (사이트 안 경로는 주소로 보지 않는다)
  function looksLikeUrl(text) {
    return /^(https?:\/\/|mailto:|tel:)/i.test(text) || /^[\w-]+(\.[\w-]+)+([/?#]|$)/.test(text);
  }
  function hostLabel(href) {
    try {
      var u = new URL(href);
      return /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\./, "") : u.pathname;
    } catch (e) { return "링크"; }
  }
  function has(a) { return Array.isArray(a) && a.length > 0; }
  function paragraphs(text) {
    return String(text || "").split(/\n\s*\n|\n/).map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (s) { return h("p", null, s); });
  }

  /* ---------- 섹션 ---------- */

  function hero(d) {
    var p = d.profile || {};
    var name = p.name || "이름";
    var photo = p.photo
      ? h("img", { src: p.photo, alt: name + " 사진" })
      : h("div", { class: "ph", "aria-hidden": "true" }, name.slice(0, 1));
    return h("section", { class: "hero wrap" },
      h("div", { class: "hero-grid" },
        h("div", null,
          h("div", { class: "label" }, p.tagline || "Portfolio"),
          h("h1", null, name, h("span", null, ".")),
          p.role && h("p", { class: "role" }, (p.nameEn ? p.nameEn + "  /  " : "") + p.role),
          p.headline && h("p", { class: "headline" }, p.headline),
          h("div", { class: "cta" },
            has(d.projects) && h("a", { class: "btn primary", href: "#projects" }, "프로젝트 보기 ↓"),
            link("이력서", p.resumeUrl, "btn"),
            link("포트폴리오", p.portfolioUrl, "btn"),
            (p.links || []).map(function (l) { return link(l.label, l.url, "btn quiet"); }),
            reachable(p) && h("a", { class: "btn quiet", href: "#contact" }, "연락하기"))),
        h("figure", { class: "portrait" }, photo)),
      has(d.stats) && h("div", { class: "stats" }, d.stats.map(function (s) {
        return h("div", { class: "stat" }, h("b", null, s.value), h("span", null, s.label));
      })));
  }

  function about(d) {
    var p = d.profile || {};
    if (!p.bio && !has(d.principles)) return null;
    return h("div", null,
      h("div", { class: "bio" }, paragraphs(p.bio)),
      has(d.principles) && h("div", { class: "principles" }, d.principles.map(function (x) {
        return h("div", { class: "principle" }, h("div", { class: "label" }, x.key), h("p", null, x.text));
      })));
  }

  function projects(d) {
    if (!has(d.projects)) return null;
    var counts = {};
    d.projects.forEach(function (p) { (p.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    var tags = Object.keys(counts);
    var list = h("div", null);
    var bar = h("div", { class: "filters" });
    var current = "";

    function draw() {
      list.replaceChildren.apply(list, d.projects.filter(function (p) {
        return !current || (p.tags || []).indexOf(current) >= 0;
      }).map(card));
      bar.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.tag === current));
      });
    }
    function chip(tag, label, n) {
      return h("button", { class: "chip", type: "button", "data-tag": tag, onclick: function () { current = tag; draw(); } },
        label, h("small", null, String(n)));
    }
    if (tags.length > 1 && d.projects.length > 1) {
      bar.append(chip("", "전체", d.projects.length));
      tags.forEach(function (t) { bar.append(chip(t, t, counts[t])); });
    }
    draw();
    return h("div", null, bar.children.length ? bar : null, list);
  }

  function card(p) {
    return h("article", { class: "project" },
      p.image && h("img", { src: p.image, alt: p.title + " 화면", loading: "lazy" }),
      h("div", { class: "body" },
        h("div", { class: "label" }, [p.period, p.role].filter(Boolean).join("  ·  ")),
        h("h3", null, p.title),
        p.summary && h("p", { class: "summary" }, p.summary),
        has(p.highlights) && h("ul", null, p.highlights.map(function (t) { return h("li", null, t); })),
        has(p.stack) && h("div", { class: "tags" }, p.stack.map(function (t) { return h("span", null, t); })),
        has(p.metrics) && h("div", { class: "metrics" }, p.metrics.map(function (m) {
          return h("div", { class: "metric" }, h("b", null, m.value), h("span", null, m.label));
        })),
        has(p.links) && h("div", { class: "links" }, p.links.map(function (l) { return link(l.label, l.url, "btn small"); }))));
  }

  function rows(items, whenKey) {
    if (!has(items)) return null;
    return h("div", { class: "rows" }, items.map(function (x) {
      return h("div", { class: "row" },
        h("div", { class: "when" }, x[whenKey || "period"]),
        h("div", null,
          h("h3", null, x.title),
          x.org && h("p", { class: "org" }, x.org),
          x.description && h("p", { class: "desc" }, x.description)));
    }));
  }

  function capabilities(d) {
    if (!has(d.capabilities)) return null;
    return h("div", { class: "caps" }, d.capabilities.map(function (c, i) {
      return h("article", { class: "cap" },
        h("div", { class: "num" }, String(i + 1).padStart(2, "0")),
        h("h3", null, c.title),
        c.summary && h("p", null, c.summary),
        has(c.evidence) && h("ul", null, c.evidence.map(function (t) { return h("li", null, t); })));
    }));
  }

  function flow(d) {
    if (!has(d.process)) return null;
    return h("ol", { class: "flow" }, d.process.map(function (s, i) {
      return h("li", null,
        h("div", { class: "label" }, String(i + 1).padStart(2, "0") + (s.when ? "  ·  " + s.when : "")),
        h("h3", null, s.title),
        s.text && h("p", null, s.text));
    }));
  }

  function story(d) {
    if (!has(d.story)) return null;
    return h("div", { class: "story" }, d.story.map(function (s) {
      return h("article", null,
        h("div", { class: "label" }, [s.chapter, s.period].filter(Boolean).join("  ·  ")),
        h("h3", null, s.title),
        s.text && h("p", null, s.text),
        s.org && h("span", { class: "who" }, s.org));
    }));
  }

  function contribution(d) {
    if (!has(d.contribution)) return null;
    return h("div", { class: "contrib" }, d.contribution.map(function (c, i) {
      return h("div", null,
        h("b", null, String(i + 1).padStart(2, "0")),
        h("h3", null, c.title),
        c.text && h("p", null, c.text));
    }));
  }

  function skills(d) {
    if (!has(d.skills)) return null;
    return h("div", { class: "skills" }, d.skills.map(function (g) {
      return h("div", null, h("h3", null, g.group),
        h("ul", null, (g.items || []).map(function (t) { return h("li", null, t); })));
    }));
  }

  function reachable(p) {
    return !!(p.email || p.phone || has(p.links) || safeUrl(p.resumeUrl) || safeUrl(p.portfolioUrl));
  }

  function contact(d) {
    var p = d.profile || {};
    if (!reachable(p)) return null;
    return h("section", { class: "contact wrap", id: "contact" },
      h("div", { class: "label" }, "Contact"),
      h("h2", null, p.contactLine || "함께 만들 일이 있다면 편하게 연락 주세요."),
      h("div", { class: "reach" },
        p.email && link(p.email, "mailto:" + p.email, "mail"),
        p.phone && link(p.phone, "tel:" + String(p.phone).replace(/[^0-9+]/g, ""), "mail")),
      h("div", { class: "links" },
        link("이력서", p.resumeUrl, "btn small"),
        link("포트폴리오", p.portfolioUrl, "btn small"),
        (p.links || []).map(function (l) { return link(l.label, l.url, "btn small quiet"); })));
  }

  /* ---------- 조립 ---------- */

  function render(d) {
    var main = document.getElementById("top");
    var nav = document.getElementById("nav");
    var p = d.profile || {};
    var defs = [
      ["about", "소개", about(d)],
      ["capabilities", "핵심 역량", capabilities(d)],
      ["projects", "프로젝트", projects(d)],
      ["process", "업무 흐름", flow(d)],
      ["experience", "경력·활동", rows(d.experience)],
      ["story", "커리어 스토리", story(d)],
      ["education", "학력·교육", rows(d.education)],
      ["awards", "자격·수상", rows(d.awards, "date")],
      ["skills", "보유 기술", skills(d)],
      ["contribution", "기여하고 싶은 일", contribution(d)],
    ].filter(function (x) { return x[2]; });

    var body = h("div", { class: "wrap" }, defs.map(function (x, i) {
      return h("section", { class: "section", id: x[0] },
        h("header", null,
          h("div", { class: "num" }, String(i + 1).padStart(2, "0")),
          h("h2", null, x[1])),
        x[2]);
    }));
    var c = contact(d);
    main.replaceChildren(hero(d), body);
    if (c) main.append(c);

    nav.replaceChildren.apply(nav, defs.map(function (x) { return h("a", { href: "#" + x[0] }, x[1]); })
      .concat(c ? [h("a", { href: "#contact" }, "연락")] : []));

    if (p.name) {
      document.title = p.name + (p.role ? " — " + p.role : "") + " | 포트폴리오";
      document.getElementById("brand").replaceChildren(p.name, h("i", null, "."));
    }
    document.getElementById("copy").textContent = "© " + new Date().getFullYear() + " " + (p.name || "");
    spy(defs.map(function (x) { return x[0]; }));
  }

  // 지금 보고 있는 섹션을 상단 메뉴에 표시
  function spy(ids) {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        document.querySelectorAll("#nav a").forEach(function (a) {
          a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    ids.forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  document.getElementById("theme").addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });

  fetch("data/content.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function (e) {
      document.getElementById("state").textContent =
        "내용을 불러오지 못했습니다. 파일을 직접 연 경우에는 run.bat 으로 실행해 주세요. (" + e.message + ")";
    });
})();
