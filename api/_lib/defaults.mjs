// 이력서 서식 목록과, 가입했을 때 넣어 줄 기본 내용
export const TEMPLATES = [
  { id: "dense",    name: "밀집형",   hint: "두 단으로 많은 내용을 한눈에. 기본값" },
  { id: "modern",   name: "모던",     hint: "큰 이름과 넓은 여백, 포트폴리오형" },
  { id: "timeline", name: "타임라인", hint: "시간 순서가 한 줄로 이어지는 형태" },
  { id: "compact",  name: "한 장",    hint: "A4 한 장에 들어가는 요약형" },
  { id: "card",     name: "카드",     hint: "항목마다 카드로 나뉘는 형태" },
];
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);

export function blankResume(name) {
  return {
    profile: {
      name: name || "이름",
      nameEn: "",
      role: "",
      tagline: "Resume",
      headline: "",
      bio: "",
      photo: "",
      email: "",
      phone: "",
      resumeUrl: "",
      portfolioUrl: "",
      contactLine: "",
      links: [],
    },
    stats: [],
    principles: [],
    capabilities: [],
    projects: [],
    process: [],
    experience: [],
    story: [],
    education: [],
    awards: [],
    skills: [],
    contribution: [],
  };
}

export function slugify(text, fallback) {
  const base = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || fallback;
}
