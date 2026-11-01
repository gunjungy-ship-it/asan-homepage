# 아산 홈페이지

아산의 자연, 호수 풍경과 온천을 소개하는 정적 웹사이트입니다.

**홈페이지:** [asan-homepage.pages.dev](https://asan-homepage.pages.dev/)

## 문의 DB 준비 현황

요청에 따라 로컬 컴퓨터에 SQLite 데이터베이스와 문의용 테이블 하나를 만들었습니다.

- SQLite CLI: `3.53.4`
- 로컬 데이터베이스: `inquiries.sqlite`
- 테이블 생성 스키마: [`migrations/0001_create_inquiries.sql`](migrations/0001_create_inquiries.sql)
- 기존 테이블 업데이트 스키마: [`migrations/0002_add_inquiry_audit_timestamps.sql`](migrations/0002_add_inquiry_audit_timestamps.sql)
- 테이블 이름: `inquiries`
- DB 파일은 `.gitignore` 처리되어 저장소나 GitHub에 올라가지 않습니다.

문의 테이블은 문의 유형, 제목, 내용, 처리 상태, 생성 시각 및 자동 증가 ID를 저장하도록 준비되어 있습니다. 로컬 DB에 테이블이 생성된 상태이며 홈페이지나 공개 서버의 문의 데이터가 그곳으로 저장되지는 않습니다.

`updated_at`은 행이 수정되면 SQLite 트리거가 현재 시각으로 갱신합니다. `deleted_at`은 기본값이 `NULL`이며, 나중에 백엔드를 만들 때 실제 행을 지우지 않고 소프트 삭제 시각을 기록할 수 있도록 마련했습니다. 현재 이 두 기능도 DB 준비 단계이며 문의 입력·수정·삭제 API는 아직 없습니다.

### 로컬 DB 확인하기

저장소 루트에서 PowerShell을 열고 다음 명령으로 테이블과 저장 내용을 확인할 수 있습니다. 현재 DB는 비어 있습니다.

```powershell
sqlite3 inquiries.sqlite ".schema inquiries"
sqlite3 inquiries.sqlite "SELECT id, category, subject, status, created_at, updated_at, deleted_at FROM inquiries;"
```

## 아직 구현하지 않은 기능

- 홈페이지 문의 양식과 DB 연결
- 문의를 DB에 저장하는 백엔드/API
- 문의 목록 및 관리자 기능
- 이 로컬 DB를 웹 서버에서 쓰도록 배포하는 작업

홈페이지의 문의 입력란과 등록 버튼은 현재 비활성화되어 있습니다. 내용을 작성하거나 실제로 접수했다고 착각하지 않도록 저장 기능이 아직 준비되지 않았다는 안내를 표시합니다. **추후 백엔드 구현을 요청하실 때 그 단계에서 DB와 홈페이지를 연결하겠습니다.**

## 기술 스택

- HTML5, CSS3, 기존 홈페이지의 UI를 위한 Vanilla JavaScript
- Google Fonts: `Noto Sans KR`, `Gowun Batang`, `DM Sans`
- 로컬 문의 DB: SQLite
- 검색 엔진 안내: `robots.txt`, `sitemap.xml`

이 프로젝트에는 현재 백엔드 코드나 운영 데이터베이스 연결 설정이 없습니다. SQLite 로컬 파일은 Cloudflare Pages 서버에서 접근할 수 없으며, 웹 방문자가 같은 로컬 DB를 공유하지 않습니다.