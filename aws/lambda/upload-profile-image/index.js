// Lambda 함수: 프로필 이미지 업로드 (Presigned URL 생성)
const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

const BUCKET_NAME = process.env.PROFILE_IMAGE_BUCKET;
// AWS_REGION은 Lambda가 자동으로 제공하는 예약된 환경 변수
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-northeast-1';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

    // 사용자 정보 가져오기
    const userInfo = await cognitoIdentityServiceProvider.getUser({
      AccessToken: accessToken
    }).promise();

    const userId = userInfo.Username;
    const fileExtension = event.pathParameters?.extension || 'jpg';

    // 파일명 생성: userId-timestamp.extension
    const timestamp = Date.now();
    const fileName = `${userId}-${timestamp}.${fileExtension}`;
    const key = `profiles/${fileName}`;

    // Presigned URL 생성 (업로드용)
    const uploadUrl = s3.getSignedUrl('putObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`,
      Expires: 300 // 5분
    });

    // 이미지 URL 생성 (조회용)
    const imageUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        uploadUrl,
        imageUrl,
        key
      })
    };
  } catch (error) {
    console.error('Error:', error);
    
    let errorMessage = '이미지 업로드 URL 생성에 실패했습니다.';
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
