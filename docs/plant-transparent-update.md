# 8종 투명 식물 적용 · 동백을 물망초로 교체

## 2026-11-02 중복을 줄이는 신규 배정

사용자 승인으로 단순ID hash%8 배정을 대체했다. 새 자료 등록 시 기존 자료가 사용하지 않은 식물을 우선하며, 모두 사용 중이면 배정 수가 가장 적은 식물을 고른다. 동률만 자료ID 해시로 결정한다. 완료/보관 자료도 포함하며 구형 flower/tree/mushroom은 실제 표시되는 daisy/oak/hydrangea로 집계한다. 삭제된 자료는 집계에서 빠져 해당 종류를 다시 사용할 수 있다.

기존 배정은 재조정하지 않는다. 구형별칭·성장메타데이터 없는 기존자료의 fallback·완성상태·원본기록·수동설정·저장키/버전은 유지한다. 추가 원장이나 저장값 초기화 없이 등록 당시 전체 자료에서 집계한다. 기존 중복이 저절로 없어지는 기능은 아니다. root/dist 데이터 모듈과 양쪽PWA캐시를 갱신했다.

관련 [자동테스트44건 모두 통과](evidence/plant-balance-tests.tap)와 [격리 Chrome6흐름](evidence/plant-images-browser-results.json)으로 충돌ID의 첫8종 무중복·80개 균형·기존 편중에서 최소종 선택·구형/보관집계·삭제후재사용·기존배정/백업보존을 확인했다. 브라우저에서는 구형4개+신규8개의 전체 표시종8개/최대최소차1, 기존회독/복습·40PNG·오프라인·콘솔오류0을 확인했다. 최초 브라우저 실행의 '신규8개만 항상8종' 가정은 이번 정책과 맞지 않아 전체자료 균형 검증으로 바꿔 재실행했다. 사용자자료·실기기Safari·게시주소 검증과 커밋/배포는 하지 않았다. CG-SKILL-064.

## 2026-11-01 실제 앱 연결 오류 수정

이전 PNG 반영 보고와 달리 현재 체크아웃에는 실제 앱의4종 스프라이트·배정/검증이 남아 있었다. 신규 PNG를 재제작·수정하지 않고 실제 렌더러에 연결했다.

- 공통 `plantMarkup`이 홈·상세·완료 목록에서 `assets/plants/<species>-<1~5>.png`를 선택한다. 성장 경계10/30/60/100%·최초 완성 유지·컨테이너 크기/배치를 유지하며, contain·중앙·정사각형·클리핑 없음으로 투명PNG 전체를 표시한다. 구형 스프라이트 URL은 제거했다.
- 신규 자료는 ID 기반8종 자동 배정 후 `growthState`에 저장한다. 파일 ID는 `gerbera`(거베라), `sunflower`(해바라기), `daisy`(데이지), `hydrangea`(수국), `camellia`(표시 물망초), `cherry`(벚꽃), `oak`(참나무), `cactus`(선인장)다.
- 기존 배정 ID는 변경하지 않고 표시만 flower→daisy·tree→oak·cactus→cactus·mushroom→hydrangea로 대응한다. 버섯PNG가 없어 수국으로 표시한다. 구형 seed/sapling/sprout/daisy 별칭과 메타데이터 없는 기존 자료의 hash%4 배정도 유지한다. 읽을 때 저장값을 갱신하지 않는다.
- 구형/신규 저장상태를 모두 허용하고 기존 키·버전·학습/복습/회독·수동설정은 보존한다. 알 수 없는 collection/배정원장 필드 보존도 합성 검증했다. 별도 도감 UI/원장 로직은 현재 소스에서 확인되지 않아 그 기능 전체의 검증 완료로 주장하지 않는다.
- root/dist의 app/data는 동일하게 수정하고 CSS는 식물 변경만 동일 반영했다. 런타임40PNG를 PWA 빌더에서 명시 수집하고 양쪽 worker를 갱신했다. 사용자 지정 배포 기준은 main/(root)이며 원격 설정 변경·게시·커밋은 하지 않았다.

### 이번 검증 결과

- Node 전체 **200건 중198건 통과·2건 실패**: [출력](evidence/plant-images-tests.tap). 신규 이미지 테스트4건은 모두 통과했다.
- 실패는 study-app의 복습 완료 후 목록과11월1일 통계 조회 사례다. 현재 날짜와 고정된2026-10-25/11-01 가정이 충돌한다. HEAD의 수정 전 app/data를 메모리에서 읽은 [기준 코드 실행](evidence/plant-images-baseline.tap)에서도 동일2건이 실패했다. 관련 로직/테스트를 임의 수정하지 않았다. [재현 도구](evidence/plant-images-baseline.cjs).
- [격리 Chrome6흐름](evidence/plant-images-browser-results.json) 통과: 루트 소스를 `/ai-project-01/index.html` 하위 경로로 제공하고 `/dist/index.html`도 검증했다. 기존 자료의 실제 홈/상세 경로 일치,8종×5단계384px 이미지 로딩·375/1440px contain/정사각형/클리핑 없음, 신규8종 등록·학습·부분복습·다음회독·백업 왕복을 확인했다.
- 루트 하위 경로 worker의40PNG 캐시, 네트워크 차단 후 앱 재로딩·40PNG decode·저장값 동일을 확인했다. 404·런타임 예외·console.error0건. [스크립트](evidence/plant-images-browser.cjs), [실제40단계 화면](evidence/plant-images-grid.png).
- 첫 Chrome 실행은 Page.enable 타임아웃으로 미완료였다. 격리된 임시 테스트 프로필에 `--no-sandbox`를 적용한 재실행이 최종 결과다. 사용자 브라우저에는 연결하지 않았다.
- 경계 점검은 전후 exit0. 생성된 service-worker.js를 제외한 배포JS는 app/data만 변경됐다. PNG·reference/v1·복습/회독 계산 모듈은 불변이며 root/dist40PNG 바이트 동일을 확인했다.

한계: 실제 사용자 브라우저 데이터·iPhone Safari·게시 GitHub Pages 주소는 미검증이다. 안전한 업데이트 대기 정책은 유지한다. 게시 후 기존 앱을 모두 닫고 다시 열어 새 캐시를 적용한다. 저장 데이터나 사이트 데이터를 삭제할 필요는 없다.

---

사용자 제공 최종8종 시안을 투명 배경 이미지로 정리하고 단계별PNG40개를 root/dist에 적용했다. 동백 대신 최종물망초5단계를 사용한다. 내부 camellia 식별자/파일명은 기존 회독·배정원장·수집기록의 호환을 위해 유지하며 표시그림과 미리보기명칭은 물망초다. JS 저장/계산/배정 코드는 변경하지 않았다.

PNG는384×384 RGBA·기존지면368, 종별같은배율·NEAREST 축소·투명여백. 생성도구로 배경/이름표를 제거한 뒤 실제알파영역을 기준으로 안전여백을포함해분리했다. 추가재사용시트8개는512px균일셀5칸이며모든셀경계완전투명. 앱기존단계별확대와6px하향CSS불변.

검증: TZ=Asia/Seoul node --test tests/pwa.test.cjs tests/plant-growth.test.cjs 10/10통과. Python40PNG 경계투명/잘림없음과8시트셀경계알파0확인. Chrome plant-preview40/40이미지384×384로딩확인 및전체시각검사. 실제홈테스트모드6자료에서물망초5단계표시와기존배율1.15·Y6px확인. 기존학습자료/기록JS·CSS는Gitdiff불변, root/distPNG동일. PWA73파일갱신. 실제iPhoneSafari미검증. inspect-boundary.ps1은체크아웃에없어Git변경경계로확인했다.
