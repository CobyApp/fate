# 문제 해결 가이드

## 🔴 로그인 400 Bad Request 오류

### 증상
```
POST https://cognito-idp.ap-northeast-1.amazonaws.com/ 400 (Bad Request)
```

### 원인 및 해결 방법

#### 1. 환경 변수 확인 (가장 흔한 원인)

**확인 방법**:
1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭에서 다음 명령 실행:
   ```javascript
   console.log('User Pool ID:', import.meta.env.VITE_COGNITO_USER_POOL_ID);
   console.log('Client ID:', import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID);
   console.log('Region:', import.meta.env.VITE_AWS_REGION);
   ```

**문제**: `undefined` 또는 빈 문자열이 표시되는 경우

**해결**:
1. 프로젝트 루트에 `.env` 파일이 있는지 확인
2. `.env` 파일 내용 확인:
   ```env
   VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
   VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_AWS_REGION=ap-northeast-1
   VITE_API_URL=https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev
   ```
3. 값이 올바른지 확인:
   - User Pool ID 형식: `ap-northeast-1_`로 시작
   - Client ID: 긴 문자열 (약 26자)
4. 개발 서버 재시작:
   ```bash
   # 서버 중지 (Ctrl+C)
   npm run dev
   ```

#### 2. Cognito User Pool ID 및 Client ID 확인

**AWS 콘솔에서 확인**:
1. AWS 콘솔 → **Amazon Cognito** → **User pools**
2. `fate-user-pool-dev` 선택
3. **General settings** 탭에서 **User pool ID** 복사
4. **App integration** 탭 → **App clients** 섹션
5. Client ID 복사

**CloudFormation 출력에서 확인**:
```bash
aws cloudformation describe-stacks \
  --stack-name fate-stack-dev \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs' \
  --output table
```

#### 3. 사용자 상태 확인

**이메일 인증이 완료되지 않은 경우**:
1. AWS 콘솔 → **Amazon Cognito** → **User pools** → `fate-user-pool-dev`
2. **Users** 탭 → 사용자 선택
3. **Status** 확인:
   - `CONFIRMED`: 정상
   - `FORCE_CHANGE_PASSWORD`: 비밀번호 변경 필요
   - `UNCONFIRMED`: 이메일 인증 필요

**해결**:
- `UNCONFIRMED`인 경우: 이메일 인증 코드 입력
- 또는 Cognito 콘솔에서 **Actions** → **Confirm user** 클릭

#### 4. Cognito User Pool Client 설정 확인

**인증 흐름 확인**:
1. AWS 콘솔 → **Amazon Cognito** → **User pools** → `fate-user-pool-dev`
2. **App integration** 탭 → **App clients** 섹션
3. Client 선택 → **Edit** 클릭
4. **Authentication flows configuration** 확인:
   - ✅ **ALLOW_USER_SRP_AUTH** 활성화 (필수)
   - ✅ **ALLOW_USER_PASSWORD_AUTH** 활성화 (선택사항)
   - ✅ **ALLOW_REFRESH_TOKEN_AUTH** 활성화 (필수)

**문제**: `ALLOW_USER_SRP_AUTH`가 비활성화된 경우

**해결**: 활성화 후 저장

#### 5. 리전 확인

**확인**:
- `.env` 파일의 `VITE_AWS_REGION`이 `ap-northeast-1`인지 확인
- Cognito User Pool이 같은 리전에 있는지 확인

---

## 🟡 다른 일반적인 오류

### "User does not exist"
- 사용자가 회원가입되지 않았거나 이메일 주소가 잘못됨
- 회원가입부터 다시 시도

### "Incorrect username or password"
- 비밀번호가 잘못됨
- 비밀번호 재설정 또는 올바른 비밀번호 입력

### "User is not confirmed"
- 이메일 인증이 완료되지 않음
- 이메일 확인 또는 Cognito 콘솔에서 직접 인증

### "Network error" 또는 "Failed to fetch"
- 인터넷 연결 확인
- CORS 설정 확인 (API Gateway)
- Cognito 리전 확인

---

## 🔍 디버깅 팁

### 1. 브라우저 콘솔 확인
- 개발자 도구 (F12) → Console 탭
- 에러 메시지 전체 확인
- 빨간색 에러 메시지 클릭하여 상세 정보 확인

### 2. Network 탭 확인
- 개발자 도구 → Network 탭
- 로그인 시도 시 실패한 요청 확인
- Response 탭에서 에러 메시지 확인

### 3. Amplify 설정 확인
브라우저 콘솔에서:
```javascript
import { Amplify } from 'aws-amplify';
console.log(Amplify.getConfig());
```

### 4. 환경 변수 확인
브라우저 콘솔에서:
```javascript
console.log(import.meta.env);
```

---

## ✅ 체크리스트

로그인 오류 해결을 위한 확인 사항:

- [ ] `.env` 파일이 프로젝트 루트에 있음
- [ ] `.env` 파일에 `VITE_COGNITO_USER_POOL_ID` 설정됨
- [ ] `.env` 파일에 `VITE_COGNITO_USER_POOL_CLIENT_ID` 설정됨
- [ ] `.env` 파일에 `VITE_AWS_REGION` 설정됨 (또는 기본값 사용)
- [ ] User Pool ID가 올바른 형식 (`ap-northeast-1_`로 시작)
- [ ] Client ID가 올바른 형식 (긴 문자열)
- [ ] 개발 서버 재시작 (`npm run dev`)
- [ ] Cognito User Pool이 올바른 리전에 있음
- [ ] 사용자가 회원가입되어 있음
- [ ] 사용자 상태가 `CONFIRMED`임
- [ ] Cognito Client에 `ALLOW_USER_SRP_AUTH` 활성화됨

---

## 📞 추가 도움

문제가 계속되면:
1. 브라우저 콘솔의 전체 에러 메시지 복사
2. Network 탭의 실패한 요청 Response 확인
3. `.env` 파일 내용 확인 (민감 정보 제외)
4. Cognito User Pool 설정 스크린샷
