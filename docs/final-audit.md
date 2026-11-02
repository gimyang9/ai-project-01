# 최종 전체 점검 결과

## 사용자 승인 후 수정·재검증

아래 최초 실패 기록을 보존하고, 사용자 수정 요청에 따라 다음 항목을 반영했다. 이번 수정의 기준 HEAD는 `393571b`다.

| 항목 | 수정 | 재검증 |
|---|---|---|
| PWA 해시 | HTML·CSS·JS·매니페스트·SVG의 CRLF를 LF로 정규화해 버전 계산. 이미지·폰트는 원본 바이트 사용. 최종 셸 재생성 | 루트·dist 모두 `92a9fb2078dc1154`, 두 줄바꿈 방식의 동일성 및 자산 무결성 검사 통과 |
| 날짜 의존 복습 테스트 | 해당 테스트에 고정 시계 주입. 완료 직후 목록 제외와 다음 예정일 재등장을 함께 검증 | 전체 앱 **217/217 통과**. 최초 216건의 3실패는 아래 보존 |
| 중복 ID | 시험 필터를 `goal-count-all`로 분리 | 루트·dist 중복 ID 0, 전체 ID 고유성 회귀 검사 추가 |
| 실행본 차이 | 지연 경고를 설명이 완전한 문구로 통일하고 미사용 버전 CSS 차이 정리 | 루트·dist 대응 실행 파일 차이 0 |
| 문서·에셋 안내 | 제거된 미리보기는 당시 결과 JSON에 연결. 현재 에셋과 과거 제작 이력 구분 | 일반 Markdown의 누락 링크 0 |

**브라우저 재검증:** 양쪽 각각 홈·계획·통계 12건과 탭·시험 메뉴·테스트 격리 3건, 총 30건 통과. 네트워크·런타임 오류 없음. 임시 Chrome 프로필과 명시적 테스트용 no-sandbox 옵션을 사용했다. 실제 사용자 데이터·저장 키·백업 버전·학습/복습 계산 정책·PNG 내용은 바꾸지 않았다. 원격 게시·실기기·설치 PWA는 새로 검사하지 않았다.

수정 후 원시 결과: `C:/Users/alsru/AppData/Local/Temp/chagok-final-fixes-c6d120f9e50c4785a515a01be17d8ba2/`의 `all-tests.tap`, `ui-root/results.json`, `ui-dist/results.json`, `navigation-root/results.json`, `navigation-dist/results.json`, `static.json`. 임시 폴더는 영구 제출 링크가 아니다.

### 과거 근거 연결 보완

과거 로그의 경로 문자열은 당시 원문 그대로 보존한다. 아래 자료는 누락 원문의 복원본이 아니라 현재 남은 근거와 그 한계를 연결한 보완 기록이다. 원본 파일이 없는 **10개 로그 항목의 6종 문서 경로** 자체를 복구했다고 주장하지 않는다.

| 과거 기록·누락 문서 | 현재 확인 가능한 자료 | 한계 |
|---|---|---|
| CG-SKILL-056 `plant-size-update.md` | [이후 식물 반영 기록](plant-transparent-update.md), [현재 스타일](../style.css) | 당시 20% 확대 보고서 원문 없음. 이후 화면 검사가 당시 결과 전체를 복원하지 않음 |
| CG-SKILL-057 `plant-stage-size-update.md` | [식물 검사](../tests/plant-images.test.cjs), [기존 PNG 검사 결과](evidence/plant-images-tests.tap) | 과거 단계별 배율 보고서 원문 없음 |
| CG-SKILL-058 `plant-offset-update.md` | [현재 스타일](../style.css), [현재 식물 상태](plant-transparent-update.md) | 과거 6px 이동 보고서 원문 없음 |
| CG-SKILL-059 `camellia-stage5-update.md` | [이후 이미지 교체·표시 기록](plant-transparent-update.md), [물망초 식별자 변경 이력](TODO-changes.md) | 과거 동백 수정 보고서 원문 없음. 현재 물망초 이미지를 당시 이미지로 취급하지 않음 |
| CG-SKILL-071~072 `skill-improvement-proposal.md` | [원래 분석·범위 조정 로그](skill-usage-log.md), [데이터 보호](../skills/chagok-data-guard/SKILL.md)·[계산](../skills/chagok-learning-check/SKILL.md)·[UI](../skills/chagok-ui-regression/SKILL.md) 최종 원문 | 최초 제안서 원문 없음. 최종 스킬을 과거 제안서로 대체하지 않음 |
| CG-SKILL-073~076 `skill-validation/report.md` | [기존 데이터 TAP](skill-validation/data-preservation-tests.tap), [계산 root](skill-validation/learning-root.json)·[dist](skill-validation/learning-dist.json), [UI root](skill-validation/ui-root/results.json)·[dist](skill-validation/ui-dist/results.json), [도구 TAP](skill-validation/tools-tests.tap) | 삭제된 요약 보고서를 대신해 당시 남아 있는 실행 파일을 직접 연결 |

후속 스킬 활용 로그에는 이 보완표를 연결한다. 과거 기록을 덮어쓰거나 새 자료를 당시 사용한 것처럼 소급하지 않는다.

## 최초 점검 기록 (수정 전)

대상: 로컬 Git HEAD `905898d`의 루트 앱과 dist. 사용자 요청에 따른 읽기 전용 점검이다. 앱·CSS·데이터·이미지·배포 파일을 수정하거나 캐시를 재생성하지 않았다. 실제 사용자 브라우저 대신 메모리 합성 자료와 새 Chrome 프로필을 사용했다.

## 검사 결과

| 검사 | 결과 | 범위 |
|---|---|---|
| 전체 기존 앱 테스트 | **216건 중 213 통과·3 실패** | `node --test --test-reporter=tap tests/*.test.cjs` |
| JS 문법 | **28개 파일 통과** | 루트·dist의 JS 각각 14개 |
| 독립 계산 검사 | **루트 20·dist 20 통과** | 기준일 고정, 계획/실제 예상일·복습·오늘 차감·원본 불변 |
| 홈·계획 설정·통계 UI | **루트 20·dist 20 통과** | 각 4사례 × 320×400·375×700·768×700·1024×700·1440×900 |
| 탭·시험 메뉴·테스트 모드 격리 | **루트 3·dist 3 통과** | 각 320×400·768×700·1440×900. ON/OFF 후 기존 LocalStorage 동일 |
| 스킬 도구 자체 검사 | **8건 통과** | 로그·보호 경계·메타데이터 일부·오류 탐지 대조군 |
| README의 스킬 전문 | **3개 원문과 일치** | 줄바꿈 차이를 제외하고 비교 |
| HTML 참조 파일 | **누락 없음** | 루트·dist 진입 HTML의 로컬 src/href |
| HTML ID 고유성 | **문제 발견** | 두 HTML 모두 `material-count-all` 중복 |

서로 다른 검사 수를 합쳐 전체 앱의 통과 수로 표현하지 않는다. UI 검사에서 네트워크/콘솔/런타임 오류는 없었다. 1440×900 홈과 320×400 계획 모달 캡처도 직접 확인했다. 낮은 모달은 내부 스크롤을 사용하며 버튼 접근 검사가 통과했다. 모든 캡처를 수동 정밀 비교한 것은 아니다.

## 발견한 문제와 조치 우선순위

### 1. PWA 캐시 식별자와 현재 파일 내용 불일치 — 우선 확인

[루트 worker](../service-worker.js#L3)·[dist worker](../dist/service-worker.js#L3)의 선언값이 참조 파일의 실제 해시와 다르다. [PWA 검사](../tests/pwa.test.cjs#L2) 두 건이 실패했다.

| 대상 | worker 선언값 | 현재 파일로 계산한 값 |
|---|---|---|
| 루트 | `480ea680f01cfc6d` | `aa7238c6a395c303` |
| dist | `18b3be88306cb116` | `ac34cbe59cfef3a1` |

캐시 버전 갱신이 필요한 상태다. 변경된 자산에 같은 캐시 식별자를 계속 사용하면 기존 설치본에 이전 자산이 남을 가능성이 있다. 이 검사는 바이트 기준이므로 줄바꿈 변화도 영향을 준다. 불일치만으로 실제 게시본이 깨졌다고 단정하지 않는다. 최종 앱 파일을 확정한 뒤 `node scripts/build-pwa.cjs`를 실행하고 PWA 검사·업데이트 동작을 확인하는 것이 우선이다. 이번 점검에서는 재생성하지 않았다.

### 2. 복습 목록 테스트가 실행 날짜에 의존 — 테스트 수정 필요

[study-app.test.cjs](../tests/study-app.test.cjs#L160)의 `review groups hide ranges initially and original completion stores one history row`가 실패한다. 기록·완료일은 고정 날짜인데 앱 조회는 실제 오늘을 사용해, 완료한 범위가 다시 복습 대상이 되는 시간이 지나면 172행의 “목록에서 사라져야 함” 검사가 실패한다.

별도 임시 preload로 Node 프로세스의 날짜만 해당 테스트 기준일로 고정하면 **동일 테스트 1건이 통과**했다. OS 시계·앱 소스·기존 테스트는 바꾸지 않았다. 이는 날짜 의존 원인의 재현이며 최초 전체 검사 실패를 취소한 결과가 아니다. 고정 시계를 테스트에 주입하고, 완료 직후 제거와 다음 주기 재등장을 별도로 검증할 필요가 있다. 이번 결과로 복습 저장 자체의 오류라고 단정하지 않는다.

### 3. HTML의 동일 ID 중복 — 구조 정리 필요

[index.html](../index.html#L78)과 [dist/index.html](../dist/index.html#L78)에서 `material-count-all`이 학습 자료 필터와 시험 필터에 각각 쓰인다. 문서 내 ID는 고유해야 한다. 현재 시험 개수는 버튼 내부 span을 별도로 갱신하므로 이 문제로 개수가 틀리는 현상까지 재현된 것은 아니다. 다만 향후 ID 조회·접근성 연결에서 대상을 잘못 선택할 수 있어 시험용 ID를 구분하는 것이 좋다.

### 4. 루트·dist에 문구와 잔여 스타일 차이 — 동기화 확인

[app.js](../app.js#L317)와 [dist/app.js](../dist/app.js#L317)의 지연 경고가 다르다.

- 루트: ` 기한보다 늦게 완료될 것으로 예상해요.`
- dist: `현재 학습량으로는 목표 기한보다 늦게 완료될 것으로 예상해요.`

루트 문구에는 선행 공백도 있다. 계산·저장 모듈은 일치하며 이 차이는 안내 문구에 한정된다. CSS에는 삭제한 버전 표시의 미사용 `.forest-version` 규칙이 dist에 남아 있다. 버전 요소는 양쪽 HTML에서 제거돼 있어 이 잔여 규칙이 현재 표시를 되살리지는 않는다. worker 차이 자체는 서로 다른 셸 내용으로 생길 수 있지만 각 셸의 해시 일치 여부는 1번 문제로 따로 확인해야 한다.

### 5. 삭제된 근거·미리보기 링크 — 제출 자료 정리 필요

일반 Markdown 링크 중 다음 세 곳이 존재하지 않는 미리보기를 가리킨다.

- [배너 실시간 검토 기록](banner-camera-live-review.md#L13): `../previews/banner-camera-r2-live/index.html`
- [반응형 수정 기록](responsive-ui-fixes.md#L44): `../previews/banner-camera-r2/index.html`
- [반응형 수정 기록](responsive-ui-fixes.md#L91): `../previews/banner-camera-r2-live/index.html`

활용 로그의 단독 파일 경로 근거도 **10개 항목**에서 없어진 문서를 참조한다. 대상은 `plant-size-update.md`, `plant-stage-size-update.md`, `plant-offset-update.md`, `camellia-stage5-update.md`, `skill-improvement-proposal.md`, `skill-validation/report.md`다. 과거 로그를 실제 사용하지 않은 새 문서로 덮어쓰지 말고, 원문 복원 또는 현재 남은 원시 결과로 보완 설명을 연결하는 방식이 적절하다. 주요 현재 PRD·TODO·README의 일반 Markdown 링크에서는 누락을 발견하지 않았다.

### 6. 에셋 안내 일부가 과거 구현 설명 — 낮은 우선순위

[ASSETS.md](../ASSETS.md#L11)는 아직 `plants.png` 스프라이트와 CSS 배경 위치를 현재 방식처럼 설명한다. 현재 구현은 8종 40개 개별 PNG이며 물망초는 `forget-me-not`이다. 기존 스프라이트 기록을 보존하면서 현재 사용 방식과 구분할 필요가 있다. `QA.md`·날짜별 보고서의 옛 설명은 당시 단계 기록이므로 전부 현재 상태로 덮어쓰는 대상이 아니다.

## 정상 확인 범위와 한계

- 이번 전체 검사에서 자료·학습/복습·회독·시험·백업/복원·통계·식물의 관련 테스트는 위 세 실패를 제외하고 통과했다. 원본 사용자 데이터에 접근하거나 초기화하지 않았다.
- 식물 40개 파일·루트/dist 일치·`camellia` 구형 자료 호환·배정 균형 검사는 전체 테스트에 포함돼 통과했다.
- 실제 v1 전환·Safari/PWA·게시 주소는 사용자가 이전에 직접 확인 완료라고 답한 상태를 유지한다. 이번 점검에서 원격 주소·실기기를 새로 확인한 것은 아니다.
- 격리 Chrome 검사는 임시 프로필 전용 `--allow-test-no-sandbox` 옵션을 명시해 실행했다. 실제 모바일 키보드·브라우저 확대·Safari·설치 PWA까지 통과했다고 확대하지 않는다.
- 공식 YAML 검증은 이번에도 수행하지 않았고, 스킬 도구 테스트의 제한적 메타데이터 검사와 구분한다.

## 원시 결과

이번 실행 결과는 시스템 임시 폴더 `C:/Users/alsru/AppData/Local/Temp/chagok-final-audit-e52e619f84974576b3b5af5d78960676/`에 있다. `all-tests.tap`, `learning-root.json`, `learning-dist.json`, `ui-root/results.json`, `ui-dist/results.json`, `navigation-root/results.json`, `navigation-dist/results.json`, `static.json` 및 원본 캡처를 보관했다. 임시 폴더는 영구 제출 링크가 아니다. 스킬 적용 이력에는 이번 점검과 한계를 추가한다.
