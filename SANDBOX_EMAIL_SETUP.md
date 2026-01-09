# Sandbox 모드 이메일 인증 설정 가이드

Sandbox 모드에서는 **인증한 이메일 주소로만** 회원가입이 가능합니다. 빠르고 간단하게 설정할 수 있습니다.

## 📋 개요

- ✅ 도메인 구매 불필요
- ✅ Production Access 요청 불필요
- ✅ 빠른 설정 (5분 이내)
- ⚠️ 제한: 인증한 이메일 주소로만 회원가입 가능

---

## 🚀 단계별 설정

### 1단계: SES에서 이메일 주소 인증

1. **AWS 콘솔** 접속
   - https://console.aws.amazon.com/

2. **SES 서비스 찾기**
   - 상단 검색창에 "SES" 또는 "Simple Email Service" 입력
   - **Amazon SES** 선택

3. **리전 확인**
   - 오른쪽 상단에서 리전이 `ap-northeast-1` (도쿄)인지 확인
   - 다른 리전이면 `ap-northeast-1`로 변경

4. **Verified identities로 이동**
   - 왼쪽 메뉴에서 **Configuration** → **Verified identities** 클릭
   - 또는 상단 탭에서 **Verified identities** 직접 클릭

5. **이메일 주소 인증 시작**
   - 오른쪽 상단의 **Create identity** 버튼 클릭

6. **Identity type 선택**
   - **Email address** 선택 (개별 이메일 주소 인증)
   - **Domain**은 선택하지 않음

7. **이메일 주소 입력**
   - **Email address** 입력란에 자신의 이메일 주소 입력
   - 예: `your-email@gmail.com`, `test@example.com` 등
   - ⚠️ **이 이메일 주소로만 회원가입이 가능합니다**

8. **인증 요청**
   - **Create identity** 버튼 클릭

9. **이메일 확인**
   - 입력한 이메일 주소로 인증 이메일이 발송됨
   - 이메일을 열고 **"Verify this email address"** 버튼 클릭
   - 또는 인증 링크를 클릭
   - 이메일이 보이지 않으면 **스팸 폴더** 확인

10. **인증 완료 확인**
    - SES 콘솔로 돌아가기
    - **Verified identities** 목록에서 이메일 주소 확인
    - 상태가 **"Verified"**로 표시되면 완료

---

### 2단계: Cognito User Pool에 SES 연결

1. **Cognito 서비스 찾기**
   - AWS 콘솔 상단 검색창에 "Cognito" 입력
   - **Amazon Cognito** 선택

2. **User Pool 선택**
   - 왼쪽 메뉴에서 **User pools** 클릭
   - `fate-user-pool-dev` 선택 (또는 배포한 스택 이름에 맞게)

3. **Messaging 탭으로 이동**
   - 왼쪽 메뉴에서 **Messaging** 클릭
   - 또는 상단 탭에서 **Messaging** 선택

4. **Email 섹션 설정**
   - **Email** 섹션을 확장 (클릭하여 펼치기)

5. **Email provider 변경**
   - **Email provider** 드롭다운에서 **Amazon SES** 선택
   - 기본값은 "Cognito"인데, 이를 "Amazon SES"로 변경

6. **FROM 이메일 주소 선택**
   - **Source (FROM) email address** 드롭다운 클릭
   - 위에서 인증한 이메일 주소 선택
   - 목록에 보이지 않으면 SES에서 인증 상태 확인

7. **선택사항 설정**
   - **FROM sender name**: 발신자 이름 입력 (예: "Fate App")
     - 이메일에서 "From: Fate App <your-email@example.com>" 형태로 표시
   - **Reply-to email address**: 답장 받을 이메일 (비워두면 FROM 주소 사용)

8. **설정 저장**
   - 맨 아래 **Save changes** 버튼 클릭
   - 저장 완료 메시지 확인

---

### 3단계: 테스트

1. **애플리케이션 실행**
   ```bash
   cd /Users/doyoung_kim/Documents/Git/fate
   npm run dev
   ```

2. **회원가입 테스트**
   - 브라우저에서 `http://localhost:3000` 접속
   - **회원가입** 클릭
   - **인증한 이메일 주소**로 회원가입 시도
     - 예: SES에서 `test@example.com`을 인증했다면, `test@example.com`으로만 회원가입 가능

3. **이메일 확인**
   - 이메일함 확인 (스팸 폴더도 확인)
   - 인증 코드가 포함된 이메일 수신 확인

4. **인증 코드 입력**
   - 이메일에서 받은 인증 코드 입력
   - 인증 완료

5. **로그인 테스트**
   - 인증 완료 후 로그인 테스트

---

## ⚠️ 중요 제한사항

### Sandbox 모드 제한

- **인증한 이메일 주소로만** 회원가입 가능
- 예시:
  - SES에서 `test@example.com` 인증 → `test@example.com`으로만 회원가입 가능
  - `user@gmail.com`으로 회원가입 시도 → 오류 발생

### 여러 이메일 사용하려면

- SES에서 사용할 모든 이메일 주소를 각각 인증해야 함
- 예: `test1@example.com`, `test2@example.com`, `user@gmail.com` 모두 인증 필요

---

## 🔧 문제 해결

### 이메일이 오지 않는 경우

1. **SES 인증 상태 확인**
   - AWS 콘솔 → SES → Verified identities
   - 이메일 주소가 "Verified" 상태인지 확인

2. **Cognito SES 연결 확인**
   - Cognito → User pools → `fate-user-pool-dev` → Messaging
   - Email provider가 "Amazon SES"인지 확인
   - FROM 주소가 올바르게 선택되었는지 확인

3. **스팸 폴더 확인**
   - 처음 받는 이메일은 스팸 처리될 수 있음

4. **이메일 주소 확인**
   - 회원가입한 이메일이 SES에서 인증된 이메일과 정확히 일치하는지 확인
   - 대소문자, 오타 확인

### "Email address is not verified" 오류

**원인**: 회원가입한 이메일 주소가 SES에서 인증되지 않음

**해결**:
1. SES → Verified identities에서 해당 이메일 주소 인증
2. 또는 인증된 이메일 주소로 회원가입

### "MessageRejected" 오류

**원인**: FROM 이메일 주소가 SES에서 인증되지 않음

**해결**:
1. Cognito → Messaging → Email 섹션 확인
2. FROM 주소가 SES에서 "Verified" 상태인지 확인
3. 필요시 FROM 주소 재선택

---

## 📝 빠른 참조

### SES 이메일 인증
```
AWS 콘솔 → SES → Configuration → Verified identities
→ Create identity → Email address
→ 이메일 입력 → 인증 이메일 확인
```

### Cognito SES 연결
```
AWS 콘솔 → Cognito → User pools → fate-user-pool-dev
→ Messaging → Email
→ Email provider: Amazon SES
→ FROM 주소: 인증한 이메일 선택
→ Save changes
```

### 테스트
```
인증한 이메일 주소로만 회원가입 가능
→ 이메일 확인 → 인증 코드 입력
```

---

## 💡 팁

1. **개발/테스트용 이메일 사용**
   - 실제 이메일 대신 테스트용 이메일 사용 권장
   - Gmail, Outlook 등에서 테스트 계정 생성 가능

2. **여러 이메일 인증**
   - 팀원들이 각자 사용할 이메일을 SES에서 인증
   - 각자 인증한 이메일로 테스트 가능

3. **프로덕션 환경**
   - 실제 서비스에서는 도메인 인증 후 Production Access 권장
   - 모든 이메일 주소로 회원가입 가능

---

## 다음 단계

Sandbox 모드 설정이 완료되었습니다!

- ✅ SES 이메일 인증 완료
- ✅ Cognito SES 연결 완료
- ✅ 회원가입 테스트 완료

**프로덕션 환경으로 전환하려면**:
- `PRODUCTION_DEPLOYMENT.md` 파일 참조
- 도메인 구매 및 인증 필요
- Production Access 요청 필요
