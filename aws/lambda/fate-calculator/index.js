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
    const { 
      birthDate, 
      birthTime, 
      gender, 
      language = 'ko',
      category = 'saju',
      partnerBirthDate,
      partnerBirthTime,
      partnerGender,
      zodiacYear
    } = body;

    // 카테고리별 필수 입력 검증
    if (category === 'today') {
      // 오늘의 운세는 생년월일 없이도 가능
    } else if (category === 'zodiac') {
      if (!zodiacYear) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '띠 선택은 필수입니다.' })
        };
      }
    } else {
    if (!birthDate || !gender) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '생년월일과 성별은 필수입니다.' })
      };
      }
    }

    if (category === 'compatibility' && (!partnerBirthDate || !partnerGender)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '상대방 생년월일과 성별은 필수입니다.' })
      };
    }

    // Gemini API를 사용한 운세 계산
    const fateResult = await calculateFateWithGemini(
      birthDate, 
      birthTime, 
      gender, 
      language,
      category,
      partnerBirthDate,
      partnerBirthTime,
      partnerGender,
      zodiacYear
    );

    // DynamoDB에 저장
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      birthDate: birthDate || '',
      birthTime: birthTime || '00:00',
      gender: gender || '',
      category,
      partnerBirthDate: partnerBirthDate || '',
      partnerBirthTime: partnerBirthTime || '',
      partnerGender: partnerGender || '',
      zodiacYear: zodiacYear || '',
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

async function calculateFateWithGemini(
  birthDate, 
  birthTime, 
  gender, 
  language = 'ko',
  category = 'saju',
  partnerBirthDate = '',
  partnerBirthTime = '',
  partnerGender = '',
  zodiacYear = ''
) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  let year, month, day, hour = 0;
  if (birthDate) {
  const date = new Date(birthDate);
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
    
    if (birthTime) {
      const [h, m] = birthTime.split(':');
      hour = parseInt(h) || 0;
    }
  }

  let partnerYear, partnerMonth, partnerDay, partnerHour = 0;
  if (partnerBirthDate) {
    const partnerDate = new Date(partnerBirthDate);
    partnerYear = partnerDate.getFullYear();
    partnerMonth = partnerDate.getMonth() + 1;
    partnerDay = partnerDate.getDate();
    
    if (partnerBirthTime) {
      const [h, m] = partnerBirthTime.split(':');
      partnerHour = parseInt(h) || 0;
    }
  }

  // 카테고리별 프롬프트 생성
  const getPromptByCategory = (lang, cat) => {
    const categoryPrompts = {
      tojeong: {
        ko: `토정 이지함 선생의 토정비결 방법론을 바탕으로 운명을 점쳐주세요.
${year ? `생년월일: ${year}년 ${month}월 ${day}일` : ''}
${birthTime ? `생시: ${hour}시` : ''}
${gender ? `성별: ${gender === 'male' ? '남성' : '여성'}` : ''}

토정비결의 핵심인 간지, 십이신살, 오행 등을 활용하여 상세한 운명 분석을 제공해주세요.`,
        en: `Analyze fate based on Tojeong Lee Ji-ham's Tojeongbigyeol methodology.
${year ? `Birth Date: ${year}-${month}-${day}` : ''}
${birthTime ? `Birth Time: ${hour}:00` : ''}
${gender ? `Gender: ${gender === 'male' ? 'Male' : 'Female'}` : ''}

Provide detailed fate analysis using the core elements of Tojeongbigyeol including Ganji, Twelve Gods, and Five Elements.`,
        ja: `土亭 李之函先生の土亭秘訣方法論に基づいて運命を占ってください。
${year ? `生年月日: ${year}年${month}月${day}日` : ''}
${birthTime ? `生時: ${hour}時` : ''}
${gender ? `性別: ${gender === 'male' ? '男性' : '女性'}` : ''}

干支、十二神殺、五行など土亭秘訣の核心要素を活用して、詳細な運命分析を提供してください。`
      },
      saju: {
        ko: `전통 사주명리학 관점에서 상세한 사주 분석을 해주세요.
${year ? `생년월일: ${year}년 ${month}월 ${day}일` : ''}
${birthTime ? `생시: ${hour}시` : ''}
${gender ? `성별: ${gender === 'male' ? '남성' : '여성'}` : ''}

사주팔자, 일간, 십성, 대운 등을 분석하여 정확한 운세를 제공해주세요.`,
        en: `Provide detailed Four Pillars analysis from a traditional perspective.
${year ? `Birth Date: ${year}-${month}-${day}` : ''}
${birthTime ? `Birth Time: ${hour}:00` : ''}
${gender ? `Gender: ${gender === 'male' ? 'Male' : 'Female'}` : ''}

Analyze the Eight Characters, Day Stem, Ten Gods, and Grand Fortune to provide accurate fortune.`,
        ja: `伝統的な四柱命理学の観点から詳細な四柱分析を行ってください。
${year ? `生年月日: ${year}年${month}月${day}日` : ''}
${birthTime ? `生時: ${hour}時` : ''}
${gender ? `性別: ${gender === 'male' ? '男性' : '女性'}` : ''}

四柱八字、日干、十星、大運などを分析して、正確な運勢を提供してください。`
      },
      compatibility: {
        ko: `두 사람의 사주를 비교하여 궁합을 분석해주세요.

첫 번째 사람:
생년월일: ${year}년 ${month}월 ${day}일
${birthTime ? `생시: ${hour}시` : ''}
성별: ${gender === 'male' ? '남성' : '여성'}

두 번째 사람:
생년월일: ${partnerYear}년 ${partnerMonth}월 ${partnerDay}일
${partnerBirthTime ? `생시: ${partnerHour}시` : ''}
성별: ${partnerGender === 'male' ? '남성' : '여성'}

사주팔자, 오행, 십성 등을 비교하여 상세한 궁합 분석을 제공해주세요.`,
        en: `Analyze compatibility by comparing the Four Pillars of two people.

First Person:
Birth Date: ${year}-${month}-${day}
${birthTime ? `Birth Time: ${hour}:00` : ''}
Gender: ${gender === 'male' ? 'Male' : 'Female'}

Second Person:
Birth Date: ${partnerYear}-${partnerMonth}-${partnerDay}
${partnerBirthTime ? `Birth Time: ${partnerHour}:00` : ''}
Gender: ${partnerGender === 'male' ? 'Male' : 'Female'}

Compare the Eight Characters, Five Elements, and Ten Gods to provide detailed compatibility analysis.`,
        ja: `二人の四柱を比較して相性を分析してください。

一人目:
生年月日: ${year}年${month}月${day}日
${birthTime ? `生時: ${hour}時` : ''}
性別: ${gender === 'male' ? '男性' : '女性'}

二人目:
生年月日: ${partnerYear}年${partnerMonth}月${partnerDay}日
${partnerBirthTime ? `生時: ${partnerHour}時` : ''}
性別: ${partnerGender === 'male' ? '男性' : '女性'}

四柱八字、五行、十星などを比較して、詳細な相性分析を提供してください。`
      },
      love: {
        ko: `연인과의 관계와 애정운을 분석해주세요.
${year ? `생년월일: ${year}년 ${month}월 ${day}일` : ''}
${birthTime ? `생시: ${hour}시` : ''}
성별: ${gender === 'male' ? '남성' : '여성'}

애정운, 결혼운, 연인과의 관계 등을 사주명리학 관점에서 상세히 분석해주세요.`,
        en: `Analyze love relationship and romantic fortune.
${year ? `Birth Date: ${year}-${month}-${day}` : ''}
${birthTime ? `Birth Time: ${hour}:00` : ''}
Gender: ${gender === 'male' ? 'Male' : 'Female'}

Provide detailed analysis of love fortune, marriage fortune, and relationships from a Four Pillars perspective.`,
        ja: `恋人との関係と愛情運を分析してください。
${year ? `生年月日: ${year}年${month}月${day}日` : ''}
${birthTime ? `生時: ${hour}時` : ''}
性別: ${gender === 'male' ? '男性' : '女性'}

愛情運、結婚運、恋人との関係などを四柱命理学の観点から詳細に分析してください。`
      },
      today: {
        ko: `오늘(${currentYear}년 ${currentMonth}월 ${currentDay}일)의 운세를 분석해주세요.
${year ? `생년월일: ${year}년 ${month}월 ${day}일` : ''}
${birthTime ? `생시: ${hour}시` : ''}
${gender ? `성별: ${gender === 'male' ? '남성' : '여성'}` : ''}

오늘 하루의 운세, 조언, 주의사항 등을 제공해주세요.`,
        en: `Analyze today's (${currentYear}-${currentMonth}-${currentDay}) fortune.
${year ? `Birth Date: ${year}-${month}-${day}` : ''}
${birthTime ? `Birth Time: ${hour}:00` : ''}
${gender ? `Gender: ${gender === 'male' ? 'Male' : 'Female'}` : ''}

Provide today's fortune, advice, and cautions.`,
        ja: `今日（${currentYear}年${currentMonth}月${currentDay}日）の運勢を分析してください。
${year ? `生年月日: ${year}年${month}月${day}日` : ''}
${birthTime ? `生時: ${hour}時` : ''}
${gender ? `性別: ${gender === 'male' ? '男性' : '女性'}` : ''}

今日一日の運勢、アドバイス、注意事項などを提供してください。`
      },
      zodiac: {
        ko: `띠별 운세를 분석해주세요.
띠: ${zodiacYear === 'rat' ? '쥐띠' : zodiacYear === 'ox' ? '소띠' : zodiacYear === 'tiger' ? '호랑이띠' : zodiacYear === 'rabbit' ? '토끼띠' : zodiacYear === 'dragon' ? '용띠' : zodiacYear === 'snake' ? '뱀띠' : zodiacYear === 'horse' ? '말띠' : zodiacYear === 'goat' ? '양띠' : zodiacYear === 'monkey' ? '원숭이띠' : zodiacYear === 'rooster' ? '닭띠' : zodiacYear === 'dog' ? '개띠' : '돼지띠'}
연도: ${currentYear}년

${currentYear}년 올해의 운세, 각 분야별 운세, 조언 등을 상세히 제공해주세요.`,
        en: `Analyze zodiac fortune.
Zodiac: ${zodiacYear === 'rat' ? 'Rat' : zodiacYear === 'ox' ? 'Ox' : zodiacYear === 'tiger' ? 'Tiger' : zodiacYear === 'rabbit' ? 'Rabbit' : zodiacYear === 'dragon' ? 'Dragon' : zodiacYear === 'snake' ? 'Snake' : zodiacYear === 'horse' ? 'Horse' : zodiacYear === 'goat' ? 'Goat' : zodiacYear === 'monkey' ? 'Monkey' : zodiacYear === 'rooster' ? 'Rooster' : zodiacYear === 'dog' ? 'Dog' : 'Pig'}
Year: ${currentYear}

Provide detailed fortune for ${currentYear}, fortune by field, and advice.`,
        ja: `干支別の運勢を分析してください。
干支: ${zodiacYear === 'rat' ? '子' : zodiacYear === 'ox' ? '丑' : zodiacYear === 'tiger' ? '寅' : zodiacYear === 'rabbit' ? '卯' : zodiacYear === 'dragon' ? '辰' : zodiacYear === 'snake' ? '巳' : zodiacYear === 'horse' ? '午' : zodiacYear === 'goat' ? '未' : zodiacYear === 'monkey' ? '申' : zodiacYear === 'rooster' ? '酉' : zodiacYear === 'dog' ? '戌' : '亥'}
年度: ${currentYear}年

${currentYear}年の今年の運勢、各分野別の運勢、アドバイスなどを詳細に提供してください。`
      },
      newyear: {
        ko: `신년(${currentYear}년) 운세를 분석해주세요.
${year ? `생년월일: ${year}년 ${month}월 ${day}일` : ''}
${birthTime ? `생시: ${hour}시` : ''}
성별: ${gender === 'male' ? '남성' : '여성'}

${currentYear}년 새해의 전반적인 운세, 각 분야별 운세, 조언 등을 상세히 제공해주세요.`,
        en: `Analyze New Year (${currentYear}) fortune.
${year ? `Birth Date: ${year}-${month}-${day}` : ''}
${birthTime ? `Birth Time: ${hour}:00` : ''}
Gender: ${gender === 'male' ? 'Male' : 'Female'}

Provide detailed overall fortune for ${currentYear}, fortune by field, and advice.`,
        ja: `新年（${currentYear}年）の運勢を分析してください。
${year ? `生年月日: ${year}年${month}月${day}日` : ''}
${birthTime ? `生時: ${hour}時` : ''}
性別: ${gender === 'male' ? '男性' : '女性'}

${currentYear}年の新年の全体的な運勢、各分野別の運勢、アドバイスなどを詳細に提供してください。`
      }
    };

    return categoryPrompts[cat]?.[lang] || categoryPrompts.saju[lang];
  };

  // 언어별 시스템 프롬프트
  const systemPrompts = {
    ko: '당신은 전통 사주명리학 전문가입니다. 정확하고 상세한 운세 분석을 제공합니다.',
    en: 'You are an expert in traditional Four Pillars fortune telling. Provide accurate and detailed fortune analysis.',
    ja: 'あなたは伝統的な四柱命理学の専門家です。正確で詳細な運勢分析を提供します。'
  };

  const instruction = getPromptByCategory(language, category);

  // 카테고리별 JSON 응답 형식
  const getJsonFormat = (lang, cat) => {
    const needsElements = cat === 'saju' || cat === 'tojeong';
    const langName = lang === 'ko' ? '한국어' : (lang === 'en' ? 'English' : '日本語');
    const langNameEn = lang === 'ko' ? 'Korean' : (lang === 'en' ? 'English' : 'Japanese');
    
    let jsonFormat = '';
    
    if (lang === 'ko') {
      jsonFormat = `다음 형식의 JSON으로 응답해주세요:
{
  "fortune": "간단한 운세 요약 (1-2문장)",
  "description": "상세한 운세 설명 (500자 이상, ${langName}로 작성)"`;
      
      if (needsElements) {
        jsonFormat += `,
  "year": ${year || 'null'},
  "month": ${month || 'null'},
  "day": ${day || 'null'},
  "elements": {
    "wood": 0-100 사이 숫자,
    "fire": 0-100 사이 숫자,
    "earth": 0-100 사이 숫자,
    "metal": 0-100 사이 숫자,
    "water": 0-100 사이 숫자
  }`;
      }
      
      jsonFormat += `\n}

응답은 반드시 유효한 JSON 형식이어야 하며, 설명은 상세하고 실용적이어야 합니다. JSON 형식만 응답하고 다른 설명은 포함하지 마세요.`;
    } else if (lang === 'en') {
      jsonFormat = `Please respond in the following JSON format:
{
  "fortune": "Brief fortune summary (1-2 sentences)",
  "description": "Detailed fortune description (at least 500 characters, written in ${langNameEn})"`;
      
      if (needsElements) {
        jsonFormat += `,
  "year": ${year || 'null'},
  "month": ${month || 'null'},
  "day": ${day || 'null'},
  "elements": {
    "wood": number between 0-100,
    "fire": number between 0-100,
    "earth": number between 0-100,
    "metal": number between 0-100,
    "water": number between 0-100
  }`;
      }
      
      jsonFormat += `\n}

Respond only in valid JSON format. The description must be detailed and practical. Do not include any additional explanations outside the JSON.`;
    } else {
      jsonFormat = `以下のJSON形式で応答してください:
{
  "fortune": "簡単な運勢要約 (1-2文)",
  "description": "詳細な運勢説明 (500文字以上、${langName}で記述)"`;
      
      if (needsElements) {
        jsonFormat += `,
  "year": ${year || 'null'},
  "month": ${month || 'null'},
  "day": ${day || 'null'},
  "elements": {
    "wood": 0-100の数字,
    "fire": 0-100の数字,
    "earth": 0-100の数字,
    "metal": 0-100の数字,
    "water": 0-100の数字
  }`;
      }
      
      jsonFormat += `\n}

JSON形式のみで応答し、他の説明は含めないでください。説明は詳細で実用的である必要があります。`;
    }
    
    return jsonFormat;
  };

  // 전체 프롬프트 조합
  const fullPrompt = `${systemPrompts[language] || systemPrompts.ko}

${instruction}

${getJsonFormat(language, category)}`;

  try {
    const response = await callGeminiAPI(fullPrompt);
    const fortune = JSON.parse(response);
    
    // 기본 구조 확인 및 보완
    const needsElements = category === 'saju' || category === 'tojeong';
    const result = {
      category,
      fortune: fortune.fortune || (language === 'ko' ? '중길' : (language === 'en' ? 'Medium Fortune' : '中吉')),
      description: fortune.description || (language === 'ko' ? '운세 분석이 완료되었습니다.' : (language === 'en' ? 'Fortune analysis completed.' : '運勢分析が完了しました。'))
    };

    if (needsElements && year) {
      result.year = fortune.year || year;
      result.month = fortune.month || month;
      result.day = fortune.day || day;
      result.gender = fortune.gender || gender;
      result.elements = {
        wood: fortune.elements?.wood || 50,
        fire: fortune.elements?.fire || 50,
        earth: fortune.elements?.earth || 50,
        metal: fortune.elements?.metal || 50,
        water: fortune.elements?.water || 50
      };
    } else if (year) {
      result.year = year;
      result.month = month;
      result.day = day;
      result.gender = gender;
    }

    return result;
  } catch (error) {
    console.error('Gemini API 오류:', error);
    
    // 언어별 에러 메시지
    const errorMessages = {
      ko: '운세 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      en: 'An error occurred during fortune analysis. Please try again later.',
      ja: '運勢分析中にエラーが発生しました。しばらくしてから再度お試しください。'
    };
    
    // API 오류 시 기본 응답 반환
    const needsElements = category === 'saju' || category === 'tojeong';
    const errorResult = {
      category,
      fortune: language === 'ko' ? '중길' : (language === 'en' ? 'Medium Fortune' : '中吉'),
      description: errorMessages[language] || errorMessages.ko
    };

    if (needsElements && year) {
      errorResult.year = year;
      errorResult.month = month;
      errorResult.day = day;
      errorResult.gender = gender;
      errorResult.elements = {
        wood: 50,
        fire: 50,
        earth: 50,
        metal: 50,
        water: 50
      };
    }

    return errorResult;
  }
}

function callGeminiAPI(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
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
