# 아산 홈페이지

아산의 자연, 호수 풍경과 온천을 소개하는 정적 웹사이트입니다.

**홈페이지:** [asan-homepage.pages.dev](https://asan-homepage.pages.dev/)

## 문의 DB 준비 현황

요청에 따라 로컬 컴퓨터에 SQLite 데이터베이스와 문의용 테이블 하나를 만들었습니다.

- SQLite CLI: `3.53.4`
- 로컬 데이터베이스: `inquiries.sqlite`
- 테이블 생성 스키마: [`migrations/0001_create_inquiries.sql`](migrations/0001_create_inquiries.sql)
- 기존 테이블 업데이트 스키마: [`migrations/0002_add_inquiry_audit_timestamps.sql`](migrations/0002_add_inquiry_audit_timestamps.sql)
- 회원 테이블 생성 스키마: [`migrations/0003_create_users.sql`](migrations/0003_create_users.sql)
- 테이블 이름: `inquiries`
- DB 파일은 `.gitignore` 처리되어 저장소나 GitHub에 올라가지 않습니다.

문의 테이블은 문의 유형, 제목, 내용, 처리 상태, 생성 시각 및 자동 증가 ID를 저장하도록 준비되어 있습니다. 로컬 DB에 테이블이 생성된 상태이며 홈페이지나 공개 서버의 문의 데이터가 그곳으로 저장되지는 않습니다.

회원가입 화면을 위한 `users` 테이블도 로컬 DB에 만들었습니다. 닉네임, 고유 이메일, 선택 입력 성별, 선택 입력 집주소, 향후 인증용 `password_hash`, 생성·수정·삭제 시각을 위한 컬럼이 있습니다. 비밀번호 평문은 저장하지 않으며, 회원 레코드는 아직 없고 회원가입·로그인 백엔드도 구현하지 않았습니다. 성별과 집주소는 개인정보이므로 실제 서비스에서는 꼭 필요한 경우에만 수집해야 합니다.

`updated_at`은 행이 수정되면 SQLite 트리거가 현재 시각으로 갱신합니다. `deleted_at`은 기본값이 `NULL`이며, 나중에 백엔드를 만들 때 실제 행을 지우지 않고 소프트 삭제 시각을 기록할 수 있도록 마련했습니다. 현재 이 두 기능도 DB 준비 단계이며 문의 입력·수정·삭제 API는 아직 없습니다.

### 로컬 DB 확인하기

저장소 루트에서 PowerShell을 열고 다음 명령으로 문의·회원 테이블의 구조와 데이터를 확인할 수 있습니다. `inquiries`에는 예시 행이 10건 있으며 `users`는 비어 있습니다.

```powershell
sqlite3 inquiries.sqlite ".schema inquiries"
sqlite3 inquiries.sqlite "SELECT id, category, subject, status, created_at, updated_at, deleted_at FROM inquiries;"
sqlite3 inquiries.sqlite ".schema users"
sqlite3 inquiries.sqlite "SELECT id, nickname, email, gender, home_address, password_hash, created_at, updated_at, deleted_at FROM users;"
```

## Pages Functions 회원 인증

회원 API는 Cloudflare Pages Functions 및 Production D1의 `DB` binding을 이용합니다.

- `POST /api/auth/signup`: 닉네임, 이메일, 비밀번호를 검증한 뒤 계정을 만듭니다. 성별과 집주소는 선택 사항이며, 사용자가 입력한 경우에만 저장합니다.
- `POST /api/auth/login`: 이메일과 비밀번호를 검증하고 8시간 유효한 `HttpOnly`, `Secure`, `SameSite=Lax` 세션 쿠키를 발급합니다.
- 비밀번호는 Web Crypto `PBKDF2-SHA-256` (600,000회 반복, 사용자별 무작위 salt)으로 해시합니다. 평문 비밀번호는 저장하지 않습니다.
- 이메일 주소는 대소문자를 구분하지 않고 고유하게 처리합니다. 사용자 데이터는 API 응답이나 로그에 반환하지 않습니다.
- Wrangler 설정은 D1 database `asan-homepage-db`를 `DB` binding으로 가리킵니다. Production의 session signing key `SESSION_SECRET`은 Wrangler secret으로 저장하며 Git에 커밋하지 않습니다.

**아직 제공하지 않는 기능:** 로그아웃, 로그인 세션 검증을 사용하는 보호 페이지, 사용자 프로필 조회·수정, 계정 삭제. 현재 Pages Function은 회원가입·로그인 요청만 제공합니다.

**개인정보 주의:** 정확한 집주소와 성별은 개인정보이며, 꼭 필요한 경우에만 수집하세요. `users`의 데이터 삭제/탈퇴 및 보관 정책은 추후 운영 기준에 맞춰 별도로 구현해야 합니다.

로그인 및 회원가입 함수는 기존 Pages 프로젝트의 Production `DB` binding을 사용합니다. Production Pages secret `SESSION_SECRET`이 설정되어 있어야 로그인 세션을 발급합니다. Preview에는 Production 사용자 개인정보가 섞이지 않도록 Production D1을 연결하지 않았습니다. 문의 양식은 DB/API와 연결되지 않아 계속 비활성 상태입니다.

## 기술 스택

- HTML5, CSS3, 기존 홈페이지의 UI를 위한 Vanilla JavaScript
- Cloudflare Pages Functions와 D1을 이용한 회원가입·로그인 API
- Cloudflare Web Crypto를 이용한 비밀번호 해시와 서명 세션 쿠키
- Google Fonts: `Noto Sans KR`, `Gowun Batang`, `DM Sans`
- 로컬 문의 DB: SQLite
- 검색 엔진 안내: `robots.txt`, `sitemap.xml`

이 프로젝트에는 회원가입·로그인 Pages Functions 및 Cloudflare D1 Production DB 연결이 있습니다. 로컬 SQLite 파일은 개발 PC 전용으로 Cloudflare Pages 서버에서 접근할 수 없으며, 방문자 회원정보는 Cloudflare D1에 별도로 저장됩니다.

## 회원가입·로그인 화면

`signup.html`과 `login.html`을 각각 독립된 HTML 페이지로 분리했습니다. `index.html`의 상단 회원 메뉴에서 이동할 수 있으며, 두 계정 페이지 사이에도 상호 링크가 있습니다. 회원가입 화면에는 닉네임, 이메일 주소, 성별, 집주소와 비밀번호 입력란이 있습니다. 홈페이지 주소 기준으로 `/signup.html`, `/login.html`에서 직접 접근할 수 있습니다.

페이지 주소는 `/signup.html`, `/login.html`입니다. 성별과 집주소는 선택 항목입니다. 정확한 집주소는 민감한 개인정보이므로 꼭 필요한 경우에만 수집하고 보유·삭제 정책을 안내하세요. 문의 폼은 아직 저장 API에 연결되지 않았습니다.

각 계정 페이지의 HTML `<title>`과 meta description은 해당 파일에 별도로 설정되어 있습니다. 세부 SEO 문안은 [`seo-pages.md`](seo-pages.md)를 참고하세요.

로컬 Pages Functions 개발 시 `.dev.vars` 파일에 48바이트 이상의 무작위 `SESSION_SECRET`을 설정합니다. `.dev.vars`는 `.gitignore` 대상이며 반드시 Production secret과 분리합니다. 운영 비밀값은 `npx wrangler pages secret put SESSION_SECRET --project-name asan-homepage` 명령으로 설정합니다. Git 연동 Production에서는 secret을 설정한 뒤 `layout` 브랜치에 변경을 푸시해 새 배포가 완료되어야 로그인 API가 해당 값을 사용합니다.