// Lambda 함수: 비밀번호 변경
const AWS = require('aws-sdk');

const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // CORS preflight 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Authorization 헤더에서 액세스 토큰 추출
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '인증 토큰이 필요합니다.' })
      };
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // 요청 본문 파싱
    const body = JSON.parse(event.body);
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '현재 비밀번호와 새 비밀번호는 필수입니다.' })
      };
    }

    // 비밀번호 정책 검증
    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '비밀번호는 최소 8자 이상이어야 합니다.' })
      };
    }

    if (!/[A-Z]/.test(newPassword)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '비밀번호에 대문자가 포함되어야 합니다.' })
      };
    }

    if (!/[a-z]/.test(newPassword)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '비밀번호에 소문자가 포함되어야 합니다.' })
      };
    }

    if (!/[0-9]/.test(newPassword)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '비밀번호에 숫자가 포함되어야 합니다.' })
      };
    }

    // Cognito ChangePassword API 호출
    await cognitoIdentityServiceProvider.changePassword({
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword,
      AccessToken: accessToken
    }).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다.'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    
    let errorMessage = '비밀번호 변경에 실패했습니다.';
    let statusCode = 500;

    // Cognito 에러 처리
    if (error.code === 'NotAuthorizedException') {
      errorMessage = '현재 비밀번호가 올바르지 않습니다.';
      statusCode = 401;
    } else if (error.code === 'InvalidPasswordException') {
      errorMessage = '새 비밀번호가 정책을 만족하지 않습니다.';
      statusCode = 400;
    } else if (error.code === 'InvalidParameterException') {
      errorMessage = '비밀번호가 너무 짧거나 정책을 만족하지 않습니다.';
      statusCode = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({ error: errorMessage })
    };
  }
};
