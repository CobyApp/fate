# GitHub Actions 자동 배포 설정 가이드

이 가이드는 GitHub Actions를 사용하여 커밋 시 자동으로 AWS에 배포하는 방법을 설명합니다.

## 📋 사전 준비

### 1. GitHub Secrets 설정

GitHub 저장소에서 **Settings > Secrets and variables > Actions**로 이동하여 다음 Secrets를 추가하세요:

#### 필수 Secrets

| Secret 이름 | 설명 | 예시 |
|------------|------|------|
| `AWS_ACCESS_KEY_ID` | AWS IAM 사용자의 Access Key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM 사용자의 Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `GEMINI_API_KEY` | Google Gemini API 키 | `AIzaSy...` |
| `FROM_EMAIL_ADDRESS` | SES에서 인증된 이메일 주소 | `doyoung@minami-hd.co.jp` |

#### Frontend 빌드용 Secrets

| Secret 이름 | 설명 | 설정 방법 |
|------------|------|----------|
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID | Backend 배포 후 CloudFormation Outputs에서 확인 |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | Cognito User Pool Client ID | Backend 배포 후 CloudFormation Outputs에서 확인 |
| `VITE_API_URL` | API Gateway URL (선택사항) | Backend 배포 후 자동으로 설정됨 |

> **참고**: `VITE_API_URL`은 Backend 배포 후 자동으로 가져오므로, 초기 설정 시에는 생략 가능합니다.

### 2. AWS IAM 사용자 설정

GitHub Actions에서 사용할 IAM 사용자를 생성하고 다음 권한을 부여하세요:

#### 최소 권한 정책 (권장)

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

#### 또는 기존 IAM 정책 사용

- `PowerUserAccess`: 대부분의 권한 포함 (권장)
- `AdministratorAccess`: 모든 권한 (테스트용)

### 3. CloudFormation Outputs 확인

Backend 배포가 완료되면 다음 명령어로 필요한 정보를 확인할 수 있습니다:

```bash
aws cloudformation describe-stacks \
  --stack-name fate-stack-dev \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs'
```

다음 Outputs가 필요합니다:
- `ApiUrl`: API Gateway URL
- `UserPoolId`: Cognito User Pool ID
- `UserPoolClientId`: Cognito User Pool Client ID
- `FrontendBucket`: S3 버킷 이름
- `FrontendDistributionId`: CloudFront Distribution ID
- `FrontendUrl`: CloudFront URL

## 🚀 사용 방법

### 자동 배포

1. **main** 또는 **master** 브랜치에 코드를 푸시하면 자동으로 배포가 시작됩니다.

```bash
git add .
git commit -m "배포 테스트"
git push origin main
```

2. GitHub 저장소의 **Actions** 탭에서 배포 진행 상황을 확인할 수 있습니다.

### 수동 배포

GitHub Actions 페이지에서 **"Deploy Application"** 워크플로우를 선택하고 **"Run workflow"** 버튼을 클릭하여 수동으로 배포할 수 있습니다.

## 📊 배포 프로세스

워크플로우는 다음 순서로 실행됩니다:

1. **deploy-backend** (Backend 배포)
   - AWS SAM CLI 설치
   - Lambda 함수 빌드
   - CloudFormation 스택 배포
   - API URL 추출

2. **deploy-frontend** (Frontend 배포)
   - Node.js 환경 설정
   - 프론트엔드 빌드
   - S3 버킷에 업로드
   - CloudFront 캐시 무효화

3. **notify** (배포 상태 요약)
   - 배포 성공/실패 상태 확인

## 🔧 문제 해결

### 배포 실패 시

#### 1. GitHub Actions 로그 확인

- GitHub 저장소의 **Actions** 탭에서 실패한 워크플로우 선택
- 각 단계의 로그를 확인하여 오류 원인 파악

#### 2. Secrets 확인

```bash
# Secrets가 올바르게 설정되었는지 확인
# GitHub 웹 인터페이스에서만 확인 가능
```

#### 3. IAM 권한 확인

AWS 콘솔에서 IAM 사용자의 권한을 확인하세요.

#### 4. CloudFormation 스택 상태 확인

```bash
aws cloudformation describe-stacks \
  --stack-name fate-stack-dev \
  --region ap-northeast-1 \
  --query 'Stacks[0].StackStatus'
```

### 자주 발생하는 오류

#### 1. "Access Denied" 오류

**원인**: IAM 사용자에게 필요한 권한이 없음

**해결**: IAM 사용자에 필요한 권한 추가

#### 2. "Stack is in UPDATE_IN_PROGRESS" 오류

**원인**: 이미 배포가 진행 중임

**해결**: 이전 배포가 완료될 때까지 대기

#### 3. "S3 Bucket does not exist" 오류

**원인**: SAM 배포용 S3 버킷이 없음

**해결**: 
```bash
aws s3 mb s3://sam-deploy-bucket-tokyo --region ap-northeast-1
```

#### 4. Frontend 빌드 실패

**원인**: 환경 변수가 누락되었거나 잘못 설정됨

**해결**: 
- `VITE_COGNITO_USER_POOL_ID` 확인
- `VITE_COGNITO_USER_POOL_CLIENT_ID` 확인
- `VITE_API_URL` 확인 (Backend 배포 후 자동 설정)

## 📝 환경 변수 설정

프론트엔드 빌드 시 다음 환경 변수가 설정됩니다:

- `VITE_COGNITO_USER_POOL_ID`: Cognito User Pool ID
- `VITE_COGNITO_USER_POOL_CLIENT_ID`: Cognito User Pool Client ID
- `VITE_API_URL`: API Gateway URL (Backend 배포 후 자동 설정)
- `VITE_AWS_REGION`: AWS 리전 (기본값: `ap-northeast-1`)

## 🔐 보안 권장사항

1. **Secrets 관리**: 민감한 정보는 절대 코드에 커밋하지 마세요
2. **IAM 권한**: 필요한 최소 권한만 부여하세요
3. **API 키**: API 키는 GitHub Secrets로 관리하세요
4. **배포 브랜치**: 배포는 `main` 또는 `master` 브랜치에서만 자동 실행됩니다

## 📚 추가 자료

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [AWS SAM CLI 문서](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [AWS CloudFormation 문서](https://docs.aws.amazon.com/cloudformation/)

## 🆘 지원

문제가 발생하면 다음을 확인하세요:

1. GitHub Actions 로그
2. CloudFormation 스택 이벤트
3. Lambda 함수 로그 (CloudWatch)
4. 이 문서의 문제 해결 섹션
