# 개발자 테스트 사용법

2026-10-26 최신 요청에 따라 기존 다중 시나리오 시스템을 단순화했다.

- 기존 앱 또는 dist/index.html → 더보기 → 설정 → **개발자 테스트 [OFF | ON]**.
- OFF는 기존 실사용 LocalStorage, ON은 탭 전용 SessionStorage의 단일 가상 데이터다.
- 전환은 새로고침 없이 현재 화면에 적용한다. 자료 상세에서 다른 환경으로 바꾸면 홈으로 돌아간다.
- ON마다 최초 가상 데이터를 다시 만든다. ON 중 새로고침은 수정 내용을 유지한다.
- 가상 자료7개·시험3개·약5개월의 학습/복습127건. 회독·완료/보관·시험 중단·쉬는 날짜·페이지/문제/강을 포함한다.
- 테스트 기록·삭제·복원·전체 초기화는 테스트 세션에만 적용한다. TEST 백업은 일반 복원기에 섞이지 않도록 별도 표식을 유지한다.
- 실사용 저장 키·JSON 백업 형식·학습/복습/통계 계산·오늘 최초 권장량 차감 정책은 유지했다.

기존 dev/, dev-dist/,28종 JSON,생성/개발 빌드 스크립트,시나리오/파일/복사본/비교 UI와 관련 코드를 삭제했다. 이전 테스트 전용 IndexedDB chagok-dev-test-v1과 모드 선택 키만 정리하며, 다른 IndexedDB나 실사용 LocalStorage를 지우지 않는다. 별도 개발 앱은 없다. 이전 CG-SKILL-035 결과와 보고서는 당시 검증 기록이며 현재 기능 설명이 아니다.

앱 변경 후 게시 전 기존 명령 **node scripts/build-pwa.cjs**를 실행한다. 일반 dist의 PWA 캐시에 test-data.js와 test-mode.js도 포함된다. GitHub Pages 게시 구조는 그대로이며 이번 작업에서 커밋·게시하지 않았다.

검증 결과: [자동 테스트](evidence/developer-mode/simplify-tests.tap), [Chrome 전환·격리·복원·초기화·반응형·오프라인](evidence/developer-mode/simplify-browser-results.json). [모바일 설정 모습](evidence/developer-mode/simple-settings-375.png).

실제 iPhone Safari/PWA와 GitHub Pages 게시 주소 검증은 아직 하지 않았다. Chrome의 모바일 너비 검증을 Safari 검증으로 간주하지 않는다. 실제 사용자 자료는 읽거나 변경하지 않고 격리 프로필의 합성 표식으로 검증했다.
