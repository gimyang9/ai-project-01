# 차곡차곡 실제 스킬 적용 기록

스킬 생성 이후 실제 적용만 기록한다. TODO 완료 상태는 자동 변경하지 않는다.

## CG-SKILL-001: 스킬 생성 후 현재 1단계의 원본 보존·저장 경계·단계 표현 재점검

- 적용 시각: 2026-10-24T09:12:18+09:00
- 스킬: chagok-data-guard
- TODO 연결: 1단계 재점검(1-1~1-10 구현을 소급 수행한 것이 아님), 2-1 관련 저장 구조 사전 검토(2단계 구현 미착수)
- 결과: limited — 보존 파일 6개 일치, 정적 저장 접근 0건, 합성 도구 테스트 12개 통과. 단계 문구를 정정했고 앱 코드와 원본은 변경하지 않았다.

실제 수행:

- 작성한 SKILL.md와 데이터 불변조건·기록 양식을 읽고 현재 단계와 소스를 대조했다.
- 원본 ZIP의 6개 항목을 reference/v1 파일과 SHA-256으로 비교했다.
- dist JavaScript의 저장 접근 패턴과 스크립트 구성을 확인했다.
- 독립 검토에서 관찰한 단계 승인 표현을 PROGRESS.md에서 후속 계획으로 바로잡았다.
- 스킬 도구의 합성 테스트 12개를 실행했다.

증거 파일:

- docs/evidence/data-boundary-2026-10-24.json
- docs/evidence/forward-check-2026-10-24.json
- docs/evidence/forward-check-notes.md
- docs/evidence/skill-tool-tests-2026-10-24.json

한계·미검증:

- 실제 사용자 데이터와 LocalStorage 내용은 읽거나 변경하지 않았다.
- 마이그레이션·저장 실패·백업 왕복·Safari/PWA 동작 검증은 다음 구현 단계에 남아 있다.
- 정적 탐지 통과는 동작상 무손실을 보장하지 않는다.
- 독립 검토 문서의 승인 표현 지적은 정정 이전에 관찰한 내용이다.

## CG-SKILL-002: 1단계 전체 UI/UX 개선 시 저장 경계 보존 및 반응형 검증

- 적용 시각: 2026-10-24T09:39:19+09:00
- 스킬: chagok-data-guard
- TODO 연결: 1-1~1-10 디자인 개선 재작업(2단계 구현 미착수)
- 결과: limited — 1.0 원본 6개 동일, 리터럴 저장 접근 0건. 모바일 네 화면 가로 넘침 없음. 메뉴에서 메모 진입 및 초기화 전 확인 유지.

실제 수행:

- 최신 사용자 지시·PROGRESS·기존 이벤트 구조 확인
- 화면·문구·식물 렌더링만 수정하고 LocalStorage와 1.0 소스 유지
- 원본 6개 파일 비교와 저장 경계 정적 검사
- 320/390px iframe 네 탭·진도/복습 모달·설정 확인·PC 레이아웃 검증

증거 파일:

- docs/evidence/ui-refresh-boundary.json
- docs/evidence/ui-refresh-qa.json

한계·미검증:

- Chrome iframe 기반 폭 검증이며 실제 iPhone Safari·PWA·소프트 키보드는 미검증.
- 2.0은 화면 전용 단계. 영구 저장·스마트 복습·실제 데이터 통계는 미연결.
- 정적 저장 경계 검사는 별칭·동적 접근을 완전히 탐지하지 않음.

## CG-SKILL-003: 승인된 아기 곰 브랜드 헤더와 5단계 식물 UI 적용

- 적용 시각: 2026-10-24T10:15:58+09:00
- 스킬: chagok-data-guard
- TODO 연결: 1-1~1-10 화면 개선 후속(2단계 데이터 연결 미착수)
- 결과: limited — 배너·헤더·식물·카드 UI 적용. 성장 표시 37개 사례 통과. 1.0 원본 6개 동일, 리터럴 저장 접근 0건.

실제 수행:

- 승인된 텍스트 없는 배너와 식물 아틀라스 재사용
- HTML 브랜드 제목 통합·세부 헤더 중앙 정렬·카드 여백 축소
- 자료 데이터 수정 없이 표시 함수의 5단계 경계·과거 완성 상태 유지 검증
- 원본 6개 파일 보존 및 저장 경계 검사·모바일 두 폭과 PC 시각 점검

증거 파일:

- docs/evidence/approved-assets-boundary.json
- docs/evidence/five-stage-boundaries.json
- docs/evidence/approved-assets-qa.json

한계·미검증:

- 실제 iPhone Safari·PWA·가상 키보드 미검증.
- 현재 2.0은 저장·스마트 복습 계산 미연결인 화면 미리보기.
- 정적 검사로 모든 동적 저장 접근이나 실제 데이터 호환성을 증명하지 않음.

## CG-SKILL-004: 추가 버튼 글자 확대 및 필터 볼드 적용

- 적용 시각: 2026-10-24T14:02:40+09:00
- 스킬: chagok-data-guard
- TODO 연결: 1단계 UI 미세 조정
- 결과: limited — 버튼 크기와 동작을 유지하면서 글자 강조 적용. 저장 코드 변경 없음.

실제 수행:

- 미완료 홈 작업을 보존하고 요청된 CSS만 분리 수정
- 브라우저 계산 스타일로 추가 높이44·글자15·굵기700·아이콘18 확인
- 필터 높이36 유지·굵기700 확인

증거 파일:

- docs/evidence/button-type-qa.json

한계·미검증:

- 실기기 모바일 미검증

## CG-SKILL-005: 식물 가장자리 잘림 수정

- 적용 시각: 2026-10-24T14:09:25+09:00
- 스킬: chagok-data-guard
- TODO 연결: 1단계 식물 표시 수정
- 결과: limited — 20개 식물 실루엣이 각 표시창 내부에 포함됨. 원본 이미지·기록·진도 계산은 수정하지 않음.

실제 수행:

- 원본 알파 영역을 읽어 20개 식물의 실제 실루엣 경계 측정
- 300×300 원본 좌표 표시창과 3px 여유를 지정해 전체 실루엣 포함
- 일괄3% 자르기 대신 종류·단계별 이웃 이미지 분리
- Chrome에서 완성 나무 왼쪽 잎 표시 확인

증거 파일:

- docs/evidence/plant-complete-bounds.json

한계·미검증:

- 실기기 Safari 미검증
- 알파128 이상 영역을 기준으로 측정하고 원본3px 여유를 적용함

## CG-SKILL-006: 1단계 화면·입력 정리 및 저장 경계 검증

- 적용 시각: 2026-10-24T14:25:00+09:00
- 스킬: chagok-data-guard
- TODO 연결: 1단계 화면·입력 정리
- 결과: limited — 화면 정리와 검증 완료. 원본1.0 및 사용자 저장 데이터 변경 없음.

실제 수행:

- 유형별 저장 단위를 참조하는 UI 및 시험 날짜 선택 입력 검증
- 연속 학습일 계산을 저장과 분리하고 날짜 경계 9개 사례 검사
- 원본 1.0 파일 6개와 LocalStorage 미접근 경계 감사
- 화면 미리보기와 미연결 실제 저장 기능 구분 유지

증거 파일:

- docs/evidence/stage1-input-qa.json
- docs/evidence/stage1-input-boundary.json
- tests/streak.test.cjs

한계·미검증:

- 2.0 is a UI prototype with explicit fixture notice; no persistent CRUD or recommendations connected
- Mobile Safari/PWA hardware not tested
- Streak UI uses existing demo records until data integration

## CG-SKILL-007: 추가 요청 시험 관리 단계와 필터 볼드

- 적용 시각: 2026-10-24T15:00:00+09:00
- 스킬: chagok-data-guard
- TODO 연결: 추가 UI/UX #4, #4-1, #4-2, 시험 필터 볼드 추가 지시
- 결과: limited — 시험 관리 동작 및 필터700 적용. 22개 테스트 통과. 기존 기록 변경 없음.

실제 수행:

- 시험 상태 계산과 LocalStorage 경계를 학습 기록에서 분리
- 다중 시험 공유·독립 자료·수동 중단 자료를 구분하는 중단/재개 검증
- JSON 및 버전 검증과 저장 실패 시 UI 불변 검사
- 원본1.0 파일6개 대조, 미리보기 저장 범위와 미연결 백업을 명시

증거 파일:

- tests/exam-management.test.cjs
- docs/evidence/exam-management-boundary.json
- docs/evidence/exam-management-qa.json

한계·미검증:

- Study material and record data are still fixtures; no 1.0 migration or real study CRUD connected
- Backup/restore/reset integration for this new preview store is not implemented in this scope
- No physical Safari or installed PWA testing
- Automatic learning quantity and review calculations remain later work; displayed quantities are fixtures
- 정적 감사가 간접 LocalStorage 접근을 탐지하지 못하여 실제 저장 키를 수동 확인함

## CG-SKILL-008: 시험 중단/마무리 시 자료별 학습 유지 선택으로 전환

- 적용 시각: 2026-10-24T16:00:00+09:00
- 스킬: chagok-data-guard
- TODO 연결: 최신 자료별 선택 요청 #1~#6
- 결과: limited — 35개 테스트 통과. 기존 기록/연결 보존, 자료별 선택 및 기본해제 확인.

실제 수행:

- 상시 독립 학습 설정과 이벤트 제거
- 시험별 유지 선택과 직접/자동 중단 원인 분리
- 기존 미리보기 저장값을 비파괴 전환하며 최초 변경 전 원문 별도 보존
- 공유자료/반복재개/연결변경/오류저장 및 JSON 왕복 검사
- 27개 합성 자료 목록으로 모바일 내부 스크롤/확인 버튼 위치 검사

증거 파일:

- docs/evidence/material-choice-qa.json
- docs/evidence/material-choice-boundary.json
- tests/exam-management.test.cjs

한계·미검증:

- Actual1.0 migration and real study record CRUD are not connected in this preview
- Backup/restore/reset UI remains previously unconnected; only exam store version1/version2 read compatibility and JSON round trip tested
- No physical Safari or PWA validation
- Static audit misses indirect storage calls; exact keys reviewed in source
- Many-item QA used a separate temporary in-memory fixture harness; removed before publication

## CG-SKILL-009: 사용자 승인 B배너·홈·필터·중단 모달 UI 적용

- 적용 시각: 2026-10-24T15:57:18.755486+09:00
- 스킬: chagok-data-guard
- TODO 연결: 홈 디자인·필터 개선 #1~#6, 시험 중단 모달 UI 개선 #1~#6, 최종 조합 승인 그래
- 결과: limited — 승인된 디자인 적용 및 검증 완료; 기능 데이터 변경 없음.

실제 수행:

- 승인된 개별 PNG 에셋 적용 및 원본 배너 보존
- 화면 문구와 CSS만 변경하고 상태·저장·연속일 계산 모듈은 유지
- 35개 기존 테스트 재실행
- 390/320px 및 PC 화면, 전체 선택행 클릭과 긴 목록 스크롤 검증

증거 파일:

- docs/evidence/approved-home-modal-qa.json
- docs/evidence/approved-home-modal-boundary.json

한계·미검증:

- Browser QA in Chrome at simulated mobile widths; physical Safari/PWA not tested
- App remains a preview; real1.0 data/backup integration is still pending
- Many-item layout QA used an isolated temporary in-memory fixture harness removed before packaging
- Static storage audit does not capture indirect storage calls

## CG-SKILL-010: 승인된 배너 높이·작은 UI 글자 및 관리 메뉴 여백 개선

- 적용 시각: 2026-10-24T21:07:14.274568+09:00
- 스킬: chagok-data-guard
- TODO 연결: 홈 배너 높이 및 UI 가독성 요청 #1~#6, 표시 영역 확인 후 추가 승인, 관리 메뉴는 글자 확대만큼 기존 여백 축소
- 결과: limited — 승인된 UI 적용 및 관련 검증 통과. 자료 관리 모달15px, 시험 관리 모달18px 축소.

실제 수행:

- CSS만 수정하고 이미지 원본·JS·데이터·계산 모듈 유지
- 모바일 배너 aspect-ratio를 기존의92% 높이로 변경, 이미지 배율·제목 절대위치 유지
- 작은 글씨 선별 확대, 주요 제목·수치·진행률 라벨 유지
- 관리 메뉴 행59→56px로 축소해 글씨13→13.8px를 기존 공간에 수용
- 기존35개 테스트와1.0파일 보존 점검 및320/390px·PC 브라우저 검사

증거 파일:

- docs/evidence/readability-qa.json
- docs/evidence/readability-boundary.json

한계·미검증:

- Simulated Chrome viewport, not physical Safari/PWA
- QA used identical application CSS in a copy with in-memory fixture storage
- Static audit misses indirect storage access; JS modules unchanged
- Existing app remains preview; actual1.0 migration and full backup integration pending

## CG-SKILL-011: 승인된 홈 작은 글씨 및 자료 카드 버튼 개선

- 적용 시각: 2026-10-24T21:51:22.555642+09:00
- 스킬: chagok-data-guard
- TODO 연결: 홈 텍스트·학습 자료 카드 버튼 개선 #1~#4, 제안 수치 사용자 승인 어
- 결과: limited — 승인된 홈 UI 수정 및 관련 검증 통과. 버튼·카드 높이는 유지하고 글씨가 내부 여백을 채우도록 개선.

실제 수행:

- 현재 적용 수치를 기준으로 홈 전용 선택자만 추가
- 자료명·상태·권장 분량·요약 보조 글씨 선별 확대
- 메인 카드 버튼12.8→13.4px, 상하패딩9→8.2px, 최소높이44px 유지
- D-Day·주요 제목·이미지·계산·저장·이벤트 소스 유지
- 35개 테스트 및1.0파일6개 보존 점검,320/390px·PC 화면과 기존 모달 진입 검증

증거 파일:

- docs/evidence/home-text-buttons-qa.json
- docs/evidence/home-text-buttons-boundary.json

한계·미검증:

- Chrome simulated mobile widths; no physical Safari/PWA validation
- QA used copied app with isolated in-memory fixture storage
- Full1.0 migration and actual study-record/backup integration remain pending
- Static audit cannot detect all indirect storage access; JS source unchanged

## CG-SKILL-012: 승인된 더보기 두 메뉴·숫자 배지 UI 개선

- 적용 시각: 2026-10-24T22:00:32.407963+09:00
- 스킬: chagok-data-guard
- TODO 연결: 더보기 탭 메뉴 구성·UI 개선 #1~#8, UI만 우선 진행 사용자 승인 어
- 결과: limited — 승인된 UI 적용. 실제 저장된 보관 자료 집계/복원 기능은 미연결 상태로 유지하며 완료로 주장하지 않음.

실제 수행:

- 앱 정보 메뉴 및 전용 모달 분기 제거, 홈 버전 및 공통 개발 안내 유지
- 자료 보관함 명칭으로 변경하고 기존 보관 모달/복원 미연결 안내 유지
- 배지와 보관 화면을 동일 예시 목록 기준으로 표시, 저장 구조 변경 없음
- 더보기 전용 CSS로 행54px·카드114px·오른쪽배지와화살표8px간격 적용
- 35개 기존 테스트와1.0파일6개 보존 검사,320px의0/12개 및390px 화면 확인

증거 파일:

- docs/evidence/more-menu-qa.json
- docs/evidence/more-menu-boundary.json

한계·미검증:

- Actual persistent archive/restore remains unconnected; displayed archive is a fixture, not real user data
- Chrome simulated mobile widths, no physical Safari/PWA validation
- 0/12 count cases used isolated QA-only fixture copies
- Static audit misses indirect storage access; storage/calculation modules unchanged

## CG-SKILL-013: 새 프로젝트 스킬 생성 후 저장 경계·완료 표현 개발 검토

- 적용일: 2026-10-24 (정확한 시각 미기록)
- 스킬 원문: skills/chagok-data-guard/SKILL.md — 이번에 새로 작성한 버전, 과거 원문 복원본 아님.
- TODO: SUB-006, 2-1 관련 사전 소스 검토. 2단계 구현·완료 아님.
- 실제 적용: 원문을 읽고 PRD 후속 결정과 TODO를 대조했다. 시험 KEY/load/save/upgrade, commitExam의 저장 후 상태 반영, preview form의 저장 미연결을 검토했다. 점검 도구를 실행하고 README·TODO·제출 상태·AGENTS 로드 경로를 갱신했다.
- 결과: limited. 도구가 보존 파일 6개와 JS 3개 해시, 저장 접근 후보 6곳을 출력했다. 학습·복습은 예시이고 시험 변경은 별도 저장이라는 소스 범위를 확인했다. 앱 코드와 원본은 수정하지 않았다.
- 근거: docs/evidence/skill-013-source-inventory.json, docs/evidence/skill-use-entry-013.json, docs/skill-selection.md.
- 실행: powershell -NoProfile -ExecutionPolicy Bypass -File skills/chagok-data-guard/scripts/inspect-boundary.ps1. 기본 정책에서 파일 실행이 거절돼 프로세스 한정 옵션으로 재실행했다. 시스템 정책 변경 없음.
- 한계: 정적 검색은 간접 접근을 놓칠 수 있다. 해시는 현재 기준선이며 과거 원본과 대조하지 않았다. Python/py가 없어 quick_validate.py 미실행, 필수 frontmatter와 출력 구조만 별도 확인했다. Node 앱 테스트·브라우저·마이그레이션·백업 왕복은 이번에 실행하지 않았다. 전역 설치 없이 AGENTS의 프로젝트 경로로 사용한다.
- 생성과 사용 구분: 작성 후 수행한 소스 검토만 이번 적용이다. 과거 CG-SKILL-001~012나 생성 전 앱 구현을 새 스킬의 사용으로 소급하지 않는다. Git 커밋은 사용자가 직접 수행한다.
