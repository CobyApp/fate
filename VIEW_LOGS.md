# Lambda 함수 로그 확인 가이드

Lambda 함수의 실행 로그를 확인하는 방법을 설명합니다.

## 📋 CloudWatch Logs로 로그 확인

### 1. AWS 콘솔에서 확인

1. AWS 콘솔에 로그인
2. **CloudWatch** 서비스로 이동
3. 왼쪽 메뉴에서 **로그 > 로그 그룹** 선택
4. `/aws/lambda/fate-calculator-dev` (또는 해당 함수 이름) 로그 그룹 선택
5. 최신 로그 스트림 선택
6. 로그 확인

### 2. AWS CLI로 로그 확인

```bash
# 최신 로그 확인
aws logs tail /aws/lambda/fate-calculator-dev --follow --region ap-northeast-1

# 특정 시간대의 로그 확인
aws logs tail /aws/lambda/fate-calculator-dev \
  --since 1h \
  --region ap-northeast-1

# 오류만 필터링하여 확인
aws logs tail /aws/lambda/fate-calculator-dev \
  --filter-pattern "ERROR" \
  --region ap-northeast-1

# JSON 형식으로 출력
aws logs tail /aws/lambda/fate-calculator-dev \
  --format short \
  --region ap-northeast-1 | jq
```

### 3. 특정 로그 그룹 찾기

Lambda 함수 이름에 따라 로그 그룹 이름이 달라질 수 있습니다:

```bash
# 모든 Lambda 로그 그룹 찾기
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/fate" \
  --region ap-northeast-1 \
  --query 'logGroups[*].logGroupName' \
  --output table
```

일반적인 로그 그룹 이름:
- `/aws/lambda/fate-stack-dev-FateCalculatorFunction-XXXXX`
- `/aws/lambda/fate-calculator-dev`

### 4. SAM CLI로 로그 확인 (로컬 테스트용)

```bash
# SAM 로컬 실행 시 로그 확인
sam local invoke FateCalculatorFunction --event event.json --log-file log.txt

# 또는 실시간 로그
sam local start-api 2>&1 | tee api.log
```

## 🔍 로그에서 확인할 사항

### 정상 실행 시 로그

```
Lambda 함수 실행 시작
요청 파라미터: { ... }
운세 계산 시작 - 카테고리: saju
calculateFateWithGemini 호출: { category: 'saju', language: 'ko' }
GEMINI_API_KEY 확인 완료
Gemini API 호출 시작
프롬프트 길이: 1234
Gemini API 응답 받음, 상태 코드: 200
Gemini API 응답 받음, 길이: 5678
JSON 파싱 성공: [ 'fortune', 'description', 'year', ... ]
결과 구조 생성 완료: [ 'category', 'fortune', 'description' ]
운세 계산 완료: { ... }
DynamoDB 저장 시작
DynamoDB 저장 완료 - ID: xxxxx
```

### 오류 발생 시 확인 사항

1. **"GEMINI_API_KEY가 설정되지 않았습니다"**
   - Lambda 함수 환경 변수 확인
   - CloudFormation 템플릿의 `GeminiApiKey` 파라미터 확인

2. **"Gemini API 오류: 400" 또는 "401"**
   - API 키가 유효한지 확인
   - API 키 사용량/할당량 확인

3. **"JSON 파싱 실패"**
   - Gemini API 응답 형식 확인
   - 응답 내용 로그 확인

4. **"DynamoDB 저장 실패"**
   - DynamoDB 테이블 존재 확인
   - IAM 권한 확인

## 🛠️ 로그 레벨 조정

현재 코드에는 `console.log`를 사용하여 로그를 남기고 있습니다. 

프로덕션에서는 불필요한 로그를 줄이기 위해:

1. 중요한 오류만 로그 남기기
2. 환경 변수로 로그 레벨 제어
3. CloudWatch Logs Insights 사용

## 📊 CloudWatch Logs Insights 사용

복잡한 로그 분석이 필요한 경우:

```bash
# CloudWatch Logs Insights 쿼리 예시
aws logs start-query \
  --log-group-name /aws/lambda/fate-calculator-dev \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc' \
  --region ap-northeast-1
```

또는 AWS 콘솔에서:
1. CloudWatch > 로그 > 인사이트
2. 로그 그룹 선택
3. 쿼리 작성 및 실행

## ⚡ 빠른 문제 해결 명령어

```bash
# 최근 1시간의 모든 로그 확인
aws logs tail /aws/lambda/fate-calculator-dev --since 1h --region ap-northeast-1

# 최근 오류만 확인
aws logs tail /aws/lambda/fate-calculator-dev \
  --since 1h \
  --filter-pattern "ERROR" \
  --region ap-northeast-1

# Lambda 함수 이름 확인 (CloudFormation에서)
aws cloudformation describe-stack-resources \
  --stack-name fate-stack-dev \
  --logical-resource-id FateCalculatorFunction \
  --region ap-northeast-1 \
  --query 'StackResources[0].PhysicalResourceId' \
  --output text
```

## 📝 참고

- CloudWatch Logs는 24시간 후부터 보관 기간에 따라 비용이 발생할 수 있습니다
- Lambda 함수 실행 시간이 3초를 넘으면 타임아웃 오류가 발생할 수 있습니다
- 로그는 최대 15분 후에 나타날 수 있습니다 (CloudWatch 지연)
