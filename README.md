# UX Work Dashboard

서비스 UX 업무 진행 현황 대시보드 — GitHub Projects #59 기반 실시간 현황판

## 구조

```
├── index.html              # 메인 대시보드
├── assets/
│   ├── style.css
│   └── script.js
├── config/
│   └── milestones.json     # 마일스톤별 주요 날짜 설정
├── data/
│   └── issues.json         # GitHub Actions가 자동 생성
├── scripts/
│   └── fetch-data.js       # GitHub GraphQL API 페처
└── .github/workflows/
    └── update-data.yml     # 1시간마다 자동 갱신
```

## 날짜 설정

`config/milestones.json`에서 마일스톤별 주요 날짜를 관리합니다.

```json
{
  "current": "4.12",
  "milestones": {
    "4.12": {
      "github_milestone": "4.12.0",
      "dates": {
        "spec_done":   "2026-08-01",
        "design_done": "2026-08-15",
        "qa_start":    "2026-09-01",
        "issue_clear": "2026-09-15",
        "release":     "2026-09-22"
      }
    }
  }
}
```

## 배포 설정

### 1. 레포 생성 및 GitHub Pages 활성화

```bash
gh repo create hkmc-airlab/ux-work-dashboard --public
git remote add origin https://github.com/hkmc-airlab/ux-work-dashboard.git
git push -u origin main
```

GitHub 레포 Settings → Pages → Source: `main` 브랜치 `/root`

### 2. PAT 토큰 등록

GitHub Projects v2 API는 `read:project` 스코프가 필요합니다.

1. [GitHub PAT 생성](https://github.com/settings/tokens) — `read:project`, `repo` 스코프
2. 레포 Settings → Secrets → `PROJECT_TOKEN`으로 등록

### 3. 로컬 테스트

```bash
GITHUB_TOKEN=your_pat node scripts/fetch-data.js
npx serve . -p 3000
```

## 제품 구분

| 섹션 | 레포 | 표시 이름 |
|------|------|---------|
| 마일스톤 제품 | shucle-rider | Rider |
| 마일스톤 제품 | shucle-DriverVehicle-product | Driver |
| 마일스톤 제품 | shucle-taxidriver-product | Taxi Driver |
| 마일스톤 제품 | shucle-kiosk | Kiosk |
| 마일스톤 제품 | shucle-CallAgent-product | Call Agent |
| 상시 확인 | shucle-product | Product |
| 상시 확인 | shucle-registry | Registry |
| 상시 확인 | shucle-ux | UX |
