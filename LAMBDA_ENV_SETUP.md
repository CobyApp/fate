# Lambda 환경 변수 설정 가이드

Lambda 함수의 환경 변수는 CloudFormation 템플릿을 통해 자동으로 설정됩니다.

## 📋 현재 설정된 환경 변수

### FateCalculatorFunction (사주 계산 함수)

다음 환경 변수가 자동으로 설정됩니다:

1. **FATE_TABLE_NAME**: DynamoDB 테이블 이름 (자동 설정)
2. **GEMINI_API_KEY**: Google Gemini API 키 (파라미터로 전달 필요)

---

## 🚀 환경 변수 설정 방법

### 방법 1: SAM 배포 시 파라미터 전달 (권장)

```bash
cd /Users/doyoung_kim/Documents/Git/fate/aws/cloudformation

# 1. 빌드
sam build

# 2. 배포 (Gemini API 키 포함)
sam deploy \
  --parameter-overrides \
    Environment=dev \
    FromEmailAddress=doyoung@minami-hd.co.jp \
    GeminiApiKey=your-gemini-api-key-here
```

**파라미터 설명**:
- `Environment`: 환경 이름 (기본값: dev)
- `FromEmailAddress`: SES에서 인증한 이메일 주소
- `GeminiApiKey`: Google Gemini API 키 (필수)

### 방법 2: samconfig.toml에 저장 (자동화)

`samconfig.toml` 파일을 수정하여 파라미터를 저장할 수 있습니다:

```toml
version = 0.1

[default.deploy.parameters]
stack_name = "fate-stack-dev"
resolve_s3 = true
s3_prefix = "fate-stack-dev"
region = "ap-northeast-1"
confirm_changeset = true
capabilities = "CAPABILITY_IAM"
parameter_overrides = [
  "Environment=\"dev\"",
  "FromEmailAddress=\"doyoung@minami-hd.co.jp\"",
  "GeminiApiKey=\"your-gemini-api-key-here\""
]
image_repositories = []

[default.global.parameters]
region = "ap-northeast-1"
```

**⚠️ 보안 주의**: `samconfig.toml`에 API 키를 저장하면 Git에 커밋하지 마세요!

`.gitignore`에 추가:
```
samconfig.toml
```

### 방법 3: AWS Systems Manager Parameter Store 사용 (고급)

더 안전한 방법으로 AWS Systems Manager Parameter Store를 사용할 수 있습니다:

1. **Parameter Store에 API 키 저장**:
   ```bash
   aws ssm put-parameter \
     --name "/fate/dev/gemini-api-key" \
     --value "your-gemini-api-key-here" \
     --type "SecureString" \
     --region ap-northeast-1
   ```

2. **CloudFormation 템플릿 수정** (선택사항):
   ```yaml
   Environment:
     Variables:
       FATE_TABLE_NAME: !Ref FateTable
       GEMINI_API_KEY: !Sub '{{resolve:ssm-secure:/fate/${Environment}/gemini-api-key}}'
   ```

---

## 🔑 Google Gemini API 키 발급 방법

1. **Google AI Studio 접속**:
   - https://aistudio.google.com/app/apikey

2. **로그인**:
   - Google 계정으로 로그인

3. **API 키 생성**:
   - **Create API Key** 클릭
   - Google Cloud 프로젝트 선택 (또는 새로 생성)
   - API 키가 생성되면 복사

4. **키 복사**:
   - ⚠️ **키를 안전한 곳에 저장하세요**
   - 형식: 긴 문자열 (약 39자)

5. **사용량 확인**:
   - Google Cloud Console → API & Services → Credentials
   - 또는 https://console.cloud.google.com/apis/credentials

**참고**: Gemini API는 무료 티어가 제공됩니다 (월 60 요청/분 제한).

---

## ✅ 배포 후 확인

### 1. Lambda 함수 환경 변수 확인

**AWS 콘솔에서**:
1. AWS 콘솔 → **Lambda** → Functions
2. `fate-calculator-dev` 선택
3. **Configuration** 탭 → **Environment variables** 섹션
4. 다음 변수들이 있는지 확인:
   - ✅ `FATE_TABLE_NAME`: `fate-dev`
   - ✅ `GEMINI_API_KEY`: `...` (마스킹됨)

**CLI로 확인**:
```bash
aws lambda get-function-configuration \
  --function-name fate-calculator-dev \
  --region ap-northeast-1 \
  --query 'Environment.Variables' \
  --output table
```

### 2. 테스트

```bash
# API 엔드포인트 테스트
curl -X POST https://o4rsyegje1.execute-api.ap-northeast-1.amazonaws.com/dev/fate \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "gender": "male"
  }'
```

---

## 🔄 기존 스택 업데이트

이미 배포된 스택에 환경 변수를 추가하려면:

```bash
cd /Users/doyoung_kim/Documents/Git/fate/aws/cloudformation

# 1. 빌드
sam build

# 2. 업데이트 배포
sam deploy \
  --parameter-overrides \
    Environment=dev \
    FromEmailAddress=doyoung@minami-hd.co.jp \
    GeminiApiKey=your-new-gemini-api-key-here
```

---

## 🛡️ 보안 모범 사례

### 1. API 키 보호

- ✅ `.gitignore`에 `samconfig.toml` 추가
- ✅ API 키를 코드에 하드코딩하지 않기
- ✅ AWS Systems Manager Parameter Store 사용 (프로덕션)
- ✅ IAM 역할로 최소 권한 부여

### 2. 환경 변수 관리

- ✅ 개발/프로덕션 환경 분리
- ✅ API 키 로테이션 정기적으로 수행
- ✅ CloudWatch Logs에서 민감 정보 로깅 방지

---

## 📝 요약

1. **Gemini API 키 발급**: https://aistudio.google.com/app/apikey
2. **배포 시 파라미터 전달**:
   ```bash
   sam deploy --parameter-overrides GeminiApiKey=your-key-here
   ```
3. **환경 변수 확인**: Lambda 콘솔 또는 CLI로 확인
4. **테스트**: API 호출로 Gemini 연동 확인

---

## 🆘 문제 해결

### "Gemini API 키가 설정되지 않았습니다" 오류

**원인**: Lambda 함수에 `GEMINI_API_KEY` 환경 변수가 없음

**해결**:
1. Lambda 콘솔에서 환경 변수 확인
2. 배포 시 `GeminiApiKey` 파라미터 전달 확인
3. CloudFormation 템플릿의 `Environment.Variables` 확인

### API 키가 작동하지 않음

**확인 사항**:
1. API 키 형식이 올바른지
2. Google Cloud 프로젝트에서 Gemini API가 활성화되었는지
3. API 키가 만료되지 않았는지
4. CloudWatch Logs에서 실제 오류 메시지 확인
5. API 할당량을 초과하지 않았는지 확인

---

## 참고 자료

- [Google Gemini API 문서](https://ai.google.dev/docs)
- [Gemini API 가이드](https://ai.google.dev/gemini-api/docs)
- [AWS Lambda 환경 변수](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
