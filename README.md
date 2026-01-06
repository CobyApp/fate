# Fate - 사주 보기 웹사이트

React + Vite로 구축된 사주 보기 웹사이트입니다. AWS Lambda, API Gateway, DynamoDB를 활용한 서버리스 아키텍처를 사용합니다.

## 프로젝트 구조

```
fate/
├── src/                    # React 소스 코드
│   ├── api/               # API 통신 모듈
│   ├── App.jsx            # 메인 앱 컴포넌트
│   ├── App.css            # 앱 스타일
│   ├── main.jsx           # 엔트리 포인트
│   └── index.css          # 글로벌 스타일
├── aws/                    # AWS 인프라 설정
│   ├── lambda/            # Lambda 함수들
│   └── cloudformation/    # CloudFormation 템플릿
├── package.json
├── vite.config.js
└── index.html
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

### 3. 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

## 🚀 서버 연결 및 배포

### 빠른 시작

1. **AWS 인프라 배포** (자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md) 참조)
   ```bash
   cd aws/cloudformation
   sam build
   sam deploy --guided
   ```
   배포 완료 후 출력되는 `ApiUrl`을 복사하세요.

2. **환경 변수 설정**
   프로젝트 루트에 `.env` 파일을 생성하고 다음 값들을 설정:
   ```env
   VITE_API_URL=https://your-api-id.execute-api.region.amazonaws.com/dev
   VITE_COGNITO_USER_POOL_ID=ap-northeast-2_xxxxxxxxx
   VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_AWS_REGION=ap-northeast-2
   ```
   자세한 내용은 [COGNITO_SETUP.md](./COGNITO_SETUP.md)를 참조하세요.

3. **개발 서버 실행**
   ```bash
   npm install
   npm run dev
   ```

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

## 기능

- 🔐 **Cognito 인증**: 회원가입, 로그인, 이메일 인증
- 📱 **온보딩 페이지**: 로그인 전 사용자를 위한 소개 페이지
- 🔮 **사주 계산**: 생년월일, 생시, 성별을 입력하여 사주 보기
- 💾 **기록 저장**: 사주 결과를 DynamoDB에 저장
- 📜 **기록 조회**: 이전 사주 기록 조회 및 관리

## 기술 스택

### 프론트엔드
- React 18
- Vite
- React Router
- AWS Amplify (Cognito 인증)
- Axios

### 백엔드
- AWS Lambda
- API Gateway
- DynamoDB
- AWS Cognito (인증)
- CloudFormation/SAM

## 라이선스

MIT
