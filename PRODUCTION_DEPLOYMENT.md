# 프로덕션 배포 가이드 - 모든 이메일 가입 가능

이 가이드는 SES Production 모드로 설정하여 **모든 이메일 주소**로 회원가입이 가능하도록 하는 방법을 설명합니다.

## 📋 사전 준비사항

1. ✅ AWS 계정 및 IAM 권한 설정 완료
2. ✅ AWS CLI 및 SAM CLI 설치 완료
3. ✅ 이메일 주소 1개 이상 (SES 인증용)

---

## 🚀 단계별 설정

### 1단계: SES에서 이메일 주소 인증

1. **AWS 콘솔** 접속 → 검색창에 "SES" 입력 → **Amazon SES** 선택
2. 왼쪽 메뉴 **Configuration** → **Verified identities** 클릭
3. 오른쪽 상단 **Create identity** 버튼 클릭
4. **Email address** 선택
5. 이메일 주소 입력 (예: `noreply@yourdomain.com` 또는 `your-email@gmail.com`)
6. **Create identity** 클릭
7. 이메일로 전송된 인증 링크 클릭하여 인증 완료
8. 상태가 **"Verified"**로 변경될 때까지 대기

**⚠️ 중요**: 이 이메일 주소는 Cognito에서 FROM 주소로 사용됩니다.

---

### 2단계: 도메인 인증 (필수 - Production Access 전)

**⚠️ 중요**: 최신 AWS SES 정책에 따라 Production Access를 요청하기 전에 **도메인 인증이 필수**입니다.

#### 옵션 A: 자신의 도메인이 있는 경우 (권장)

1. **AWS 콘솔** → **Amazon SES** → **Configuration** → **Verified identities**
2. 오른쪽 상단 **Create identity** 버튼 클릭
3. **Identity type** 화면에서 **Domain** 선택
4. **Domain** 입력란에 도메인 이름 입력 (예: `example.com`)
   - 서브도메인도 가능 (예: `mail.example.com`)
5. **Easy DKIM** 설정:
   - **Easy DKIM** 활성화 (기본값: 활성화)
   - DKIM을 통해 이메일 인증 신뢰도 향상
6. **Create identity** 버튼 클릭
7. **DNS 레코드 설정**:
   - SES에서 제공하는 **CNAME records** 3개 복사
   - **TXT record** (SPF) 확인
8. **도메인 DNS 설정에 레코드 추가**:
   - 도메인 제공업체 (Route 53, GoDaddy, Namecheap 등)의 DNS 설정 페이지 접속
   - SES에서 제공한 CNAME 레코드 3개 추가
   - TXT 레코드 추가 (이미 있으면 업데이트)
9. **DNS 확인 완료 대기**:
   - SES 콘솔에서 상태가 **"Verified"**로 변경될 때까지 대기
   - 보통 몇 분~몇 시간 소요 (DNS 전파 시간)
   - **Refresh** 버튼으로 상태 확인 가능

#### 옵션 B: 도메인이 없는 경우

**방법 1: 도메인 구매 (권장)**
- 저렴한 도메인 구매 (연간 $10-15)
- 예: Namecheap, GoDaddy, Route 53 등
- 구매 후 위의 "옵션 A" 단계 진행

**방법 2: Sandbox 모드로 계속 사용**
- Production Access 없이 Sandbox 모드로 사용
- **인증한 이메일 주소로만** 회원가입 가능
- 개발/테스트 환경에 적합

**방법 3: AWS Support에 문의**
- 특별한 경우 AWS Support에 Production Access 요청 가능
- 하지만 일반적으로 도메인 인증이 필수

---

### 3단계: SES Production 모드로 전환

**도메인 인증 완료 후** Production Access를 요청할 수 있습니다.

1. **AWS 콘솔** → **Amazon SES** → **Configuration** → **Account dashboard**
2. **Account status** 섹션 확인:
   - 현재 상태가 **"Sandbox mode"**인지 확인
   - 도메인이 인증되었는지 확인
3. **Request production access** 버튼이 활성화되어 있는지 확인
   - 비활성화되어 있다면 도메인 인증 상태 확인
4. **Request production access** 버튼 클릭
   - 또는 **"Move out of the Amazon SES sandbox"** 링크 클릭
5. **Use case details** 폼 작성:

   **Mail type**: 
   - ✅ **Transactional** 선택 (회원가입 인증 코드는 거래 이메일)
   - 또는 **Both** 선택

   **Website URL**: 
   - 웹사이트 URL 입력 (없으면 "개발 중" 또는 "준비 중" 명시)
   - 예: `https://your-app.com` 또는 `https://github.com/your-repo`

   **Use case description** (중요):
   ```
   사용자 회원가입 시 이메일 인증 코드를 발송하는 용도입니다.
   
   이메일 내용 예시:
   - 제목: "이메일 인증 코드"
   - 본문: "인증 코드: 123456"
   
   예상 전송량: 월 10,000건 이하 (초기)
   ```

   **Your AWS use case** (선택사항):
   ```
   Cognito User Pool을 사용하여 사용자 인증을 처리하며,
   회원가입 시 이메일 인증 코드를 발송합니다.
   ```

5. **Submit** 버튼 클릭
6. **승인 대기**:
   - 보통 **24시간 이내** 승인됨
   - 상태는 **Account dashboard**에서 확인 가능
   - 승인 완료 시 이메일로 알림 발송

**✅ Production 모드 승인 완료 후**:
- **모든 이메일 주소**로 이메일 전송 가능
- Sandbox 모드 제한 해제
- 인증한 도메인의 모든 이메일 주소 사용 가능 (예: `@example.com` 도메인 인증 시, `any@example.com` 모두 가능)

---

### 4단계: CloudFormation 템플릿 확인

템플릿이 이미 SES 설정을 지원하도록 수정되어 있습니다.

**확인 사항**:
- `template.yaml`에 `FromEmailAddress` 파라미터가 있는지 확인
- `EmailConfiguration` 섹션이 있는지 확인

---

### 5단계: 배포 (SES 설정 포함)

#### 방법 1: SAM CLI로 배포 (권장)

```bash
cd /Users/doyoung_kim/Documents/Git/fate/aws/cloudformation

# 1. 템플릿 빌드
sam build

# 2. SES 이메일 주소를 파라미터로 전달하여 배포
sam deploy \
  --parameter-overrides \
    Environment=dev \
    FromEmailAddress=your-verified-email@example.com \
    ReplyToEmailAddress=support@example.com
```

**파라미터 설명**:
- `Environment`: 환경 이름 (기본값: dev)
- `FromEmailAddress`: SES에서 인증한 이메일 주소 (필수)
- `ReplyToEmailAddress`: 답장 받을 이메일 (선택사항, 비워두면 FromEmailAddress 사용)

#### 방법 2: 기존 스택 업데이트

이미 배포된 스택이 있다면:

```bash
cd /Users/doyoung_kim/Documents/Git/fate/aws/cloudformation

# 1. 빌드
sam build

# 2. 기존 스택 업데이트
sam deploy \
  --parameter-overrides \
    Environment=dev \
    FromEmailAddress=your-verified-email@example.com
```

#### 방법 3: samconfig.toml에 파라미터 저장

```bash
sam deploy --guided
```

프롬프트에서:
- `Parameter Environment [dev]`: `dev` (또는 원하는 환경)
- `Parameter FromEmailAddress []`: `your-verified-email@example.com`
- `Parameter ReplyToEmailAddress []`: `support@example.com` (또는 비워두기)

---

### 6단계: 배포 확인

#### CloudFormation 출력 확인

```bash
aws cloudformation describe-stacks \
  --stack-name fate-stack-dev \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs' \
  --output table
```

다음 값들을 확인:
- `ApiUrl`: API Gateway URL
- `UserPoolId`: Cognito User Pool ID
- `UserPoolClientId`: Cognito User Pool Client ID

#### Cognito SES 설정 확인

1. **AWS 콘솔** → **Amazon Cognito** → **User pools** → `fate-user-pool-dev`
2. **Messaging** 탭 클릭
3. **Email** 섹션 확인:
   - ✅ **Email provider**: `Amazon SES`로 설정되어 있어야 함
   - ✅ **Source (FROM) email address**: SES에서 인증한 이메일이 선택되어 있어야 함

**⚠️ 주의**: CloudFormation으로 배포해도 Cognito 콘솔에서 수동으로 SES를 연결해야 할 수 있습니다.

---

## 🧪 테스트

### 1. 모든 이메일 주소로 회원가입 테스트

1. 애플리케이션 실행
2. **회원가입** 클릭
3. **임의의 이메일 주소**로 회원가입 시도
   - 예: `test123@example.com`, `user@gmail.com` 등
4. 이메일 확인 (스팸 폴더도 확인)
5. 인증 코드 입력
6. 로그인 테스트

### 2. 이메일이 오지 않는 경우

#### 확인 사항:

1. **SES Production 모드 확인**:
   - AWS 콘솔 → **Amazon SES** → **Account dashboard**
   - **Account status**가 **"Production mode"**인지 확인
   - "Sandbox mode"라면 아직 승인 대기 중

2. **Cognito SES 연결 확인**:
   - Cognito → User pools → `fate-user-pool-dev` → **Messaging**
   - **Email provider**가 `Amazon SES`인지 확인
   - FROM 이메일이 SES에서 인증되었는지 확인

3. **스팸 폴더 확인**:
   - 처음 받는 이메일은 스팸 처리될 수 있음

4. **SES 전송 통계 확인**:
   - AWS 콘솔 → **Amazon SES** → **Monitoring** → **Dashboard**
   - 전송량 및 오류 확인

---

## 🔄 기존 스택 업데이트 (SES 추가)

이미 배포된 스택에 SES 설정을 추가하려면:

### 1. SES 이메일 인증 및 Production 모드 전환 (위 1-2단계 완료)

### 2. 템플릿 업데이트 및 재배포

```bash
cd /Users/doyoung_kim/Documents/Git/fate/aws/cloudformation

# 1. 빌드
sam build

# 2. 업데이트 배포 (SES 파라미터 추가)
sam deploy \
  --parameter-overrides \
    Environment=dev \
    FromEmailAddress=your-verified-email@example.com
```

### 3. Cognito 콘솔에서 수동 연결 (필요시)

CloudFormation이 자동으로 설정하지 못한 경우:

1. AWS 콘솔 → **Amazon Cognito** → **User pools** → `fate-user-pool-dev`
2. **Messaging** 탭 → **Email** 섹션
3. **Email provider**: `Amazon SES` 선택
4. **Source (FROM) email address**: SES에서 인증한 이메일 선택
5. **Save changes** 클릭

---

## 💰 비용

### SES 비용 (Production 모드)

- **$0.10 per 1,000 emails** (EC2/Elastic Beanstalk에서 전송)
- **$0.12 per 1,000 emails** (다른 AWS 서비스에서 전송, Cognito 포함)

**예상 비용**:
- 월 10,000명 가입: 약 **$1.20**
- 월 100,000명 가입: 약 **$12**

### Cognito 비용

- 월 50,000 MAU (월간 활성 사용자) 무료
- 이후: $0.0055 per MAU

---

## 📝 빠른 배포 명령어

### 전체 프로세스 (한 번에)

```bash
cd /Users/doyoung_kim/Documents/Git/fate/aws/cloudformation

# 1. 빌드
sam build

# 2. 배포 (SES 이메일 주소를 실제 값으로 변경)
sam deploy \
  --parameter-overrides \
    Environment=dev \
    FromEmailAddress=your-verified-email@example.com \
    ReplyToEmailAddress=support@example.com
```

**⚠️ 중요**: `your-verified-email@example.com`을 SES에서 인증한 실제 이메일 주소로 변경하세요!

---

## 📝 요약 체크리스트

- [ ] **도메인 인증 완료** (Production Access 전 필수)
  - [ ] SES에서 도메인 인증 (Create identity → Domain)
  - [ ] DNS 레코드 설정 (CNAME 3개, TXT 1개)
  - [ ] 도메인 상태가 "Verified"로 변경 확인
- [ ] SES에서 이메일 주소 인증 완료 (선택사항, 도메인 인증 시 자동)
- [ ] SES Production 모드 승인 완료 (24시간 이내)
- [ ] CloudFormation 템플릿에 SES 파라미터 추가 확인
- [ ] `sam build` 실행
- [ ] `sam deploy` 실행 (FromEmailAddress 파라미터 포함)
- [ ] Cognito 콘솔에서 SES 연결 확인
- [ ] 임의의 이메일 주소로 회원가입 테스트
- [ ] 이메일 수신 확인
- [ ] 인증 코드 입력 및 로그인 테스트

## 🆕 도메인 없이 사용하는 방법 (Sandbox 모드)

도메인이 없거나 Production Access가 필요 없는 경우:

1. **SES에서 이메일 주소만 인증**:
   - SES → Verified identities → Create identity → Email address
   - 자신의 이메일 주소 인증

2. **Cognito에 SES 연결**:
   - Cognito → User pools → Messaging → Email provider: Amazon SES
   - FROM 주소로 인증한 이메일 선택

3. **제한사항**:
   - **인증한 이메일 주소로만** 회원가입 가능
   - 예: `test@example.com`을 인증했다면, `test@example.com`으로만 회원가입 가능
   - 다른 이메일 주소로는 회원가입 불가

4. **개발/테스트 환경에 적합**:
   - 소규모 테스트에 적합
   - 프로덕션 환경에서는 도메인 인증 후 Production Access 권장

---

## 🆘 문제 해결

### "Email address is not verified" 오류

**원인**: SES Sandbox 모드이거나 이메일이 인증되지 않음

**해결**:
1. SES Production 모드로 전환 (위 3단계)
2. FROM 이메일 주소가 SES에서 인증되었는지 확인
3. 도메인 인증이 완료되었는지 확인 (Production 모드 필수)

### "Request production access" 버튼이 비활성화됨

**원인**: 도메인 인증이 완료되지 않음

**해결**:
1. SES → Configuration → Verified identities 확인
2. 도메인이 "Verified" 상태인지 확인
3. 도메인 인증이 완료되지 않았다면 위의 "2단계: 도메인 인증" 진행
4. DNS 레코드가 올바르게 설정되었는지 확인
5. DNS 전파 대기 (최대 72시간, 보통 몇 시간)

### "MessageRejected" 오류

**원인**: SES Production 모드가 아니거나 FROM 주소가 인증되지 않음

**해결**:
1. SES Account dashboard에서 Production 모드 확인
2. FROM 이메일 주소 재인증

### CloudFormation 배포 실패

**원인**: FROM 이메일 주소가 SES에서 인증되지 않음

**해결**:
1. SES에서 먼저 이메일 인증 완료
2. 인증 완료 후 다시 배포

---

## 참고 자료

- [SES Production 모드 요청](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [Cognito 이메일 설정](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html)
- [SES 가격](https://aws.amazon.com/ses/pricing/)
