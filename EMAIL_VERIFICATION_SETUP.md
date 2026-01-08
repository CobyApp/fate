# 이메일 인증 설정 가이드

Cognito에서 실제로 이메일 인증 코드를 받으려면 AWS SES (Simple Email Service) 설정이 필요합니다.

## 📋 개요

Cognito는 기본적으로 매우 제한적인 이메일 전송 기능만 제공합니다. 실제 이메일을 받으려면:
- **SES Sandbox 모드**: 자신의 이메일 주소만 인증 가능 (개발/테스트용)
- **SES Production 모드**: 모든 이메일 주소로 전송 가능 (프로덕션용)

---

## 🚀 빠른 시작: SES Sandbox 모드 (개발/테스트)

### 단계 1: SES에서 이메일 주소 인증

1. **AWS 콘솔** 접속 → 검색창에 "SES" 또는 "Simple Email Service" 입력
2. **Amazon SES** 선택
3. 왼쪽 메뉴에서 **Configuration** → **Verified identities** 클릭
   - 또는 상단 메뉴에서 **Verified identities** 탭 직접 클릭
4. 오른쪽 상단의 **Create identity** 버튼 클릭
5. **Identity type** 선택 화면:
   - **Email address** 선택 (개별 이메일 주소 인증)
   - 또는 **Domain** 선택 (도메인 전체 인증, 권장)
6. **Email address** 선택한 경우:
   - **Email address** 입력란에 자신의 이메일 주소 입력 (예: `your-email@example.com`)
   - **Create identity** 버튼 클릭
7. **이메일 확인**:
   - 입력한 이메일 주소로 인증 이메일이 발송됨
   - 이메일을 열고 **Verify this email address** 버튼 클릭
   - 또는 인증 링크를 클릭하여 인증 완료
   - 이메일이 보이지 않으면 스팸 폴더 확인

**참고**: 
- Sandbox 모드에서는 **인증한 이메일 주소로만** 이메일을 전송할 수 있습니다.
- 인증 상태는 **Verified identities** 목록에서 확인 가능 (상태: "Verified")

### 단계 2: Cognito User Pool에 SES 설정 연결

#### 방법 1: AWS 콘솔에서 설정 (권장)

1. **AWS 콘솔** 접속 → 검색창에 "Cognito" 입력
2. **Amazon Cognito** 선택
3. 왼쪽 메뉴에서 **User pools** 클릭
4. `fate-user-pool-dev` 선택 (또는 배포한 스택 이름에 맞게)
5. 왼쪽 메뉴에서 **Messaging** 클릭
   - 또는 상단 탭에서 **Messaging** 선택
6. **Email** 섹션 확장:
   - **Email provider**: 드롭다운에서 **Amazon SES** 선택 (기본값: Cognito)
   - **Source (FROM) email address**: 드롭다운에서 SES에서 인증한 이메일 주소 선택
     - 인증한 이메일이 보이지 않으면 SES에서 먼저 인증 완료
   - **FROM sender name** (선택사항): 발신자 이름 입력 (예: "Fate App")
     - 이메일에서 "From: Fate App <your-email@example.com>" 형태로 표시됨
   - **Reply-to email address** (선택사항): 답장 받을 이메일 주소
     - 비워두면 FROM 주소로 답장됨
7. 맨 아래 **Save changes** 버튼 클릭
8. 설정 저장 확인 메시지 확인

#### 방법 2: CloudFormation 템플릿 수정 (자동화)

`template.yaml`에 SES 설정을 추가할 수 있습니다:

```yaml
UserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    # ... 기존 설정 ...
    EmailConfiguration:
      EmailSendingAccount: DEVELOPER
      SourceArn: !Sub 'arn:aws:ses:${AWS::Region}:${AWS::AccountId}:identity/${FromEmailAddress}'
      From: !Sub '${FromEmailAddress}'
      ReplyToEmailAddress: !Sub '${ReplyToEmailAddress}'
```

**Parameters 추가 필요:**
```yaml
Parameters:
  Environment:
    Type: String
    Default: dev
  FromEmailAddress:
    Type: String
    Description: SES에서 인증한 이메일 주소
    Default: noreply@example.com
  ReplyToEmailAddress:
    Type: String
    Description: 답장 받을 이메일 주소
    Default: support@example.com
```

### 단계 3: SES 권한 설정

Cognito가 SES를 사용할 수 있도록 IAM 권한이 필요합니다.

**자동 설정** (CloudFormation 사용 시):
CloudFormation이 자동으로 필요한 권한을 생성합니다.

**수동 설정** (콘솔 사용 시):
일반적으로 Cognito가 자동으로 필요한 권한을 관리하므로 추가 설정이 필요 없습니다.

---

## 📧 SES Production 모드 (프로덕션 환경)

Sandbox 모드를 벗어나 모든 이메일 주소로 전송하려면:

### 단계 1: Production Access 요청

1. **AWS 콘솔** → **Amazon SES** 접속
2. 왼쪽 메뉴에서 **Configuration** → **Account dashboard** 클릭
   - 또는 상단 메뉴에서 **Dashboard** 탭 클릭
3. **Account status** 섹션 확인:
   - 현재 상태가 **Sandbox mode**인지 확인
4. **Request production access** 버튼 클릭
   - 또는 **Move out of the Amazon SES sandbox** 링크 클릭
5. **Use case details** 폼 입력:
   - **Mail type**: 이메일 유형 선택 (Transactional, Marketing, 또는 둘 다)
   - **Website URL**: 웹사이트 URL 입력 (없으면 개발 중임을 명시)
   - **Use case description**: 
     - 이메일 용도 설명 (예: "사용자 회원가입 인증 코드 발송")
     - 이메일 내용 예시 (예: "인증 코드: 123456")
     - 예상 전송량 (예: "월 10,000건 이하")
   - **Your AWS use case**: 추가 설명 (선택사항)
6. 하단의 **Submit** 버튼 클릭
7. **승인 대기**:
   - 보통 24시간 이내 승인됨
   - 상태는 **Account dashboard**에서 확인 가능
   - 승인 완료 시 이메일로 알림 발송

**참고**: Production 모드로 전환되면 **모든 이메일 주소**로 전송 가능합니다.

### 단계 2: 도메인 인증 (선택사항, 권장)

자신의 도메인을 사용하여 이메일을 전송하려면:

1. **AWS 콘솔** → **Amazon SES** → **Configuration** → **Verified identities**
2. 오른쪽 상단의 **Create identity** 버튼 클릭
3. **Identity type** 화면에서 **Domain** 선택
4. **Domain** 입력란에 도메인 이름 입력 (예: `example.com`)
   - 서브도메인도 가능 (예: `mail.example.com`)
5. **Easy DKIM** 설정 (권장):
   - **Easy DKIM** 활성화 (기본값: 활성화)
   - DKIM을 통해 이메일 인증 신뢰도 향상
6. **Create identity** 버튼 클릭
7. **DNS 레코드 설정** 화면에서:
   - SES에서 제공하는 DNS 레코드를 확인
   - **CNAME records** 섹션: 3개의 CNAME 레코드 복사
   - **TXT record** (SPF) 섹션: TXT 레코드 확인
8. **도메인 DNS 설정에 레코드 추가**:
   - 도메인 제공업체 (예: Route 53, GoDaddy)의 DNS 설정 페이지 접속
   - SES에서 제공한 CNAME 레코드 3개 추가
   - TXT 레코드 추가 (이미 있으면 업데이트)
9. **DNS 확인 완료 대기**:
   - SES 콘솔에서 상태가 "Verified"로 변경될 때까지 대기
   - 보통 몇 분~몇 시간 소요 (DNS 전파 시간)
   - **Refresh** 버튼으로 상태 확인 가능
10. **도메인 인증 완료 후**:
    - 해당 도메인의 모든 이메일 주소로 전송 가능
    - 예: `@example.com` 도메인 인증 시, `any@example.com` 모두 가능

---

## 🔧 CloudFormation 템플릿 수정 (선택사항)

자동화를 원한다면 `template.yaml`에 다음을 추가:

```yaml
Parameters:
  Environment:
    Type: String
    Default: dev
  FromEmailAddress:
    Type: String
    Description: SES에서 인증한 이메일 주소
    Default: noreply@example.com
  ReplyToEmailAddress:
    Type: String
    Description: 답장 받을 이메일 주소
    Default: support@example.com

Resources:
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub 'fate-user-pool-${Environment}'
      AutoVerifiedAttributes:
        - email
      UsernameAttributes:
        - email
      # ... 기존 설정 ...
      EmailConfiguration:
        EmailSendingAccount: DEVELOPER
        SourceArn: !Sub 'arn:aws:ses:${AWS::Region}:${AWS::AccountId}:identity/${FromEmailAddress}'
        From: !Ref FromEmailAddress
        ReplyToEmailAddress: !Ref ReplyToEmailAddress
```

**배포 시:**
```bash
sam deploy \
  --parameter-overrides \
    Environment=dev \
    FromEmailAddress=your-email@example.com \
    ReplyToEmailAddress=support@example.com
```

---

## 🧪 테스트

### 1. 회원가입 테스트

1. 애플리케이션 실행
2. **회원가입** 클릭
3. **SES에서 인증한 이메일 주소**로 회원가입
   - Sandbox 모드: 인증한 이메일만 가능
   - Production 모드: 모든 이메일 가능
4. 이메일 확인
5. 인증 코드 입력

### 2. 이메일이 오지 않는 경우

#### 확인 사항 (순서대로):

1. **SES 이메일 인증 상태 확인**:
   - AWS 콘솔 → **Amazon SES** → **Configuration** → **Verified identities**
   - 이메일 주소가 "Verified" 상태인지 확인
   - 상태가 "Pending"이면 이메일 확인 링크 클릭 필요

2. **SES Sandbox 모드 확인**:
   - AWS 콘솔 → **Amazon SES** → **Configuration** → **Account dashboard**
   - **Account status** 섹션 확인
   - "Sandbox mode"라면 **인증한 이메일 주소로만** 회원가입 가능
   - 예: `test@example.com`을 인증했다면, `test@example.com`으로만 회원가입 가능

3. **Cognito SES 연결 확인**:
   - AWS 콘솔 → **Amazon Cognito** → **User pools** → `fate-user-pool-dev`
   - **Messaging** 탭 → **Email** 섹션
   - **Email provider**: `Amazon SES` 선택되어 있는지 확인
   - **Source (FROM) email address**: SES에서 인증한 이메일이 선택되어 있는지 확인
   - 설정 변경 시 **Save changes** 클릭했는지 확인

4. **스팸 폴더 확인**:
   - 이메일이 스팸/정크 폴더에 있을 수 있음
   - 특히 Gmail, Outlook 등에서 처음 받는 이메일은 스팸 처리될 수 있음

5. **SES 전송 통계 확인**:
   - AWS 콘솔 → **Amazon SES** → **Monitoring** → **Dashboard**
   - **Sending statistics** 섹션에서 전송량 확인
   - 오류가 있다면 **CloudWatch Logs**에서 확인

6. **Cognito 콘솔에서 직접 인증** (개발/테스트용):
   - AWS 콘솔 → **Amazon Cognito** → **User pools** → `fate-user-pool-dev`
   - 왼쪽 메뉴 **Users** 클릭
   - 사용자 선택 (이메일 주소 클릭)
   - 상단 **Actions** 버튼 → **Confirm user** 선택
   - 이메일 인증 없이 직접 인증 완료

---

## 💰 비용

### SES 비용

- **Sandbox 모드**: 무료 (인증한 이메일로만 제한)
- **Production 모드**:
  - **$0.10 per 1,000 emails** (Amazon EC2 또는 Elastic Beanstalk에서 전송)
  - **$0.12 per 1,000 emails** (다른 AWS 서비스에서 전송, Cognito 포함)

**예상 비용**:
- 월 10,000명 가입: 약 **$1.20**
- 월 100,000명 가입: 약 **$12**

### Cognito 비용

- 월 50,000 MAU (월간 활성 사용자) 무료
- 이후: $0.0055 per MAU

---

## 🔐 보안 고려사항

1. **이메일 인증 필수**: 현재 설정대로 `AutoVerifiedAttributes: email` 사용
2. **SPF/DKIM 설정**: 도메인 인증 시 이메일 신뢰도 향상
3. **Rate Limiting**: SES는 자동으로 rate limiting 적용
4. **Bounce/Complaint 처리**: SES에서 자동 처리 (설정 가능)

---

## 📝 요약

### 개발 환경 (Sandbox)

1. ✅ SES에서 자신의 이메일 주소 인증
2. ✅ Cognito User Pool → Messaging → Email provider를 SES로 설정
3. ✅ 인증한 이메일로 테스트

### 프로덕션 환경

1. ✅ SES Production Access 요청
2. ✅ 도메인 인증 (선택사항, 권장)
3. ✅ CloudFormation 템플릿에 SES 설정 추가 (선택사항)
4. ✅ 모든 이메일 주소로 전송 가능

---

## 🆘 문제 해결

### "Email sending not configured" 오류

**해결**:
1. AWS 콘솔 → **Amazon Cognito** → **User pools** → `fate-user-pool-dev`
2. **Messaging** 탭 → **Email** 섹션
3. **Email provider**가 `Amazon SES`로 선택되어 있는지 확인
4. **Source (FROM) email address**가 SES에서 인증된 이메일인지 확인
5. 설정 변경 후 **Save changes** 클릭

### "Email address not verified" 오류

**해결**:
1. AWS 콘솔 → **Amazon SES** → **Configuration** → **Verified identities**
2. FROM으로 사용할 이메일 주소가 목록에 있고 "Verified" 상태인지 확인
3. "Pending" 상태라면 이메일 확인 링크 클릭
4. Sandbox 모드에서는 **인증한 이메일 주소로만** 이메일 전송 가능
   - 인증한 이메일: `test@example.com` → 이 이메일로만 회원가입 가능
   - 다른 이메일로 회원가입 시 오류 발생

### "MessageRejected: Email address is not verified" 오류

**해결**:
- 회원가입한 이메일 주소가 SES Sandbox 모드에서 인증되지 않음
- **해결책 1**: SES에서 해당 이메일 주소 인증
- **해결책 2**: SES Production 모드로 전환
- **해결책 3**: 개발 중이라면 Cognito 콘솔에서 직접 사용자 인증

### 이메일이 스팸 폴더로 이동

**해결**:
- 도메인 인증 (SPF, DKIM) 설정
- SES Production 모드 사용
- FROM 주소를 명확하게 설정

---

## 참고 자료

- [AWS SES 문서](https://docs.aws.amazon.com/ses/)
- [Cognito 이메일 설정](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html)
- [SES 가격](https://aws.amazon.com/ses/pricing/)
