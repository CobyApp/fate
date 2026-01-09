// Lambda 함수: 사주 계산 (Google Gemini API 사용)
const AWS = require('aws-sdk');
const https = require('https');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.FATE_TABLE_NAME;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
    const body = JSON.parse(event.body);
    const { birthDate, birthTime, gender, language = 'ko' } = body;

    if (!birthDate || !gender) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '생년월일과 성별은 필수입니다.' })
      };
    }

    // Gemini API를 사용한 사주 계산
    const fateResult = await calculateFateWithGemini(birthDate, birthTime, gender, language);

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

async function calculateFateWithGemini(birthDate, birthTime, gender, language = 'ko') {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }

  const date = new Date(birthDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 시간 파싱
  let hour = 0;
  if (birthTime) {
    const [h, m] = birthTime.split(':');
    hour = parseInt(h) || 0;
  }

  // 언어별 프롬프트 템플릿
  const prompts = {
    ko: {
      system: '당신은 전통 사주명리학 전문가입니다. 정확하고 상세한 사주 분석을 제공합니다.',
      instruction: `다음 정보를 바탕으로 전통 사주명리학 관점에서 상세한 사주 분석을 해주세요.

생년월일: ${year}년 ${month}월 ${day}일
생시: ${hour}시
성별: ${gender === 'male' ? '남성' : '여성'}

다음 형식의 JSON으로 응답해주세요:
{
  "year": ${year},
  "month": ${month},
  "day": ${day},
  "gender": "${gender}",
  "fortune": "대길/중길/소길 중 하나",
  "description": "상세한 사주 분석 설명 (200자 이상, 한국어로 작성)",
  "elements": {
    "wood": 0-100 사이 숫자,
    "fire": 0-100 사이 숫자,
    "earth": 0-100 사이 숫자,
    "metal": 0-100 사이 숫자,
    "water": 0-100 사이 숫자
  }
}

JSON 형식만 응답하고 다른 설명은 포함하지 마세요. 모든 내용은 한국어로 작성해주세요.`,
      genderLabels: { male: '남성', female: '여성' },
      fortuneLabels: { great: '대길', medium: '중길', small: '소길' }
    },
    en: {
      system: 'You are an expert in traditional Korean fortune telling (Saju). Provide accurate and detailed fortune analysis.',
      instruction: `Please provide a detailed fortune analysis based on traditional Korean Saju (Four Pillars) fortune telling using the following information:

Birth Date: ${month}/${day}/${year}
Birth Time: ${hour}:00
Gender: ${gender === 'male' ? 'Male' : 'Female'}

Please respond in the following JSON format:
{
  "year": ${year},
  "month": ${month},
  "day": ${day},
  "gender": "${gender}",
  "fortune": "Great Fortune/Medium Fortune/Small Fortune (choose one)",
  "description": "Detailed fortune analysis description (at least 200 characters, written in English)",
  "elements": {
    "wood": number between 0-100,
    "fire": number between 0-100,
    "earth": number between 0-100,
    "metal": number between 0-100,
    "water": number between 0-100
  }
}

Respond only in JSON format without any additional explanations. Write all content in English.`,
      genderLabels: { male: 'Male', female: 'Female' },
      fortuneLabels: { great: 'Great Fortune', medium: 'Medium Fortune', small: 'Small Fortune' }
    },
    ja: {
      system: 'あなたは伝統的な韓国の四柱推命の専門家です。正確で詳細な占い分析を提供します。',
      instruction: `以下の情報を基に、伝統的な韓国の四柱推命の観点から詳細な占い分析を行ってください。

生年月日: ${year}年${month}月${day}日
生時: ${hour}時
性別: ${gender === 'male' ? '男性' : '女性'}

以下のJSON形式で応答してください:
{
  "year": ${year},
  "month": ${month},
  "day": ${day},
  "gender": "${gender}",
  "fortune": "大吉/中吉/小吉のいずれか",
  "description": "詳細な占い分析の説明（200文字以上、日本語で記述）",
  "elements": {
    "wood": 0-100の数字,
    "fire": 0-100の数字,
    "earth": 0-100の数字,
    "metal": 0-100の数字,
    "water": 0-100の数字
  }
}

JSON形式のみで応答し、他の説明は含めないでください。すべての内容は日本語で記述してください。`,
      genderLabels: { male: '男性', female: '女性' },
      fortuneLabels: { great: '大吉', medium: '中吉', small: '小吉' }
    }
  };

  // 언어 선택 (기본값: 한국어)
  const langPrompt = prompts[language] || prompts.ko;
  const prompt = langPrompt.instruction;

  try {
    const response = await callGeminiAPI(prompt, langPrompt.system);
    const fortune = JSON.parse(response);
    
    // 기본 구조 확인 및 보완
    return {
      year: fortune.year || year,
      month: fortune.month || month,
      day: fortune.day || day,
      gender: fortune.gender || gender,
      fortune: fortune.fortune || '중길',
      description: fortune.description || '사주 분석이 완료되었습니다.',
      elements: {
        wood: fortune.elements?.wood || 50,
        fire: fortune.elements?.fire || 50,
        earth: fortune.elements?.earth || 50,
        metal: fortune.elements?.metal || 50,
        water: fortune.elements?.water || 50
      }
    };
  } catch (error) {
    console.error('Gemini API 오류:', error);
    
    // 언어별 에러 메시지
    const errorMessages = {
      ko: '사주 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      en: 'An error occurred during fortune analysis. Please try again later.',
      ja: '占い分析中にエラーが発生しました。しばらくしてから再度お試しください。'
    };
    
    // API 오류 시 기본 응답 반환
    return {
      year: year,
      month: month,
      day: day,
      gender: gender,
      fortune: language === 'ko' ? '중길' : (language === 'en' ? 'Medium Fortune' : '中吉'),
      description: errorMessages[language] || errorMessages.ko,
      elements: {
        wood: 50,
        fire: 50,
        earth: 50,
        metal: 50,
        water: 50
      }
    };
  }
}

function callGeminiAPI(prompt, systemMessage = '당신은 전통 사주명리학 전문가입니다. 정확하고 상세한 사주 분석을 제공합니다.') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemMessage}\n\n${prompt}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(responseData);
          const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            // JSON 부분만 추출 (마크다운 코드 블록 제거)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              resolve(jsonMatch[0]);
            } else {
              resolve(content);
            }
          } else {
            reject(new Error('Gemini 응답에 내용이 없습니다.'));
          }
        } else {
          reject(new Error(`Gemini API 오류: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}
