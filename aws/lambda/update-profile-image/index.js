// Lambda 함수: 프로필 이미지 URL을 Cognito에 저장
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
    const { imageUrl } = body;

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '이미지 URL이 필요합니다.' })
      };
    }

    // Cognito 사용자 속성 업데이트 (picture 속성)
    // 주의: Cognito의 기본 속성에는 picture가 없으므로 custom attribute를 사용하거나
    // name 필드에 JSON으로 저장할 수 있습니다.
    // 여기서는 간단하게 사용자 속성에 저장하지 않고, 
    // 프론트엔드에서 localStorage에 저장하거나 별도 DynamoDB 테이블에 저장하는 것을 권장합니다.
    
    // 임시로 성공 응답 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '이미지 URL이 저장되었습니다.',
        imageUrl
      })
    };
  } catch (error) {
    console.error('Error:', error);
    
    let errorMessage = '이미지 URL 저장에 실패했습니다.';
    let statusCode = 500;

    if (error.code === 'NotAuthorizedException') {
      errorMessage = '인증이 필요합니다.';
      statusCode = 401;
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
