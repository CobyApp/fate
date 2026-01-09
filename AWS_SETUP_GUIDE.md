# AWS 설정 완벽 가이드

이 문서는 AWS에서 Cognito, DynamoDB, Lambda, API Gateway를 설정하는 **단계별 자세한 가이드**입니다.

## 📋 목차

1. [사전 준비사항](#사전-준비사항)
2. [AWS 인프라 배포 (자동)](#aws-인프라-배포-자동)
3. [AWS 콘솔에서 확인 및 수동 설정](#aws-콘솔에서-확인-및-수동-설정)
4. [환경 변수 설정](#환경-변수-설정)
5. [테스트 및 검증](#테스트-및-검증)
6. [문제 해결](#문제-해결)

---

## 사전 준비사항

### 1. AWS 계정 생성 및 준비

1. [AWS 콘솔](https://aws.amazon.com/console/)에 로그인
2. **리전 선택**: 오른쪽 상단에서 `ap-northeast-1 (도쿄)` 선택
3. **결제 정보 확인**: 모든 서비스가 사용료가 발생할 수 있으므로 결제 정보 확인

### 2. AWS CLI 설치 및 설정

#### macOS
```bash
# Homebrew로 설치
brew install awscli

# 버전 확인
aws --version
```

#### Windows
```bash
# PowerShell에서 실행
# MSI 설치 프로그램 다운로드
# https://awscli.amazonaws.com/AWSCLIV2.msi
```

#### 설정
```bash
# AWS 자격 증명 설정
aws configure

# 다음 정보 입력:
# AWS Access Key ID: [IAM에서 생성한 Access Key]
# AWS Secret Access Key: [IAM에서 생성한 Secret Key]
# Default region name: ap-northeast-1
# Default output format: json
```

**Access Key 생성 방법:**
1. AWS 콘솔 → IAM (Identity and Access Management)
2. 좌측 메뉴 → "사용자" → 본인 사용자 선택
3. "보안 자격 증명" 탭
4. "액세스 키 만들기" 클릭
5. Access Key ID와 Secret Access Key를 **안전하게 저장** (다시 볼 수 없음)

### 3. AWS SAM CLI 설치

#### macOS
```bash
brew install aws-sam-cli

# 버전 확인
sam --version
```

#### Windows
```bash
# PowerShell에서 실행
# Chocolatey 사용
choco install aws-sam-cli

# 또는 직접 설치
# https://github.com/aws/aws-sam-cli/releases
```

### 4. IAM 권한 설정 (중요!)

SAM CLI로 배포하려면 IAM 사용자에게 다음 권한이 필요합니다.

#### AWS 콘솔에서 IAM 권한 설정

1. **AWS 콘솔** → **IAM** → **사용자** → 본인 사용자 선택 (예: `coby5502`)
2. **권한 추가** 버튼 클릭
3. 두 가지 방법 중 선택:

#### 방법 1: 관리형 정책 추가 (간단)

**권장 정책:**
- `PowerUserAccess` - 대부분의 AWS 서비스에 대한 전체 액세스 (일부 관리 작업 제외)
- 또는 `AdministratorAccess` - 모든 AWS 서비스 및 리소스에 대한 전체 액세스

**주의**: `AdministratorAccess`는 모든 권한을 부여하므로 보안상 주의가 필요합니다.

**추가 방법:**
1. "권한 추가" → "정책 직접 연결" 탭
2. 검색창에 `PowerUserAccess` 또는 `AdministratorAccess` 입력
3. 체크박스 선택 → "다음" → "권한 추가"

#### 방법 2: 필요한 권한만 정책 생성 (세밀한 제어)

SAM CLI에 필요한 최소 권한만 부여하려면:

1. **IAM** → **정책** → **정책 생성**
2. **JSON** 탭에서 다음 정책 붙여넣기:

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
        "dynamodb:*",
        "cognito-idp:*",
        "cognito-identity:*",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PassRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRolePolicy",
        "iam:ListRolePolicies",
        "iam:ListAttachedRolePolicies",
        "iam:TagRole",
        "iam:UntagRole",
        "logs:*",
        "events:*",
        "application-autoscaling:*",
        "cloudwatch:*"
      ],
      "Resource": "*"
    }
  ]
}
```

3. 정책 이름: `SAMDeployPolicy` (또는 원하는 이름)
4. **정책 생성** 클릭
5. 사용자에게 정책 연결:
   - **IAM** → **사용자** → 본인 사용자 선택
   - **권한 추가** → **정책 직접 연결** 탭
   - 방금 생성한 `SAMDeployPolicy` 선택 → **권한 추가**

#### 권한 적용 확인

권한이 적용되기까지 몇 초 걸릴 수 있습니다. 다음 명령어로 확인:

```bash
# AWS CLI로 권한 확인
aws sts get-caller-identity

# SAM 배포 테스트 (실제 배포는 하지 않음)
sam validate --template template.yaml
```

#### 문제 해결: AccessDenied 오류

**오류 메시지:**
```
Error: Failed to create managed resources: An error occurred (AccessDenied) 
when calling the CreateChangeSet operation: User: arn:aws:iam::... is not 
authorized to perform: cloudformation:CreateChangeSet
```

**해결 방법:**
1. 위의 IAM 권한 설정 단계를 완료했는지 확인
2. 권한 변경 후 몇 분 기다린 후 다시 시도
3. AWS 콘솔에서 로그아웃 후 다시 로그인
4. 로컬의 AWS 자격 증명 확인:
   ```bash
   aws configure list
   ```
5. 올바른 Access Key를 사용하고 있는지 확인

---

## AWS 인프라 배포 (자동)

CloudFormation 템플릿이 자동으로 다음을 생성합니다:
- ✅ Cognito User Pool
- ✅ Cognito User Pool Client
- ✅ Cognito Identity Pool
- ✅ DynamoDB 테이블
- ✅ API Gateway
- ✅ Lambda 함수 2개 (사주 계산, 기록 조회)

### 단계 1: 프로젝트 디렉토리 이동

```bash
cd /Users/doyoung_kim/Documents/Git/fate/aws/cloudformation
```

### 단계 2: SAM 빌드

```bash
sam build
```

이 명령은:
- Lambda 함수 코드를 패키징
- 의존성 설치 (node_modules)
- CloudFormation 템플릿 검증

**예상 출력:**
```
Building codeuri: ../lambda/fate-calculator runtime: nodejs18.x metadata: {} architecture: x86_64 functions: ['FateCalculatorFunction']
Building codeuri: ../lambda/get-fate-history runtime: nodejs18.x metadata: {} architecture: x86_64 functions: ['GetFateHistoryFunction']

Build Succeeded
```

### 단계 3: SAM 배포 (첫 배포)

```bash
sam deploy --guided
```

**질문에 답변:**

1. **Stack Name [fate-stack]**: 
   - 기본값 그대로 Enter 또는 원하는 이름 입력
   - 예: `fate-stack-dev`

2. **AWS Region [ap-northeast-1]**:
   - `ap-northeast-1` 입력 (도쿄 리전)

3. **Parameter Environment [dev]**:
   - `dev` 입력 (개발 환경)
   
4. **#Shows you resources changes to be deployed and require a 'Y' to initiate deploy**:
   - `Y` 입력

5. **#SAM needs permission to be able to create roles to connect to the resources in your template**:
   - `Y` 입력 (IAM 역할 자동 생성 허용)

6. **#Preserves the state of previously provisioned resources when an operation fails**:
   - `N` 입력 (오류 시 롤백 허용)

7. **#Save arguments to configuration file [samconfig.toml]**:
   - `Y` 입력 (다음 배포 시 자동으로 설정 사용)

**배포 시간**: 약 5-10분 소요

### 단계 4: 배포 완료 확인

배포가 완료되면 다음과 같은 출력이 나타납니다:

```
Successfully created/updated stack - fate-stack in ap-northeast-1

Outputs:
--------------------------------------------------------------------------------
ApiUrl = https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/dev
TableName = fate-dev
UserPoolClientId = 1a2b3c4d5e6f7g8h9i0j
UserPoolId = ap-northeast-1_ABC123XYZ
--------------------------------------------------------------------------------
```

**⚠️ 중요: 이 값들을 반드시 복사해서 저장하세요!**

---

## AWS 콘솔에서 확인 및 수동 설정

### 1. Cognito User Pool 확인

1. AWS 콘솔 → **Cognito** → **User pools**
2. `fate-user-pool-dev` 선택
3. 확인 사항:
   - ✅ User Pool ID 확인 (예: `ap-northeast-1_ABC123XYZ`)
   - ✅ "App integration" 탭 → App client 목록에서 Client ID 확인
   - ✅ "Sign-up experience" 탭 → 이메일 인증 활성화 확인

#### 이메일 인증 설정 (중요!)

**⚠️ 기본 설정으로는 실제 이메일을 받을 수 없습니다!**

실제로 이메일 인증 코드를 받으려면 **SES (Simple Email Service)** 설정이 필요합니다.

**빠른 설정 (SES Sandbox 모드 - 개발/테스트용):**

1. **SES에서 이메일 주소 인증**:
   - AWS 콘솔 접속 → 검색창에 "SES" 입력 → **Amazon SES** 선택
   - 왼쪽 메뉴 **Configuration** → **Verified identities** 클릭
   - 오른쪽 상단 **Create identity** 버튼 클릭
   - **Email address** 선택 → 자신의 이메일 주소 입력
   - **Create identity** 클릭 → 이메일로 전송된 인증 링크 클릭

2. **Cognito User Pool에 SES 연결**:
   - AWS 콘솔 → **Amazon Cognito** → **User pools** → `fate-user-pool-dev` 선택
   - 왼쪽 메뉴 **Messaging** 탭 클릭
   - **Email** 섹션에서:
     - **Email provider**: `Amazon SES` 선택 (드롭다운)
     - **Source (FROM) email address**: SES에서 인증한 이메일 선택
     - **Save changes** 버튼 클릭

3. **테스트**:
   - 애플리케이션에서 **인증한 이메일 주소**로 회원가입
   - 이메일 확인 (스팸 폴더도 확인) → 인증 코드 입력

**⚠️ Sandbox 모드 제한사항**:
- SES Sandbox 모드에서는 **인증한 이메일 주소로만** 이메일 전송 가능
- 예: `your-email@example.com`을 인증했다면, `your-email@example.com`으로만 회원가입 가능

**프로덕션 환경 (모든 이메일 주소 허용)**:
1. **SES Production Access 요청**:
   - SES → Account dashboard → Request production access
   - 승인 대기 (보통 24시간 이내)

2. **도메인 인증** (선택사항, 권장):
   - SES → Verified identities → Create identity → Domain
   - DNS 레코드 설정

**상세한 설정 가이드**: `EMAIL_VERIFICATION_SETUP.md` 파일 참조

**개발 중 빠른 테스트 (이메일 없이)**:
- Cognito 콘솔 → User pools → `fate-user-pool-dev` → Users
- 사용자 선택 → **Actions** → **Confirm user**
- 이메일 인증 없이 직접 인증 완료

#### 콜백 URL 설정 (필요시)

웹 애플리케이션 배포 후:
1. User Pool → "App integration" 탭
2. App client 선택
3. "Hosted UI" 섹션에서:
   - Callback URLs: `https://your-domain.com`
   - Sign-out URLs: `https://your-domain.com`

### 2. DynamoDB 테이블 확인

1. AWS 콘솔 → **DynamoDB** → **Tables**
2. `fate-dev` 테이블 확인:
   - ✅ 테이블 이름: `fate-dev`
   - ✅ 파티션 키: `id` (String)
   - ✅ 청구 모드: On-demand (PAY_PER_REQUEST)
   - ✅ 스트림 활성화 확인

#### 테이블 구조 확인

```json
{
  "id": "string (Partition Key)",
  "birthDate": "string",
  "birthTime": "string",
  "gender": "string",
  "result": {
    "year": "number",
    "month": "number",
    "day": "number",
    "gender": "string",
    "fortune": "string",
    "description": "string",
    "elements": {
      "wood": "number",
      "fire": "number",
      "earth": "number",
      "metal": "number",
      "water": "number"
    }
  },
  "createdAt": "string (ISO 8601)"
}
```

### 3. Lambda 함수 확인

1. AWS 콘솔 → **Lambda**
2. 다음 함수들이 생성되었는지 확인:
   - `fate-calculator-dev`
   - `get-fate-history-dev`

#### Lambda 함수 환경 변수 확인

각 Lambda 함수 → "Configuration" 탭 → "Environment variables":
- ✅ `FATE_TABLE_NAME`: `fate-dev`

#### Lambda 함수 권한 확인

각 Lambda 함수 → "Configuration" 탭 → "Permissions":
- ✅ DynamoDB 테이블에 대한 읽기/쓰기 권한 자동 설정되어 있음

#### Lambda 함수 로그 확인

각 Lambda 함수 → "Monitor" 탭 → "CloudWatch Logs":
- 로그 그룹 이름: `/aws/lambda/fate-calculator-dev`
- 또는 `/aws/lambda/get-fate-history-dev`

### 4. API Gateway 확인

1. AWS 콘솔 → **API Gateway**
2. `fate-api-dev` API 확인
3. "Resources" 탭에서 엔드포인트 확인:
   - `POST /fate` → `fate-calculator-dev` Lambda 함수 연결
   - `GET /fate` → `get-fate-history-dev` Lambda 함수 연결
   - `GET /fate/{id}` → `get-fate-history-dev` Lambda 함수 연결

#### CORS 설정 확인

1. API Gateway → `fate-api-dev` → "Actions" → "Enable CORS"
2. 다음 설정 확인:
   - Access-Control-Allow-Origin: `*`
   - Access-Control-Allow-Methods: `GET, POST, OPTIONS`
   - Access-Control-Allow-Headers: `Content-Type, Authorization`

#### API 배포 확인

1. "Stages" 탭 → `dev` 스테이지 선택
2. "Invoke URL" 확인:
   - 예: `https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/dev`
   - 이 URL이 `.env` 파일의 `VITE_API_URL`과 일치하는지 확인

---

## 환경 변수 설정

### 1. `.env` 파일 생성

프로젝트 루트에 `.env` 파일 생성:

```bash
cd /Users/doyoung_kim/Documents/Git/fate
touch .env
```

### 2. 환경 변수 입력

`.env` 파일을 열고 다음 내용 입력:

```env
# API Gateway URL (SAM 배포 완료 시 출력된 ApiUrl)
VITE_API_URL=https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/dev

# Cognito User Pool ID (SAM 배포 완료 시 출력된 UserPoolId)
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_ABC123XYZ

# Cognito User Pool Client ID (SAM 배포 완료 시 출력된 UserPoolClientId)
VITE_COGNITO_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j

# AWS 리전
VITE_AWS_REGION=ap-northeast-1
```

### 3. 환경 변수 확인 방법 (다시 찾아야 하는 경우)

#### CloudFormation 출력에서 확인

```bash
aws cloudformation describe-stacks \
  --stack-name fate-stack \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs' \
  --output table
```

#### AWS 콘솔에서 확인

1. **API Gateway URL**:
   - API Gateway 콘솔 → `fate-api-dev` → Stages → `dev` → Invoke URL

2. **Cognito User Pool ID**:
   - Cognito 콘솔 → User pools → `fate-user-pool-dev` → Pool ID

3. **Cognito User Pool Client ID**:
   - Cognito 콘솔 → User pools → `fate-user-pool-dev` → App integration → App clients → Client ID

---

## 테스트 및 검증

### 1. Cognito 사용자 생성 및 인증 테스트

#### AWS 콘솔에서 사용자 생성

1. Cognito 콘솔 → User pools → `fate-user-pool-dev`
2. "Users" 탭 → "Create user"
3. 정보 입력:
   - Username: 테스트 이메일 주소 (예: `test@example.com`)
   - Email: 테스트 이메일 주소
   - Temporary password: 임시 비밀번호 입력
   - ✅ "Mark email address as verified" 체크
   - ✅ "Send an invitation to the new user?" 체크 해제

4. 생성 후 사용자 상태 확인:
   - 상태가 "CONFIRMED"인지 확인
   - 아니면 사용자 선택 → "Actions" → "Confirm user"

#### 프론트엔드에서 로그인 테스트

```bash
# 개발 서버 실행
npm install
npm run dev
```

1. 브라우저에서 `http://localhost:5173` 접속
2. "회원가입" 클릭
3. 이메일과 비밀번호로 회원가입
4. 이메일에서 인증 코드 확인 (또는 Cognito 콘솔에서 직접 인증)
5. 로그인 테스트

### 2. API 엔드포인트 테스트

#### cURL로 테스트

```bash
# API URL을 환경 변수로 설정
export API_URL="https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/dev"

# 1. 사주 계산 (POST)
curl -X POST $API_URL/fate \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "gender": "male"
  }'

# 예상 응답:
# {
#   "success": true,
#   "data": {
#     "year": 1990,
#     "month": 1,
#     "day": 1,
#     "gender": "male",
#     "fortune": "...",
#     "description": "...",
#     "elements": { ... }
#   },
#   "id": "1234567890-abcdefgh"
# }

# 2. 사주 기록 조회 (GET)
curl -X GET $API_URL/fate

# 예상 응답:
# {
#   "success": true,
#   "data": [
#     { "id": "...", "birthDate": "...", ... },
#     ...
#   ]
# }

# 3. 특정 기록 조회 (GET)
curl -X GET $API_URL/fate/{id}

# 예상 응답:
# {
#   "success": true,
#   "data": { "id": "...", "birthDate": "...", ... }
# }
```

#### Postman으로 테스트

1. Postman 설치
2. 새 Request 생성:
   - Method: `POST`
   - URL: `https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/dev/fate`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "birthDate": "1990-01-01",
       "birthTime": "12:00",
       "gender": "male"
     }
     ```
3. "Send" 클릭

### 3. DynamoDB 데이터 확인

1. DynamoDB 콘솔 → Tables → `fate-dev`
2. "Explore table items" 클릭
3. API를 통해 저장된 데이터 확인

### 4. Lambda 함수 로그 확인

#### CloudWatch Logs에서 확인

1. AWS 콘솔 → CloudWatch → Logs → Log groups
2. `/aws/lambda/fate-calculator-dev` 선택
3. 최근 로그 스트림 확인

#### CLI로 확인

```bash
# 최근 로그 확인
aws logs tail /aws/lambda/fate-calculator-dev --follow

# 특정 시간대 로그 확인
aws logs tail /aws/lambda/fate-calculator-dev \
  --since 1h \
  --format short
```

---

## 문제 해결

### 1. 배포 오류

#### "AccessDenied" - CloudFormation 권한 없음

**오류 메시지:**
```
Error: Failed to create managed resources: An error occurred (AccessDenied) 
when calling the CreateChangeSet operation: User: arn:aws:iam::... is not 
authorized to perform: cloudformation:CreateChangeSet
```

**해결 방법:**

1. **IAM 권한 확인 및 추가**
   - AWS 콘솔 → IAM → 사용자 → 본인 사용자 선택
   - "권한 추가" → 정책 직접 연결
   - `PowerUserAccess` 또는 `AdministratorAccess` 정책 연결
   - 또는 위의 "IAM 권한 설정" 섹션에서 최소 권한 정책 생성

2. **권한 적용 대기**
   - 권한 변경 후 1-2분 대기
   - AWS 콘솔에서 로그아웃 후 다시 로그인

3. **자격 증명 확인**
   ```bash
   # 현재 사용하는 AWS 자격 증명 확인
   aws sts get-caller-identity
   
   # 올바른 Access Key를 사용하고 있는지 확인
   aws configure list
   ```

4. **SAM 배포 재시도**
   ```bash
   cd aws/cloudformation
   sam deploy --guided
   ```

#### "Stack creation failed"

```bash
# 스택 이벤트 확인
aws cloudformation describe-stack-events \
  --stack-name fate-stack \
  --region ap-northeast-1 \
  --max-items 10 \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]' \
  --output table
```

**일반적인 원인:**
- IAM 권한 부족 → IAM 사용자에 `AdministratorAccess` 또는 필요한 권한 추가 (위 섹션 참조)
- 리소스 이름 충돌 → 다른 스택 이름 사용
- 리전 문제 → `ap-northeast-1` 리전 확인

### 2. Cognito 오류

#### "User pool not found"

- ✅ `.env` 파일의 `VITE_COGNITO_USER_POOL_ID` 확인
- ✅ User Pool이 올바른 리전에 있는지 확인
- ✅ 브라우저 캐시 지우기

#### "Invalid client ID"

- ✅ `.env` 파일의 `VITE_COGNITO_USER_POOL_CLIENT_ID` 확인
- ✅ Client ID가 User Pool과 연결되어 있는지 확인

#### "User does not exist" 또는 로그인 실패

- ✅ Cognito 콘솔에서 사용자 상태 확인
- ✅ 사용자 상태가 "CONFIRMED"인지 확인
- ✅ 이메일 인증 완료 여부 확인

#### 이메일 인증 코드를 받지 못함

**개발 환경 해결책:**
1. Cognito 콘솔 → User pools → `fate-user-pool-dev` → Users
2. 사용자 선택 → "Actions" → "Confirm user"
3. 또는 임시 비밀번호로 로그인 후 비밀번호 변경

**프로덕션 환경:**
- AWS SES 설정 필요 (이메일 전송 서비스)

### 3. API Gateway 오류

#### CORS 오류

```
Access to XMLHttpRequest at 'https://...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**해결책:**
1. API Gateway 콘솔 → `fate-api-dev` → Actions → Enable CORS
2. Lambda 함수 응답에 CORS 헤더 포함 확인 (이미 포함되어 있음)

#### 403 Forbidden 오류

- ✅ API Gateway 리소스 정책 확인
- ✅ Lambda 함수 권한 확인
- ✅ API Gateway 스테이지 배포 확인

#### 502 Bad Gateway 오류

- ✅ Lambda 함수 로그 확인 (CloudWatch Logs)
- ✅ Lambda 함수 타임아웃 설정 확인 (기본 3초, 필요시 증가)

### 4. DynamoDB 오류

#### "Table not found"

- ✅ 테이블 이름 확인: `fate-dev`
- ✅ 리전 확인: `ap-northeast-1`
- ✅ Lambda 함수 환경 변수 `FATE_TABLE_NAME` 확인

#### "Access denied"

- ✅ Lambda 함수 IAM 역할에 DynamoDB 권한 확인
- ✅ CloudFormation 템플릿에서 `DynamoDBCrudPolicy` 확인

### 5. 환경 변수 오류

#### "VITE_* 변수를 찾을 수 없음"

- ✅ `.env` 파일이 프로젝트 루트에 있는지 확인
- ✅ 변수명에 `VITE_` 접두사가 있는지 확인
- ✅ 개발 서버 재시작: `npm run dev`

#### "API URL이 undefined"

- ✅ `.env` 파일 형식 확인 (공백, 따옴표 없이)
- ✅ 브라우저 개발자 도구에서 `console.log(import.meta.env)` 확인

---

## 추가 설정 (선택사항)

### 1. 사용자별 데이터 분리

현재 DynamoDB 테이블에 사용자 정보를 저장하지 않고 있습니다. 사용자별로 데이터를 분리하려면:

1. DynamoDB 테이블 구조 변경:
   - 파티션 키: `userId` (String)
   - 정렬 키: `id` (String)

2. Lambda 함수 수정:
   - JWT 토큰에서 `userId` 추출
   - DynamoDB 쿼리 시 `userId` 필터 추가

3. CloudFormation 템플릿 업데이트:
   - DynamoDB 테이블 스키마 변경
   - Lambda 함수 코드 업데이트

### 2. API 인증 추가

현재 API는 인증 없이 접근 가능합니다. Cognito JWT 토큰 검증을 추가하려면:

1. API Gateway에 Cognito Authorizer 추가
2. Lambda 함수에서 JWT 토큰 검증
3. 인증되지 않은 요청 거부

### 3. 도메인 연결

프로덕션 환경에서:
1. Route 53 또는 다른 DNS 서비스에서 도메인 설정
2. API Gateway에 Custom Domain 추가
3. SSL/TLS 인증서 (ACM) 설정

---

## 비용 예상

### 무료 티어 (첫 12개월)

- **Lambda**: 월 100만 요청 무료
- **DynamoDB**: 월 25GB 스토리지 + 200만 요청 무료
- **API Gateway**: 월 100만 API 호출 무료
- **Cognito**: 월 5만 MAU (월간 활성 사용자) 무료

### 비용 예상 (무료 티어 이후)

- **Lambda**: $0.20 per 1M requests
- **DynamoDB**: On-demand 요금 (사용한 만큼만 지불)
- **API Gateway**: $3.50 per 1M requests
- **Cognito**: $0.0055 per MAU

**예상 월 비용 (소규모 앱)**:
- Lambda: ~$0 (무료 티어 내)
- DynamoDB: ~$0-1 (데이터 적음)
- API Gateway: ~$0 (무료 티어 내)
- Cognito: ~$0 (무료 티어 내)

**총 예상 비용: $0-5/월**

---

## 정리 및 삭제

### 리소스 삭제

```bash
cd aws/cloudformation

# SAM으로 배포한 경우
sam delete --stack-name fate-stack --region ap-northeast-1

# 또는 CloudFormation으로 직접 삭제
aws cloudformation delete-stack \
  --stack-name fate-stack \
  --region ap-northeast-1
```

**⚠️ 주의**: 모든 리소스가 삭제되며 데이터도 삭제됩니다. DynamoDB 테이블의 데이터를 백업하려면 먼저 Export를 실행하세요.

---

## 다음 단계

1. ✅ 모든 설정 완료 확인
2. ✅ 프론트엔드와 백엔드 연결 테스트
3. ✅ 사용자 인증 플로우 테스트
4. ✅ API 엔드포인트 테스트
5. ✅ 프로덕션 배포 준비

---

## 참고 자료

- [AWS SAM 문서](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Cognito 문서](https://docs.aws.amazon.com/cognito/)
- [AWS DynamoDB 문서](https://docs.aws.amazon.com/dynamodb/)
- [AWS Lambda 문서](https://docs.aws.amazon.com/lambda/)
- [API Gateway 문서](https://docs.aws.amazon.com/apigateway/)
- [AWS CLI 문서](https://docs.aws.amazon.com/cli/)

---

## 도움이 필요하신가요?

문제가 발생하면:
1. 이 문서의 "문제 해결" 섹션 확인
2. AWS CloudWatch Logs에서 에러 로그 확인
3. AWS Support (유료 플랜) 또는 AWS Forums에 문의
