import { Amplify } from 'aws-amplify';

// 환경 변수에서 Cognito 설정 가져오기
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
const region = import.meta.env.VITE_AWS_REGION || 'ap-northeast-2';

// 환경 변수 확인
if (!userPoolId || !userPoolClientId) {
  console.error('Cognito 설정 오류: 환경 변수가 설정되지 않았습니다.');
  console.error('VITE_COGNITO_USER_POOL_ID:', userPoolId);
  console.error('VITE_COGNITO_USER_POOL_CLIENT_ID:', userPoolClientId);
  console.error('.env 파일을 확인하세요.');
}

// Amplify v6 설정 형식
if (userPoolId && userPoolClientId) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: userPoolId,
        userPoolClientId: userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });
} else {
  console.error('⚠️ Amplify 설정 실패: 환경 변수가 설정되지 않았습니다.');
  console.error('User Pool ID:', userPoolId || '없음');
  console.error('Client ID:', userPoolClientId || '없음');
}

export default Amplify;
