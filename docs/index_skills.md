# SMART RACING PRO V9 - 기술 스택 분석

## 프로젝트 개요
**SMART RACING PRO V9**는 경마 데이터 분석 및 시각화 웹 애플리케이션입니다. 모바일 최적화된 UI/UX로 실시간 경주 정보, 말 정보, 통계 분석을 제공합니다.

---

## 📚 핵심 기술 스택

### 1. 프론트엔드 프레임워크
- **React 18** (development build)
  - CDN을 통한 UMD 빌드 사용
  - Hooks 기반 함수형 컴포넌트 (`useState`, `useEffect`, `useRef`)
  - 단일 컴포넌트 구조 (App)

### 2. 빌드 & 트랜스파일러
- **Babel Standalone**
  - 브라우저에서 직접 JSX를 JavaScript로 변환
  - 별도 빌드 프로세스 없이 즉시 실행 가능
  - `type="text/babel"` 스크립트 블록 활용

### 3. 스타일링
- **Tailwind CSS** (CDN)
  - 유틸리티 우선 CSS 프레임워크
  - 커스텀 애니메이션 및 스타일 추가
  - 반응형 디자인 (모바일 우선)

- **커스텀 CSS**
  - Google Fonts: Pretendard (한글 폰트)
  - 커스텀 애니메이션: `slideUp`, `fillBar`
  - 블러 효과 sticky header
  - 스크롤바 숨김 처리

### 4. 아이콘
- **Lucide Icons**
  - 경량 아이콘 라이브러리
  - 커스텀 Icon 컴포넌트로 래핑
  - 동적 아이콘 생성 (useEffect 활용)

### 5. 백엔드 & 데이터베이스
- **Firebase**
  - `firebase-config.js`를 통한 설정 (별도 모듈)
  - Firestore 추정 (경주 데이터, 말 정보 저장)
  - 실시간 데이터 동기화 가능성

---

## 🏗️ 아키텍처 특징

### 단일 HTML 파일 구조
- **모든 코드가 하나의 HTML 파일에 통합**
- 배포 및 공유가 간단
- 프로토타이핑 및 빠른 개발에 최적화
- 프로덕션 환경에서는 빌드 프로세스 권장

### CDN 기반 의존성 관리
```html
<!-- React & React-DOM -->
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

<!-- Babel (JSX 변환) -->
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Lucide Icons -->
<script src="https://unpkg.com/lucide@latest"></script>
```

**장점:**
- npm 없이 즉시 실행 가능
- 초기 설정 최소화
- 브라우저만 있으면 개발 가능

**단점:**
- 네트워크 의존성 (오프라인 동작 불가)
- 성능 최적화 제한
- 프로덕션 배포 시 번들 크기 증가

---

## 🎨 주요 UI 컴포넌트

### 1. Icon 컴포넌트
```javascript
const Icon = ({ name, size = 16, className = "" }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (window.lucide) 
            window.lucide.createIcons({ 
                root: ref.current, 
                name, 
                attrs: { width: size, height: size, class: className } 
            });
    }, [name, className, size]);
    return <i ref={ref} data-lucide={name}></i>;
};
```
- Lucide 아이콘을 React 컴포넌트로 래핑
- 동적 크기 및 스타일 적용
- useRef + useEffect로 DOM 직접 조작

### 2. BarChart 컴포넌트
- **데이터 시각화**: 말의 기록을 바 차트로 표현
- **동적 스케일링**: 최소/최대값 기반 상대적 길이 계산
- **애니메이션**: CSS `bar-fill` 클래스로 채워지는 효과
- **색상 구분**: 
  - 빨간색: 초반 스피드 (S1F)
  - 파란색: 후반 탄력 (G1F)

### 3. 말 번호 배지 시스템
```javascript
const getBadgeStyle = (no) => {
    const n = parseInt(no);
    const base = "border-2 shadow-sm box-border";
    if (n===1) return `${base} bg-white text-slate-900 border-slate-900`;
    if (n===2) return `${base} bg-yellow-400 text-slate-900 border-yellow-400`;
    // ... 1~12번까지 고유 색상 정의
};
```
- 말 번호(1~12번)별 고유 색상 스타일
- 일관된 시각적 식별 체계
- 접근성 고려 (색상 + 테두리)

---

## 💾 데이터 구조

### 경주 데이터 (Race)
```javascript
{
    id: String,           // 경주 고유 ID
    name: String,         // 경주 이름
    track: String,        // 경주장
    date: String,         // 날짜
    distance: String,     // 거리
    class: String,        // 등급
    horses: Array         // 출전 말 목록
}
```

### 말 정보 (Horse)
```javascript
{
    no: String,                    // 말 번호 (1~12)
    name: String,                  // 말 이름
    jockey: String,                // 기수
    trainer: String,               // 조교사
    owner: String,                 // 마주
    grade: String,                 // 등급
    weight: String,                // 부중
    rating: String,                // 레이팅
    training_cnt: Number,          // 훈련 횟수
    participation_period: String,  // 참여 주기
    picks: String,                 // 전문가 코멘트
    recent_history: Array,         // 최근 경주 기록
    steward_trip_note: Object,     // 심판 리포트 (date, note)
    medical_alerts: Array          // 진료 현황 배열 (date, detail)
}
```

### 통계 데이터 (Stats)
```javascript
{
    fast_start_horses: [           // 초반 스피드 순위
        { no: String, name: String, rec: String }
    ],
    fast_finish_horses: [          // 후반 탄력 순위
        { no: String, name: String, rec: String }
    ]
}
```

---

## 🎯 핵심 기능

### 1. 경주 선택 시스템
- 드롭다운 방식의 경주 목록
- 선택 시 해당 경주의 상세 정보 로드
- 로딩 상태 표시

### 2. 말 정보 카드
- **접기/펼치기 기능**: 각 말 정보 토글
- **배지 시스템**: 말 번호별 색상 구분
- **전문가 코멘트**: picks 필드에 인사이트 표시
- **최근 전적 테이블**: 
  - 날짜, 등급, 거리, 기록
  - 순위, 부중, 기수
  - S1F, G3F, G1F 기록

### 3. 데이터 분석 차트
- **초반 스피드 (S1F)**: 빨간색 바 차트
- **후반 탄력 (G1F)**: 파란색 바 차트
- 상대적 성능 비교 시각화

### 4. 반응형 디자인
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```
- 모바일 우선 설계
- 터치 최적화 (`-webkit-tap-highlight-color: transparent`)
- 스크롤 및 제스처 지원

---

## ⚡ 성능 최적화 요소

### 1. 애니메이션 최적화
```css
@keyframes slideUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes fillBar {
    to { transform: scaleX(1); }
}
```
- CSS 애니메이션 활용 (GPU 가속)
- `cubic-bezier` 이징 함수로 부드러운 전환
- `transform-origin` 최적화

### 2. 폰트 최적화
```css
@import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap');
```
- Google Fonts CDN 활용
- 필요한 폰트 웨이트만 선택적 로드
- `display=swap`으로 FOIT 방지

### 3. 조건부 렌더링
- 경주 선택 전후 UI 분기
- 데이터 없을 때 fallback 메시지
- 로딩 상태 처리

---

## 🔧 개선 제안

### 프로덕션 배포 시 고려사항

1. **빌드 프로세스 도입**
   - Vite 또는 Create React App 마이그레이션
   - 코드 번들링 및 최소화
   - Tree shaking으로 불필요한 코드 제거

2. **성능 개선**
   ```bash
   # 추천 스택
   - Vite (빌드 도구)
   - React (production build)
   - Firebase Hosting
   ```

3. **코드 분리**
   - 컴포넌트 파일 분리 (Icon, BarChart, HorseCard 등)
   - 유틸리티 함수 모듈화 (getBadgeStyle)
   - 상수 및 설정 분리

4. **타입 안정성**
   - TypeScript 도입
   - PropTypes 또는 Zod 스키마 검증

5. **상태 관리**
   - 복잡도 증가 시 Zustand 또는 Context API 고려
   - Firebase 데이터 캐싱 전략

6. **테스트**
   - Jest + React Testing Library
   - E2E 테스트 (Playwright)

---

## 📱 모바일 최적화

### 터치 인터랙션
```css
body {
    -webkit-tap-highlight-color: transparent;
}
```
- 터치 시 하이라이트 제거
- 네이티브 앱과 유사한 경험

### 뷰포트 설정
```html
maximum-scale=1.0, user-scalable=no
```
- 확대/축소 방지
- 고정 레이아웃 유지

### 스크롤 최적화
```css
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
```
- 커스텀 스크롤 영역
- 깔끔한 UI

---

## 🎨 디자인 시스템

### 색상 팔레트
- **Primary**: Slate (900, 800, 700, 600, 500, 400, 300, 200, 100, 50)
- **Accent**: 
  - Red (600, 500, 50) - 초반 스피드
  - Blue (700, 600, 500, 50) - 후반 탄력
  - Yellow (400) - 2번 말
  - Green (600, 100) - 6번 말, 데이터 분석
- **Semantic**:
  - Rose (600) - 상위 순위
  - Purple (700) - 9번 말

### 타이포그래피
- **Font Family**: Pretendard (한글 최적화)
- **Font Weights**: 300, 400, 500, 600, 700, 800
- **Font Features**: `tabular-nums` (숫자 정렬)

### 간격 시스템
- Tailwind 기본 스케일 활용
- 일관된 padding/margin (px-4, py-2, gap-3 등)

---

## 🔐 보안 고려사항

### Firebase 설정
```javascript
<script type="module" src="firebase-config.js"></script>
```
- **중요**: Firebase API 키는 별도 파일로 분리
- 환경 변수 사용 권장 (프로덕션)
- Firestore 보안 규칙 설정 필수

### 권장 보안 조치
1. Firebase Security Rules 설정
2. API 키 환경 변수화
3. CORS 정책 설정
4. Rate limiting 적용

---

## 📊 데이터 흐름

```
Firebase Firestore
    ↓
App 컴포넌트 (useState)
    ↓
경주 선택 → 데이터 로드
    ↓
┌──────────────┬──────────────┐
│  말 정보     │   통계 차트   │
│  (HorseCard) │  (BarChart)  │
└──────────────┴──────────────┘
```

---

## 🚀 시작하기

### 개발 환경 실행
1. Firebase 프로젝트 생성
2. `firebase-config.js` 파일 작성
3. 웹 서버에서 `index.html` 실행
   ```bash
   # 간단한 로컬 서버
   python -m http.server 8000
   # 또는
   npx serve .
   ```

### 프로덕션 배포
1. Firebase Hosting 설정
   ```bash
   firebase init hosting
   firebase deploy
   ```

---

## 📄 라이센스 & 크레딧

### 사용된 오픈소스
- React (MIT)
- Tailwind CSS (MIT)
- Lucide Icons (ISC)
- Pretendard Font (OFL)

### 프로젝트 정보
- **버전**: V9
- **플랫폼**: 웹 (모바일 최적화)
- **언어**: 한국어

---

## 📞 추가 정보

이 문서는 SMART RACING PRO V9의 기술 스택과 아키텍처를 분석한 것입니다. 
실제 구현 시 프로젝트 요구사항에 맞게 조정하시기 바랍니다.

**작성일**: 2026-02-10  
**분석 대상**: index.html (600 lines)