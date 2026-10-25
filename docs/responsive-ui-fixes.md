# 반응형 UI 수정 결과와 R2 배너 제안

2026-10-26. 사용자 승인 순서에 따라 **R1 → R3~R6 → R7**을 실제 앱에 반영했다. **R2는 별도 미리보기만 제작했으며 실제 앱 적용은 승인 대기**다.

## 1단계 — R1 완료

시험 중단·마무리 모달의 콘텐츠를 자연스러운 높이로 배치해 선택 목록과 안내가 겹치지 않도록 했다. 모달이 화면보다 길면 내부에서 세로 스크롤된다.

높이600px 이하에서는 선택 목록의 별도 높이 제한을 해제하고 모달 전체를 하나의 스크롤 영역으로 사용한다. 따라서 좁고 낮은 화면에서도 모든 항목·설명·취소/확인 버튼에 접근할 수 있다. 기존 버튼 디자인과 저장·시험 상태 처리 함수는 유지했다.

- 320/375/430/680/1024/1440px, 높이400px을 포함한20개 휠 입력 조건에서 목록/안내 겹침0건, 버튼 접근 성공.
- 높이300px에서도 추가 휠 입력·버튼 hit-test 검증 통과.
- [수정 전320×400](evidence/responsive-audit/wheel-exam-archive-320x400.png) / [수정 후320×400](evidence/responsive-fixes/wheel-exam-archive-320x400.png)

## 2단계 — R3~R6 완료

| 항목 | 실제 변경 | 확인 결과 |
| --- | --- | --- |
| R3 연결 자료명 | 목록의 긴 단어 줄바꿈 허용·최소 폭 정리 | 펼친 연결 자료의 가로 넘침 해소 |
| R4 통계 이름 | 이름의 nowrap 상속 해제, 비율 숫자는 축소하지 않음 | 이름과 비율 숫자 겹침 해소 |
| R4 좁은 통계 카드 | 공간이 부족하면 이름 목록이 도넛 아래로 자연스럽게 이동 | 지나치게 좁은 줄바꿈도 방지 |
| R5 연결 자료 체크 목록 | 0까지 줄어드는 그리드 열·이름 줄바꿈·체크박스 크기 유지 | 시험 수정/재응시 모달의 가로 스크롤 해소 |
| R6 보관함 | 텍스트 영역 min-width:0·flex:1 및 제목 줄바꿈 | 보관함 가로 스크롤 해소 |

텍스트에 말줄임·강제 숨김을 추가하지 않았다. 긴 이름은 전체 내용을 유지하며 줄바꿈한다. 관련 없는 카드·모달의 색상, 글꼴, 기능은 변경하지 않았다.

- [통계 수정 전](evidence/responsive-audit/issue-stats-name-1024.png) / [통계 수정 후](evidence/responsive-fixes/issue-stats-name-1024.png)
- [연결 자료 수정 전](evidence/responsive-audit/issue-linked-name-320.png) / [연결 자료 수정 후](evidence/responsive-fixes/issue-linked-name-320.png)
- [시험 모달 수정 후](evidence/responsive-fixes/modal-exam-edit-320x400.png)
- [보관함 수정 후](evidence/responsive-fixes/modal-archive-320x400.png)

## 3단계 — R7 완료

요약 카드 묶음이 왼쪽 오늘의 학습 목록 높이를 따라 늘어나지 않도록 정렬했다. 두 카드는 같은 크기의 그리드 트랙을 사용해 **같은 화면에서 항상 동일한 높이**를 유지한다. 긴 제목은 줄바꿈하고, 필요할 때 두 카드가 콘텐츠에 맞춰 함께 커진다.

- 16개 너비에서 두 카드 높이 일치 검증 통과.
- 왼쪽 목록을 숨겨도 카드 높이가 바뀌지 않음을 확인했다.
- 긴 공백 없는 시험명을 넣어도 두 카드 높이가 같고 가로 넘침이 없었다.
- 1151px에서 카드 묶음은 약630px에서222px로 줄었다. 각 카드 높이는105px이다.
- [수정 전1151px](evidence/responsive-audit/boundary-home-1151.png) / [수정 후1151px](evidence/responsive-fixes/summary-after-1151.png)

## 4단계 — R2 개선안, 승인 대기

[**현재/제안 반응형 비교 미리보기 열기**](../previews/banner-camera-r2/index.html)

추천안은 하나의 기존 풍경을 원본 비율 그대로 렌더링하고, 화면에 따라 카메라의 스케일과 위치를 연결하는 방식이다.

1. 배경을 배너보다 작게 배치하지 않는 하한을 둔다. 이미지가 화면 안쪽에서 시작해 왼쪽에 빈 영역을 만드는 상황을 방지한다.
2. 작은 화면에서는 장면 스케일과 수평·수직 위치를 함께 조정한다. PC에서는 기존 약1120px 장면 스케일에 가까운 구도를 유지한다.
3. 로고 폭과 위치는 화면 너비에 따라 연속적으로 변하도록 한다. 767/768px에서 서로 다른 고정 폭을 사용하지 않는다.
4. 오두막·곰은 기존 분리 에셋과 원본 비율을 유지하며 위치를 연결한다.
5. 날짜·인사 카드·버전·내비게이션 기준은 유지한다. 1024px에서 사이드바로 전환되며 본문 폭이 바뀌는 기존 정책도 그대로다.

**제안 검증:** 주요15개 너비의 현재/제안 비교와8px 간격 구간을 포함해231개 카메라 샘플을 확인했다. 제안 배경은 배너를 가로·세로 모두 채웠다. 767→768px 로고 폭 변화는 기존95px에서 **0.3125px**로 줄었다.

- [제안320px](evidence/responsive-fixes/r2-proposal-320.png)
- [현재767px](evidence/responsive-fixes/r2-current-767.png) / [제안767px](evidence/responsive-fixes/r2-proposal-767.png)
- [제안768px](evidence/responsive-fixes/r2-proposal-768.png)
- [제안1024px](evidence/responsive-fixes/r2-proposal-1024.png) / [제안1440px](evidence/responsive-fixes/r2-proposal-1440.png)

미리보기의 슬라이더는320~1920px를1px 단위로 바꿀 수 있다. 두 화면은 같은 크기로 렌더링하고 비교 영역에 맞춰 전체를 축소 표시한다. 앱 저장 코드를 실행하지 않는 읽기 전용 화면이다.

제안 CSS는 **previews/banner-camera-r2/proposal.css**에만 있다. 실제 style.css/dist/style.css에는 배너 제안을 넣지 않았다. 실제 앱의 배너 관련 CSS·HTML·이미지·로고 에셋은 보존했다.

## 최종 검증

- 자동 테스트 **166개 통과, 실패0개**.
- 실제 Chrome 렌더링: 10개 주요 너비,16px 간격 양방향 구간,1px 경계,15종 모달,높이300px/400px 등 재확인.
- 실제 Chrome 페이지 확대:80/90/100/110/125/150/200%. CSS zoom이나 이미지 확대를 사용하지 않았다.
- UI 후속 검증 **2,134개 측정**에서 문서 가로 넘침·뷰포트 밖 텍스트 요소·런타임 오류·누락 리소스0건. 별도의 이름 글자 범위와 비율 숫자 겹침 검사도 통과했다.
- 자료·시험 등록, 진도/복습 저장, 시험 중단/재개, 다음 회독, 보관/복원, 파일 백업/복원, 오프라인 저장·재로드, 두 창 저장 충돌과 재시도 통과.
- 기존1.0 합성 저장값과 과거 회독을 보존했고, 합성 데이터의 백업 파일 왕복 내용이 동일했다.
- HTML·앱/계산/저장 JavaScript 모듈은 변경 전 해시와 같다. 실제 앱 변경은 두 CSS 파일 및 PWA 빌드로 생성한 service-worker.js에 한정했다.
- 실제 사용자 브라우저의 저장 자료는 읽거나 초기화하지 않았다.

근거:
[자동 테스트](evidence/responsive-fixes/tests.json),
[소스 보존·검증 집계](evidence/responsive-fixes/after.json),
[기능·저장 검증](evidence/responsive-fixes/browser-results.json),
[요약 카드·낮은 모달 단언](evidence/responsive-fixes/regression-results.json),
[확대 검증](evidence/responsive-fixes/zoom-results.json),
[배너 제안 검증](evidence/responsive-fixes/r2-preview-results.json).

실제 iPhone Safari/WebKit·소프트 키보드·안전 영역·핀치 줌은 이번에도 검증하지 못했다. Chrome은 headless 실제 렌더링이며, 좁은 모바일 너비는 뷰포트 에뮬레이션이다. 실제 창 크기 변경의 하한은512px이었다.

R2 승인 전까지6-11 전체 UI 확인은 대기 상태로 유지한다. 6-1·6-12 실제 사용자 자료 전환 대조도 계속 별도 대기다. 커밋·게시·배포는 수행하지 않았다.


## R2 후속 검토 페이지

사용자 추가 요청에 따라 축소 없는1:1 드래그 페이지를 별도로 제작했다. [최신 반응형 검토 페이지](../previews/banner-camera-r2-live/index.html)에서 오른쪽 가장자리를 잡아 직접 너비를 변경할 수 있다. 기존안과 개선안 전환·실제 너비 표시·브라우저 연동·실제 앱 배치 보기를 제공한다. 실제 적용 승인은 계속 대기다. [검증 안내](banner-camera-live-review.md) 참조.


## R2 최종 승인·실제 반영

2026-10-26 사용자가 최종 적용을 승인했다. 원본과dist에 같은 카메라 CSS를 연결했으며 실제 배너463개 측정과166개 테스트를 통과했다. [최신 적용 보고서](banner-camera-applied.md) 참조. 위의 승인 대기 표현은 당시 이력으로 보존한다.
