# 학습 관리 UI·기록·자동 추천 통합 개선

검증일: 2026-10-26. root와 dist에 반영했으며 커밋·게시는 수행하지 않았다.

## 변경 파일과 동작

- app.js / dist/app.js: 기본 정보의 학습 계획을 단일 베이지 카드와 2열 핵심 정보로 변경. 유효한 시험이 있을 때만 일정과 단일 안내 표시. 자료·시험의 실제 메모 폼을 공통 UI로 통일. 기록 목록은 원본을 조회하는 타임라인과 5개씩 더 보기로 구성. 시험 연결 자료는 상세 이동 행으로 간소화.
- learning-plan.js / dist/learning-plan.js: 홈과 상세가 같은 build 결과를 사용. 시험 당일 제외, 쉬는 날짜와 학습 가능한 요일, 당일 최초 권장량 차감 유지. 늦은 자료 목표일이 시험 전 완료를 방해하지 않도록 더 이른 기한을 사용. 여러 준비 시험에서는 다가오는 유효 날짜를 우선하고 모두 지났으면 지난 날짜를 남겨 예외 상태 판단.
- style.css / dist/style.css: 단일 계획 카드, 타임라인, 이해도 세그먼트, 메모, 연결 목록에 한정한 스타일 추가.
- service-worker.js / dist/service-worker.js: 실제 셸 33개 기준 캐시 갱신.
- tests/learning-plan.test.cjs / tests/study-app.test.cjs: 변경된 표시·기한 정책 기대값 반영, 부담 경계 및 예외 검증.

## 계산과 데이터 보존

필요 권장량은 이미 남은 분량÷학습 가능일을 올림하므로 이를 중복 구현하지 않았다. 최초 권장량에서 오늘 실제 증가량을 차감하고, 계획 조건이 바뀔 때만 재계산한다. 예: 120페이지/4일=30, 오늘 10페이지 학습 후 남은 권장량20.

예상 완료일의 기존 실제 기록 기반 7/14/28일 적응형 평균은 유지했다. 부담 판단은 같은 기간 선택과 원본 진도 증가분을 재사용하되, 시험의 학습 가능일과 쉬는 날짜를 반영한 평균을 사용한다. 학습하지 않은 가능일도 분모에 포함하며, 기록7일 미만·최근0·가능일0일이면 근거 없는 비율을 만들지 않는다. 1.5 이상일 때 요청 문구 하나만 표시한다. 직접 설정량은 변경하지 않고 남은 실제 수용량이 부족할 때 해당 경고만 표시한다.

실제 상향 조정의 근거가 없는 상황에서 조정 안내를 만들어내지 않는다. 정상 상태·시험 연결 없음에는 시험 관련 안내와 빈 영역을 생성하지 않는다.

LocalStorage 키·자료/기록 ID·원본 날짜·순서·단위·회독·이해도·시험 연결 및 백업 형식을 유지했다. dailyPlan의 파생 signature에는 기한 정책 버전을 포함해 이전 정책으로 계산한 당일 캐시를 새 정책에서 그대로 사용하지 않게 했다. 원본 이력을 소급 수정하지 않는다. 기존 복습 알고리즘·정렬과 통계 계산 모듈은 변경하지 않았다.

## 검증 결과

- Node 자동 테스트196건 통과: [실행 결과](evidence/developer-mode/integrated-management-tests.tap).
- Chrome 신규11흐름 통과: [결과](evidence/developer-mode/integrated-management-results.json), [실행 스크립트](evidence/developer-mode/integrated-management-browser.cjs).
- 기존 오늘의 학습·복습12흐름 회귀검증 통과: [결과](evidence/developer-mode/integrated-regression-today-results.json).
- 320×400 / 375×600 / 430×800 / 768×500 / 1024×400 / 1440×900에서 2열 카드, 긴 이름, 모달 가로 넘침, 44px 이해도 버튼, 실제 휠로 메모 저장 버튼 접근 확인.
- 현재·과거 회독, 학습 후 위치, 복습 범위, 5→10→전체 표시, 이해도 해제/수정·삭제 후 파생 추천 재계산 확인.
- 자료·시험 메모의 저장 대상 분리, 앞쪽 줄바꿈·공백 보존, 최대240px 자동 확장, 중복 저장 차단, X/Esc/배경 클릭 확인창 취소 시 입력 보존 확인.
- 테스트 자료 삭제 후 실사용 LocalStorage 문자열 동일, OFF 복귀·새로고침 후 동일, JSON 백업 왕복 동일 확인.
- [모바일 학습 계획](evidence/developer-mode/integrated-management-375.png) / [PC 학습 계획](evidence/developer-mode/integrated-management-1440.png).
- [변경 전 해시](evidence/developer-mode/integrated-management-before.json) / [변경 후 해시](evidence/developer-mode/integrated-management-after.json).

검증 중 메모를 빠르게 다시 열면 이전 close 이벤트가 새 변경 감지 상태를 초기화하던 문제를 발견해 수정했다. Esc도 기본 닫힘 이전에 처리해 확인 취소 후 모달이 닫히지 않도록 했다. 비동기 저장 완료 대기와 네이티브 확인창 처리 오류로 중단된 검증 스크립트 실행은 최종 통과 결과와 구분했다.

## 한계

실제 iPhone Safari/PWA, 소프트 키보드·안전 영역은 미검증이다. Chrome의 작은 뷰포트·높이 검증을 Safari 성공으로 간주하지 않는다. 사용자의 브라우저 저장소에 접근하지 않고 격리 프로필과 합성 자료를 사용했다. PowerShell 경계 점검 도구는 실행 정책으로 차단되어 소스 해시·호출 경로와 실제 합성 저장/백업 검증으로 대체했다.
