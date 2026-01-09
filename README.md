# Fate - 운세 분석 플랫폼

Google Gemini API를 활용한 현대적인 운세 분석 웹 애플리케이션입니다. React + Vite로 구축되었으며, AWS 서버리스 아키텍처를 사용합니다.

## 🌟 주요 기능

### 운세 카테고리
- 📜 **토정비결**: 토정 이지함 선생의 전통 운세 분석
- 🔮 **사주**: 생년월일시 기반 정확한 사주명리학 분석
- 💕 **궁합**: 두 사람의 사주를 비교한 상세한 궁합 분석
- 💖 **연애운**: 연인과의 관계와 애정운 분석
- ✨ **오늘의 운세**: 오늘 하루의 운세와 조언
- 🐉 **띠별 운세**: 띠별 올해 운세 분석
- 🎊 **신년운세**: 새해 전반적인 운세와 조언

### 인증 및 프로필
- 🔐 **Cognito 인증**: 회원가입, 로그인, 이메일 인증
- 👤 **프로필 관리**: 닉네임, 이름, 프로필 이미지 수정
- 🔑 **비밀번호 관리**: 비밀번호 변경, 비밀번호 재설정
- 🗑️ **계정 관리**: 회원탈퇴 기능

### 기타 기능
- 🌍 **다국어 지원**: 한국어, 영어, 일본어
- 📝 **운세 기록**: 이전에 본 운세 결과 저장 및 조회
- 📱 **반응형 디자인**: 모바일 및 데스크톱 지원

## 🏗️ 기술 스택

### 프론트엔드
- **React 18** - UI 라이브러리
- **Vite** - 빌드 도구
- **React Router** - 라우팅
- **AWS Amplify v6** - Cognito 인증 통합
- **Axios** - HTTP 클라이언트
- **i18n** - 다국어 지원

### 백엔드
- **AWS Lambda** - 서버리스 함수
- **API Gateway** - REST API
- **DynamoDB** - NoSQL 데이터베이스
- **AWS Cognito** - 사용자 인증 및 관리
- **S3** - 프로필 이미지 및 프론트엔드 호스팅
- **CloudFront** - CDN 및 HTTPS
- **AWS SAM** - 인프라 코드

### AI/ML
- **Google Gemini API** - 운세 분석 AI

## 📁 프로젝트 구조

```
fate/
├── src/                          # React 소스 코드
│   ├── api/                      # API 통신 모듈
│   │   ├── config.js            # API 설정
│   │   └── fateApi.js           # 운세 API 클라이언트
│   ├── components/               # 재사용 가능한 컴포넌트
│   │   ├── Auth.css             # 인증 컴포넌트 스타일
│   │   ├── Login.jsx            # 로그인 컴포넌트
│   │   ├── Register.jsx         # 회원가입 컴포넌트
│   │   ├── ProfileSettings.jsx  # 프로필 설정 컴포넌트
│   │   └── ...
│   ├── contexts/                 # React Context
│   │   ├── AuthContext.jsx      # 인증 상태 관리
│   │   └── I18nContext.jsx      # 다국어 상태 관리
│   ├── pages/                    # 페이지 컴포넌트
│   │   ├── Home.jsx             # 메인 페이지 (운세 카테고리 선택)
│   │   └── Onboarding.jsx       # 온보딩 페이지 (로그인 전)
│   ├── i18n/                     # 다국어 번역
│   │   ├── index.js             # i18n 설정
│   │   └── locales/             # 번역 파일
│   │       ├── ko.json          # 한국어
│   │       ├── en.json          # 영어
│   │       └── ja.json          # 일본어
│   └── config/
│       └── amplify.js           # AWS Amplify 설정
├── aws/                          # AWS 인프라
│   ├── lambda/                   # Lambda 함수들
│   │   ├── fate-calculator/     # 운세 계산 함수 (Gemini API)
│   │   ├── get-fate-history/    # 운세 기록 조회 함수
│   │   ├── change-password/     # 비밀번호 변경 함수
│   │   └── upload-profile-image/ # 프로필 이미지 업로드 함수
│   └── cloudformation/
│       ├── template.yaml        # CloudFormation 템플릿
│       └── samconfig.toml       # SAM 배포 설정
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions 자동 배포
├── deploy-frontend.sh           # 프론트엔드 배포 스크립트
├── package.json
├── vite.config.js
└── README.md
```

## 🚀 빠른 시작

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <repository-url>
cd fate
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 값들을 설정:

```env
# AWS Cognito 설정
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=ap-northeast-1

# API Gateway URL (배포 후 설정)
VITE_API_URL=https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev
```

> **참고**: AWS 인프라 배포 후 실제 값으로 업데이트해야 합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` (또는 표시된 포트)로 접속하세요.

### 4. 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

## 📦 배포

### 자동 배포 (GitHub Actions)

`main` 또는 `master` 브랜치에 코드를 푸시하면 자동으로 배포됩니다.

**필수 GitHub Secrets:**
- `AWS_ACCESS_KEY_ID` - AWS IAM Access Key ID
- `AWS_SECRET_ACCESS_KEY` - AWS IAM Secret Access Key
- `GEMINI_API_KEY` - Google Gemini API 키
- `FROM_EMAIL_ADDRESS` - SES 인증된 이메일 주소
- `VITE_COGNITO_USER_POOL_ID` - Cognito User Pool ID (배포 후)
- `VITE_COGNITO_USER_POOL_CLIENT_ID` - Cognito User Pool Client ID (배포 후)

자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

### 수동 배포

#### 1. Backend 배포

```bash
cd aws/cloudformation
sam build
sam deploy --parameter-overrides \
  Environment=dev \
  FromEmailAddress=your-email@example.com \
  GeminiApiKey=your-gemini-api-key
```

#### 2. Frontend 배포

```bash
# 환경 변수 설정 후
npm run build
./deploy-frontend.sh dev
```

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

## ⚙️ 설정

### AWS 인프라 설정

배포 전 다음 AWS 서비스를 설정해야 합니다:

1. **Cognito User Pool** - 사용자 인증
2. **SES (Simple Email Service)** - 이메일 인증 (Sandbox 또는 Production)
3. **IAM 사용자** - 배포 권한

자세한 설정 방법은 [SETUP.md](./SETUP.md)를 참조하세요.

### Google Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. API 키 생성
3. 환경 변수 또는 GitHub Secrets에 추가

## 🧪 개발

### 로컬 개발

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 빌드 미리보기
npm run preview
```

### Lambda 함수 로컬 테스트

```bash
cd aws/cloudformation
sam build
sam local invoke FateCalculatorFunction --event event.json
```

## 📚 문서

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 배포 가이드
- [SETUP.md](./SETUP.md) - 초기 설정 및 AWS 구성 가이드

## 🔒 보안

- 민감한 정보(API 키, Access Key 등)는 절대 코드에 커밋하지 마세요
- GitHub Secrets를 사용하여 환경 변수를 관리하세요
- IAM 사용자는 필요한 최소 권한만 부여하세요

## 🐛 문제 해결

일반적인 문제와 해결 방법:

1. **Cognito 인증 오류**: 환경 변수가 올바르게 설정되었는지 확인
2. **API 호출 실패**: API Gateway URL이 올바른지 확인
3. **빌드 오류**: Node.js 버전 확인 (18 이상 권장)
4. **배포 실패**: AWS 자격 증명 및 권한 확인

자세한 문제 해결은 [DEPLOYMENT.md](./DEPLOYMENT.md)의 문제 해결 섹션을 참조하세요.

## 📝 라이선스

MIT

## 👥 기여

이슈 및 Pull Request를 환영합니다!
