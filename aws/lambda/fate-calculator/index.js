// Lambda 함수: 사주 계산
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.FATE_TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const body = JSON.parse(event.body);
    const { birthDate, birthTime, gender } = body;

    if (!birthDate || !gender) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '생년월일과 성별은 필수입니다.' })
      };
    }

    // 사주 계산 로직 (간단한 예시)
    const fateResult = calculateFate(birthDate, birthTime, gender);

    // DynamoDB에 저장
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      birthDate,
      birthTime: birthTime || '00:00',
      gender,
      result: fateResult,
      createdAt: new Date().toISOString()
    };

    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: item
    }).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: fateResult,
        id: item.id
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '서버 오류가 발생했습니다.' })
    };
  }
};

function calculateFate(birthDate, birthTime, gender) {
  // 간단한 사주 계산 예시
  // 실제로는 더 복잡한 사주 계산 로직이 필요합니다
  const date = new Date(birthDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 간단한 운세 계산 (실제 사주 로직으로 대체 필요)
  const fortune = {
    year: year,
    month: month,
    day: day,
    gender: gender,
    fortune: ['대길', '중길', '소길'][Math.floor(Math.random() * 3)],
    description: '당신의 운명은 밝습니다. 긍정적인 에너지가 흐르고 있습니다.',
    elements: {
      wood: Math.floor(Math.random() * 100),
      fire: Math.floor(Math.random() * 100),
      earth: Math.floor(Math.random() * 100),
      metal: Math.floor(Math.random() * 100),
      water: Math.floor(Math.random() * 100)
    }
  };

  return fortune;
}
