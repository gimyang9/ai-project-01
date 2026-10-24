# 차곡차곡 데이터 경계 재점검 — 2026-10-24

판정: **제한적 확인(limited)**. 보존 파일 비교와 1단계 정적 경계 검사는 통과했다. 이는 마이그레이션 또는 실제 사용자 기록 보존의 동작 검증 완료를 의미하지 않는다.

## 문제와 선택 이유

차곡차곡 2.0의 현재 단계와 원본 1.0의 보존 상태, 미리보기의 저장 경계를 확인했다. `/root/.codex/skills/remote-skills/chagok-data-guard/SKILL.md`와 `references/invariants.md`, `references/usage-record.md`를 원문으로 읽었다. 현재 프로젝트의 `PROGRESS.md` 5–7행과 `dist/app.js`의 실제 구현이 저장 없는 1단계이므로 `prototype` 모드를 선택했다. 스마트 복습 계산 변경은 없으므로 review-rules 참조는 적용하지 않았다.

## 실제 확인

| 대상 | 관찰과 근거 |
|---|---|
| 단계와 TODO | `PROGRESS.md` 5행은 1단계와 사용자 확인 경계를 명시하며 11–20행에는 1-1~1-10 완료 표기가 있다. 이 점검에서는 해당 화면 품질 완료를 재검증하지 않았다. 별도 PRD/TODO 파일은 프로젝트 파일 목록에서 찾지 못했다. |
| 원본 보존 | `forward-check-2026-10-24.json`에서 ZIP의 파일 6개가 `reference/v1`의 대응 파일과 SHA-256 기준 모두 일치했다. ZIP SHA-256: `194c7d594e9667db0d5fa4a222f18ec5f695a27ceab543ca7f06acc0216309a8`. |
| 게시 경계 | `.openai/hosting.json`의 `static.directory`는 `dist`이다. `reference/v1`은 이 정적 게시 디렉터리 밖에 있다. 원격 게시 상태는 확인하지 않았다. |
| 미리보기 입력 | `dist/app.js` 8–26행은 코드 내 예시 자료/목표/기록이다. 입력은 DOM 폼 값이며 264–276행의 제출 처리는 기본 제출을 막고, 범위를 검사하고, 모달을 닫은 뒤 미리보기 안내를 표시한다. 자료·기록의 영구 저장은 구현되어 있지 않다. |
| 읽기·저장 호출 | 도구가 검색한 `dist/app.js`에서 literal storage 접근은 0개였다. 수동으로 전체 JS와 `dist/index.html`도 읽었다. HTML의 실행 스크립트는 13행의 로컬 `app.js` 한 개이며 인라인 실행 스크립트는 없다. `node --check dist/app.js`는 종료 코드 0이었다. |
| 자동/수동 복습 | `dist/app.js`의 목표 폼은 자동/수동 선택과 직접 시작일 입력을 표시한다. 255–258행은 필드 표시·필수 여부만 바꾼다. 자동 추천 계산이나 수동 일정 저장은 아직 없다. |
| 1.0 계약 | `reference/v1/app.js` 20행의 저장 키는 `study-progress-data-v1`, 539–585행은 version 1 저장 및 검증이다. 자료·기록 ID, 날짜/sequence 정렬(221–243행), 회독 이력의 total/unit, 메모가 실제 소스에 존재한다. 508–537행의 부분 복습 입력은 reviews를 변경하고 current/round를 직접 변경하지 않는다. |
| 1.0 복원·초기화 | `reference/v1/app.js` 667–679행은 새/옛 백업 형식을 검증한다. 681–727행은 복원/초기화 확인 모달과 저장 성공 후 메모리 교체 순서를 구현한다. 588–604행은 읽기 실패 시 자동 저장을 막는다. 이는 소스 관찰이며 실패 상황을 실행한 결과는 아니다. |

## 실행 근거

`python3 /root/.codex/skills/remote-skills/chagok-data-guard/scripts/audit_boundary.py --project /workspace/sites/chagok-v2-stage1 --baseline-archive /workspace/scratch/e7a758a63f16/recovered-v1/study-no-examples-full.zip --mode prototype --output /workspace/sites/chagok-v2-stage1/docs/evidence/forward-check-2026-10-24.json`

종료 코드 0, 도구 결과 `passed`, 보존 파일 6개, 탐지된 저장 접근 0개. 증거 JSON의 `dist/app.js` 해시는 `ec8a00e730410beaec8777b9fe1b54f5f4740465ad86b9ce7677ab885a3f5a27`이다.

## 한계와 스킬 사용 시 주의점

- 정적 도구는 JS 정규식 탐지와 ZIP 대응 파일 비교를 한다. 별칭·동적 코드·HTML·외부 스크립트는 완전히 분석하지 않으며, 참조 디렉터리의 추가 파일까지 동일 집합인지 판정하는 도구도 아니다. 이번 수동 확인은 해당 한계를 일부 보완하며 실행 검증을 대체하지 않는다.
- 실제 사용자 JSON/LocalStorage를 읽거나 변경하지 않았다. 기존 출처와 새 미리보기 출처 사이 LocalStorage 이동 여부, 데이터 변환·변환 실패·저장 실패·수정/삭제·재실행·백업 왕복·초기화 후 재수입 방지는 미검증이다.
- 브라우저 UI, 실제 iPhone Safari, 설치형 PWA, 원격 배포를 실행하지 않았다. `QA.md`에 있는 이전 검증은 이번 점검 결과로 재분류하지 않았다.
- `PROGRESS.md`의 “승인된 다음 단계”(30행)라는 제목과 “사용자 확인 전 2단계로 진행하지 않는다”(5행)는 승인 상태를 오해할 여지가 있다. 이 점검은 1단계 재점검에 한정했으며 2단계 승인을 추정하지 않았다.
- 스킬의 사용 기록 추가 명령은 이번 위임의 명시적 “주 사용 로그에 추가하지 말 것” 지시에 따라 실행하지 않았다. 이 파일과 JSON만 새로 만들었다. 상위 작업자가 실제 적용 로그를 합칠 수 있다.
- 스킬 참조의 v1 계약은 실제 소스와 대조할 수 있었다. 스킬/앱 코드 수정이나 배포는 하지 않았다. 미래 구현의 효과나 예정 검증을 완료로 기록하지 않았다.
