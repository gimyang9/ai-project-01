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

## CG-SKILL-014: 1단계 TODO 완료 여부 문서 확인

- date: 2026-10-24
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 1단계 TODO 완료 여부 문서 확인
- todo_refs: 1-1~1-10
- actions: 스킬 원문과 TODO·PROGRESS·요구사항 인덱스·최근 사용 로그 대조.
- evidence: docs/TODO.md의 1단계 10개 체크와 화면 구성 기준, PROGRESS.md의 완료 목록과 실제 저장 미연결 설명, docs/requirements-index.md의 구현 보고 완료·사용자 확인 대기.
- result: limited
- outcome: 문서 기준 화면 구성 10/10 완료. 실제 데이터 연결과 최종 검증 완료를 뜻하지 않음.
- limitations: 문서 검토만 수행. 앱 소스·브라우저·테스트 재검증 미실행. 기존 구현에 새 스킬 사용을 소급하지 않음.

## CG-SKILL-015: 사용자 승인 2단계 데이터 연결 구현

- date: 2026-10-24
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 사용자 승인 2단계 데이터 전환·학습 관리·통합 백업 구현
- todo_refs: 2-1~2-14
- actions: 스킬 원문과 TODO·PROGRESS·PRD 후속 결정 및 1.0 소스를 확인했다. 통합 study-data.js와 실제 자료/기록/회독/메모/목표일/중단/보관/백업 폼을 연결했다. 원본 키와 알 수 없는 필드를 보존하고 기록 있는 자료의 단위 변경을 거부했다. 오류 후 복원/초기화는 읽지 못한 원문을 보존한 뒤 교체한다. 루트/dist를 동기화하고 문서 완료 표현을 갱신했다.
- evidence: docs/stage2-validation.md, docs/evidence/stage2-tests.tap, stage2-boundary-before.json·stage2-boundary-after.json, skill-use-entry-015.json. Codex 런타임 node.exe로 테스트 실행. 56개 중 56개 통과(기존 35 + 합성 저장/데이터 16 + 모의 DOM 앱 5), 구문 검사 통과, reference/v1 파일 6개 해시 전후 동일.
- result: limited
- outcome: 2-1~2-14 구현·합성 자동 검증 완료. 실제 브라우저·사용자 1.0 백업 복사본 검증·사용자 최종 확인 대기. 3단계 미착수.
- limitations: 사용자 실제 저장값 접근 없음. 모의 DOM은 실제 브라우저·모바일/PC 레이아웃·파일 다운로드·Safari/PWA 검증을 대체하지 않는다. computer-use 스킬 원문을 읽고 cua 브라우저 검증을 시도했으나 apps/browsers 모두 없고 iab unavailable이었다. 경계 도구는 프로세스 한정 ExecutionPolicy 옵션으로 실행했으며 시스템 정책 변경 없음. 해시는 파일 보존 근거이며 사용자 데이터 전환 성공을 뜻하지 않는다. 배포·Git 커밋·Push 없음. 생성 전 구현 소급 기록 없음.

## CG-SKILL-016: 데스크톱 사이드바와 미적용 시안 4종

- date: 2026-10-24
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 승인된 데스크톱 반응형 레이아웃과 시안 4종 비교 자료
- todo_refs: UI-SIDEBAR-01~04
- actions: 원문/현재 진행과 이미지 에셋 확인, HTML/CSS로 동일 메뉴의 1024px 사이드바 전환·홈/더보기 정렬 개선. 모바일 스타일 유지. imagegen 스킬과 내장 image_gen으로 투명 PNG 4종을 생성해 독립 폴더에 보존하고 비교 HTML·최종 프롬프트를 작성. 앱에는 시안 미적용. 기존 테스트 재실행과 전후 경계·알파·미리보기 JS 검사.
- evidence: docs/sidebar-layout-notes.md, docs/evidence/sidebar-tests.tap (56/56 pass), sidebar-summary.json, sidebar-art-alpha.json, sidebar-boundary-before.json, sidebar-boundary-after.json, skill-use-entry-016.json. Node는 Codex 런타임 실행 파일 사용.
- result: limited
- outcome: 레이아웃 구현 및 독립 시안 4종 완료. 앱 JavaScript·reference/v1 전후 해시 동일. 루트/dist 동기화. 일러스트 실제 앱 미참조.
- limitations: cua.getState apps=[] browsers=[]로 실제 모바일/PC·1024px 경계·낮은 창·키보드 QA 미수행. 모의 DOM/정적 구조 검사를 실제 화면 검증으로 주장하지 않음. 알파는 12px 간격 표본 검사. 실제 Safari/PWA 미검증. 사용자 시안 선택 대기. 3단계·Git 커밋·배포 없음.

## CG-SKILL-017: 사이드바 최종안 1번 실제 적용

- date: 2026-10-25
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 사용자 최종 선택 나무 곁의 아기 곰을 실제 데스크톱 사이드바에 적용
- todo_refs: UI-SIDEBAR-04 완료, UI-SIDEBAR-03 실제 화면 확인 대기
- actions: 스킬/현재 진행/CSS와 선택 이미지를 확인했다. 원본을 새 assets 경로에 복사해 desktop media picture로 연결하고 208px 지정·컨테이너 제한/문구 간격5px/버전 분리/낮은 창 spacing을 적용했다. 기존 본문 간격과 모바일 스타일을 검토하고 JS/저장 로직은 유지했다. 비교 페이지 선택 상태와 문서를 갱신했다.
- evidence: sidebar-final-tests.tap 56/56 pass, sidebar-final-summary.json, sidebar-final-before.json, sidebar-final-after.json, docs/sidebar-layout-notes.md. 앱 JS/1.0 전후 동일, 선택 원본과 새 에셋 동일, 루트/dist 일치.
- result: limited
- outcome: 실제 앱 최종안 적용 완료, 기능 테스트 56개 통과. 기존 이미지 원본/앱 기능 보존.
- limitations: cua.getState apps=[] browsers=[]이므로 데스크톱 홈/모바일/낮은 창 시각 검증 미수행. 정적 간격 검토를 실제 화면 QA로 주장하지 않는다. 이미지 생성/편집 없음. Git 커밋·배포 없음.

## CG-SKILL-018: 3단계 시험 관리·쉬는 날짜·재응시 구현

- date: 2026-10-25
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 승인된 다음 단계 착수, 시험 관리 구현 및 미확정 계산 기준 확인
- todo_refs: 3-1~3-6, 3-8, 3-14~3-17 구현 확인; 3-7, 3-9~3-13 계산 기준 응답 대기
- actions: 원문/현재 진행/PRD 후속 결정과 실제 저장 코드를 확인했다. 쉬는 날짜의 검증/저장, 기존 자료와 기록을 공유하는 새 재응시 시험, 보관 자료의 기존 연결 유지 UI를 구현했다. 원래 시험/수동 일정/직접 중단/보관 상태를 보존한다. 미확정 날짜 경계와 속도 산정 기간은 사례로 사용자에게 질문하고 답변 전 계산을 확정 구현하지 않았다.
- evidence: docs/stage3-validation.md, docs/evidence/stage3-tests.tap (60/60 pass), stage3-before.json, stage3-after.json, stage3-summary.json. 원본 1.0 6개 전후 동일, 루트/dist 일치.
- result: limited
- outcome: 시험 관리 부분 구현·60개 자동 테스트 완료. 권장량/예상일 계산 기준 응답 대기로 3단계 전체 미완료.
- limitations: 실제 브라우저·Safari/PWA 미검증, 합성/모의 DOM만 검증. 사용자 실제 데이터 접근 없음. Git 커밋·배포 없음.


## CG-SKILL-019: 3단계 권장량·자료별 적응형 평균 예상일

- date: 2026-10-25
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 사용자 확정 기준으로 3단계 권장량/예상일과 수동 계획 연결
- todo_refs: 3-7, 3-9~3-13, 3단계 전체 구현 완료
- actions: 원문/현재 상태/사용자 확정 규칙을 확인했다. learning-plan.js 순수 계산 모듈로 권장량과 자료별7/14/28일 평균 예상일을 분리하고 원본/복습/회독 이력을 보존했다. 목표일 우선/요일/쉬는 날/자료당 중복 방지, 수동 하루 분량 저장/복귀와 홈·시험·자료 상세/계획 UI를 연결했다.
- evidence: docs/stage3-validation.md, docs/evidence/stage3-plan-tests.tap(90/90 pass), stage3-plan-before.json, stage3-plan-after.json, stage3-plan-summary.json. 원본1.0 6개 동일, 루트/dist 동기화.
- result: limited
- outcome: 3-1~3-17 구현·합성 자동 검증 완료. 실제 브라우저/사용자 확인 대기.
- limitations: cua.getState apps=[] browsers=[]로 실제 모바일/PC/Safari/PWA 미검증. 모의 DOM/합성 테스트만 실행, 사용자 실제 저장값 접근 없음. 최초 쉬는 날0/null 테스트 기대값 오류 수정 후 최종90개 통과. 4단계·Git 커밋·배포 없음.


## CG-SKILL-020: 홈 배너 로고 A/B 미리보기

- date: 2026-10-25
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 승인 전 독립 홈 배너 A/B 비교 제작
- todo_refs: 사용자 요청 홈 배너 문구/디자인 비교, 실제 적용 승인 대기
- actions: 실제 배너 문구(하루하루 쌓이는 공부 기록)와 CSS12px/400/5px를 확인했다. 앱 스크립트를 제거한 홈 스냅샷을 별도 iframe에 넣고 A 유지/B 오늘의 공부를 기록해요·13.2px·600·4px를 비교했다. 폭320/390/430/1280px 전환을 제공하고 원본 해시·미리보기 구문/저장 접근을 확인했다.
- evidence: previews/banner-logo/index.html, snapshot.js, docs/evidence/banner-logo-before.json, banner-logo-boundary-before.json, banner-logo-boundary-after.json, banner-logo-preview-summary.json.
- result: limited
- outcome: 비교 시안만 제작. 실제 앱 HTML/CSS/배너 이미지 동일. B 추천, 사용자 최종 승인 대기.
- limitations: Medium 폰트 파일이 없어 기존 Bold600을 사용한 시안이며 진짜 Medium이 아님. cua.getState apps=[] browsers=[]로 실제 모바일/PC 겹침·배치 미검증. 앱 코드를 수정하지 않아 회귀 테스트 미실행. Git 커밋·배포 없음.

## CG-SKILL-021: 승인된 홈 배너 B안 실제 적용

- date: 2026-10-25
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 사용자 승인 B안의 홈 보조 문구/타이포 적용
- todo_refs: 홈 배너 B안 사용자 승인
- actions: 원문/현재 진행/배너를 확인했다. 루트/dist HTML 문구를 오늘의 공부를 기록해요로 변경하고 보조 문구만13.2px·600·간격4px·왼쪽 정렬을 적용했다. 비교 페이지는 A의 이전 스타일을 고정하고 B승인 상태를 표시했다. 전후 저장 경계/이미지 해시/동기화를 확인했다.
- evidence: docs/evidence/banner-logo-final-before.json, banner-logo-final-after.json, banner-logo-image-before.json, banner-logo-final-summary.json.
- result: limited
- outcome: 승인 B안 실제 반영 완료. 제목/배너 이미지·높이·반응형 배치/버전 위치와 앱 JS·원본1.0 유지. 루트/dist 일치.
- limitations: cua.getState apps=[] browsers=[]로 실제 모바일/PC 겹침과 시각적 균형 미검증. 문구/CSS만 바꿔 회귀 테스트 미재실행, 과거 통과 수를 이번 결과로 재사용하지 않음. Medium 파일 추가 없이 승인 시안의 기존 Bold600 사용. Git 커밋·배포 없음.


## CG-SKILL-022: 학습 계획 모달 제안과 독립 비교 시안

- date: 2026-10-25
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 승인 전 학습 계획 모달 UI/정보 밀도 개선안
- todo_refs: 사용자 요청 모달 UI 제안, 실제 앱 적용 승인 대기
- actions: 원문/현재 상태/planMarkup 공유 구조와 모달 템플릿·스타일을 확인했다. 모달 전용 최대2줄 상태, 하루 학습량 라벨/단위 일체형 입력, 비워 두면 자동 추천을 사용해요 한줄 안내, 구분선 유지·padding/간격 축소를 제안했다. 7개 합성 상태와320/390/430px·단위 비교 HTML을 독립 제작했다. 도움말 아이콘 미추가. 앱 해시 불변과 시안 JS구문/저장 접근 없음을 확인했다.
- evidence: previews/study-plan/index.html, docs/evidence/plan-modal-preview-before.json, plan-modal-preview-boundary-before.json, plan-modal-preview-boundary-after.json, plan-modal-preview-summary.json.
- result: limited
- outcome: 독립 비교 제안 완료. 앱/다른 모달/카드/계산/저장 미수정, 사용자 승인 대기.
- limitations: cua.getState apps=[] browsers=[]로 실제 모바일/PC·Safari 입력/키보드/레이아웃 미검증. 고정 예시만 사용. 앱 코드 변경이 없어 회귀 테스트 미실행. Git 커밋·배포 없음.

## CG-SKILL-023: 승인된 학습 계획 모달 UI 적용

- date: 2026-10-25
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 학습 계획 모달 표시/입력/여백 개선 실제 반영
- todo_refs: UI-PLAN-01
- actions: 원문과 현재 모달/스타일을 확인했다. 공유 planMarkup은 유지하고 모달 전용 compactPlanStatus로 핵심/보조 최대2문단만 표시한다. 실제 계산 결과를 읽기만 하며 상태를 부정확하게 합치지 않는다. 라벨을 하루 학습량으로 바꾸고 실제 단위를 일체형 입력 오른쪽에 표시한다. 46px 그룹/16px 입력/44px 이상 버튼과 한줄 안내, 구분선 유지·간격 축소를 적용했다. 전용 class를 다른 모달 진입 시 해제한다. 도움말은 추가하지 않았다.
- evidence: docs/evidence/plan-modal-final-tests.tap (92/92 pass), plan-modal-final-summary.json, plan-modal-final-before.json, plan-modal-final-after.json. 원본1.0과 계산/저장 모듈 동일, 루트/dist 일치.
- result: limited
- outcome: 승인된 모달 UI 적용 완료. 저장/차감/자동 추천/예상일 정책과 다른 모달/카드 스타일 유지. 입력 보존/상태 우선순위/원본 불변/스타일 격리 신규2개와 기존90개 통과.
- limitations: cua.getState apps=[] browsers=[]로 실제 모바일/PC/Safari 숫자 입력·키보드·레이아웃 미검증. 모의 DOM을 실제 화면 검증으로 주장하지 않는다. Git 커밋·배포 없음.


## CG-SKILL-024: 더보기 태블릿/PC 메뉴 치수 통일

- date: 2026-10-25
- skill: chagok-data-guard
- skill_source: skills/chagok-data-guard/SKILL.md
- task: 더보기 메뉴의1024px 전환 시 확대 제거
- todo_refs: UI-MORE-UNIFIED-01
- actions: 원문/현재 상태와 CSS 중복을 확인하고681px 이상 더보기 전용 치수를 한 구간으로 모았다. 행60px·글자14px·아이콘21px·패딩10px14px·간격13px, 카드최대680px·패딩4px18px·반경24px를 적용하고1024px 크기 재정의를 제거했다. 모바일/사이드바/배지/화살표 구조는 유지했다. 요청6폭+모바일2폭을 정적으로 검사하고 별도 확인 페이지를 제작했다.
- evidence: docs/evidence/more-unified-cascade.json, more-unified-summary.json, more-unified-before.json, more-unified-after.json, more-unified-css-before.json, previews/more-responsive/index.html.
- result: limited
- outcome: 지정 치수 통일 및 요청 화면 폭의 정적 적용값 일치. 앱 JS/원본1.0 유지. 더보기 규칙은 루트/dist 동일.
- limitations: 브라우저 apps=[] browsers=[]로 실제 모바일/PC 렌더링·넘침·숫자 배지 정렬 미검증. CSS-only로 회귀 테스트 미재실행. 작업 시작 시 root/dist CSS는 같았으나 마지막 검사 때 루트의 학습계획 모달에 별도 수정이 생겨 범위 밖 변경을 보존했다. 전체 파일 동일을 주장하지 않는다. Git 커밋·배포 없음.
