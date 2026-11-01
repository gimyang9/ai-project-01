# 커스텀 스킬 제작·개선 및 실제 적용

분석 기준 Git HEAD `ca02c2e080df7571c89a643a2cc2ec65504e12bd`. 사용자 승인 범위는 기존 데이터 보호 스킬 개선과 계산·UI 스킬 신규 제작이다. `chagok-pwa-audit`는 제외했다. 앱 소스·기능·이미지·배포 구조를 수정하거나 커밋/Push하지 않았다.

## 제작 이유와 역할

과거 개발 사례는 제작 이유로만 구분하며, 당시 테스트 수를 이번 실행 결과로 재사용하지 않는다. 기존 후보 분석 문서는 현재 작업 폴더에 없어 링크를 제공하지 않는다.

| 스킬 | 실제 개발에서 확인된 필요 | 이번 제작 및 개선 |
|---|---|---|
| [chagok-data-guard](../../skills/chagok-data-guard/SKILL.md) | 회독·부분 복습·구형 데이터·수동 설정 보존, 저장 실패 및 충돌 확인 반복 | 기존 보존 계약 유지. 루트·dist·보호 문서 경계 비교, 관련 검사 선택, 실제 적용 로그 도구 추가 |
| [chagok-learning-check](../../skills/chagok-learning-check/SKILL.md) | 계획/실제 속도 분리, 오늘 학습량 중복 차감, 요일/쉬는 날, 회독 경계, 복습 구간 겹침 | 고정 기준일과 앱과 별개로 작성한 단순 달력 기대값으로 계산 검사. 원본 불변 및 미리보기/저장 결과 비교 |
| [chagok-ui-regression](../../skills/chagok-ui-regression/SKILL.md) | 낮은 모달, 긴 자료명, 상세 계획 수정 후 홈 롤백, 저장 전 미리보기 | 유지할 화면을 명시하고 새 Chrome 프로필에서 화면·입력·취소·저장·재실행 검사. 실제 클릭과 원본 캡처 포함 |

기존 데이터 보호 스킬의 광범위한 개발 검증 지침과 직접 저장 패턴/일부 파일 해시 수집을 보존 계약 중심으로 정리했다. 계산 정답과 화면 조작은 별도 스킬로 분리했다. 경계 도구는 비교 가능한 스냅샷과 보호 파일 변경 목록을 제공하며, 로그 도구는 필수 필드·날짜·중복/부분 ID·동시 기록 잠금을 검사한다. 기본은 dry-run이며 명시적 `--write`에서만 두 로그에 추가한다. 두 파일 전체의 원자적 트랜잭션을 보장하지는 않는다.

계산·UI 스킬은 **이번에 새로 제작한 뒤 현재 앱에 적용**했다. 과거 관련 개발 사례는 제작 이유이며 과거 실제 사용 증거가 아니다. 기존 로그와 누락 ID는 보충·변환하지 않았다. `skill-creator` 지침을 제작에 참고했으며 전역 설치나 자동 목록 등록은 하지 않았다.

## 실행 환경과 명령

Node `v24.22.1`, Windows PowerShell, Chrome `156.0.8078.74`. Node 실행 파일은 `C:/Users/alsru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`, Chrome은 `C:/Program Files/Google/Chrome/Application/chrome.exe`를 사용했다. 아래 `node`는 해당 실행 파일을 뜻한다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File skills/chagok-data-guard/scripts/inspect-boundary.ps1 -ProjectRoot .
node --test --test-reporter=tap tests/study-data.test.cjs tests/final-integration.test.cjs
node skills/chagok-learning-check/scripts/check-learning.cjs --root . --source root --today 2026-11-02 --out docs/skill-validation/learning-root.json
node skills/chagok-learning-check/scripts/check-learning.cjs --root . --source dist --today 2026-11-02 --out docs/skill-validation/learning-dist.json
node skills/chagok-ui-regression/scripts/run-ui.cjs --root . --chrome 'C:/Program Files/Google/Chrome/Application/chrome.exe' --route /index.html --groups home,plan,stats --sizes 320x400,375x700,1440x900 --allow-test-no-sandbox --out docs/skill-validation/ui-root
node skills/chagok-ui-regression/scripts/run-ui.cjs --root . --chrome 'C:/Program Files/Google/Chrome/Application/chrome.exe' --route /dist/index.html --groups home,plan,stats --sizes 320x400,375x700,1440x900 --allow-test-no-sandbox --out docs/skill-validation/ui-dist
$env:CHAGOK_TEST_CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:CHAGOK_TEST_NO_SANDBOX='1'
node --test --test-reporter=tap skills/chagok-data-guard/scripts/tools.test.cjs skills/chagok-learning-check/scripts/tools.test.cjs skills/chagok-ui-regression/scripts/tools.test.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File skills/chagok-data-guard/scripts/inspect-boundary.ps1 -ProjectRoot . -BaselinePath docs/skill-validation/before.json
```

명령의 출력 경로는 새 결과 전용이다. 기존 결과를 덮어쓰지 말고 다음 실행에는 다른 이름을 지정한다. OS 시계는 변경하지 않았다. 계산 도구는 날짜만 사용하는 UTC 산술을 사용하고 UI 합성 사례는 실행일 기준이다. 실제 사용자 저장소 대신 메모리 합성 자료와 새 브라우저 프로필만 사용했다.

## 실제 결과

| 검사 | 상태 | 근거와 범위 |
|---|---|---|
| 기존 저장·기록·통합 보존 검사 | 통과 28 | [실행 TAP](data-preservation-tests.tap), 선택한 기존 두 테스트 파일만 실행 |
| 계산: 루트 / dist | 각각 통과 20, 실패 0 | [루트](learning-root.json), [dist](learning-dist.json). 수동/자동, 달력 조합, 오늘 차감, 계획 변경 credit, 회독, 간격, 범위, 미리보기 |
| UI: 루트 / dist | 각각 통과 12, 실패 0 | [루트](ui-root/results.json), [dist](ui-dist/results.json). 4개 사례 × 3개 크기, 네트워크/런타임 오류 없음 |
| 스킬 도구 자체 검사 | 통과 8, 건너뜀 0 | [실행 TAP](tools-tests.tap). 중복/부분 로그·동시 잠금·날짜·보호 파일 비교, 계산 오류 변이 탐지, 의도적 UI 넘침 실패 및 미검증 구분 |
| 앱/에셋·보호 문서 경계 | 통과 | [전](before.json), [후](after.json). 비교 대상 변경 0, 보호 문서 변경 0. Git 제외 파일은 범위 밖 |
| 공식 skill-creator YAML 검사 | 미검증 | `quick_validate.py` 실제 실행 시 `ModuleNotFoundError: No module named 'yaml'`. 패키지를 임의 설치하지 않았다. 도구 자체 검사에서 제한적인 frontmatter/메타데이터 검사는 별도로 통과 |
| 실제 사용자 1.0 데이터, Safari/설치 PWA, 배포/캐시 | 미검증 | 이번 검사 범위에서 제외. 합성 자료 성공을 실제 데이터 전환 성공으로 표현하지 않음 |

Chrome 기본 실행은 연결 종료로 준비에 실패해 [첫 결과](ui-root-initial/results.json)를 미검증으로 보존했다. 이후 별도 임시 프로필에만 명시적으로 `--allow-test-no-sandbox`를 적용해 루트·dist 검사에 성공했다. 이 환경 제약과 브라우저 보호 옵션 차이가 있으므로 일반 브라우저/실기기 검증으로 확대하지 않는다. 사용자 Chrome 프로필을 열거나 초기화하지 않았다.

UI는 기존 오늘의 학습 행 구조 유지, 긴 이름, 가로 넘침, 입력 즉시 미리보기, 저장 전 state/LocalStorage/SessionStorage 불변, 잘못된 입력, 닫기/취소, 저장·재로드·자동 추천 복귀, Tab 포커스의 모달 내 유지, 통계의 세 날짜 라벨을 검사했다. 이는 키보드 전체 순환·실제 모바일 키보드·화면 확대·저장 실패 UI·모든 기존 모달 검사를 대신하지 않는다.

375×700의 [홈](ui-root/home-375-700.png), [설정 창](ui-root/preview-375-700.png), [통계](ui-root/stats-375-700.png)는 직접 보며 긴 이름 줄바꿈과 날짜·버튼 배치를 확인했다. 다른 크기는 자동 배치/조작 검사와 원본 캡처 근거이며 모든 캡처를 수동 정밀 비교한 것은 아니다. 캡처의 토스트와 내비게이션은 숨기거나 잘라내지 않았다.

## 발견 사항 및 한계

- 이번 선택 검사에서 앱 결함은 발견하지 않았다. 스킬 도구의 오류 탐지 검사는 복사한 임시 계산 모듈과 의도적으로 넘치게 만든 임시 HTML을 사용한 음성 대조군이며 앱 실패가 아니다.
- 분석 당시 루트·dist `app.js`의 경고 문구 차이는 기존 상태다. 각각 검사했지만 문구를 동기화하거나 앱 소스를 수정하지 않았다.
- 과거 전체 검사 기록의 214건 중 1건 실패 및 원본 재현 기록은 후보 분석에 남아 있다. 이번 부분 검사 성공으로 해당 과거 실패가 해결됐다고 판단하지 않는다.
- 데이터 경계 비교는 파일 보존 증거이며 실제 사용자 데이터 무손실·모든 계산 정책·모든 반응형 요구 충족의 증명이 아니다. 사용자 지정 보호 이름 문서 4개는 작업 시작 시 해시와 동일하다.
- 공식 YAML 검증 의존성, 실기기/네이티브 키보드·확대, 나머지 모달, 실제 사용자 데이터 전환은 추가 확인 대상으로 남긴다. PWA 검증은 제외된 스킬의 업무를 다른 스킬로 옮기지 않았다.

## 결과 파일과 활용 기록

- 개선: `skills/chagok-data-guard/SKILL.md`, `scripts/inspect-boundary.ps1`; 추가: `scripts/record-usage.cjs`, `scripts/tools.test.cjs`.
- 신규: `skills/chagok-learning-check/`, `skills/chagok-ui-regression/`의 `SKILL.md`, `agents/openai.yaml`, 실행 도구·사례 및 도구 테스트.
- 보고: 이 폴더의 JSON/TAP/원본 PNG와 본 문서. 작성일 표시는 생략하고, 계산 기준일과 실제 실행 로그는 검증 근거로 유지한다. 보고서 폴더는 날짜 없는 이름을 사용한다.
- 실제 활용은 [기존 MD 로그](../skill-usage-log.md)와 [JSONL](../skill-usage-log.jsonl)의 새 `CG-SKILL-073~075`에 추가한다. 과거 기록을 보존하고 이번 개선·제작 후 실행만 기록한다.

`README.md`, `TODO.md`, `PRD.md`는 하위 폴더의 동명 파일을 포함해 수정하지 않았다. 별도 앱 기능 개발이나 배포 승인을 전제하지 않는다.
