# 커스텀 스킬 후보와 선택

2026-10-24 PRD·후속 결정·TODO 분석 결과다.

| 후보 | 필요한 이유 | 실제 활용 | 관련 TODO |
|---|---|---|---|
| chagok-data-guard | 원본 이력과 수동 설정 보호 기준이 필요 | 저장 경계 조사, 마이그레이션 전후 비교, 실패 처리 검증, 근거 기록 | 2단계, 3-14~17, 4-6~8·21~23, 6단계 |
| chagok-review-check | 겹친 범위·회독·다중 시험의 계산 사례가 복잡 | 규칙 확인 후 순수 계산 함수의 기대 결과·경계 테스트 구성 | 4단계 |
| chagok-development-evidence | 화면 미리보기와 실제 저장 완료를 구분해야 함 | PRD–TODO–수정–검증 연결 및 제출 상태 검토 | 제출 준비, 6단계 |

**chagok-data-guard 하나를 먼저 작성했다.** 2단계 저장 연결은 이후 시험·복습·통계의 전제이며, 데이터 보호는 여러 단계에 반복 적용된다. 근거 관리에 필요한 부분은 적용 로그 절차에 포함했다. 복습 전용 스킬은 계산 규칙이 구체화된 뒤 필요하면 분리한다. 다른 두 후보는 작성하거나 사용하지 않았다.

## 위치와 재사용

- [SKILL.md 전문](../skills/chagok-data-guard/SKILL.md)
- [검증 보조 도구](../skills/chagok-data-guard/scripts/inspect-boundary.ps1)
- 프로젝트 AGENTS.md가 원문 경로를 지정한다. 이후 Codex는 이 경로를 읽고 적용한다. 전역 설치·자동 목록 등록은 하지 않았다.
- 이번에 새로 작성한 커스텀 버전이다. 과거 CG-SKILL-001~012의 원문을 복원한 것이 아니다.

프로젝트 루트에서 다음 명령으로 소스 경계 목록을 수집한다. 실행 정책 옵션은 해당 프로세스에만 적용하며 시스템 설정을 변경하지 않는다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File skills/chagok-data-guard/scripts/inspect-boundary.ps1
```

도구는 보존 소스와 앱 JavaScript의 SHA-256 및 직접적인 저장 접근 후보를 출력한다. 변경 전후 비교용이며 무손실 판정 도구는 아니다. 사용자 LocalStorage에는 접근하지 않는다.

## 생성 후 첫 실제 적용

CG-SKILL-013에서 예시 데이터·시험 저장 키·저장 성공 후 상태 반영 순서·미리보기 폼을 검토하고 제출 문서를 갱신했다. 도구를 실행해 보존 파일 6개와 앱 JavaScript 3개의 해시, 저장 접근 후보 6곳을 수집했다. 이는 현재 기준선이며 과거 원본과의 동일성 검증 결과가 아니다.

기본 PowerShell 정책으로 파일 실행이 거절돼 프로세스 한정 옵션으로 재실행했고 정상 JSON 출력을 확인했다. Python/py 명령을 찾지 못해 skill-creator의 quick_validate.py는 실행하지 못했다. frontmatter·명명 규칙·상대 경로는 별도로 확인한다. Node 기반 앱 테스트와 브라우저는 이번 작업에서 재실행하지 않았다.

실제 적용은 [로그](skill-usage-log.md) CG-SKILL-013과 [JSONL](skill-usage-log.jsonl)에 기록한다. 이번 적용은 개발 검토이며 새 앱 기능 구현이 아니다. 후속 구현에서는 관련 TODO와 기대 결과를 먼저 정하고 실제 실행한 범위만 추가한다.
