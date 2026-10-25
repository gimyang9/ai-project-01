# R2 배너 최종 적용 — 2026-10-26

사용자가 직접 조작 미리보기의 개선 배너 적용을 승인해 실제 원본과 배포본에 반영했다.

## 변경

- index.html과 dist/index.html의 배너에 camera-continuous 클래스를 추가했다.
- 승인된 미리보기의 카메라 규칙을 banner-camera.css와 dist/banner-camera.css로 연결했다. 규칙은 미리보기와 동일하다.
- 실시간 검토 페이지도 dist/banner-camera.css를 직접 불러오므로 실제 앱과 같은 카메라 CSS를 사용한다.
- 배경·로고·오두막은 배너 컨테이너를 기준으로 계산한다. 원본 이미지 비율을 유지하고 빈 영역을 방지한다.
- 기본 style.css, 앱/계산/저장 JavaScript와 이미지·로고 에셋은 변경하지 않았다.
- 날짜·인사 카드·버전과 기존1024px 내비게이션 전환을 유지했다.
- PWA 셸을 갱신했고 새 카메라 CSS를 포함한29개 파일을 캐시한다.

## 확인

- 자동 테스트 **166개 통과, 실패0개**.
- 원본·배포본 실제 Chrome 렌더링 **463개 측정** 통과.
- 320/375/430/600/680/681/767/768/935/936/1023/1024/1280/1440/1920px 확인.
- 600→800→600px를1px 간격으로 왕복하며 배경·로고 크기 연속성 확인.
- 실제 Chrome 창 크기 변경과 실제 페이지 확대80/90/100/110/125/150/200% 확인.
- 배너 이미지가 배너를 덮지 못하는 빈 영역은0px, 런타임 오류·누락 리소스0건.
- 실제 앱과 승인 미리보기의 배너·배경·로고·오두막 좌표 및 크기 일치 확인(0.1 CSS px 이내).
- 실제 브라우저의 합성 자료로 등록·진도/복습 저장·보관·파일 백업/복원·두 창 충돌 방지 재검증.
- 오프라인 재로드 후에도 새 카메라 CSS가 적용되고 저장·재실행이 유지됨을 확인했다.
- 기존 원본1.0 합성 저장값과 과거 회독 이력, 백업 파일 왕복 내용 보존 확인.

[자동 테스트](evidence/banner-camera-applied/tests.json) ·
[실제 배너 측정](evidence/banner-camera-applied/results.json) ·
[저장·오프라인 검증](evidence/banner-camera-applied/browser-results.json) ·
[원본 보존 및 동일 규칙 확인](evidence/banner-camera-applied/after.json)

[1440px 홈](evidence/banner-camera-applied/home-1440.png) ·
[1024px 홈](evidence/banner-camera-applied/home-1024.png) ·
[767px 홈](evidence/banner-camera-applied/home-767.png) ·
[768px 홈](evidence/banner-camera-applied/home-768.png)

실제 iPhone Safari·소프트 키보드·안전 영역은 이번에도 검증하지 않았다. 실제 사용자 자료 전환·대조인6-1·6-12도 별도 대기다. 해당 이유로6단계 전체 완료로 표시하지 않는다.

Git 커밋·게시·배포는 수행하지 않았다.
