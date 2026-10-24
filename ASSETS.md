# 디자인 에셋

## 이미지

내장 ImageGen으로 이 프로젝트용 이미지 두 장을 제작했다.

- `dist/assets/forest-banner.png`: 아이보리 햇살, 올리브·세이지 나무,
  테라코타 지붕의 작은 크림색 집, 들꽃과 돌길로 구성한 16비트 픽셀 숲.
  왼쪽은 글자를 얹을 수 있게 밝고 여유 있게, 집은 오른쪽에 배치했다.
  글자·UI·테두리 없는 풍경으로 요청했다.
- `dist/assets/plants.png`: 투명 배경의 3열×2행 식물 스프라이트.
  화분 새싹, 어린 나무, 완성 나무, 땅 위 새싹, 데이지, 테라코타 꽃.
  CSS 배경 위치로 구분하며 사용자가 식물을 직접 고르는 UI는 없다.

## 폰트

- LINE Seed Sans KR Regular / Bold: 기존 1.0에 포함된 파일을 그대로 사용.
- Cafe24 Ssurround: 다음 배포 파일을 사용.
  https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24Ssurround.woff

## 일반 아이콘

직접 작성한 일관된 선 두께의 SVG 심볼. 이모지 아이콘은 사용하지 않는다.

## 2026-10-24 식물 성장 이미지 교체
- `dist/assets/plants-growth-v2.png`: 사용자가 제공한 참고 이미지로 생성한 투명 배경 3열×2행 나무·꽃 성장 아틀라스. 사용자 승인 후 적용. 기존 식물 파일은 보존.
- CSS 셀 위치와 clip-path로 이웃 스프라이트 노출을 방지한다. 기존 숲 배너는 재사용한다.

## 승인된 아기 곰 배너 / 5단계 식물
- `dist/assets/forest-bear.png`: 사용자 참고 시안으로 생성·승인한 텍스트 없는 숲 배너. 앱 이름/버전은 HTML 텍스트.
- `dist/assets/plants-five-stages.png`: 꽃·나무·선인장·버섯 4종×5단계의 승인된 투명 아틀라스. 이전 에셋은 보존. CSS로 셀 위치와 가장자리 여백을 조정하며 비율을 유지한다.

## 승인 후 적용한 디자인 비교 에셋

- `dist/assets/forest-bear-b.png`: 기존 배너 구도를 참조해 imagegen으로 재묘사한 B안. 사용자 최종 승인 후 적용. 2:1 비율, 별도 HTML 제목·부제 사용.
- `dist/assets/date-leaf.png`: imagegen으로 생성한 투명 배경 픽셀 잎사귀. 날짜 옆18px 표시.
- 이전 `forest-bear.png`는 원본으로 보존. 식물 이미지는 변경하지 않음.

## 데스크톱 사이드바 픽셀 정원 시안 4종 — 선택 대기

내장 image_gen으로 기존 forest-bear-b.png / plants-five-stages.png를 스타일 참조하여 독립 투명 PNG 네 장을 제작했다. 기존 파일 수정·덮어쓰기 없음. 실제 앱에는 적용하지 않았다.

- previews/sidebar-art/01-bear-tree.png: 나무 곁의 아기 곰
- previews/sidebar-art/02-growing-garden.png: 새싹과 꽃 정원
- previews/sidebar-art/03-woodland-cabin.png: 목재 오두막과 숲
- previews/sidebar-art/04-study-garden.png: 책·화분·연필과 공부 정원
- previews/sidebar-art/index.html: 사이드바 전체 4종 비교, 폭/이미지 크기/투명도 확인
- previews/sidebar-art/prompts.json: 도구 모드·참고 이미지·최종 프롬프트

동일 파일을 dist/previews/sidebar-art에 포함했다. 앱 HTML은 시안 에셋을 참조하지 않는다. 알파는 생성 원본 그대로이며 기존 에셋을 수정하지 않았다. 자세한 배치·검증 한계는 docs/sidebar-layout-notes.md.

## 2026-10-25 최종 선택 적용

사용자가 1번을 최종 선택했다. previews/sidebar-art/01-bear-tree.png를 assets/sidebar-bear-tree.png와 dist/assets/sidebar-bear-tree.png로 그대로 복사해 실제 데스크톱 사이드바에 적용했다. 이전 시안 미적용 설명은 선택 전 상태다. 이미지 재생성·편집·원본 덮어쓰기 없음. 폭 208px 지정/컨테이너 제한, 투명도·픽셀 표현 유지. 모바일에는 표시하지 않는다.
