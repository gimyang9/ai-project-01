# 학습 자료 상단·오늘의 복습 UI 개선

2026-10-26. 실제 앱 root/dist에 반영. 커밋·게시는 수행하지 않았다.

## 변경 파일

- index.html / dist/index.html: 자료 제목의 삼각형을 선형 chevron으로 변경. 자료 개수와 분류별 개수는 hidden으로 화면·접근성 트리에서 숨기고 기존 계산용 ID는 보존. 추가 문구 제거 및 학습 자료 추가 접근성 이름 제공.
- app.js / dist/app.js: 복습 범위에 범위/예정일/실제 이전 이해도/메뉴만 표시. 자료 제목은 카드 밖 그룹 제목으로 유지하고 추천 이유·개별 기록 버튼은 기본 목록에서 제거. 공유 범위 팝업의 기록/날짜 변경은 기존 모달·범위 데이터·목록 복귀 동작에 연결.
- style.css / dist/style.css: 가벼운 분류 캡슐, 164px 제목 메뉴·선택 체크, 제목 chevron 회전. 시험 추가와 같은 공통 버튼 규칙 재사용. 이를 덮어쓰던 기존 자료 추가 버튼 전용 width:auto·아이콘18px 규칙을 제거했다. 복습 자료 제목의 3×20px 세이지 선과 별도 범위 카드, 얇은 행 구분선·마지막 행 선 제거.
- service-worker.js / dist/service-worker.js: 실제 셸33개 기준 캐시 재생성.

## 팝업 및 기존 동작

제목 메뉴는 details 내부의 absolute 요소로 배치해 아래 필터·카드를 밀지 않는다. 너비는164px이며 작은 화면 너비를 넘지 않게 제한한다. 외부 클릭/선택/Escape로 닫히고 열린 상태에서 chevron이 위로 회전한다.

복습 메뉴는 모달 직속 공유 요소이며 지원 브라우저에서는 native popover의 최상위 레이어에 표시한다. 일반 흐름에서 제외하고 클릭한 버튼·모달·가시 뷰포트 경계를 기준으로 위치를 계산한다. 아래 공간이 부족하면 위쪽, 오른쪽 공간이 부족하면 왼쪽으로 조정한다. 스크롤·창 크기 변경 시 위치를 갱신하고 버튼이 모달 바깥으로 사라지면 닫는다. API가 없는 환경에는 같은 위치 계산의 fixed 배치를 사용하지만 실제 구형 Safari 검증은 하지 않았다.

외부 클릭/항목 선택/Escape 닫기, 방향키·Home·End 이동, 닫을 때 트리거로 포커스 복귀를 제공한다. 메뉴가 열린 상태의 모달 배경 클릭은 메뉴만 닫는다. 기록과 날짜 변경은 기존 범위를 정확히 전달하며 저장/취소 후 기존 필터·자료 선택으로 돌아온다.

오늘 예정/밀린 복습, ID별 그룹화, 접기·펼치기, 5개씩 더 보기·접기, 추천 정렬과 수동 날짜 우선 정책은 유지한다. 자료 카드 내부 디자인은 이번에 수정하지 않았다.

## 검증

- Node196건 통과: [테스트 출력](evidence/developer-mode/material-review-ui-tests.tap).
- 격리 Chrome10흐름 통과, 최종 런타임 오류0: [결과](evidence/developer-mode/material-review-ui-results.json), [실행 스크립트](evidence/developer-mode/material-review-ui-browser.cjs).
- 320/375/430/768/1024/1440px에서 제목 메뉴 열기 전후 필터·카드 좌표 동일. 자료/필터 개수 미표시, 제목 화살표19px, 시험/자료 추가 버튼의 실제 크기·패딩·색상·모서리·아이콘 동일.
- 학습 중/완료 및 자료가 있는 전공/시험 분류와 빈 분류를 확인. 제목 실제 터치·클릭 및 자료 추가 진입 확인.
- 320×400/375×600/430×800/768×500/1024×400/1440×900에서 복습 팝업을 열어도 행 좌표 동일. 팝업이 모달 안에 들어오고 항목 중심 hit-test 성공. 위/아래 배치를 모두 재현했다.
- 복습 범위별 큰 버튼·추천 설명 제거, 카드 밖 그룹 제목·단순 세로선·5→10→전체/접기 확인.
- 실제 터치, 키보드 메뉴·Escape, 외부 클릭, 정확한 범위 입력, 단일 복습 저장, 수동 일정 변경 후 오늘 분류 이동, 원본 이력 보존 확인.
- 표시 조작만으로 저장값이 바뀌지 않음, JSON 백업 왕복, 새 문서 로드 완료 후 재조회, 테스트 변경 후 실제 데이터 문자열 동일 확인.
- [변경 전 해시](evidence/developer-mode/material-review-ui-before.json) / [변경 후 해시](evidence/developer-mode/material-review-ui-after.json): learning-plan / review-plan / study-data / exam-management / today-review-view / test-mode / 1.0 원본 동일.

화면: [모바일 자료 제목](evidence/developer-mode/material-heading-375.png), [PC 자료 제목](evidence/developer-mode/material-heading-1440.png), [모바일 복습](evidence/developer-mode/material-review-375.png), [PC 복습](evidence/developer-mode/material-review-1440.png).

초기 검증에서는 폰트 안정화 전의 미세한 좌표 차이와 이전 자료 버튼 전용 CSS 충돌을 확인했다. 폰트 로드 후 다시 측정하고 충돌 CSS를 제거했다. 스크롤 직후 늦게 전달되는 이벤트가 메뉴를 닫는 문제는 위치 갱신으로 수정했다. 새로고침이 끝나기 전 구 문서를 검사하던 테스트 스크립트는 새 문서 확인 후 재실행했으며 최종 통과 실행만 위 결과에 포함했다.

## 한계

실제 iPhone Safari/PWA 및 구형 popover 미지원 엔진은 미검증. Chrome 터치 에뮬레이션을 실제 Safari 성공으로 간주하지 않는다. 사용자 데이터에 접근하지 않고 합성 데이터와 별도 브라우저 프로필을 사용했다. PowerShell 경계 도구의 기존 실행 정책 제한 때문에 소스 해시·호출 경로와 합성 저장/백업 왕복으로 보존을 검증했다.
