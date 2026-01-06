# Cognito 인증 설정 가이드

이 프로젝트는 AWS Cognito를 사용하여 사용자 인증을 처리합니다.

## 📋 Cognito 리소스

CloudFormation 템플릿에 다음 Cognito 리소스가 포함되어 있습니다:

1. **User Pool**: 사용자 인증 및 관리
2. **User Pool Client**: 애플리케이션 클라이언트
3. **Identity Pool** (선택사항): AWS 서비스 접근용

## 🔧 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
VITE_COGNITO_USER_POOL_ID=ap-northeast-2_xxxxxxxxx
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=ap-northeast-2
VITE_API_URL=https://your-api-id.execute-api.ap-northeast-2.amazonaws.com/dev
```

## 📝 배포 후 값 확인

### 방법 1: CloudFormation 출력에서 확인

```bash
aws cloudformation describe-stacks \
  --stack-name fate-stack \
  --region ap-northeast-2 \
  --query 'Stacks[0].Outputs'
```

### 방법 2: AWS 콘솔에서 확인

1. **User Pool ID 확인**:
   - AWS 콘솔 > Cognito > User pools
   - `fate-user-pool-dev` 선택
   - Pool ID 복사

2. **User Pool Client ID 확인**:
   - 같은 User Pool에서 "App integration" 탭
   - App client 목록에서 Client ID 복사

## 🎯 인증 흐름

1. **회원가입**: 사용자가 이메일과 비밀번호로 회원가입
2. **이메일 인증**: Cognito가 이메일로 인증 코드 전송
3. **인증 확인**: 사용자가 인증 코드 입력
4. **로그인**: 이메일과 비밀번호로 로그인
5. **토큰 발급**: Cognito가 JWT 토큰 발급
6. **API 호출**: 토큰을 Authorization 헤더에 포함하여 API 호출

## 🔐 비밀번호 정책

현재 설정된 비밀번호 정책:
- 최소 8자 이상
- 대문자 포함 필수
- 소문자 포함 필수
- 숫자 포함 필수
- 특수문자 선택사항

## 🧪 테스트

### 회원가입 테스트

1. 애플리케이션 실행
2. "회원가입" 클릭
3. 이메일과 비밀번호 입력
4. 이메일에서 인증 코드 확인
5. 인증 코드 입력하여 인증 완료

### 로그인 테스트

1. 이메일과 비밀번호로 로그인
2. 홈 페이지로 리다이렉트 확인
3. 사주 계산 기능 테스트

## ⚠️ 문제 해결

### "User pool not found" 오류
- `.env` 파일의 `VITE_COGNITO_USER_POOL_ID` 확인
- User Pool이 올바른 리전에 배포되었는지 확인

### "Invalid client ID" 오류
- `.env` 파일의 `VITE_COGNITO_USER_POOL_CLIENT_ID` 확인
- Client ID가 User Pool과 연결되어 있는지 확인

### 이메일 인증 코드를 받지 못함
- 스팸 폴더 확인
- Cognito 콘솔에서 이메일 설정 확인
- 개발 환경에서는 Cognito 콘솔에서 직접 사용자 인증 가능

### 로그인 후 토큰 오류
- 브라우저 개발자 도구에서 네트워크 탭 확인
- Authorization 헤더가 포함되어 있는지 확인
- API Gateway에서 CORS 설정 확인

## 📚 참고 자료

- [AWS Amplify Auth 문서](https://docs.amplify.aws/react/build-a-backend/auth/)
- [Cognito User Pool 문서](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
