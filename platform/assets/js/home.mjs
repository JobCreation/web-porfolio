// 들머리 화면: 로그인과 가입
import { api, setupTheme, THEME_BUTTON } from "./api.mjs";

document.getElementById("theme-slot").innerHTML = THEME_BUTTON;
setupTheme(document.getElementById("theme"));

const $ = (id) => document.getElementById(id);
let mode = "login";

function setMode(next) {
  mode = next;
  const join = mode === "join";
  $("tab-login").setAttribute("aria-pressed", String(!join));
  $("tab-join").setAttribute("aria-pressed", String(join));
  $("card-title").textContent = join ? "가입" : "로그인";
  $("card-desc").textContent = join ? "이메일과 비밀번호만 있으면 됩니다." : "이메일과 비밀번호를 넣어 주세요.";
  $("name-field").hidden = !join;
  $("submit").textContent = join ? "가입하고 시작" : "로그인";
  $("password").setAttribute("autocomplete", join ? "new-password" : "current-password");
  $("msg").textContent = "";
}
$("tab-login").addEventListener("click", () => setMode("login"));
$("tab-join").addEventListener("click", () => setMode("join"));

function say(text, ok) {
  const m = $("msg");
  m.textContent = text || "";
  m.className = "msg" + (ok ? " ok" : "");
}

$("form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const input = {
    email: $("email").value.trim(),
    password: $("password").value,
    name: $("name").value.trim(),
  };
  $("submit").disabled = true;
  say(mode === "join" ? "가입하는 중…" : "확인하는 중…", true);
  try {
    await (mode === "join" ? api.register(input) : api.login(input));
    location.href = "/app";
  } catch (e) {
    say(e.message);
    $("submit").disabled = false;
  }
});

// 서버 설정이 아직이면 미리 알려 준다
api.meta().then((meta) => {
  if (meta.ready) return;
  say("서버에 자료 보관 설정이 아직 없어 가입·로그인이 되지 않습니다. (운영자가 Supabase 키를 넣어야 합니다)");
  $("submit").disabled = true;
}).catch(() => {});

// 이미 로그인한 사람은 편집 화면으로 갈 수 있게
api.me().then(({ user }) => {
  if (!user) return;
  $("status").textContent = `${user.name} 님으로 로그인되어 있습니다`;
  $("go-app").hidden = false;
}).catch(() => {});
