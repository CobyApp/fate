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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: result.Item
        })
      };
    } else {
      // 최근 기록 조회 (최대 10개)
      const result = await dynamodb.scan({
        TableName: TABLE_NAME,
        Limit: 10
      }).promise();

      // 생성일 기준 내림차순 정렬
      const items = result.Items.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
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
