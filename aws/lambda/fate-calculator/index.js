// Lambda 함수: 사주 계산 (Groq API 사용)
const AWS = require('aws-sdk');
const https = require('https');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.FATE_TABLE_NAME;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // CORS preflight 처리
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Lambda 함수 실행 시작');
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('Event body:', event.body);
    console.log('Event body type:', typeof event.body);
    
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
      // userId가 없어도 계속 진행 (선택적 인증)
    }
    
    // event.body가 없거나 빈 문자열인 경우 처리
    if (!event.body || event.body === '') {
      console.error('❌ event.body가 비어있습니다.');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: '요청 본문이 비어있습니다.' 
        })
      };
    }
    
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      console.error('❌ event.body JSON 파싱 오류:', parseError);
      console.error('event.body 내용:', event.body);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: '요청 본문 형식이 올바르지 않습니다.' 
        })
      };
    }
    const { 
      birthDate, 
      birthTime, 
      gender, 
      language = 'ko',
      category = 'saju',
      partnerBirthDate,
      partnerBirthTime,
      partnerGender,
      zodiacYear,
      constellation
    } = body;
    
    console.log('요청 파라미터:', {
      birthDate,
      birthTime,
      gender,
      language,
      category,
      partnerBirthDate,
      partnerBirthTime,
      partnerGender,
      zodiacYear,
      constellation
    });

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
    } else if (category === 'constellation') {
      if (!constellation) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '별자리 선택은 필수입니다.' })
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

    // Groq API를 사용한 운세 계산
    console.log('운세 계산 시작 - 카테고리:', category);
    const fateResult = await calculateFateWithGroq(
      birthDate, 
      birthTime, 
      gender, 
      language,
      category,
      partnerBirthDate,
      partnerBirthTime,
      partnerGender,
      zodiacYear,
      constellation
    );
    console.log('운세 계산 완료:', JSON.stringify(fateResult, null, 2));

    // DynamoDB에 저장 (비동기 처리 - 응답을 먼저 반환)
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: userId || 'anonymous', // 사용자 ID 추가
      birthDate: birthDate || '',
      birthTime: birthTime || '00:00',
      gender: gender || '',
      category,
      partnerBirthDate: partnerBirthDate || '',
      partnerBirthTime: partnerBirthTime || '',
      partnerGender: partnerGender || '',
      zodiacYear: zodiacYear || '',
      constellation: constellation || '',
      result: fateResult,
      createdAt: new Date().toISOString()
    };

    // 응답을 먼저 반환하고 DynamoDB 저장은 비동기로 처리
    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: fateResult,
        id: item.id
      })
    };

    // DynamoDB 저장을 비동기로 처리 (응답 지연 방지)
    dynamodb.put({
      TableName: TABLE_NAME,
      Item: item
    }).promise()
      .then(() => {
        console.log('DynamoDB 저장 완료 - ID:', item.id);
      })
      .catch((dbError) => {
        console.error('❌ DynamoDB 저장 오류 (비동기):', dbError);
        // 로그만 남기고 응답에는 영향을 주지 않음
      });

    return response;
  } catch (error) {
    console.error('❌ Lambda 함수 오류:', error);
    console.error('오류 타입:', error?.constructor?.name);
    console.error('오류 스택:', error?.stack);
    console.error('오류 메시지:', error?.message);
    console.error('전체 오류 객체:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // 항상 CORS 헤더와 함께 응답 반환
    try {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: error?.message || '서버 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        })
      };
    } catch (responseError) {
      // JSON.stringify 실패 시 (순환 참조 등)
      console.error('❌ 응답 생성 오류:', responseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: '서버 오류가 발생했습니다.'
        })
      };
    }
  }
};

async function calculateFateWithGroq(
  birthDate, 
  birthTime, 
  gender, 
  language = 'ko',
  category = 'saju',
      partnerBirthDate = '',
      partnerBirthTime = '',
      partnerGender = '',
      zodiacYear = '',
      constellation = ''
    ) {
  console.log('calculateFateWithGroq 호출:', { category, language });
  
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY가 설정되지 않았습니다.');
    throw new Error('Groq API 키가 설정되지 않았습니다.');
  }
  
  console.log('GROQ_API_KEY 확인 완료');

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
    // 안전한 문자열 생성 함수
    const safeStr = (val) => (val !== undefined && val !== null && val !== '') ? String(val) : '';
    const safeYear = safeStr(year);
    const safeMonth = safeStr(month);
    const safeDay = safeStr(day);
    const safeHour = safeStr(hour);
    const safeGender = gender === 'male' ? '남성' : (gender === 'female' ? '여성' : '');
    const safePartnerYear = safeStr(partnerYear);
    const safePartnerMonth = safeStr(partnerMonth);
    const safePartnerDay = safeStr(partnerDay);
    const safePartnerHour = safeStr(partnerHour);
    const safePartnerGender = partnerGender === 'male' ? '남성' : (partnerGender === 'female' ? '여성' : '');
    const safeConstellation = safeStr(constellation);
    
    const categoryPrompts = {
      tojeong: {
        ko: '당신은 토정 이지함 선생의 토정비결 전통 명리학 전문가입니다. 다음 정보를 바탕으로 상세하고 정확한 운명 분석을 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            '\n【분석 요청사항】\n' +
            '• 토정비결의 핵심 원리인 간지(干支), 십이신살(十二神煞), 오행(五行) 균형을 종합적으로 분석\n' +
            '• 일간(日干)과 월간(月干), 년간(年干), 시간간(時干)의 상생상극 관계를 자세히 설명\n' +
            '• 십이신살(역마, 화개, 천살 등)을 통한 성격 특성과 인생 전환점 분석\n' +
            '• 오행의 과부족을 통한 건강, 재물, 인연, 직업운 등 각 분야별 운세 제시\n' +
            '• 대운(大運)과 세운(歲運) 변화에 따른 시기별 조언 제공\n' +
            '\n실제 운세 전문가처럼 구체적이고 실용적인 조언을 포함하여 자연스럽게 작성해주세요.',
        en: 'Analyze fate based on Tojeong Lee Ji-ham\'s Tojeongbigyeol methodology.\n' +
            (safeYear ? `Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\nProvide detailed fate analysis using the core elements of Tojeongbigyeol including Ganji, Twelve Gods, and Five Elements.',
        ja: '土亭 李之函先生の土亭秘訣方法論に基づいて運命を占ってください。\n' +
            (safeYear ? `生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `生時: ${safeHour}時\n` : '') +
            (gender ? `性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n干支、十二神殺、五行など土亭秘訣の核心要素を活用して、詳細な運命分析を提供してください。'
      },
      saju: {
        ko: '당신은 전통 사주명리학 전문가입니다. 다음 정보를 바탕으로 상세하고 정확한 사주 분석을 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            '\n【분석 요청사항】\n' +
            '• 사주팔자(四柱八字): 년주(年柱), 월주(月柱), 일주(日柱), 시주(時柱)를 각각 분석\n' +
            '• 일간(日干): 일주의 천간을 기준으로 한 성격, 기질, 재능 분석\n' +
            '• 십성(十星): 정관, 편관, 정재, 편재, 식신, 상관, 비견, 겁재, 인수, 편인의 조합 분석\n' +
            '• 오행(五行) 균형: 목(木), 화(火), 토(土), 금(金), 수(水)의 과부족과 상생상극 관계\n' +
            '• 대운(大運) 분석: 10년 단위의 운세 흐름과 각 시기별 조언\n' +
            '• 세운(歲運) 분석: 올해와 내년의 운세 변화\n' +
            '\n실제 사주 전문가처럼 구체적이고 실용적인 내용으로, 연애운, 재물운, 건강운, 직업운, 인연운 등을 포함하여 자연스럽게 작성해주세요.',
        en: 'Provide detailed Four Pillars analysis from a traditional perspective.\n' +
            (safeYear ? `Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\nAnalyze the Eight Characters, Day Stem, Ten Gods, and Grand Fortune to provide accurate fortune.',
        ja: '伝統的な四柱命理学の観点から詳細な四柱分析を行ってください。\n' +
            (safeYear ? `生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `生時: ${safeHour}時\n` : '') +
            (gender ? `性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n四柱八字、日干、十星、大運などを分析して、正確な運勢を提供してください。'
      },
      compatibility: {
        ko: '당신은 사주명리학 기반 궁합 전문가입니다. 두 사람의 사주를 비교하여 상세하고 실용적인 궁합 분석을 제공해주세요.\n\n' +
            '【첫 번째 사람】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            '\n【두 번째 사람】\n' +
            (safePartnerYear ? `• 생년월일: ${safePartnerYear}년 ${safePartnerMonth}월 ${safePartnerDay}일\n` : '') +
            (partnerBirthTime && safePartnerHour ? `• 생시: ${safePartnerHour}시\n` : '') +
            (safePartnerGender ? `• 성별: ${safePartnerGender}\n` : '') +
            '\n【분석 요청사항】\n' +
            '• 전체 궁합 점수와 평가: 사주팔자, 오행, 십성, 십이신살 등을 종합한 전체 궁합 점수\n' +
            '• 성격 궁합: 일간 상성, 성격 특징 비교, 서로에게 미치는 영향\n' +
            '• 연애/결혼 궁합: 애정운, 결혼 적합도, 결혼 후 생활 조화도\n' +
            '• 오행 균형 비교: 목화토금수 오행의 상생상극 관계 분석\n' +
            '• 갈등 요소와 해결책: 상극하는 부분과 극복 방법\n' +
            '• 조화로운 관계 유지 방법: 궁합이 좋은 분야와 주의할 점\n' +
            '\n실제 궁합 전문가처럼 구체적이고 현실적인 내용으로, 관계 개선에 도움이 되도록 자연스럽게 작성해주세요.',
        en: 'Analyze compatibility by comparing the Four Pillars of two people.\n\n' +
            'First Person:\n' +
            (safeYear ? `Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\nSecond Person:\n' +
            (safePartnerYear ? `Birth Date: ${safePartnerYear}-${safePartnerMonth}-${safePartnerDay}\n` : '') +
            (partnerBirthTime && safePartnerHour ? `Birth Time: ${safePartnerHour}:00\n` : '') +
            (partnerGender ? `Gender: ${partnerGender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\nCompare the Eight Characters, Five Elements, and Ten Gods to provide detailed compatibility analysis.',
        ja: '二人の四柱を比較して相性を分析してください。\n\n' +
            '一人目:\n' +
            (safeYear ? `生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `生時: ${safeHour}時\n` : '') +
            (gender ? `性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n二人目:\n' +
            (safePartnerYear ? `生年月日: ${safePartnerYear}年${safePartnerMonth}月${safePartnerDay}日\n` : '') +
            (partnerBirthTime && safePartnerHour ? `生時: ${safePartnerHour}時\n` : '') +
            (partnerGender ? `性別: ${partnerGender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n四柱八字、五行、十星などを比較して、詳細な相性分析を提供してください。'
      },
      love: {
        ko: '당신은 사주명리학 기반 연애운 전문가입니다. 다음 정보를 바탕으로 상세하고 실용적인 연애운 분석을 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            '\n【분석 요청사항】\n' +
            '• 애정운(愛情運): 현재와 가까운 미래의 연애운세, 인기, 이성운 분석\n' +
            '• 결혼운(結婚運): 적절한 결혼 시기, 배우자와의 궁합, 결혼 후 운세\n' +
            '• 연인과의 관계: 사주상 연인과의 궁합, 갈등 요소, 조화로운 방법\n' +
            '• 이상형과 만남의 시기: 사주상 어울리는 상대의 특징과 만날 수 있는 시기\n' +
            '• 연애 주의사항: 삼가야 할 시기와 행동, 연애 관계를 위한 조언\n' +
            '\n현실적이고 구체적인 내용으로, 연애 고민 해결에 도움이 되도록 자연스럽게 작성해주세요.',
        en: 'Analyze love relationship and romantic fortune.\n' +
            (safeYear ? `Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\nProvide detailed analysis of love fortune, marriage fortune, and relationships from a Four Pillars perspective.',
        ja: '恋人との関係と愛情運を分析してください。\n' +
            (safeYear ? `生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `生時: ${safeHour}時\n` : '') +
            (gender ? `性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n愛情運、結婚運、恋人との関係などを四柱命理学の観点から詳細に分析してください。'
      },
      today: {
        ko: `당신은 사주명리학 기반 일일운세 전문가입니다. 오늘(${currentYear}년 ${currentMonth}월 ${currentDay}일)의 운세를 상세하고 실용적으로 분석해주세요.\n\n` +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            `• 오늘 날짜: ${currentYear}년 ${currentMonth}월 ${currentDay}일\n` +
            '\n【분석 요청사항】\n' +
            '• 오늘의 전체 운세: 사주와 오늘 날짜의 조합으로 본 종합 운세\n' +
            '• 시간대별 운세: 오전, 오후, 저녁 시간대별 운세 변화\n' +
            '• 분야별 운세: 건강운, 재물운, 인연운, 직업운 등 각 분야별 운세\n' +
            '• 행동 조언: 오늘 하루 추천 행동과 삼가야 할 행동\n' +
            '• 색상과 방향: 오늘 유리한 색상, 방향, 숫자 등\n' +
            '• 주의사항: 건강, 안전, 인간관계 등 주의해야 할 점\n' +
            '\n실제 일일운세 전문가처럼 구체적이고 실용적인 내용으로, 오늘 하루를 잘 보낼 수 있도록 자연스럽게 작성해주세요.',
        en: `Analyze today's (${currentYear}-${currentMonth}-${currentDay}) fortune.\n` +
            (safeYear ? `Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\nProvide today\'s fortune, advice, and cautions.',
        ja: `今日（${currentYear}年${currentMonth}月${currentDay}日）の運勢を分析してください。\n` +
            (safeYear ? `生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `生時: ${safeHour}時\n` : '') +
            (gender ? `性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n今日一日の運勢、アドバイス、注意事項などを提供してください。'
      },
      zodiac: {
        ko: '당신은 띠별 운세 전문가입니다. 다음 정보를 바탕으로 상세하고 실용적인 띠별 운세를 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            '• 띠: ' + (zodiacYear === 'rat' ? '쥐띠 (子)' : zodiacYear === 'ox' ? '소띠 (丑)' : zodiacYear === 'tiger' ? '호랑이띠 (寅)' : zodiacYear === 'rabbit' ? '토끼띠 (卯)' : zodiacYear === 'dragon' ? '용띠 (辰)' : zodiacYear === 'snake' ? '뱀띠 (巳)' : zodiacYear === 'horse' ? '말띠 (午)' : zodiacYear === 'goat' ? '양띠 (未)' : zodiacYear === 'monkey' ? '원숭이띠 (申)' : zodiacYear === 'rooster' ? '닭띠 (酉)' : zodiacYear === 'dog' ? '개띠 (戌)' : zodiacYear === 'pig' ? '돼지띠 (亥)' : '알 수 없음') + '\n' +
            `• 연도: ${currentYear}년\n` +
            '\n【분석 요청사항】\n' +
            `• ${currentYear}년 전체 운세: 올해의 전체적인 운세 흐름과 대세\n` +
            '• 분야별 운세: 건강운, 재물운, 인연운, 직업운, 학업운, 애정운 등 각 분야별 상세 운세\n' +
            '• 월별 운세: 월별 운세 변화와 주의할 시기\n' +
            '• 행운의 시기와 색상: 유리한 시기, 색상, 방향, 숫자\n' +
            '• 주의할 점과 조언: 삼가야 할 시기, 행동, 건강 관리법\n' +
            '• 띠 특성과 올해: 띠의 특성과 올해 운세의 조화\n' +
            '\n실제 띠별 운세 전문가처럼 구체적이고 현실적인 내용으로, 올해를 잘 보낼 수 있도록 자연스럽게 작성해주세요.',
        en: 'Analyze zodiac fortune.\n' +
            'Zodiac: ' + (zodiacYear === 'rat' ? 'Rat' : zodiacYear === 'ox' ? 'Ox' : zodiacYear === 'tiger' ? 'Tiger' : zodiacYear === 'rabbit' ? 'Rabbit' : zodiacYear === 'dragon' ? 'Dragon' : zodiacYear === 'snake' ? 'Snake' : zodiacYear === 'horse' ? 'Horse' : zodiacYear === 'goat' ? 'Goat' : zodiacYear === 'monkey' ? 'Monkey' : zodiacYear === 'rooster' ? 'Rooster' : zodiacYear === 'dog' ? 'Dog' : zodiacYear === 'pig' ? 'Pig' : 'Unknown') + '\n' +
            `Year: ${currentYear}\n\n` +
            `Provide detailed fortune for ${currentYear}, fortune by field, and advice.`,
        ja: '干支別の運勢を分析してください。\n' +
            '干支: ' + (zodiacYear === 'rat' ? '子' : zodiacYear === 'ox' ? '丑' : zodiacYear === 'tiger' ? '寅' : zodiacYear === 'rabbit' ? '卯' : zodiacYear === 'dragon' ? '辰' : zodiacYear === 'snake' ? '巳' : zodiacYear === 'horse' ? '午' : zodiacYear === 'goat' ? '未' : zodiacYear === 'monkey' ? '申' : zodiacYear === 'rooster' ? '酉' : zodiacYear === 'dog' ? '戌' : zodiacYear === 'pig' ? '亥' : '不明') + '\n' +
            `年度: ${currentYear}年\n\n` +
            `${currentYear}年の今年の運勢、各分野別の運勢、アドバイスなどを詳細に提供してください。`
      },
      newyear: {
        ko: `당신은 사주명리학 기반 신년운세 전문가입니다. ${currentYear}년 신년 운세를 상세하고 실용적으로 분석해주세요.\n\n` +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            `• 신년: ${currentYear}년\n` +
            '\n【분석 요청사항】\n' +
            `• ${currentYear}년 전체 운세: 새해의 대세와 전반적인 운세 흐름\n` +
            '• 분야별 운세: 건강운, 재물운, 인연운, 직업운, 학업운, 애정운, 가족운 등 상세 분석\n' +
            '• 분기별 운세: 1분기, 2분기, 3분기, 4분기별 운세 변화와 특징\n' +
            '• 대운(大運)과 세운(歲運): 올해 대운 흐름과 월별 운세 변화\n' +
            '• 행운의 시기: 가장 유리한 시기와 추천 행동\n' +
            '• 주의할 시기: 신중해야 할 시기와 삼가야 할 행동\n' +
            '• 신년 계획 조언: 올해 목표 설정과 실천 방법\n' +
            '\n실제 신년운세 전문가처럼 구체적이고 현실적인 내용으로, 새해 계획 수립에 도움이 되도록 자연스럽게 작성해주세요.',
        en: `You are a New Year fortune expert based on Four Pillars. Analyze the ${currentYear} New Year fortune in detail and practically.\n\n` +
            '【Basic Information】\n' +
            (safeYear ? `• Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `• Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `• Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            `• New Year: ${currentYear}\n` +
            '\n【Analysis Request】\n' +
            `• Overall ${currentYear} fortune: General fortune trend and major themes for the new year\n` +
            '• Fortune by field: Health, wealth, relationships, career, studies, love, family fortunes in detail\n' +
            '• Quarterly fortune: Changes and characteristics by quarter (Q1, Q2, Q3, Q4)\n' +
            '• Grand Fortune and Yearly Fortune: Grand fortune flow and monthly changes\n' +
            '• Fortunate periods: Most favorable times and recommended actions\n' +
            '• Caution periods: Times to be careful and actions to avoid\n' +
            '• New Year planning advice: Goal setting and implementation methods for this year\n' +
            '\nWrite naturally like a real New Year fortune expert with specific and practical content to help plan for the new year.',
        ja: `あなたは四柱命理学に基づいた新年運勢の専門家です。${currentYear}年の新年運勢を詳細で実用的に分析してください。\n\n` +
            '【基本情報】\n' +
            (safeYear ? `• 生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `• 生時: ${safeHour}時\n` : '') +
            (gender ? `• 性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            `• 新年: ${currentYear}年\n` +
            '\n【分析依頼事項】\n' +
            `• ${currentYear}年の全体的な運勢: 新年の大勢と全体的な運勢の流れ\n` +
            '• 分野別運勢: 健康運、財運、人縁運、職業運、学業運、愛情運、家族運などの詳細分析\n' +
            '• 四半期別運勢: 1四半期、2四半期、3四半期、4四半期別の運勢変化と特徴\n' +
            '• 大運と歳運: 今年の大運の流れと月別運勢変化\n' +
            '• 幸運の時期: 最も有利な時期と推奨行動\n' +
            '• 注意すべき時期: 慎重でなければならない時期と避けるべき行動\n' +
            '• 新年計画のアドバイス: 今年の目標設定と実行方法\n' +
            '\n実際の新年運勢専門家のように具体的で現実的な内容で、新年計画の立案に役立つよう自然に書いてください。'
      },
      constellation: {
        ko: '당신은 별자리 운세 전문가입니다. 서양 점성술과 별자리 특성을 기반으로 상세하고 실용적인 운세를 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            `• 별자리: ${safeConstellation === 'aries' ? '양자리 (♈)' : safeConstellation === 'taurus' ? '황소자리 (♉)' : safeConstellation === 'gemini' ? '쌍둥이자리 (♊)' : safeConstellation === 'cancer' ? '게자리 (♋)' : safeConstellation === 'leo' ? '사자자리 (♌)' : safeConstellation === 'virgo' ? '처녀자리 (♍)' : safeConstellation === 'libra' ? '천칭자리 (♎)' : safeConstellation === 'scorpio' ? '전갈자리 (♏)' : safeConstellation === 'sagittarius' ? '사수자리 (♐)' : safeConstellation === 'capricorn' ? '염소자리 (♑)' : safeConstellation === 'aquarius' ? '물병자리 (♒)' : safeConstellation === 'pisces' ? '물고기자리 (♓)' : '알 수 없음'}\n` +
            `• 연도: ${currentYear}년\n` +
            '\n【분석 요청사항】\n' +
            '• 별자리 특성: 해당 별자리의 기본 성격, 기질, 강점과 약점\n' +
            `• ${currentYear}년 전체 운세: 올해의 전반적인 운세 흐름과 주요 테마\n` +
            '• 분야별 운세: 건강운, 재물운, 인연운, 직업운, 학업운, 애정운 등 각 분야별 상세 운세\n' +
            '• 월별 운세: 월별 운세 변화와 주의할 시기\n' +
            '• 행운의 색상과 숫자: 유리한 색상, 보석, 숫자, 방향\n' +
            '• 관계와 인연: 다른 별자리와의 궁합, 인연운\n' +
            '• 조언: 올해 잘 보낼 수 있는 구체적인 조언과 주의사항\n' +
            '\n실제 별자리 운세 전문가처럼 구체적이고 현실적인 내용으로, 자연스럽게 작성해주세요.',
        en: 'You are a constellation fortune expert. Provide detailed and practical fortune based on Western astrology and constellation characteristics.\n\n' +
            '【Basic Information】\n' +
            `• Constellation: ${safeConstellation === 'aries' ? 'Aries (♈)' : safeConstellation === 'taurus' ? 'Taurus (♉)' : safeConstellation === 'gemini' ? 'Gemini (♊)' : safeConstellation === 'cancer' ? 'Cancer (♋)' : safeConstellation === 'leo' ? 'Leo (♌)' : safeConstellation === 'virgo' ? 'Virgo (♍)' : safeConstellation === 'libra' ? 'Libra (♎)' : safeConstellation === 'scorpio' ? 'Scorpio (♏)' : safeConstellation === 'sagittarius' ? 'Sagittarius (♐)' : safeConstellation === 'capricorn' ? 'Capricorn (♑)' : safeConstellation === 'aquarius' ? 'Aquarius (♒)' : safeConstellation === 'pisces' ? 'Pisces (♓)' : 'Unknown'}\n` +
            `• Year: ${currentYear}\n` +
            '\n【Analysis Request】\n' +
            '• Constellation characteristics: Basic personality, temperament, strengths and weaknesses\n' +
            `• Overall ${currentYear} fortune: General fortune trend and major themes for this year\n` +
            '• Fortune by field: Health, wealth, relationships, career, studies, love fortunes in detail\n' +
            '• Monthly fortune: Monthly changes and caution periods\n' +
            '• Lucky colors and numbers: Favorable colors, gems, numbers, directions\n' +
            '• Relationships: Compatibility with other constellations, relationship fortune\n' +
            '• Advice: Specific advice and cautions for this year\n' +
            '\nWrite naturally like a real constellation fortune expert with specific and practical content.',
        ja: 'あなたは星座運勢の専門家です。西洋占星術と星座の特性に基づいて、詳細で実用的な運勢を提供してください。\n\n' +
            '【基本情報】\n' +
            `• 星座: ${safeConstellation === 'aries' ? '牡羊座 (♈)' : safeConstellation === 'taurus' ? '牡牛座 (♉)' : safeConstellation === 'gemini' ? '双子座 (♊)' : safeConstellation === 'cancer' ? '蟹座 (♋)' : safeConstellation === 'leo' ? '獅子座 (♌)' : safeConstellation === 'virgo' ? '乙女座 (♍)' : safeConstellation === 'libra' ? '天秤座 (♎)' : safeConstellation === 'scorpio' ? '蠍座 (♏)' : safeConstellation === 'sagittarius' ? '射手座 (♐)' : safeConstellation === 'capricorn' ? '山羊座 (♑)' : safeConstellation === 'aquarius' ? '水瓶座 (♒)' : safeConstellation === 'pisces' ? '魚座 (♓)' : '不明'}\n` +
            `• 年度: ${currentYear}年\n` +
            '\n【分析依頼事項】\n' +
            '• 星座特性: 該当星座の基本性格、気質、長所と短所\n' +
            `• ${currentYear}年の全体的な運勢: 今年の全体的な運勢の流れと主要テーマ\n` +
            '• 分野別運勢: 健康運、財運、人縁運、職業運、学業運、愛情運などの各分野別詳細運勢\n' +
            '• 月別運勢: 月別運勢変化と注意すべき時期\n' +
            '• 幸運の色と数字: 有利な色、宝石、数字、方向\n' +
            '• 関係と縁: 他の星座との相性、人縁運\n' +
            '• アドバイス: 今年を良く過ごすための具体的なアドバイスと注意事項\n' +
            '\n実際の星座運勢専門家のように具体的で現実的な内容で、自然に書いてください。'
      },
      money: {
        ko: '당신은 사주명리학 기반 재물운 전문가입니다. 다음 정보를 바탕으로 상세하고 실용적인 재물운 분석을 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            '\n【분석 요청사항】\n' +
            '• 전체 재물운: 사주상 재물을 보는 방법과 금전 운세\n' +
            '• 정재(正財)와 편재(偏財): 안정적인 수입과 부수입, 투자운 분석\n' +
            '• 재물이 유리한 시기: 돈을 모을 수 있는 시기와 적절한 투자 시기\n' +
            '• 재물이 불리한 시기: 신중해야 할 시기와 손실을 막는 방법\n' +
            '• 직업과 재물: 사주상 어울리는 직업과 부를 만드는 방법\n' +
            '• 재물 관리 조언: 운세에 따른 재무 계획과 투자 전략\n' +
            '• 금전 인연: 재물운에 도움이 되는 사람과 관계\n' +
            '\n실제 재물운 전문가처럼 구체적이고 현실적인 내용으로, 재무 계획에 도움이 되도록 자연스럽게 작성해주세요.',
        en: 'You are a wealth fortune expert based on Four Pillars. Provide detailed and practical wealth fortune analysis.\n\n' +
            '【Basic Information】\n' +
            (safeYear ? `• Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `• Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `• Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\n【Analysis Request】\n' +
            '• Overall wealth fortune: How to see wealth in Four Pillars and financial fortune\n' +
            '• Regular wealth and side wealth: Stable income, side income, and investment fortune analysis\n' +
            '• Favorable wealth periods: Times to accumulate money and appropriate investment periods\n' +
            '• Unfavorable wealth periods: Times to be cautious and ways to prevent losses\n' +
            '• Career and wealth: Suitable careers and ways to create wealth according to Four Pillars\n' +
            '• Wealth management advice: Financial planning and investment strategies according to fortune\n' +
            '• Financial connections: People and relationships that help wealth fortune\n' +
            '\nWrite naturally like a real wealth fortune expert with specific and practical content to help financial planning.',
        ja: 'あなたは四柱命理学に基づいた財運の専門家です。詳細で実用的な財運分析を提供してください。\n\n' +
            '【基本情報】\n' +
            (safeYear ? `• 生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `• 生時: ${safeHour}時\n` : '') +
            (gender ? `• 性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n【分析依頼事項】\n' +
            '• 全体的な財運: 四柱上で財を見る方法と金銭運勢\n' +
            '• 正財と偏財: 安定した収入と副収入、投資運分析\n' +
            '• 財に有利な時期: お金を貯められる時期と適切な投資時期\n' +
            '• 財に不利な時期: 慎重でなければならない時期と損失を防ぐ方法\n' +
            '• 職業と財: 四柱上で合う職業と富を生み出す方法\n' +
            '• 財管理のアドバイス: 運勢に応じた財務計画と投資戦略\n' +
            '• 金銭縁: 財運に役立つ人と関係\n' +
            '\n実際の財運専門家のように具体的で現実的な内容で、財務計画に役立つよう自然に書いてください。'
      },
      health: {
        ko: '당신은 사주명리학 기반 건강운 전문가입니다. 다음 정보를 바탕으로 상세하고 실용적인 건강운 분석을 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            '\n【분석 요청사항】\n' +
            '• 전체 건강운: 사주상 건강 상태와 체질 분석\n' +
            '• 오행과 건강: 목화토금수 오행 균형에 따른 건강 특성\n' +
            '• 취약 부위: 사주상 주의해야 할 신체 부위와 질병\n' +
            '• 건강이 유리한 시기: 몸이 좋아지는 시기와 건강 관리 적기\n' +
            '• 건강이 불리한 시기: 주의해야 할 시기와 건강 관리법\n' +
            '• 식이와 운동: 체질에 맞는 음식, 운동, 생활 습관\n' +
            '• 예방 조언: 질병 예방과 건강 유지를 위한 구체적인 방법\n' +
            '\n실제 건강운 전문가처럼 구체적이고 현실적인 내용으로, 건강 관리에 도움이 되도록 자연스럽게 작성해주세요.',
        en: 'You are a health fortune expert based on Four Pillars. Provide detailed and practical health fortune analysis.\n\n' +
            '【Basic Information】\n' +
            (safeYear ? `• Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `• Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `• Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\n【Analysis Request】\n' +
            '• Overall health fortune: Health status and constitution analysis in Four Pillars\n' +
            '• Five Elements and health: Health characteristics according to Five Elements balance\n' +
            '• Vulnerable areas: Body parts and diseases to be careful about in Four Pillars\n' +
            '• Favorable health periods: Times when health improves and good times for health management\n' +
            '• Unfavorable health periods: Times to be careful and health management methods\n' +
            '• Diet and exercise: Food, exercise, and lifestyle habits suitable for constitution\n' +
            '• Preventive advice: Specific methods for disease prevention and health maintenance\n' +
            '\nWrite naturally like a real health fortune expert with specific and practical content to help health management.',
        ja: 'あなたは四柱命理学に基づいた健康運の専門家です。詳細で実用的な健康運分析を提供してください。\n\n' +
            '【基本情報】\n' +
            (safeYear ? `• 生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `• 生時: ${safeHour}時\n` : '') +
            (gender ? `• 性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n【分析依頼事項】\n' +
            '• 全体的な健康運: 四柱上の健康状態と体質分析\n' +
            '• 五行と健康: 木火土金水五行のバランスに応じた健康特性\n' +
            '• 脆弱部位: 四柱上で注意すべき身体部位と疾病\n' +
            '• 健康に有利な時期: 体が良くなる時期と健康管理適期\n' +
            '• 健康に不利な時期: 注意すべき時期と健康管理法\n' +
            '• 食事と運動: 体質に合った食べ物、運動、生活習慣\n' +
            '• 予防アドバイス: 疾病予防と健康維持のための具体的な方法\n' +
            '\n実際の健康運専門家のように具体的で現実的な内容で、健康管理に役立つよう自然に書いてください。'
      },
      career: {
        ko: '당신은 사주명리학 기반 직업운 전문가입니다. 다음 정보를 바탕으로 상세하고 실용적인 직업운 분석을 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            '\n【분석 요청사항】\n' +
            '• 전체 직업운: 사주상 어울리는 직업 분야와 재능\n' +
            '• 적성 분석: 일간과 십성을 통한 직업 적성과 성향\n' +
            '• 직업 전환 시기: 유리한 직업 변경 시기와 추천 직업\n' +
            '• 승진과 성공 시기: 직장에서 성공할 수 있는 시기와 승진운\n' +
            '• 창업운: 사주상 창업이 유리한지와 창업 시기\n' +
            '• 동료와 상관 관계: 직장 내 인간관계와 상관과의 관계\n' +
            '• 직업 조언: 성공적인 직업 생활을 위한 구체적인 조언\n' +
            '\n실제 직업운 전문가처럼 구체적이고 현실적인 내용으로, 직업 선택과 성공에 도움이 되도록 자연스럽게 작성해주세요.',
        en: 'You are a career fortune expert based on Four Pillars. Provide detailed and practical career fortune analysis.\n\n' +
            '【Basic Information】\n' +
            (safeYear ? `• Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `• Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `• Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\n【Analysis Request】\n' +
            '• Overall career fortune: Suitable career fields and talents in Four Pillars\n' +
            '• Aptitude analysis: Career aptitude and tendencies through Day Stem and Ten Gods\n' +
            '• Career change periods: Favorable times for career change and recommended careers\n' +
            '• Promotion and success periods: Times to succeed in workplace and promotion fortune\n' +
            '• Entrepreneurship fortune: Whether entrepreneurship is favorable and timing\n' +
            '• Relationships with colleagues and superiors: Workplace relationships\n' +
            '• Career advice: Specific advice for successful career life\n' +
            '\nWrite naturally like a real career fortune expert with specific and practical content to help career choice and success.',
        ja: 'あなたは四柱命理学に基づいた職業運の専門家です。詳細で実用的な職業運分析を提供してください。\n\n' +
            '【基本情報】\n' +
            (safeYear ? `• 生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `• 生時: ${safeHour}時\n` : '') +
            (gender ? `• 性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n【分析依頼事項】\n' +
            '• 全体的な職業運: 四柱上で合う職業分野と才能\n' +
            '• 適性分析: 日干と十星を通じた職業適性と傾向\n' +
            '• 職業転換時期: 有利な職業変更時期と推奨職業\n' +
            '• 昇進と成功時期: 職場で成功できる時期と昇進運\n' +
            '• 創業運: 四柱上で創業が有利かと創業時期\n' +
            '• 同僚と上司関係: 職場内の人間関係と上司との関係\n' +
            '• 職業アドバイス: 成功的な職業生活のための具体的なアドバイス\n' +
            '\n実際の職業運専門家のように具体的で現実的な内容で、職業選択と成功に役立つよう自然に書いてください。'
      },
      study: {
        ko: '당신은 사주명리학 기반 학업운 전문가입니다. 다음 정보를 바탕으로 상세하고 실용적인 학업운 분석을 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            '\n【분석 요청사항】\n' +
            '• 전체 학업운: 사주상 학업 능력과 학습 적성\n' +
            '• 학업 유리 시기: 공부가 잘 되는 시기와 시험 운세\n' +
            '• 학업 불리 시기: 주의해야 할 시기와 학습 방법 조정\n' +
            '• 입시운: 대입, 수능, 취업 시험 등 입시 운세\n' +
            '• 학과 선택: 사주상 어울리는 학과와 전공\n' +
            '• 학습 방법: 효율적인 공부 방법과 학습 전략\n' +
            '• 학업 조언: 성공적인 학업 성취를 위한 구체적인 조언\n' +
            '\n실제 학업운 전문가처럼 구체적이고 현실적인 내용으로, 학업 성공에 도움이 되도록 자연스럽게 작성해주세요.',
        en: 'You are a study fortune expert based on Four Pillars. Provide detailed and practical study fortune analysis.\n\n' +
            '【Basic Information】\n' +
            (safeYear ? `• Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `• Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `• Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\n【Analysis Request】\n' +
            '• Overall study fortune: Academic ability and learning aptitude in Four Pillars\n' +
            '• Favorable study periods: Times when studying goes well and exam fortune\n' +
            '• Unfavorable study periods: Times to be careful and learning method adjustments\n' +
            '• Exam fortune: College entrance, national exams, employment exams fortune\n' +
            '• Major selection: Suitable majors and fields of study in Four Pillars\n' +
            '• Learning methods: Efficient study methods and learning strategies\n' +
            '• Study advice: Specific advice for successful academic achievement\n' +
            '\nWrite naturally like a real study fortune expert with specific and practical content to help academic success.',
        ja: 'あなたは四柱命理学に基づいた学業運の専門家です。詳細で実用的な学業運分析を提供してください。\n\n' +
            '【基本情報】\n' +
            (safeYear ? `• 生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `• 生時: ${safeHour}時\n` : '') +
            (gender ? `• 性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n【分析依頼事項】\n' +
            '• 全体的な学業運: 四柱上の学業能力と学習適性\n' +
            '• 学業に有利な時期: 勉強が良くできる時期と試験運勢\n' +
            '• 学業に不利な時期: 注意すべき時期と学習方法調整\n' +
            '• 入試運: 大学入試、国家試験、就職試験などの入試運勢\n' +
            '• 学科選択: 四柱上で合う学科と専攻\n' +
            '• 学習方法: 効率的な勉強方法と学習戦略\n' +
            '• 学業アドバイス: 成功的な学業達成のための具体的なアドバイス\n' +
            '\n実際の学業運専門家のように具体的で現実的な内容で、学業成功に役立つよう自然に書いてください。'
      },
      relationship: {
        ko: '당신은 사주명리학 기반 인연운 전문가입니다. 다음 정보를 바탕으로 상세하고 실용적인 인연운 분석을 제공해주세요.\n\n' +
            '【기본 정보】\n' +
            (safeYear ? `• 생년월일: ${safeYear}년 ${safeMonth}월 ${safeDay}일\n` : '') +
            (birthTime && safeHour ? `• 생시: ${safeHour}시\n` : '') +
            (safeGender ? `• 성별: ${safeGender}\n` : '') +
            '\n【분석 요청사항】\n' +
            '• 전체 인연운: 사주상 인연을 보는 방법과 인간관계 운세\n' +
            '• 인수(印綬)와 비견(比肩): 인연을 나타내는 십성 분석\n' +
            '• 좋은 인연 만날 시기: 유리한 인연을 만날 수 있는 시기\n' +
            '• 인연 관계: 가족, 친구, 동료, 상관 등 각 관계별 운세\n' +
            '• 인연 관리: 사주상 어울리는 사람과 주의할 사람\n' +
            '• 인연 조언: 좋은 인연을 맺고 유지하는 방법\n' +
            '\n실제 인연운 전문가처럼 구체적이고 현실적인 내용으로, 인간관계 개선에 도움이 되도록 자연스럽게 작성해주세요.',
        en: 'You are a relationship fortune expert based on Four Pillars. Provide detailed and practical relationship fortune analysis.\n\n' +
            '【Basic Information】\n' +
            (safeYear ? `• Birth Date: ${safeYear}-${safeMonth}-${safeDay}\n` : '') +
            (birthTime && safeHour ? `• Birth Time: ${safeHour}:00\n` : '') +
            (gender ? `• Gender: ${gender === 'male' ? 'Male' : 'Female'}\n` : '') +
            '\n【Analysis Request】\n' +
            '• Overall relationship fortune: How to see relationships in Four Pillars and human relationship fortune\n' +
            '• Seal Star and Same Stem: Analysis of Ten Gods representing relationships\n' +
            '• Times to meet good relationships: Periods when favorable relationships can be met\n' +
            '• Relationship types: Fortune for family, friends, colleagues, superiors, etc.\n' +
            '• Relationship management: Compatible and cautious people in Four Pillars\n' +
            '• Relationship advice: Methods to build and maintain good relationships\n' +
            '\nWrite naturally like a real relationship fortune expert with specific and practical content to help improve human relationships.',
        ja: 'あなたは四柱命理学に基づいた人縁運の専門家です。詳細で実用的な人縁運分析を提供してください。\n\n' +
            '【基本情報】\n' +
            (safeYear ? `• 生年月日: ${safeYear}年${safeMonth}月${safeDay}日\n` : '') +
            (birthTime && safeHour ? `• 生時: ${safeHour}時\n` : '') +
            (gender ? `• 性別: ${gender === 'male' ? '男性' : '女性'}\n` : '') +
            '\n【分析依頼事項】\n' +
            '• 全体的な人縁運: 四柱上で縁を見る方法と人間関係運勢\n' +
            '• 印綬と比肩: 縁を表す十星分析\n' +
            '• 良い縁に会う時期: 有利な縁に会える時期\n' +
            '• 縁関係: 家族、友人、同僚、上司などの各関係別運勢\n' +
            '• 縁管理: 四柱上で合う人と注意すべき人\n' +
            '• 縁アドバイス: 良い縁を結び維持する方法\n' +
            '\n実際の人縁運専門家のように具体的で現実的な内容で、人間関係改善に役立つよう自然に書いてください。'
      }
    };

    return categoryPrompts[cat]?.[lang] || categoryPrompts.saju[lang];
  };

  // 언어별 시스템 프롬프트
  const systemPrompts = {
    ko: '당신은 전통 사주명리학 전문가이며, 실제 운세 전문가처럼 상세하고 실용적인 운세 분석을 제공합니다. 구체적인 예시와 조언을 포함하여 자연스럽고 읽기 쉬운 형식으로 작성해주세요.',
    en: 'You are an expert in traditional Four Pillars fortune telling. Provide accurate, detailed, and practical fortune analysis like a real fortune expert. Write naturally and in an easy-to-read format with specific examples and advice.',
    ja: 'あなたは伝統的な四柱命理学の専門家であり、実際の運勢専門家のように詳細で実用的な運勢分析を提供します。具体的な例とアドバイスを含めて、自然で読みやすい形式で書いてください。'
  };

  const instruction = getPromptByCategory(language, category);

  // 카테고리별 JSON 응답 형식
  const getJsonFormat = (lang, cat) => {
    const needsElements = cat === 'saju' || cat === 'tojeong';
    const langName = lang === 'ko' ? '한국어' : (lang === 'en' ? 'English' : '日本語');
    const langNameEn = lang === 'ko' ? 'Korean' : (lang === 'en' ? 'English' : 'Japanese');
    
    let jsonFormat = '';
    
    if (lang === 'ko') {
      jsonFormat = '다음 형식의 JSON으로 응답해주세요:\n';
      jsonFormat += '{\n';
      jsonFormat += '  "fortune": "간단한 운세 요약 (1-2문장)",\n';
      jsonFormat += '  "description": "상세한 운세 설명 (' + langName + '로 작성, 가능한 한 상세하게)"';
      
      if (needsElements) {
        jsonFormat += ',\n';
        const yearVal = year ? year : null;
        const monthVal = month ? month : null;
        const dayVal = day ? day : null;
        jsonFormat += '  "year": ' + (yearVal !== null ? yearVal : 'null') + ',\n';
        jsonFormat += '  "month": ' + (monthVal !== null ? monthVal : 'null') + ',\n';
        jsonFormat += '  "day": ' + (dayVal !== null ? dayVal : 'null') + ',\n';
        jsonFormat += '  "elements": {\n';
        jsonFormat += '    "wood": 0-100 사이 숫자,\n';
        jsonFormat += '    "fire": 0-100 사이 숫자,\n';
        jsonFormat += '    "earth": 0-100 사이 숫자,\n';
        jsonFormat += '    "metal": 0-100 사이 숫자,\n';
        jsonFormat += '    "water": 0-100 사이 숫자\n';
        jsonFormat += '  }';
      }
      
      jsonFormat += '\n}\n\n';
      jsonFormat += '\n\n중요: \n';
      jsonFormat += '• 응답은 반드시 순수 JSON 형식만 반환해야 합니다.\n';
      jsonFormat += '• 마크다운 코드 블록(```json 또는 ```)을 사용하지 마세요.\n';
      jsonFormat += '• JSON 객체만 반환하세요.\n';
      jsonFormat += '• "fortune" 필드는 간단하고 명확한 운세 요약(1-2문장)을 작성하세요.\n';
      jsonFormat += '• "description" 필드는 실제 운세 전문가가 작성한 것처럼 상세하고 실용적이며, 자연스럽고 읽기 쉬운 형식으로 작성하세요. 구체적인 예시와 조언을 포함하세요.';
    } else if (lang === 'en') {
      jsonFormat = 'Please respond in the following JSON format:\n';
      jsonFormat += '{\n';
      jsonFormat += '  "fortune": "Brief fortune summary (1-2 sentences)",\n';
      jsonFormat += '  "description": "Detailed fortune description (written in ' + langNameEn + ', as detailed as possible)"';
      
      if (needsElements) {
        jsonFormat += ',\n';
        const yearVal = year ? year : null;
        const monthVal = month ? month : null;
        const dayVal = day ? day : null;
        jsonFormat += '  "year": ' + (yearVal !== null ? yearVal : 'null') + ',\n';
        jsonFormat += '  "month": ' + (monthVal !== null ? monthVal : 'null') + ',\n';
        jsonFormat += '  "day": ' + (dayVal !== null ? dayVal : 'null') + ',\n';
        jsonFormat += '  "elements": {\n';
        jsonFormat += '    "wood": number between 0-100,\n';
        jsonFormat += '    "fire": number between 0-100,\n';
        jsonFormat += '    "earth": number between 0-100,\n';
        jsonFormat += '    "metal": number between 0-100,\n';
        jsonFormat += '    "water": number between 0-100\n';
        jsonFormat += '  }';
      }
      
      jsonFormat += '\n}\n\n';
      jsonFormat += 'IMPORTANT: \n';
      jsonFormat += '• Respond ONLY with pure JSON format.\n';
      jsonFormat += '• Do NOT use markdown code blocks (```json or ```).\n';
      jsonFormat += '• Return only the JSON object.\n';
      jsonFormat += '• The "fortune" field should contain a brief and clear fortune summary (1-2 sentences).\n';
      jsonFormat += '• The "description" field should be detailed, practical, and naturally written like a real fortune expert wrote it. Include specific examples and advice. Make it easy to read and comprehensive.';
    } else {
      jsonFormat = '以下のJSON形式で応答してください:\n';
      jsonFormat += '{\n';
      jsonFormat += '  "fortune": "簡単な運勢要約 (1-2文)",\n';
      jsonFormat += '  "description": "詳細な運勢説明 (' + langName + 'で記述、可能な限り詳細に)"';
      
      if (needsElements) {
        jsonFormat += ',\n';
        const yearVal = year ? year : null;
        const monthVal = month ? month : null;
        const dayVal = day ? day : null;
        jsonFormat += '  "year": ' + (yearVal !== null ? yearVal : 'null') + ',\n';
        jsonFormat += '  "month": ' + (monthVal !== null ? monthVal : 'null') + ',\n';
        jsonFormat += '  "day": ' + (dayVal !== null ? dayVal : 'null') + ',\n';
        jsonFormat += '  "elements": {\n';
        jsonFormat += '    "wood": 0-100の数字,\n';
        jsonFormat += '    "fire": 0-100の数字,\n';
        jsonFormat += '    "earth": 0-100の数字,\n';
        jsonFormat += '    "metal": 0-100の数字,\n';
        jsonFormat += '    "water": 0-100の数字\n';
        jsonFormat += '  }';
      }
      
      jsonFormat += '\n}\n\n';
      jsonFormat += '重要: \n';
      jsonFormat += '• 応答は純粋なJSON形式のみを返してください。\n';
      jsonFormat += '• マークダウンコードブロック（```json または ```）を使用しないでください。\n';
      jsonFormat += '• JSONオブジェクトのみを返してください。\n';
      jsonFormat += '• "fortune"フィールドは簡単で明確な運勢要約（1-2文）を記述してください。\n';
      jsonFormat += '• "description"フィールドは実際の運勢専門家が記述したように詳細で実用的であり、自然で読みやすい形式で記述してください。具体的な例とアドバイスを含めてください。';
    }
    
    return jsonFormat;
  };

  // 전체 프롬프트 조합 (템플릿 리터럴 대신 문자열 연결 사용)
  const systemPrompt = systemPrompts[language] || systemPrompts.ko;
  const jsonFormat = getJsonFormat(language, category);
  const fullPrompt = systemPrompt + '\n\n' + instruction + '\n\n' + jsonFormat;

  // 프롬프트 유효성 검증
  console.log('프롬프트 생성 완료');
  console.log('프롬프트 타입:', typeof fullPrompt);
  console.log('프롬프트 길이:', fullPrompt.length);
  
  // 프롬프트를 JSON으로 변환해서 유효성 확인
  try {
    const testJson = JSON.stringify({ text: fullPrompt });
    console.log('✅ 프롬프트 JSON.stringify 테스트 성공');
    console.log('테스트 JSON 길이:', testJson.length);
  } catch (testError) {
    console.error('❌ 프롬프트 JSON.stringify 테스트 실패:', testError);
    throw new Error(`프롬프트 생성 오류: ${testError.message}`);
  }

  try {
    console.log('Groq API 호출 시작');
    console.log('프롬프트 (처음 1000자):', fullPrompt.substring(0, 1000));
    console.log('프롬프트 (마지막 500자):', fullPrompt.substring(Math.max(0, fullPrompt.length - 500)));
    const response = await callGroqAPI(fullPrompt);
    console.log('Groq API 응답 받음, 길이:', response.length);
    console.log('Groq API 응답 (처음 500자):', response.substring(0, 500));
    
    // 마크다운 코드 블록 제거 (이중 방어)
    let cleanedResponse = response.trim();
    
    // ```json 또는 ``` 로 시작하는 코드 블록 제거
    cleanedResponse = cleanedResponse.replace(/^```json\s*\n?/i, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*\n?/i, '');
    cleanedResponse = cleanedResponse.replace(/\n?```\s*$/i, '');
    cleanedResponse = cleanedResponse.trim();
    
    // JSON 부분만 추출 (중괄호로 시작하는 부분)
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    let jsonString = cleanedResponse;
    if (jsonMatch) {
      jsonString = jsonMatch[0];
      console.log('JSON 추출 성공, 길이:', jsonString.length);
    } else {
      console.warn('⚠️ JSON 매치 실패, 전체 내용 사용');
    }
    
    let fortune;
    try {
      fortune = JSON.parse(jsonString);
      console.log('JSON 파싱 성공:', Object.keys(fortune));
    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError.message);
      console.error('파싱 시도한 JSON (처음 500자):', jsonString.substring(0, 500));
      console.error('파싱 시도한 JSON (마지막 500자):', jsonString.substring(Math.max(0, jsonString.length - 500)));
      console.error('원본 응답 (처음 500자):', response.substring(0, 500));
      
      // 불완전한 JSON인 경우 닫는 중괄호를 추가해 시도
      if (parseError.message.includes('Unexpected end of JSON input')) {
        console.warn('⚠️ 불완전한 JSON 감지, 닫는 중괄호 추가 시도');
        let fixedJson = jsonString.trim();
        // 열린 중괄호와 닫힌 중괄호 개수 확인
        const openBraces = (fixedJson.match(/\{/g) || []).length;
        const closeBraces = (fixedJson.match(/\}/g) || []).length;
        const missingBraces = openBraces - closeBraces;
        
        if (missingBraces > 0) {
          // 누락된 닫는 중괄호 추가
          fixedJson += '\n' + '}'.repeat(missingBraces);
          console.log('✅ 닫는 중괄호 추가:', missingBraces, '개');
          
          try {
            fortune = JSON.parse(fixedJson);
            console.log('✅ 수정된 JSON 파싱 성공:', Object.keys(fortune));
          } catch (retryError) {
            console.error('❌ 수정된 JSON도 파싱 실패:', retryError.message);
            throw new Error(`Groq API 응답 파싱 실패: ${parseError.message}. 응답: ${jsonString.substring(0, 200)}`);
          }
        } else {
          throw new Error(`Groq API 응답 파싱 실패: ${parseError.message}. 응답: ${jsonString.substring(0, 200)}`);
        }
      } else {
        throw new Error(`Groq API 응답 파싱 실패: ${parseError.message}. 응답: ${jsonString.substring(0, 200)}`);
      }
    }
    
    // 기본 구조 확인 및 보완
    const needsElements = category === 'saju' || category === 'tojeong';
    const result = {
      category,
      fortune: fortune.fortune || (language === 'ko' ? '중길' : (language === 'en' ? 'Medium Fortune' : '中吉')),
      description: fortune.description || (language === 'ko' ? '운세 분석이 완료되었습니다.' : (language === 'en' ? 'Fortune analysis completed.' : '運勢分析が完了しました。'))
    };
    
    console.log('결과 구조 생성 완료:', Object.keys(result));

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
    console.error('❌ calculateFateWithGroq 오류 발생:');
    console.error('오류 타입:', error.constructor.name);
    console.error('오류 메시지:', error.message);
    console.error('오류 스택:', error.stack);
    console.error('전체 오류 객체:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // 언어별 에러 메시지
    const errorMessages = {
      ko: `운세 분석 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}. 잠시 후 다시 시도해주세요.`,
      en: `An error occurred during fortune analysis: ${error.message || 'Unknown error'}. Please try again later.`,
      ja: `運勢分析中にエラーが発生しました: ${error.message || '不明なエラー'}. しばらくしてから再度お試しください。`
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

    console.error('에러 결과 반환:', JSON.stringify(errorResult, null, 2));
    return errorResult;
  }
}

// 불완전한 JSON 복구 함수
function fixIncompleteJSON(jsonString) {
  let fixed = jsonString.trim();
  
  // 줄바꿈 정리
  fixed = fixed.replace(/\n\s*\n/g, '\n');
  
  // 열린 중괄호와 닫힌 중괄호 개수 확인
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const missingBraces = openBraces - closeBraces;
  
  // 마지막 문자가 쉼표인 경우 제거
  fixed = fixed.replace(/,\s*$/, '');
  
  // 닫히지 않은 문자열 처리 - 마지막 따옴표가 없는 경우
  const lastQuoteIndex = fixed.lastIndexOf('"');
  const openQuoteCount = (fixed.match(/"/g) || []).length;
  
  // 따옴표가 홀수 개인 경우 (닫히지 않은 문자열)
  if (openQuoteCount % 2 !== 0) {
    // 마지막 따옴표 뒤에 닫는 따옴표 추가
    if (fixed[fixed.length - 1] !== '"') {
      fixed += '"';
    }
  }
  
  // 누락된 닫는 중괄호 추가
  if (missingBraces > 0) {
    fixed += '\n' + '}'.repeat(missingBraces);
  }
  
  return fixed;
}

// 부분 응답에서 최소 JSON 생성
function createMinimalJSONFromPartial(content) {
  console.log('최소 JSON 생성 시도, 내용:', content);
  
  // fortune 필드 추출 시도
  const fortuneMatch = content.match(/"fortune"\s*:\s*"([^"]*?)"/);
  let fortune = '운세 분석이 완료되었습니다.';
  if (fortuneMatch && fortuneMatch[1]) {
    fortune = fortuneMatch[1];
    console.log('✅ fortune 추출:', fortune);
  } else {
    // 따옴표 없이 fortune 추출 시도
    const fortuneMatch2 = content.match(/"fortune"\s*:\s*"([^"]*)/);
    if (fortuneMatch2 && fortuneMatch2[1]) {
      fortune = fortuneMatch2[1].trim();
      console.log('✅ fortune 추출 (닫히지 않은 문자열):', fortune);
    }
  }
  
  // description 필드 추출 시도
  let description = '상세한 운세 분석을 제공합니다.';
  const descMatch = content.match(/"description"\s*:\s*"([^"]*?)"/);
  if (descMatch && descMatch[1]) {
    description = descMatch[1];
    console.log('✅ description 추출:', description);
  } else {
    // fortune 다음 텍스트를 description으로 사용
    if (fortuneMatch) {
      const afterFortune = content.substring(fortuneMatch.index + fortuneMatch[0].length);
      const nextText = afterFortune.replace(/^[^"]*"?"\s*:?\s*"?/, '').replace(/[",}]+/g, '').trim();
      if (nextText && nextText.length > 10) {
        description = nextText.substring(0, 500);
        console.log('✅ description 추출 (fortune 다음 텍스트):', description.substring(0, 100));
      }
    }
  }
  
  const result = {
    fortune: fortune,
    description: description || fortune
  };
  
  console.log('최소 JSON 생성 완료:', result);
  return JSON.stringify(result);
}

function callGroqAPI(prompt) {
  return new Promise((resolve, reject) => {
    console.log('🔵 callGroqAPI 시작');
    console.log('GROQ_API_KEY 존재 여부:', !!GROQ_API_KEY);
    console.log('GROQ_API_KEY 길이:', GROQ_API_KEY ? GROQ_API_KEY.length : 0);
    console.log('GROQ_API_KEY 처음 10자:', GROQ_API_KEY ? GROQ_API_KEY.substring(0, 10) + '...' : '없음');
    
    if (!GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY가 설정되지 않았습니다!');
      reject(new Error('GROQ_API_KEY 환경 변수가 설정되지 않았습니다.'));
      return;
    }
    
    // 프롬프트를 안전하게 JSON 문자열로 변환하기 위해 검증
    if (typeof prompt !== 'string') {
      console.error('❌ 프롬프트가 문자열이 아닙니다:', typeof prompt);
      reject(new Error('프롬프트가 유효한 문자열이 아닙니다.'));
      return;
    }
    
    // Groq API 요청 본문 (OpenAI API 형식 사용)
    const requestBody = {
      model: 'llama-3.3-70b-versatile',  // 최신 빠른 추론 모델
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 8192  // 적절한 크기로 설정 (너무 크면 응답 지연)
    };
    
    let data;
    try {
      data = JSON.stringify(requestBody);
      console.log('✅ 요청 본문 JSON.stringify 성공');
      console.log('요청 본문 크기:', data.length);
      console.log('요청 본문 처음 1000자:', data.substring(0, 1000));
      console.log('요청 본문 마지막 500자:', data.substring(Math.max(0, data.length - 500)));
      
      // JSON 유효성 검증
      JSON.parse(data);
      console.log('✅ 요청 본문 JSON 유효성 검증 통과');
    } catch (stringifyError) {
      console.error('❌ JSON.stringify 오류:', stringifyError);
      console.error('requestBody:', JSON.stringify(requestBody, null, 2));
      reject(new Error(`JSON 생성 실패: ${stringifyError.message}`));
      return;
    }

    // Groq API 엔드포인트 (OpenAI 호환 형식)
    const apiPath = '/openai/v1/chat/completions';
    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: apiPath,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data, 'utf8')
      }
    };
    
    console.log('🔵 HTTPS 요청 옵션:', {
      hostname: options.hostname,
      path: options.path,
      method: options.method,
      'Content-Length': options.headers['Content-Length']
    });

    const req = https.request(options, (res) => {
      let responseData = '';
      
      console.log('📡 Groq API 응답 수신 시작');
      console.log('응답 상태 코드:', res.statusCode);
      console.log('응답 헤더:', JSON.stringify(res.headers));

      // 응답 타임아웃 설정 (20초 - Lambda 타임아웃 29초 내에서 안전하게)
      res.setTimeout(20000, () => {
        console.error('❌ Groq API 응답 타임아웃 (20초)');
        req.destroy();
        reject(new Error('Groq API 응답 타임아웃: 20초 내에 응답을 받지 못했습니다.'));
      });

      res.on('data', (chunk) => {
        // UTF-8 인코딩 명시적으로 처리
        if (Buffer.isBuffer(chunk)) {
          responseData += chunk.toString('utf8');
        } else {
          responseData += chunk;
        }
      });

      res.on('end', () => {
        console.log('📡 Groq API 응답 완료');
        console.log('응답 상태 코드:', res.statusCode);
        console.log('응답 데이터 길이:', responseData.length);
        console.log('응답 데이터 (처음 1000자):', responseData.substring(0, 1000));
        
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(responseData);
            console.log('✅ Groq 응답 JSON 파싱 성공');
            console.log('응답 구조 키:', Object.keys(result));
            
            if (result.error) {
              console.error('❌ Groq API 에러 응답:', result.error);
              reject(new Error(`Groq API 오류: ${JSON.stringify(result.error)}`));
              return;
            }
            
            const choice = result.choices?.[0];
            if (!choice) {
              console.error('❌ Groq 응답에 choices가 없습니다. 전체 응답:', JSON.stringify(result, null, 2));
              reject(new Error('Groq 응답에 choices가 없습니다.'));
              return;
            }
            
            console.log('Choice 구조:', Object.keys(choice));
            console.log('Finish Reason:', choice.finish_reason);
            
            // 응답이 완료되지 않았는지 확인
            if (choice.finish_reason && choice.finish_reason !== 'stop') {
              console.warn('⚠️ 응답이 완료되지 않았습니다. Finish Reason:', choice.finish_reason);
              if (choice.finish_reason === 'length') {
                console.warn('⚠️ max_tokens 제한으로 응답이 잘렸습니다.');
              }
            }
            
            const content = choice.message?.content;
            
            if (content) {
              console.log('✅ Groq 응답 텍스트 추출 성공, 길이:', content.length);
              console.log('응답 텍스트 (처음 500자):', content.substring(0, 500));
              console.log('응답 텍스트 (전체):', content);
              
              // 마크다운 코드 블록 제거 (```json ... ``` 또는 ``` ... ```)
              let cleanedContent = content;
              
              // ```json 또는 ``` 로 시작하는 코드 블록 제거
              cleanedContent = cleanedContent.replace(/^```json\s*\n?/i, '');
              cleanedContent = cleanedContent.replace(/^```\s*\n?/i, '');
              cleanedContent = cleanedContent.replace(/\n?```\s*$/i, '');
              
              // 앞뒤 공백 제거
              cleanedContent = cleanedContent.trim();
              
              console.log('마크다운 제거 후 (전체):', cleanedContent);
              
              // JSON 부분 추출 - 더 관대한 정규식 사용 (불완전한 JSON도 포함)
              let jsonString = cleanedContent;
              
              // 중괄호로 시작하는 부분 찾기
              const braceStart = cleanedContent.indexOf('{');
              if (braceStart !== -1) {
                // 첫 번째 중괄호부터 시작
                jsonString = cleanedContent.substring(braceStart);
                
                // 불완전한 JSON인 경우 복구 시도
                if (choice.finish_reason === 'length') {
                  console.warn('⚠️ length로 잘린 응답 감지, JSON 복구 시도');
                  jsonString = fixIncompleteJSON(jsonString);
                } else {
                  // 정상 응답인 경우 JSON 매칭 시도
                  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    jsonString = jsonMatch[0];
                  }
                }
                
                console.log('✅ JSON 추출 성공, 길이:', jsonString.length);
                console.log('JSON (전체):', jsonString);
                
                // JSON 유효성 검증
                try {
                  // UTF-8 인코딩 보장을 위해 Buffer 사용
                  const parsed = JSON.parse(Buffer.from(jsonString, 'utf8').toString('utf8'));
                  console.log('✅ JSON 유효성 검증 통과');
                  
                  // UTF-8로 다시 인코딩하여 깨짐 방지
                  const utf8Json = Buffer.from(JSON.stringify(parsed), 'utf8').toString('utf8');
                  resolve(utf8Json);
                } catch (validateError) {
                  console.error('❌ JSON 유효성 검증 실패:', validateError.message);
                  console.error('JSON 문자열 (전체):', jsonString);
                  
                  // 불완전한 JSON 복구 시도
                  if (validateError.message.includes('Unexpected end of JSON input') || 
                      validateError.message.includes('Unexpected token')) {
                    console.warn('⚠️ 불완전한 JSON 감지, 복구 시도');
                    const fixedJson = fixIncompleteJSON(jsonString);
                    console.log('복구된 JSON:', fixedJson);
                    
                    try {
                      const parsed = JSON.parse(fixedJson);
                      console.log('✅ 복구된 JSON 유효성 검증 통과');
                      resolve(fixedJson);
                    } catch (retryError) {
                      console.error('❌ 복구된 JSON도 파싱 실패:', retryError.message);
                      // 부분 응답에서 최소한의 JSON 생성
                      const minimalJson = createMinimalJSONFromPartial(cleanedContent);
                      console.log('최소 JSON 생성:', minimalJson);
                      resolve(minimalJson);
                    }
                  } else {
                    // 다른 오류인 경우 최소 JSON 생성
                    const minimalJson = createMinimalJSONFromPartial(cleanedContent);
                    console.log('최소 JSON 생성:', minimalJson);
                    resolve(minimalJson);
                  }
                }
              } else {
                console.warn('⚠️ JSON 중괄호를 찾을 수 없음, 최소 JSON 생성');
                const minimalJson = createMinimalJSONFromPartial(cleanedContent);
                resolve(minimalJson);
              }
            } else {
              console.error('❌ Groq 응답에 텍스트가 없습니다.');
              console.error('Choice:', JSON.stringify(choice, null, 2));
              console.error('전체 응답:', JSON.stringify(result, null, 2));
              reject(new Error('Groq 응답에 텍스트가 없습니다.'));
            }
          } catch (parseError) {
            console.error('❌ Groq 응답 JSON 파싱 실패:');
            console.error('파싱 오류:', parseError.message);
            console.error('파싱 오류 스택:', parseError.stack);
            console.error('응답 데이터 (처음 1000자):', responseData.substring(0, 1000));
            reject(new Error(`Groq 응답 파싱 실패: ${parseError.message}. 응답: ${responseData.substring(0, 500)}`));
          }
        } else {
          console.error('❌ Groq API HTTP 오류:');
          console.error('상태 코드:', res.statusCode);
          console.error('상태 메시지:', res.statusMessage);
          console.error('응답 헤더:', JSON.stringify(res.headers));
          console.error('오류 응답 전체:', responseData);
          
          let errorMessage = `Groq API HTTP 오류: ${res.statusCode}`;
          try {
            const errorData = JSON.parse(responseData);
            errorMessage += ` - ${JSON.stringify(errorData)}`;
          } catch {
            errorMessage += ` - ${responseData.substring(0, 500)}`;
          }
          
          reject(new Error(errorMessage));
        }
      });
    });

    // 요청 타임아웃 설정 제거 - Groq API 응답을 기다리기 위해 타임아웃을 설정하지 않음
    // 대신 응답 타임아웃(res.setTimeout)으로만 처리

    req.on('error', (error) => {
      console.error('❌ HTTPS 요청 오류:');
      console.error('오류 메시지:', error.message);
      console.error('오류 코드:', error.code);
      console.error('오류 스택:', error.stack);
      reject(error);
    });

    console.log('📤 Groq API 요청 전송 중...');
    req.write(data);
    req.end();
    console.log('✅ Groq API 요청 전송 완료');
  });
}
