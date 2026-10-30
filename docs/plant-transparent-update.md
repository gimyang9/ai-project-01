# 8종 투명 식물 적용 · 동백을 물망초로 교체

사용자 제공 최종8종 시안을 투명 배경 이미지로 정리하고 단계별PNG40개를 root/dist에 적용했다. 동백 대신 최종물망초5단계를 사용한다. 내부 camellia 식별자/파일명은 기존 회독·배정원장·수집기록의 호환을 위해 유지하며 표시그림과 미리보기명칭은 물망초다. JS 저장/계산/배정 코드는 변경하지 않았다.

PNG는384×384 RGBA·기존지면368, 종별같은배율·NEAREST 축소·투명여백. 생성도구로 배경/이름표를 제거한 뒤 실제알파영역을 기준으로 안전여백을포함해분리했다. 추가재사용시트8개는512px균일셀5칸이며모든셀경계완전투명. 앱기존단계별확대와6px하향CSS불변.

검증: TZ=Asia/Seoul node --test tests/pwa.test.cjs tests/plant-growth.test.cjs 10/10통과. Python40PNG 경계투명/잘림없음과8시트셀경계알파0확인. Chrome plant-preview40/40이미지384×384로딩확인 및전체시각검사. 실제홈테스트모드6자료에서물망초5단계표시와기존배율1.15·Y6px확인. 기존학습자료/기록JS·CSS는Gitdiff불변, root/distPNG동일. PWA73파일갱신. 실제iPhoneSafari미검증. inspect-boundary.ps1은체크아웃에없어Git변경경계로확인했다.
