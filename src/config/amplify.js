import { Amplify } from 'aws-amplify';

// 환경 변수에서 Cognito 설정 가져오기
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
const region = import.meta.env.VITE_AWS_REGION || 'ap-northeast-2';

// Amplify v5 설정 형식
Amplify.configure({
  Auth: {
    region: region,
    userPoolId: userPoolId || '',
    userPoolWebClientId: userPoolClientId || '',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_PASSWORD_AUTH',
  },
});

export default Amplify;
