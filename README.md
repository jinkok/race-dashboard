# 🐎 경마 데이터 대시보드 (Race Dashboard)

Vite와 React, 그리고 Firebase를 활용한 고성능 경마 데이터 분석 및 베팅 대시보드입니다.

## 🚀 주요 기능 (Core Features)

- **실시간 데이터 시각화**: HSL 기반의 세련된 색상 팔레트와 동적 애니메이션을 적용한 대시보드 UI.
- **하이브리드 동기화**: Firebase Firestore와 브라우저 LocalStorage를 결합하여 오프라인 상태에서도 강력한 데이터 지속성 제공.
- **멀티 탭 분석**: 인적 사항(기수/조교사)과 경주 성적(전적/훈련/심판/진료)을 2단 탭 구조로 최적화하여 표출.
- **실시간 결과 계산**: 당일 입상 성적(1/2/3위)을 자동으로 집계하여 트로피 배지로 시각화.
- **다중 베팅 슬롯**: 최대 3개의 베팅 조합을 동시에 관리하고 저장할 수 있는 슬롯 시스템.

## 🛠️ 기술 스택 (Technology Stack)

- **Frontend**: Vite + React
- **Styling**: Vanilla CSS (Modern CSS variables, Flex/Grid)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Anonymous Auth & Google Login

## 🔨 시작하기 (Getting Started)

### 의존성 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

### 빌드 (Deployment Ready)
```bash
npm run build
```

## 🔐 데이터 동기화 및 보안

### KST 서버 시간 기준
- 한국 표준시(KST)를 기준으로 모든 날짜 초기화 로직을 고정하여, 접속 시 항상 한국 기준의 오늘 날짜가 기본으로 표출됩니다.

### 동기화 상태 표시
- **☁️ SYNC**: 서버와 로컬 데이터가 완벽히 일치함.
- **💾 CACHE**: 서버에는 아직 없지만 로컬에 임시 저장됨.
- **✏️ EDIT**: 수정 사항이 있으며 저장이 필요한 상태.

---

> [!TIP]
> 베팅 조합(My Picks)과 마필 메모(Horse Notes)를 영구적으로 저장하고 기기간에 공유하려면 **Google 로그인**을 완료해 주세요.

> [!IMPORTANT]
> 경주별 데이터 유출(Leak)을 방지하기 위해 각 경주는 고유한 `pickPath`로 독립적으로 관리됩니다.
