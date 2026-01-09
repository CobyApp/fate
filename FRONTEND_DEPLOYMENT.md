# 프론트엔드 배포 가이드

이 가이드는 프론트엔드를 AWS S3 + CloudFront를 사용하여 배포하는 방법을 설명합니다.

## 📋 사전 요구사항

1. AWS CLI 설치 및 구성
2. CloudFormation 스택이 이미 배포되어 있어야 함
3. Node.js 및 npm 설치

## 🚀 배포 단계

### 1. CloudFormation 템플릿 업데이트 및 배포

먼저 프론트엔드 호스팅을 위한 S3 버킷과 CloudFront Distribution을 생성해야 합니다.

```bash
cd aws/cloudformation

# 빌드
sam build

# 배포 (기존 스택 업데이트)
sam deploy \
  --parameter-overrides \
    Environment=dev \
    FromEmailAddress=doyoung@minami-hd.co.jp \
    GeminiApiKey=YOUR_GEMINI_API_KEY
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일이 있는지 확인하고, 배포된 값으로 업데이트하세요:

```env
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_Z59iIqoYm
VITE_COGNITO_USER_POOL_CLIENT_ID=25s1vafmbaseru93u8713fnda0
VITE_AWS_REGION=ap-northeast-1
VITE_API_URL=https://zr9ryjd2lb.execute-api.ap-northeast-1.amazonaws.com/dev
```

**중요**: `.env` 파일의 값들이 CloudFormation 배포 결과와 일치해야 합니다.

### 3. 프론트엔드 빌드

```bash
# 프로젝트 루트에서
npm install
npm run build
```

빌드가 성공하면 `dist` 디렉토리가 생성됩니다.

### 4. 프론트엔드 배포

배포 스크립트를 실행하세요:

```bash
# 스크립트에 실행 권한 부여 (필요한 경우)
chmod +x deploy-frontend.sh

# 배포 실행
./deploy-frontend.sh dev
```

또는 수동으로 배포하려면:

```bash
# 1. S3 버킷 이름 확인
aws cloudformation describe-stacks \
  --stack-name fate-stack-dev \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucket`].OutputValue' \
  --output text

# 2. S3에 업로드 (BUCKET_NAME을 위에서 확인한 값으로 변경)
aws s3 sync dist/ s3://fate-frontend-dev-984588230794/ \
  --region ap-northeast-1 \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html"

# HTML 파일은 캐시하지 않음
aws s3 sync dist/ s3://fate-frontend-dev-984588230794/ \
  --region ap-northeast-1 \
  --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html"

# 3. CloudFront Distribution ID 확인
aws cloudformation describe-stacks \
  --stack-name fate-stack-dev \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendDistributionId`].OutputValue' \
  --output text

# 4. CloudFront 캐시 무효화 (DISTRIBUTION_ID를 위에서 확인한 값으로 변경)
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

### 5. 접속 확인

배포가 완료되면 CloudFormation Outputs에서 프론트엔드 URL을 확인하세요:

```bash
aws cloudformation describe-stacks \
  --stack-name fate-stack-dev \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
  --output text
```

또는 AWS 콘솔에서:
1. CloudFormation > Stacks > fate-stack-dev
2. Outputs 탭에서 `FrontendUrl` 확인

## 🔄 업데이트 배포

코드를 수정한 후 다시 배포하려면:

```bash
# 1. 빌드
npm run build

# 2. 배포
./deploy-frontend.sh dev
```

## ⚙️ 설정 세부사항

### S3 버킷
- 이름: `fate-frontend-{environment}-{account-id}`
- 정적 웹사이트 호스팅 활성화
- CloudFront OAC를 통한 접근만 허용 (공개 접근 차단)
- 버전 관리 활성화

### CloudFront Distribution
- HTTPS 강제 (HTTP는 HTTPS로 리다이렉트)
- SPA 라우팅 지원 (모든 경로를 `/index.html`로 리다이렉트)
- 캐싱 최적화 설정
- 전세계 CDN 배포

### 캐시 전략
- 정적 파일 (JS, CSS, 이미지 등): 1년 캐시
- HTML 파일: 캐시 없음 (항상 최신 버전 제공)

## 🔍 문제 해결

### 배포 후 변경사항이 반영되지 않음

1. CloudFront 캐시 무효화 확인:
   ```bash
   # Distribution ID 확인 후
   aws cloudfront list-invalidations --distribution-id DISTRIBUTION_ID
   ```

2. 브라우저 캐시 비우기 또는 시크릿 모드로 접속

### 환경 변수 오류

`.env` 파일이 제대로 설정되지 않았을 수 있습니다. 빌드 시점에 환경 변수가 주입되므로:

```bash
# .env 파일 확인
cat .env

# 빌드 후 확인 (dist 디렉토리의 파일에서 환경 변수 확인)
grep -r "VITE_" dist/
```

### S3 업로드 권한 오류

AWS CLI 자격 증명이 올바르게 설정되어 있는지 확인:

```bash
aws sts get-caller-identity
```

## 📝 참고사항

- CloudFront 캐시 무효화는 완료되는데 몇 분 정도 걸릴 수 있습니다.
- 첫 배포 후에는 CloudFront가 전 세계에 배포되는데 최대 15분 정도 걸릴 수 있습니다.
- 배포 스크립트는 자동으로 CloudFront 캐시 무효화를 생성하지만, 완료를 기다리지 않습니다.
- 프로덕션 환경에서는 도메인을 연결하고 SSL 인증서를 설정하는 것을 권장합니다.
