import { Amplify } from 'aws-amplify';

// 환경 변수에서 Cognito 설정 가져오기
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
const region = import.meta.env.VITE_AWS_REGION || 'ap-northeast-2';

// Amplify 설정
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: userPoolId || '',
      userPoolClientId: userPoolClientId || '',
      region: region,
      loginWith: {
        email: true,
      },
    },
  },
});

export default Amplify;
