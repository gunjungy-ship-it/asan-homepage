# 아산 홈페이지

> 온천의 따스함과 자연의 여유를 소개하는 아산 여행 홈페이지입니다.

**홈페이지:** [asan-homepage.pages.dev](https://asan-homepage.pages.dev/)

## 프로젝트 소개

아산의 자연, 호수 풍경, 온천을 단일 페이지에서 소개하고, 문의 양식으로 받은 여행·홈페이지 관련 메시지를 Cloudflare Pages Function을 통해 Cloudflare D1 데이터베이스에 저장할 수 있도록 구성했습니다.

## 적용 기술

- **HTML5·CSS3:** 한국어 시맨틱 문서, 반응형 레이아웃과 문의 양식 UI
- **JavaScript:** 모바일 메뉴와 테마 전환, JSON API를 통한 비동기 문의 제출
- **Cloudflare Pages Functions:** `functions/api/inquiries.js`가 `POST /api/inquiries` 요청 검증 및 저장 처리
- **Cloudflare D1:** SQLite 호환 관리형 데이터베이스. 문의 내용을 `inquiries` 테이블 하나에 저장
- **Google Fonts:** `Noto Sans KR`, `Gowun Batang`, `DM Sans`
- **SEO:** 페이지 메타데이터, 섹션별 안내, `robots.txt`, `sitemap.xml`

## 문의 저장 구조

`migrations/0001_create_inquiries.sql`에 문의 테이블 하나를 생성하는 스키마가 있습니다.

| 컬럼 | 용도 |
| --- | --- |
| `id` | 자동 증가 접수 번호 |
| `category` | 문의 유형 (`tourism`, `onsen`, `website`, `suggestion`) |
| `subject` | 문의 제목 (2~120자) |
| `message` | 문의 내용 (5~5000자) |
| `status` | 처리 상태 (`new`, `in_progress`, `answered`, `closed`) |
| `created_at` | 문의 접수 시각 (UTC) |

이름, 이메일, IP 주소는 수집하거나 저장하지 않습니다. 개인정보·계정 정보·결제 정보 등 민감한 내용을 문의에 적지 않도록 안내하며, 문의 내용에는 이름·전화번호 등 개인을 식별할 수 있는 정보가 포함되지 않도록 주의해 주세요.

API는 DB에 문의를 등록하지만 문의 목록이나 문의 원문을 공개하는 조회 API는 제공하지 않습니다. 운영자 응답 기능도 포함하지 않습니다. 공개 배포 시에는 필요한 보관 기간·접근 권한·삭제 요청 절차를 운영자가 따로 마련해야 합니다.

## Cloudflare D1 설정

운영 환경에서는 Cloudflare Pages와 호환되는 Cloudflare D1을 사용합니다. 로컬 SQLite 파일을 Cloudflare 서버가 직접 읽지는 않습니다.

1. Cloudflare 대시보드 **Workers & Pages → D1 SQL Database → Create database**에서 `asan-homepage-db`를 생성하고 표시되는 실제 database ID를 복사합니다.
2. [`wrangler.jsonc`](wrangler.jsonc)의 `database_id`에서 `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID`를 실제 ID로 교체합니다. 자리표시자가 남아 있으면 프로젝트를 정상 배포할 수 없습니다. database ID는 비밀 키는 아니지만 실제 프로젝트에서 발급된 값이어야 합니다.
3. Pages 프로젝트의 **Settings → Bindings → Add → D1 database**에서 `DB`라는 binding 이름으로 같은 database를 선택합니다. Production 환경에 반드시 연결하고, Preview 환경에서 문의를 시험하려는 경우 Preview에도 별도로 연결합니다. 변경 내용을 저장합니다.
4. Pages 프로젝트의 **Settings → Builds & deployments → Production branch**가 `layout`인지 확인하고 배포를 시작합니다. Wrangler 설정의 이름과 database ID도 Cloudflare 대시보드 binding과 일치시킵니다.
5. 서버에 적용하기 전에 로컬 D1 에뮬레이터에 스키마를 시험 적용하고, 테스트 문의를 전송·확인한 후 Production migration을 실행합니다.

```powershell
npm install --global wrangler
npx wrangler login
npx wrangler d1 migrations apply asan-homepage-db --local
npx wrangler d1 migrations apply asan-homepage-db --remote
```

`--local`은 로컬 D1 에뮬레이터에 적용합니다. `--remote`는 실제 운영 D1 스키마를 변경하므로, Cloudflare에서 생성한 database의 이름과 ID를 확인한 뒤 실행하세요. `npx wrangler login`과 실제 D1 database 생성에는 사용자의 Cloudflare 로그인·승인이 필요합니다.

## 저장 API

```text
POST /api/inquiries
Content-Type: application/json
```

```json
{
  "category": "tourism",
  "subject": "아산 관광 안내 문의",
  "message": "아산 관광 정보를 문의합니다."
}
```

정상 등록 시 `201 Created`와 `{ "ok": true, "id": 123 }` 형태의 응답을 반환합니다. 문의 유형과 글자 수는 서버에서도 검증합니다. DB binding이 없거나 스키마가 아직 적용되지 않은 경우 접수에 실패합니다.

## 로컬 확인

먼저 Cloudflare에 로그인하고 올바른 D1 ID와 Pages binding을 설정합니다. 이후 저장소 루트에서:

```powershell
npx wrangler pages dev .
```

Wrangler가 안내하는 로컬 주소에서 홈페이지를 열고 테스트 문의를 작성합니다. 로컬 모드의 문의 기록은 로컬 개발 저장소에만 남고, Production database에 저장되지 않습니다. 제출 전 `/api/inquiries`가 `{ "ready": true }`를 반환하는지 확인하세요. 데이터베이스 binding·테이블 migration·함수 배포가 끝나지 않았으면 문의 입력란은 비활성 상태를 유지합니다.

## 페이지 구성

| 위치 | 내용 |
| --- | --- |
| `#home` | 아산 소개 |
| `#about` | 아산 여행 이야기 |
| `#places` | 자연·호수·온천 소개 |
| `#inquiries` | 문의 유형·제목·내용 등록 |
| `#footer` | 아산시 문화관광 공식 사이트 |

실제 응답을 위해서는 Cloudflare D1 데이터베이스 생성, `DB` binding 설정, SQL 마이그레이션 적용, Pages Function 배포가 모두 필요합니다. 이 저장소의 소스와 커밋만으로는 운영 DB 연결이나 실제 운영 배포가 자동으로 완료되지 않습니다.

## 저장소의 주요 파일

```text
.
├── functions/api/inquiries.js        # 문의 JSON POST API
├── migrations/0001_create_inquiries.sql # 단일 문의 테이블 스키마
├── index.html                        # 홈페이지, 폼 UI와 제출 동작
├── wrangler.jsonc                    # Cloudflare Pages/D1 binding 설정
├── robots.txt                        # 검색엔진 크롤링 규칙
├── sitemap.xml                      # 공개 페이지 URL
├── seo-pages.md                     # 페이지·섹션별 title/description 안내
└── README.md                        # 이 문서
```

## SEO 문서

단일 HTML 페이지이므로 `<title>`과 기본 meta description은 홈페이지 전체를 대표합니다. 섹션별 제목 및 소개 문안은 [`seo-pages.md`](seo-pages.md)에 정리되어 있습니다.

## 라이선스

저장소에 별도의 라이선스 파일은 등록되어 있지 않습니다. 사용된 사진과 외부 글꼴은 각 제공자의 이용 약관을 확인하세요.