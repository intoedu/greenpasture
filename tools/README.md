# tools — 새 자료를 빠르게 반영하는 도구

홈페이지 자체는 빌드가 필요 없습니다. 이 폴더는 **새 로고 · 사진이 왔을 때 웹용 파일을 만드는 보조 도구**이며,
웹사이트에는 올라가지 않습니다 (배포는 `*.html` · `assets/` 등만 올림).

| 하고 싶은 일 | 명령 |
|---|---|
| 사진을 웹용으로 줄이기 | `python3 tools/images.py photo 원본.jpg assets/img/prod-original.jpg --width 1200` |
| 인물 사진 정사각형으로 | `python3 tools/images.py square 원본.jpg assets/img/leader-song.jpg --size 800` |
| 어두운 배경 로고 → 투명 PNG | `python3 tools/images.py keyout 로고.jpg assets/img/logo-gp.png` |
| 로고로 파비콘 · 홈 화면 아이콘 다시 만들기 | `python3 tools/images.py icons` |
| 사업자등록증 · 인증서에 '홈페이지 게시용' 워터마크 넣기 | `python3 tools/images.py document 원본.jpg assets/img/biz-registration.jpg` (워터마크 글꼴: `tools/fonts/Pretendard-SemiBold.otf`, OFL) |
| 공유 미리보기 이미지 다시 만들기 | `node tools/make-og.js` (문구는 `tools/og/og.html` 에서 수정) |
| 신청서를 구글 시트 + 이메일로 받기 | `tools/apps-script/Code.gs` 를 구글 Apps Script 에 붙여넣어 배포 ([설정 안내](../docs/이메일-접수-설정.md)) |

필요한 프로그램: Python 3 + `pip install pillow numpy`, Node.js + Playwright(공유 이미지만).

자료별 교체 절차 전체는 [`docs/자료-교체-가이드.md`](../docs/자료-교체-가이드.md) 를 보십시오.
