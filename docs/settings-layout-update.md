# 설정 화면 헤더·여백 수정

검증일: 2026-10-26. root/dist 반영. 커밋·게시 없음.

## 실제 원인

공통 .page-title은 44px / minmax(0,1fr) / 44px의3열 그리드다. 시험·통계는 h1을 감싼 div에 .page-title>div의 grid-column:2를 적용한다. 설정만 이 래퍼 없이 h1이 직접 자식이어서 첫44px열에 자동 배치됐다. 여기에 남은 PC 전용26px 글자와 overflow-wrap:anywhere가 결합해 '설/정' 두 줄이 됐다.

격리 Chrome에서 기존 DOM 구조와26px규칙을 임시 재구성했을 때 폭44px·텍스트2줄을 재현했다. 원본 파일을 이전 버전으로 되돌린 검증은 아니며, 수정 파일에서 문제 조건만 재구성한 것이다.

## 수정 파일

- index.html / dist/index.html: 설정 h1에 시험·통계와 같은 공통 div 래퍼 추가. 강제 너비나 폰트 축소 없이 중앙열에 정상 배치.
- style.css / dist/style.css: 기존 더보기에서 남은 margin:28px auto 0, 제목25px하단여백·26px글자 전용 규칙 제거. 공통 헤더 규칙 재사용. 설정 카드 컨테이너를 grid gap12px로 정리하고 자식 카드·초기화의 중복 margin 제거.
- service-worker.js / dist/service-worker.js:33개 셸 기준 캐시 갱신.

기존 카드 구성·배경색·스위치·버튼·초기화 경고색은 유지했다. app.js, test-mode.js, study-data.js, learning-plan.js, review-plan.js, exam-management.js는 이번 수정 전후 해시가 동일하다. 다른 탭 스타일과 데이터 처리 로직은 변경하지 않았다.

## 검증

- Node196건 통과: [출력](evidence/developer-mode/settings-layout-tests.tap).
- 격리 Chrome5흐름 통과, 런타임 오류0: [결과](evidence/developer-mode/settings-layout-results.json), [실행 스크립트](evidence/developer-mode/settings-layout-browser.cjs).
- 320/375/430/680/768/1023/1024/1280/1440/1920px에서 제목1줄. 시험·통계와 font family/size/weight/line-height, 헤더 상단·높이·여백, 콘텐츠 중앙 기준 정렬 일치.
- 페이지별 스크롤바 유무에 따른 콘텐츠 폭 변화는 구분하고, 각 헤더의 콘텐츠 중앙을 기준으로 비교했다. 가로 넘침 없음.
- 제목과 첫 카드 사이는 공통 헤더의16/18px하단여백을 사용하며, 두 카드·초기화 사이 간격은12px.
- 테스트ON에서 자료 삭제 후 실사용 저장 문자열 동일·OFF 복귀 동일.
- 백업 버튼으로 실제 다운로드한 JSON의 app/backupVersion 및 파일을 확인.
- 초기화 확인 전 저장값 유지·취소 시 동일·확인 후 합성 데이터 초기화.
- 실제 파일 입력에 다운로드 JSON을 선택해 확인 전 미복원·확인 후 원본 학습 기록을 포함한 전체 state 동일.
- [모바일 수정 화면](evidence/developer-mode/settings-layout-375.png), [PC 수정 화면](evidence/developer-mode/settings-layout-1440.png).
- [변경 전 해시](evidence/developer-mode/settings-layout-before.json), [변경 후 해시](evidence/developer-mode/settings-layout-after.json).

실제 사용자 자료 대신 별도 Chrome 프로필과 합성 자료를 사용했다. 실제 iPhone Safari/PWA는 미검증이며 Chrome 좁은 뷰포트를 Safari 성공으로 간주하지 않는다. PowerShell 경계 도구의 기존 실행정책 제한 때문에 해시·호출경로 및 합성 저장/백업 왕복으로 보존을 검증했다.
