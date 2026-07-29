# PS-Kiosk-Guro · 파마스퀘어 구로점 키오스크

건강기능식품 · 뷰티 · 펫용품 1,679종을 안내하는 매장 키오스크 앱.
React + Vite 기반이며, 빌드 결과물을 WebView로 감싸 Android APK로 배포한다.

## 요구 사항
- Node.js 18 이상 (LTS 권장)

## 로컬 실행
```bash
npm install      # 최초 1회 (의존성 설치)
npm run dev      # 개발 서버 → http://localhost:5173
```

## 빌드
```bash
npm run build    # dist/ 에 정적 파일 생성
npm run preview  # 빌드 결과 로컬 미리보기
```
`vite.config.js`의 `base: "./"` 덕분에 `dist/`가 상대경로로 빌드되어,
그대로 WebView(APK)의 `assets/`에 넣어도 동작한다.

## 프로젝트 구조
```
├── index.html          Vite 진입 HTML
├── src/
│   ├── main.jsx        ReactDOM 마운트
│   └── App.jsx         키오스크 전체 (화면 · 데이터 · SVG 지도)
├── vite.config.js
└── package.json
```
현재 로고·매장사진은 `App.jsx` 상단에 base64로 인라인돼 있다.
추후 `src/assets/`로 분리 예정.

## 협업 규칙
- `main`은 항상 배포 가능한 안정 상태로 유지한다.
- 기능/수정은 브랜치에서 작업 후 Pull Request로 병합한다.
  ```bash
  git checkout -b feature/이름
  # ...작업...
  git push -u origin feature/이름
  # GitHub에서 Pull Request 생성
  ```

## 버전
- v8 (2024): 최초 이관 버전
