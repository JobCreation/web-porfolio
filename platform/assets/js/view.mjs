// 공개 이력서 화면: /r/<주소>
import { api, setupTheme, THEME_BUTTON } from "./api.mjs";
import { renderResume } from "./render.mjs";

document.getElementById("theme-slot").innerHTML = THEME_BUTTON;
setupTheme(document.getElementById("theme"));
document.getElementById("print").addEventListener("click", () => window.print());

const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");

api.publicResume(slug)
  .then(({ resume, name }) => {
    renderResume(document.getElementById("sheet"), resume.data, resume.template);
    const who = resume.data?.profile?.name || name || "이력서";
    document.title = `${who} 이력서`;
    const when = resume.updated_at ? new Date(resume.updated_at).toLocaleDateString("ko-KR") : "";
    document.getElementById("status").textContent = when ? `${when} 수정` : "";
  })
  .catch((e) => {
    document.getElementById("sheet").innerHTML =
      `<p class="msg">${e.status === 404 ? "이력서를 찾을 수 없거나 비공개입니다." : e.message}</p>`;
  });
