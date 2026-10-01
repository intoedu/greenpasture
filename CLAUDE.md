# CLAUDE.md — 그린파스처 홈페이지 작업 규칙

주식회사 그린파스처(나노 촉매 코팅 **V-ZERO**) 기업 홈페이지. 빌드 없는 정적 HTML/CSS/JS, GitHub Pages 배포.
고객사는 수정을 제작사에 맡겼으므로, 새 자료가 오면 이 저장소에서 바로 반영한다.

## 반드시 지킬 것
- **사실을 만들어 넣지 않는다.** 숫자 · 연혁 · 거래처 · 인증 · 수상은 고객 자료에 있는 것만 쓴다. 자료가 없으면 비워 두고 `data-tbd` 로 표시한다.
- **비즈니스 트랙**: 문구에 종교적 표현을 넣지 않는다. ('푸른 초장(Green Pasture)'은 고객 리플릿의 사명 문구 그대로다.)
- **광고 표현**: 항균 · 항바이러스 코팅제이므로 '무독성 · 무해 · 친환경 · 안전한 · 100% · 완벽 · 유일 · 감염 예방' 같은 단정 표현을 쓰지 않는다. 성능 수치는 **조건 · 출처 · 면책 문구**와 함께 쓴다. 비교 광고(타 방식 · 타사 비교)를 넣지 않는다. (근거: `docs/고객-확인사항.md` A 항목)
- **한/영 병기**: 본문은 `<span data-lang="ko">…</span><span data-lang="en">…</span>` 쌍으로 쓴다. 한쪽만 고치지 않는다. 속성은 `data-ko-placeholder|label|alt|title` / `data-en-…`, 선택 목록은 `<option value="한국어값" data-ko="…" data-en="…">`.
- **서버 · 데이터베이스 · 빌드 도구를 들이지 않는다.** (Supabase · Vercel 은 쓰지 않기로 결정) 메모장으로도 고칠 수 있어야 한다.
- 글꼴은 저장소 안의 Pretendard(`assets/fonts/pretendard/`)만 쓴다. 외부 CDN 글꼴을 다시 넣지 않는다.
- 전화 링크는 `tel:+821034972524`. 화면 표기는 한국어 `010-3497-2524`, 영어 `+82 10-3497-2524`.

## 어디에 무엇이 있나
| 바꿀 것 | 파일 |
|---|---|
| 회사명 · 대표 · 전화 · 이메일 · 주소 · 응대 시간 · 사업자번호 · SNS · 카톡 상담 · 문자 문구 | `assets/js/site.js` 맨 위 `SITE` (헤더 · 푸터 · 모바일 메뉴 · 떠 있는 버튼에 자동 반영) |
| 메뉴 | `assets/js/site.js` `NAV_ITEMS` |
| 공지 · 소식 글 | `assets/data/posts.js` 배열 맨 위에 추가 |
| 색상 · 여백 · 글자 크기 | `assets/css/style.css` 맨 위 `:root` |
| 신청서 전송 방식 (구글 시트 / Web3Forms / 메일 앱) | `assets/js/config.js` — 설정법 `docs/이메일-접수-설정.md` |
| 구글 시트 수신 스크립트 | `tools/apps-script/Code.gs` |
| 이미지 슬롯 · 규격 | `docs/자료-교체-가이드.md` |

## 새 자료가 왔을 때
`docs/자료-교체-가이드.md` 의 해당 항목 절차를 따른다. 요약:
1. `tools/images.py` 로 웹용 파일을 만든다 (사진 `photo`, 인물 `square`, 로고 `keyout` → `icons`).
2. 로고를 바꾸면 `python3 tools/images.py icons` 와 `node tools/make-og.js` 로 파비콘 · 공유 이미지를 다시 만든다.
3. 확인이 끝난 항목은 `data-tbd` 속성과 `tbd-only` 클래스를 지우고, `docs/고객-확인사항.md` 체크박스를 갱신한다.
4. CSS · JS 를 고쳤으면 모든 HTML 의 `?v=` 번호를 올린다 (브라우저 캐시 갱신).

## 검토 모드
- 주소 뒤 `?review` → `data-tbd` 요소가 노란 점선으로 보이고, 왼쪽 아래 막대에 메모가 뜬다. `?review=0` 으로 끈다.
- `class="tbd-only"` 요소는 **검토 모드에서만** 보인다. 자료가 없는 자리(사업자번호 · 설립일 · 인증 등)는 공개 화면에서 숨긴다.
- 배포 워크플로는 공개 사이트에 올릴 때 `data-tbd` 메모를 지운다. 고객과 배포 주소에서 검토 모드로 함께 볼 때만 저장소 변수 `KEEP_REVIEW_NOTES=true`.

## 확인 방법
- 로컬: `python3 -m http.server 8080` 후 `http://localhost:8080/`. 영문은 `?lang=en`.
- 고친 뒤 최소 확인: 모든 페이지를 한/영 · PC(1440) · 모바일(390)로 열어 콘솔 오류 · 가로 스크롤이 없는지, 스크롤이 끝까지 되는지, 문의 · 신청 양식이 동작하는지.
- 스크롤 주의: 페이지 전체를 움직이는 `scrollIntoView` 를 스크롤 중에 호출하지 않는다 (탭 메뉴 스크롤이 되돌아가던 원인).
- 움직임(애니메이션)은 `style.css` 25장 · `site.js` 15장(숫자 올라가기 · 카드 빛 · 첫 화면 기울기) · 16장(크게 보기). 새 효과는 `prefers-reduced-motion` 에서 꺼지게 하고, 스크롤 이벤트 대신 IntersectionObserver 를 쓴다. CSS · JS 를 고치면 HTML 의 `?v=` 를 올린다 (지금 3).

## 배포
`main` 에 합치면 `.github/workflows/deploy-pages.yml` 이 공개 파일만 모아 GitHub Pages 로 배포한다.
저장소 Settings → Pages → Source 는 **GitHub Actions** 여야 한다. 도메인 연결은 README 7장.
