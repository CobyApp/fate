# 배포 및 서버 연결 가이드

이 문서는 AWS Lambda, API Gateway, DynamoDB를 사용한 서버 연결 및 배포 방법을 안내합니다.

## 📋 사전 준비사항

### 1. AWS 계정 및 CLI 설정

```bash
# AWS CLI 설치 (macOS)
brew install awscli

# AWS 자격 증명 설정
aws configure
# Access Key ID 입력
# Secret Access Key 입력
# Default region name: ap-northeast-1 (도쿄)
# Default output format: json
```

### 2. AWS SAM CLI 설치

```bash
# macOS
brew install aws-sam-cli

# 설치 확인
sam --version
```

## 🚀 AWS 인프라 배포

### 방법 1: SAM CLI 사용 (권장)

```bash
# 1. CloudFormation 디렉토리로 이동
cd aws/cloudformation

# 2. SAM 빌드
sam build

# 3. 배포 (첫 배포 시 --guided 옵션 사용)
sam deploy --guided

# 배포 시 질문에 답변:
# - Stack Name: fate-stack (또는 원하는 이름)
# - AWS Region: ap-northeast-1 (도쿄)
# - Parameter Environment: dev
# - Confirm changes before deploy: Y
# - Allow SAM CLI IAM role creation: Y
# - Disable rollback: N
# - Save arguments to configuration file: Y
```

배포가 완료되면 다음 값들이 출력됩니다:
- **ApiUrl**: API Gateway URL
- **UserPoolId**: Cognito User Pool ID
- **UserPoolClientId**: Cognito User Pool Client ID

이 값들을 복사하세요.

### 방법 2: CloudFormation 직접 배포

```bash
cd aws/cloudformation

aws cloudformation create-stack \
  --stack-name fate-stack \
  --template-body file://template.yaml \
  --capabilities CAPABILITY_IAM \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --region ap-northeast-1
```

배포 상태 확인:
```bash
aws cloudformation describe-stacks \
  --stack-name fate-stack \
  --region ap-northeast-1
```

## 🔗 프론트엔드 연결 설정

### 1. 환경 변수 파일 생성

프로젝트 루트에 `.env` 파일을 생성합니다:

```bash
# 프로젝트 루트에서
cp .env.example .env
```

### 2. 환경 변수 설정

`.env` 파일을 열고 배포 후 받은 값들을 입력합니다:

```env
# API Gateway URL
VITE_API_URL=https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/dev

# Cognito 설정
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=ap-northeast-1
```

**환경 변수 찾는 방법:**
- **VITE_API_URL**: SAM 배포 완료 시 출력된 `ApiUrl` 사용
- **VITE_COGNITO_USER_POOL_ID**: SAM 배포 완료 시 출력된 `UserPoolId` 사용
- **VITE_COGNITO_USER_POOL_CLIENT_ID**: SAM 배포 완료 시 출력된 `UserPoolClientId` 사용
- **VITE_AWS_REGION**: AWS 리전 (예: ap-northeast-1)

**API URL 찾는 방법:**
- SAM 배포 완료 시 출력된 `ApiUrl` 사용
- 또는 AWS 콘솔에서:
  1. API Gateway 콘솔 접속
  2. `fate-api-dev` API 선택
  3. Stages > dev 선택
  4. Invoke URL 복사

### 3. 개발 서버 실행

```bash
# 의존성 설치 (처음 한 번만)
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하여 테스트합니다.

## 🧪 API 테스트

### cURL로 테스트

```bash
# API URL을 환경 변수로 설정
export API_URL="https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev"

# 사주 계산 (POST)
curl -X POST $API_URL/fate \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "gender": "male"
  }'

# 사주 기록 조회 (GET)
curl -X GET $API_URL/fate

# 특정 기록 조회 (GET)
curl -X GET $API_URL/fate/{id}
```

## 📦 프로덕션 빌드

```bash
# 빌드
npm run build

# 빌드된 파일은 dist/ 디렉토리에 생성됩니다
# 이 파일들을 S3 + CloudFront 또는 다른 정적 호스팅 서비스에 배포하세요
```

## 🔄 업데이트 배포

Lambda 함수나 인프라를 수정한 경우:

```bash
cd aws/cloudformation

# 빌드
sam build

# 배포 (samconfig.toml이 있으면 자동으로 설정 사용)
sam deploy
```

## 🗑️ 리소스 삭제

```bash
cd aws/cloudformation

# SAM으로 배포한 경우
sam delete --stack-name fate-stack

# 또는 CloudFormation으로 직접 삭제
aws cloudformation delete-stack \
  --stack-name fate-stack \
  --region ap-northeast-1
```

## ⚠️ 문제 해결

### CORS 오류
- API Gateway의 CORS 설정 확인
- Lambda 함수의 응답 헤더에 CORS 헤더 포함 확인

### Lambda 함수 오류
- CloudWatch Logs에서 로그 확인:
  ```bash
  aws logs tail /aws/lambda/fate-calculator-dev --follow
  ```

### API Gateway 403 오류
- IAM 권한 확인
- API Gateway 리소스 정책 확인

### 환경 변수 불러오기 실패
- `.env` 파일이 프로젝트 루트에 있는지 확인
- Vite는 `VITE_` 접두사가 필요합니다 (이미 설정됨)
- 개발 서버 재시작

## 📚 참고 자료

- [AWS SAM 문서](https://docs.aws.amazon.com/serverless-application-model/)
- [API Gateway 문서](https://docs.aws.amazon.com/apigateway/)
- [Lambda 문서](https://docs.aws.amazon.com/lambda/)
- [DynamoDB 문서](https://docs.aws.amazon.com/dynamodb/)
