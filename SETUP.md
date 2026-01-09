# 초기 설정 가이드

이 문서는 Fate 애플리케이션의 초기 설정 및 AWS 인프라 구성을 설명합니다.

## 📋 사전 준비

### 1. AWS 계정 준비

- AWS 계정이 있어야 합니다
- AWS CLI가 설치되어 있어야 합니다
- IAM 사용자가 생성되어 있어야 합니다

### 2. AWS CLI 설정

```bash
# AWS CLI 설치 확인
aws --version

# AWS 자격 증명 설정
aws configure

# 입력 항목:
# - AWS Access Key ID: IAM 사용자의 Access Key ID
# - AWS Secret Access Key: IAM 사용자의 Secret Access Key
# - Default region name: ap-northeast-1
# - Default output format: json
```

### 3. AWS SAM CLI 설치

```bash
# macOS (Homebrew)
brew install aws-sam-cli

# 또는 pip 사용
pip install aws-sam-cli

# 설치 확인
sam --version
```

### 4. Node.js 설치

Node.js 18 이상이 필요합니다:

```bash
# 버전 확인
node --version

# npm 확인
npm --version
```

## 🔐 IAM 사용자 설정

### 1. IAM 사용자 생성

1. AWS 콘솔 > IAM > 사용자
2. **사용자 만들기** 클릭
3. 사용자 이름 입력 (예: `fate-deploy-user`)
4. **다음** 클릭

### 2. 권한 부여

**옵션 1: PowerUserAccess (권장, 테스트용)**

1. **기존 정책 직접 연결** 선택
2. `PowerUserAccess` 검색 및 선택
3. **다음** 클릭

**옵션 2: 최소 권한 (프로덕션용)**

다음 권한을 가진 정책 생성:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:GetRole",
        "iam:PassRole",
        "cloudfront:*",
        "logs:*",
        "dynamodb:*",
        "cognito-idp:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. Access Key 생성

1. 생성한 IAM 사용자 선택
2. **보안 자격 증명** 탭 클릭
3. **액세스 키 만들기** 클릭
4. **Command Line Interface (CLI)** 선택
5. **다음** 클릭
6. Access Key ID와 Secret Access Key를 **즉시 복사** (다시 볼 수 없음)

### 4. AWS CLI에 자격 증명 설정

```bash
aws configure
```

생성한 Access Key ID와 Secret Access Key를 입력하세요.

## 📧 SES (Simple Email Service) 설정

### 1. SES 콘솔 접속

AWS 콘솔 > SES > 이메일 주소

### 2. 이메일 주소 인증 (Sandbox 모드)

1. **이메일 주소 생성** 클릭
2. 이메일 주소 입력 (예: `doyoung@minami-hd.co.jp`)
3. **이메일 주소 생성** 클릭
4. 등록한 이메일 주소로 인증 이메일 확인
5. 이메일의 인증 링크 클릭

**참고**: Sandbox 모드에서는 인증된 이메일 주소로만 이메일을 보낼 수 있습니다.

### 3. 프로덕션 액세스 요청 (선택사항)

프로덕션 환경에서 모든 이메일 주소로 보내려면:

1. SES 콘솔 > **계정 대시보드**
2. **프로덕션 액세스 요청** 클릭
3. 사용 사례 작성 후 제출

## 🤖 Google Gemini API 키 발급

### 1. Google AI Studio 접속

https://makersuite.google.com/app/apikey

### 2. API 키 생성

1. **API 키 만들기** 클릭
2. 새 API 키 생성
3. 생성된 API 키 복사

**중요**: API 키는 안전하게 보관하세요. GitHub Secrets에 저장하거나 환경 변수로 관리하세요.

## 📦 SAM 배포용 S3 버킷 생성

SAM 배포 시 Lambda 함수 코드를 업로드할 S3 버킷이 필요합니다:

```bash
aws s3 mb s3://sam-deploy-bucket-tokyo --region ap-northeast-1
```

**참고**: 버킷 이름은 전역적으로 고유해야 합니다. 원하는 이름으로 변경 가능합니다.

## 🎯 환경 변수 설정

### 로컬 개발용 `.env` 파일

프로젝트 루트에 `.env` 파일 생성:

```env
# AWS Cognito 설정 (배포 후 설정)
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=ap-northeast-1

# API Gateway URL (배포 후 설정)
VITE_API_URL=https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev
```

**중요**: `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

### GitHub Secrets (자동 배포용)

GitHub 저장소의 **Settings > Secrets and variables > Actions**에서 설정:

**필수 Secrets:**
- `AWS_ACCESS_KEY_ID` - IAM 사용자의 Access Key ID
- `AWS_SECRET_ACCESS_KEY` - IAM 사용자의 Secret Access Key
- `GEMINI_API_KEY` - Google Gemini API 키
- `FROM_EMAIL_ADDRESS` - SES 인증된 이메일 주소

**배포 후 추가할 Secrets:**
- `VITE_COGNITO_USER_POOL_ID` - Backend 배포 후 CloudFormation Outputs에서 확인
- `VITE_COGNITO_USER_POOL_CLIENT_ID` - Backend 배포 후 CloudFormation Outputs에서 확인

## ✅ 설정 확인

### 1. AWS 자격 증명 확인

```bash
aws sts get-caller-identity
```

성공적으로 실행되면 현재 AWS 계정 정보가 표시됩니다.

### 2. SAM CLI 확인

```bash
sam --version
```

### 3. Node.js 및 npm 확인

```bash
node --version
npm --version
```

### 4. 프로젝트 의존성 설치

```bash
npm install
```

## 🚀 첫 배포

모든 설정이 완료되면 첫 배포를 진행하세요:

```bash
cd aws/cloudformation
sam build
sam deploy --parameter-overrides \
  Environment=dev \
  FromEmailAddress=your-email@example.com \
  GeminiApiKey=your-gemini-api-key \
  --region ap-northeast-1
```

배포 완료 후 CloudFormation Outputs에서 필요한 정보를 확인하고 `.env` 파일을 업데이트하세요.

자세한 배포 방법은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

## 🔍 문제 해결

### AWS CLI 설정 오류

```bash
# 자격 증명 파일 확인
cat ~/.aws/credentials

# 설정 파일 확인
cat ~/.aws/config

# 자격 증명 재설정
aws configure
```

### SES 이메일 인증 실패

- 이메일의 스팸 폴더 확인
- SES 콘솔에서 이메일 주소 상태 확인
- 인증 링크 만료 확인 (24시간 내)

### SAM 배포 버킷 오류

```bash
# 버킷 존재 확인
aws s3 ls | grep sam-deploy

# 버킷 생성
aws s3 mb s3://sam-deploy-bucket-tokyo --region ap-northeast-1

# 버킷 버전 관리 활성화 (선택사항)
aws s3api put-bucket-versioning \
  --bucket sam-deploy-bucket-tokyo \
  --versioning-configuration Status=Enabled
```

## 📚 추가 리소스

- [AWS IAM 문서](https://docs.aws.amazon.com/iam/)
- [AWS SES 문서](https://docs.aws.amazon.com/ses/)
- [AWS SAM CLI 문서](https://docs.aws.amazon.com/serverless-application-model/)
- [Google Gemini API 문서](https://ai.google.dev/docs)
