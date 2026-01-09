// Lambda 함수: 사주 기록 조회
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.FATE_TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    // 사용자 ID 추출 (JWT 토큰에서)
    let userId = null;
    try {
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // JWT 파싱 (간단한 base64 디코딩)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          userId = payload.sub || payload['cognito:username'] || null;
          console.log('사용자 ID 추출 성공:', userId);
        }
      }
    } catch (tokenError) {
      console.warn('⚠️ 사용자 ID 추출 실패:', tokenError.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '인증이 필요합니다.' })
      };
    }

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '사용자 인증이 필요합니다.' })
      };
    }

    const { id } = event.pathParameters || {};

    if (id) {
      // 특정 기록 조회
      const result = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: { id }
      }).promise();

      if (!result.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '기록을 찾을 수 없습니다.' })
        };
      }

      // 사용자 본인의 기록만 조회 가능
      if (result.Item.userId !== userId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: '접근 권한이 없습니다.' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: result.Item
        })
      };
    } else {
      // 사용자별 최근 기록 조회 (최대 50개)
      // DynamoDB는 userId로 인덱싱이 필요하지만, 간단한 방법으로 scan + filter 사용
      const result = await dynamodb.scan({
        TableName: TABLE_NAME,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        Limit: 50
      }).promise();

      // 생성일 기준 내림차순 정렬
      const items = (result.Items || []).sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: items
        })
      };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '서버 오류가 발생했습니다.' })
    };
  }
};
