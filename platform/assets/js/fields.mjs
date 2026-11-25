// 이력서 입력 항목 정의. 개인 admin과 운영자 화면이 같이 쓴다.
export const SECTIONS = [
  { key: "profile", label: "기본 정보", kind: "object", desc: "이름과 연락처, 사진입니다.", fields: [
    { key: "photo", label: "사진", type: "photo", wide: true },
    { key: "name", label: "이름" },
    { key: "nameEn", label: "영문 이름" },
    { key: "role", label: "직함·지원 분야" },
    { key: "tagline", label: "이름 위 작은 글씨" },
    { key: "headline", label: "한 줄 소개", type: "textarea", wide: true, rows: 2 },
    { key: "bio", label: "소개 글 (빈 줄로 문단 구분)", type: "textarea", wide: true, rows: 5 },
    { key: "email", label: "이메일" },
    { key: "phone", label: "전화번호" },
    { key: "resumeUrl", label: "이력서 파일 링크" },
    { key: "portfolioUrl", label: "포트폴리오 링크" },
    { key: "contactLine", label: "연락 문구", wide: true },
    { key: "links", label: "링크 (여러 개 가능)", type: "pairs", keys: ["label", "url"], rows: 4,
      hint: "한 줄에 하나:  이름 | 주소   (주소만 넣어도 됩니다)", wide: true },
  ] },
  { key: "capabilities", label: "핵심 역량", kind: "list", title: "title", desc: "잘하는 일과 근거를 짝지어 보여 줍니다.", fields: [
    { key: "title", label: "역량 이름" },
    { key: "summary", label: "한 줄 설명" },
    { key: "evidence", label: "근거", type: "lines", hint: "한 줄에 하나", wide: true, rows: 3 },
  ] },
  { key: "projects", label: "프로젝트", kind: "list", title: "title", desc: "위에 있는 항목이 먼저 보입니다.", fields: [
    { key: "image", label: "대표 사진", type: "photo", wide: true },
    { key: "title", label: "프로젝트 이름" },
    { key: "period", label: "기간" },
    { key: "role", label: "역할" },
    { key: "tags", label: "분류 (쉼표로 구분)", type: "csv" },
    { key: "summary", label: "한 줄 설명", type: "textarea", wide: true, rows: 2 },
    { key: "highlights", label: "주요 내용", type: "lines", hint: "한 줄에 하나", wide: true, rows: 4 },
    { key: "stack", label: "사용 기술 (쉼표로 구분)", type: "csv", wide: true },
    { key: "metrics", label: "수치", type: "pairs", keys: ["value", "label"], hint: "한 줄에 하나:  값 | 설명", wide: true, rows: 3 },
    { key: "links", label: "링크", type: "pairs", keys: ["label", "url"], hint: "한 줄에 하나:  이름 | 주소", wide: true, rows: 3 },
  ] },
  { key: "experience", label: "경력·활동", kind: "list", title: "title", fields: [
    { key: "period", label: "기간" }, { key: "title", label: "직무·활동" }, { key: "org", label: "소속", wide: true },
    { key: "description", label: "한 일", type: "textarea", wide: true, rows: 3 },
  ] },
  { key: "education", label: "학력·교육", kind: "list", title: "title", fields: [
    { key: "period", label: "기간" }, { key: "title", label: "과정·학위" }, { key: "org", label: "기관", wide: true },
    { key: "description", label: "설명", type: "textarea", wide: true, rows: 2 },
  ] },
  { key: "awards", label: "자격·수상", kind: "list", title: "title", fields: [
    { key: "date", label: "날짜" }, { key: "title", label: "자격증·상 이름" }, { key: "org", label: "발급·주최", wide: true },
  ] },
  { key: "skills", label: "보유 기술", kind: "list", title: "group", fields: [
    { key: "group", label: "묶음 이름", wide: true },
    { key: "items", label: "기술", type: "lines", hint: "한 줄에 하나", wide: true, rows: 4 },
  ] },
  { key: "process", label: "업무 흐름", kind: "list", title: "title", desc: "일하는 순서를 단계로 보여 줍니다.", fields: [
    { key: "title", label: "단계 이름" }, { key: "when", label: "시점" },
    { key: "text", label: "설명", type: "textarea", wide: true, rows: 2 },
  ] },
  { key: "story", label: "커리어 스토리", kind: "list", title: "title", fields: [
    { key: "chapter", label: "장 (예: 1막)" }, { key: "period", label: "시기" },
    { key: "title", label: "제목" }, { key: "org", label: "소속·장소" },
    { key: "text", label: "설명", type: "textarea", wide: true, rows: 2 },
  ] },
  { key: "stats", label: "핵심 수치", kind: "list", title: "label", desc: "머리글 옆 숫자입니다. 3~4개가 좋습니다.", fields: [
    { key: "value", label: "값" }, { key: "label", label: "설명" },
  ] },
  { key: "principles", label: "일하는 원칙", kind: "list", title: "key", fields: [
    { key: "key", label: "키워드" }, { key: "text", label: "문장" },
  ] },
  { key: "contribution", label: "기여하고 싶은 일", kind: "list", title: "title", fields: [
    { key: "title", label: "영역" }, { key: "text", label: "설명", type: "textarea", wide: true, rows: 2 },
  ] },
];

// 화면에 보이는 글 <-> 저장되는 값
export function toText(f, v) {
  if (f.type === "lines") return (v || []).join("\n");
  if (f.type === "csv") return (v || []).join(", ");
  if (f.type === "pairs") return (v || []).map((p) => `${p[f.keys[0]] || ""} | ${p[f.keys[1]] || ""}`).join("\n");
  return v || "";
}
export function fromText(f, text) {
  const clean = (s) => s.trim();
  if (f.type === "lines") return text.split("\n").map(clean).filter(Boolean);
  if (f.type === "csv") return text.split(",").map(clean).filter(Boolean);
  if (f.type === "pairs") return text.split("\n").map(clean).filter(Boolean).map((line) => {
    const i = line.indexOf("|");
    return { [f.keys[0]]: clean(i < 0 ? line : line.slice(0, i)), [f.keys[1]]: i < 0 ? "" : clean(line.slice(i + 1)) };
  });
  return text;
}
export function blankItem(section) {
  const o = {};
  for (const f of section.fields) o[f.key] = /^(lines|csv|pairs)$/.test(f.type) ? [] : "";
  return o;
}
