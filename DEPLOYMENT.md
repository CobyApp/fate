# 배포 가이드

이 문서는 Fate 애플리케이션을 AWS에 배포하는 방법을 설명합니다.

## 📋 사전 요구사항

- AWS 계정
- AWS CLI 설치 및 구성
- AWS SAM CLI 설치
- Node.js 18 이상
- Git
- Google Gemini API 키

## 🚀 배포 방법

### 방법 1: GitHub Actions 자동 배포 (권장)

`main` 또는 `master` 브랜치에 코드를 푸시하면 자동으로 배포됩니다.

#### 1. GitHub Secrets 설정

GitHub 저장소의 **Settings > Secrets and variables > Actions**에서 다음 Secrets를 추가:

**필수 Secrets:**
- `AWS_ACCESS_KEY_ID` - AWS IAM Access Key ID
- `AWS_SECRET_ACCESS_KEY` - AWS IAM Secret Access Key
- `GEMINI_API_KEY` - Google Gemini API 키
- `FROM_EMAIL_ADDRESS` - SES 인증된 이메일 주소 (예: `doyoung@minami-hd.co.jp`)

**Frontend 빌드용 Secrets (배포 후 설정):**
- `VITE_COGNITO_USER_POOL_ID` - Cognito User Pool ID
- `VITE_COGNITO_USER_POOL_CLIENT_ID` - Cognito User Pool Client ID

#### 2. 코드 푸시

```bash
git add .
git commit -m "배포 테스트"
git push origin main
```

#### 3. 배포 상태 확인

GitHub 저장소의 **Actions** 탭에서 배포 진행 상황을 확인할 수 있습니다.

### 방법 2: 수동 배포

#### 1. Backend 배포

```bash
cd aws/cloudformation

# 빌드
sam build

# 배포
sam deploy --parameter-overrides \
  Environment=dev \
  FromEmailAddress=your-email@example.com \
  GeminiApiKey=your-gemini-api-key \
  --region ap-northeast-1
```

배포 완료 후 출력되는 정보를 확인하세요:
- `ApiUrl` - API Gateway URL
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito User Pool Client ID
- `FrontendBucketName` - S3 버킷 이름
- `FrontendCloudFrontDistributionId` - CloudFront Distribution ID
- `FrontendUrl` - CloudFront URL (프론트엔드 접속 URL)

#### 2. 환경 변수 설정

Backend 배포 후 출력된 정보로 `.env` 파일을 업데이트:

```env
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_URL=https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev
VITE_AWS_REGION=ap-northeast-1
```

#### 3. Frontend 빌드 및 배포

```bash
# 빌드
npm run build

# 배포 스크립트 실행
./deploy-frontend.sh dev
```

또는 수동으로:

```bash
# CloudFormation 스택에서 정보 가져오기
STACK_NAME="fate-stack-dev"
REGION="ap-northeast-1"

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucket`].OutputValue' \
  --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendDistributionId`].OutputValue' \
  --output text)

# S3에 업로드
npm run build
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
  --region ${REGION} \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html"

aws s3 sync dist/ s3://${BUCKET_NAME}/ \
  --region ${REGION} \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html"

# CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

## 🔧 배포 설정

### 환경별 배포

현재 설정은 `dev` 환경입니다. 프로덕션 환경으로 배포하려면:

```bash
sam deploy --parameter-overrides \
  Environment=prod \
  FromEmailAddress=your-email@example.com \
  GeminiApiKey=your-gemini-api-key \
  --stack-name fate-stack-prod \
  --region ap-northeast-1
```

### 리전 변경

기본 리전은 `ap-northeast-1` (도쿄)입니다. 다른 리전으로 변경하려면:

1. `samconfig.toml` 파일 수정
2. `template.yaml`의 리전 참조 수정
3. SES에서 해당 리전으로 이메일 주소 인증

## 📊 CloudFormation Outputs

배포 완료 후 다음 정보를 확인할 수 있습니다:

```bash
aws cloudformation describe-stacks \
  --stack-name fate-stack-dev \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs'
```

주요 Outputs:
- `ApiUrl` - API Gateway 엔드포인트
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito User Pool Client ID
- `FrontendBucket` - S3 버킷 이름 (프론트엔드 호스팅)
- `FrontendDistributionId` - CloudFront Distribution ID
- `FrontendUrl` - CloudFront URL (프론트엔드 접속 URL)

## 🐛 문제 해결

### "The security token included in the request is invalid" 오류

**원인**: AWS 자격 증명이 잘못되었거나 만료됨

**해결 방법**:
1. GitHub Secrets 또는 로컬 AWS 자격 증명 확인
2. IAM 사용자의 Access Key 확인
3. Access Key가 활성화되어 있는지 확인
4. 필요시 새 Access Key 생성

### "Stack is in UPDATE_IN_PROGRESS" 오류

**원인**: 이전 배포가 아직 진행 중

**해결 방법**: 이전 배포가 완료될 때까지 대기 (보통 5-10분)

### "S3 Bucket does not exist" 오류

**원인**: SAM 배포용 S3 버킷이 없음

**해결 방법**:
```bash
aws s3 mb s3://sam-deploy-bucket-tokyo --region ap-northeast-1
```

### Frontend 빌드 실패

**원인**: 환경 변수 누락 또는 잘못된 값

**해결 방법**:
1. `.env` 파일에 모든 필수 환경 변수가 설정되었는지 확인
2. Backend 배포 후 CloudFormation Outputs에서 올바른 값 확인
3. 환경 변수 이름이 `VITE_` 접두사로 시작하는지 확인

### Lambda 함수 오류

**원인**: 코드 오류 또는 환경 변수 누락

**해결 방법**:
1. CloudWatch Logs에서 오류 확인
2. Lambda 함수 환경 변수 확인
3. 로컬에서 Lambda 함수 테스트:
   ```bash
   sam local invoke FateCalculatorFunction --event event.json
   ```

## 🔄 업데이트 배포

코드 변경 후 재배포:

### GitHub Actions 사용
```bash
git add .
git commit -m "기능 업데이트"
git push origin main
```

### 수동 재배포
```bash
cd aws/cloudformation
sam build
sam deploy --parameter-overrides \
  Environment=dev \
  FromEmailAddress=your-email@example.com \
  GeminiApiKey=your-gemini-api-key
```

Frontend만 업데이트:
```bash
npm run build
./deploy-frontend.sh dev
```

## 🗑️ 스택 삭제

전체 인프라를 삭제하려면:

```bash
aws cloudformation delete-stack \
  --stack-name fate-stack-dev \
  --region ap-northeast-1
```

**주의**: 스택 삭제 시 모든 데이터가 삭제됩니다. 필요시 백업을 수행하세요.

## 📝 참고

- AWS SAM CLI 문서: https://docs.aws.amazon.com/serverless-application-model/
- CloudFormation 문서: https://docs.aws.amazon.com/cloudformation/
- API Gateway 문서: https://docs.aws.amazon.com/apigateway/
