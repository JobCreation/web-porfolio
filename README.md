# 개인 포트폴리오 + 관리자 페이지

- 포트폴리오: <https://jobcreation.github.io/web-porfolio/>
- 관리자: <https://jobcreation.github.io/web-porfolio/admin/>

GitHub Pages만으로 동작합니다. 관리자 페이지에서 고친 내용과 사진은 이 저장소에 바로 커밋되고, 약 1분 뒤 사이트에 반영됩니다.

## 내 PC에서 실행

- **더블클릭**: `run.bat` (브라우저가 열립니다)
- **VS Code**: 이 폴더를 열고 `F5`
- **터미널**:

```powershell
python -m http.server 8020
```

주소: <http://127.0.0.1:8020/> (관리자: <http://127.0.0.1:8020/admin/>)

`index.html`을 더블클릭해 직접 열면 내용 파일을 읽지 못합니다. 위 방법으로 실행하세요.

## 관리자 페이지 처음 설정 (1회)

1. GitHub에서 토큰 만들기: Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
   - Repository access: **Only select repositories** → `web-porfolio`
   - Permissions → Repository permissions → **Contents: Read and write** (나머지는 그대로)
   - 만료일은 원하는 대로 (만료되면 3번을 다시 하면 됩니다)
2. 관리자 페이지를 열어 토큰을 붙여 넣고 관리자 비밀번호(10자 이상)를 정합니다.
3. 다음부터는 비밀번호만 입력하면 됩니다. 비밀번호를 잊었거나 토큰이 만료되면 로그인 화면의 "비밀번호를 잊었거나 토큰이 만료됐어요"에서 새 토큰으로 다시 설정합니다.

### 로그인이 지켜 주는 것

- 토큰은 비밀번호로 암호화(PBKDF2 60만 회 + AES-GCM)되어 `data/auth.json`에 저장됩니다. 비밀번호 자체는 어디에도 저장되지 않습니다.
- 관리자 페이지 주소는 누구나 열 수 있지만, 비밀번호 없이는 토큰을 풀 수 없어 아무것도 고칠 수 없습니다.
- 저장소가 공개라서 암호화된 파일도 공개됩니다. **짧거나 흔한 비밀번호는 쓰지 마세요.** 토큰 권한을 이 저장소의 Contents로만 제한해 두면, 최악의 경우에도 영향은 이 사이트 내용에 그칩니다.

## 폴더

| 경로 | 내용 |
|---|---|
| `index.html`, `assets/js/site.js`, `assets/css/site.css` | 포트폴리오 화면 |
| `admin/index.html`, `assets/js/admin.js`, `assets/css/admin.css` | 관리자 페이지 |
| `assets/css/tokens.css`, `DESIGN.md` | 색·글자 등 디자인 기준 |
| `assets/js/config.js` | 저장소 이름과 사이트 주소 |
| `data/content.json` | 사이트 내용 (관리자 페이지가 수정) |
| `data/auth.json` | 암호화된 토큰 (처음 설정 때 생성) |
| `uploads/` | 관리자 페이지에서 올린 사진 |

## 코드를 직접 고칠 때

관리자 페이지에서 저장하면 GitHub 쪽에 커밋이 쌓입니다. 내 PC에서 코드를 고치기 전에 먼저 받아 오세요.

```powershell
git pull
```

이전 템플릿 사이트(2022년)는 `legacy-2022` 브랜치에 보관되어 있습니다.
