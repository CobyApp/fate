# GitHub Actions 배포 가이드

이 디렉토리에는 자동 배포를 위한 GitHub Actions 워크플로우가 포함되어 있습니다.

## 설정 방법

### 1. GitHub Secrets 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 Secrets를 추가해야 합니다:

#### 필수 Secrets:

- **`AWS_ACCESS_KEY_ID`**: AWS IAM 사용자의 Access Key ID
- **`AWS_SECRET_ACCESS_KEY`**: AWS IAM 사용자의 Secret Access Key
- **`GEMINI_API_KEY`**: Google Gemini API 키
- **`FROM_EMAIL_ADDRESS`**: SES에서 인증된 이메일 주소 (예: doyoung@minami-hd.co.jp)

#### Frontend 빌드를 위한 Secrets:

- **`VITE_COGNITO_USER_POOL_ID`**: Cognito User Pool ID
- **`VITE_COGNITO_USER_POOL_CLIENT_ID`**: Cognito User Pool Client ID
- **`VITE_API_URL`**: API Gateway URL (Backend 배포 후 자동으로 설정됨)
- **`VITE_AWS_REGION`**: AWS 리전 (기본값: ap-northeast-1)

### 2. IAM 사용자 권한

GitHub Actions에서 사용할 IAM 사용자는 다음 권한이 필요합니다:

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
        "iam:*",
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

또는 더 안전하게 특정 리소스에만 권한을 부여할 수 있습니다.

### 3. 워크플로우 동작

워크플로우는 다음과 같이 동작합니다:

1. **코드 푸시 시 자동 트리거**: `main` 또는 `master` 브랜치에 푸시하면 자동으로 배포가 시작됩니다.
2. **수동 실행**: GitHub Actions 페이지에서 "Run workflow" 버튼을 클릭하여 수동으로도 실행할 수 있습니다.

### 4. 배포 프로세스

#### Backend 배포 (deploy-backend):
- AWS SAM CLI를 사용하여 Lambda 함수와 API Gateway 배포
- CloudFormation 스택 업데이트
- 스택 출력값을 다음 Job으로 전달

#### Frontend 배포 (deploy-frontend):
- Backend 배포 완료 후 자동 실행
- React 앱 빌드
- S3 버킷에 업로드
- CloudFront 캐시 무효화

### 5. 환경 변수 설정

`.env` 파일은 GitHub Actions에서 직접 사용되지 않습니다. 대신 Secrets를 사용하여 환경 변수를 설정합니다.

프론트엔드 빌드 시 다음 환경 변수가 설정됩니다:
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_USER_POOL_CLIENT_ID`
- `VITE_API_URL` (Backend 배포 후 자동 설정)
- `VITE_AWS_REGION`

### 6. 문제 해결

#### 배포 실패 시:

1. **GitHub Actions 로그 확인**: Actions 탭에서 실패한 워크플로우의 로그를 확인하세요.
2. **Secrets 확인**: 모든 필수 Secrets가 올바르게 설정되었는지 확인하세요.
3. **IAM 권한 확인**: IAM 사용자에게 필요한 권한이 모두 있는지 확인하세요.
4. **로컬 테스트**: `sam build`와 `sam deploy`를 로컬에서 먼저 테스트해보세요.

#### Frontend 빌드 실패 시:

- Secrets에 `VITE_*` 변수가 올바르게 설정되어 있는지 확인
- 로컬에서 `npm run build`가 성공하는지 확인

#### CloudFormation 스택 오류 시:

- AWS 콘솔에서 CloudFormation 스택 상태 확인
- 스택 이벤트에서 오류 원인 확인

### 7. 배포 상태 확인

배포 완료 후 다음을 확인할 수 있습니다:

- **Backend**: API Gateway URL이 출력됩니다
- **Frontend**: CloudFront URL이 출력됩니다

GitHub Actions 페이지에서 워크플로우 실행 상태와 로그를 확인할 수 있습니다.
