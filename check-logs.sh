#!/bin/bash

# Lambda 함수 로그 확인 스크립트

STACK_NAME="fate-stack-dev"
REGION="ap-northeast-1"

echo "🔍 Lambda 함수 로그 확인"
echo "=================================="

# Lambda 함수 이름 찾기
FUNCTION_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name ${STACK_NAME} \
  --logical-resource-id FateCalculatorFunction \
  --region ${REGION} \
  --query 'StackResources[0].PhysicalResourceId' \
  --output text 2>/dev/null)

if [ -z "$FUNCTION_NAME" ] || [ "$FUNCTION_NAME" == "None" ]; then
  echo "❌ Lambda 함수를 찾을 수 없습니다."
  echo "CloudFormation 스택이 배포되어 있는지 확인하세요."
  exit 1
fi

echo "✅ Lambda 함수 이름: ${FUNCTION_NAME}"
echo ""

# 로그 그룹 이름
LOG_GROUP="/aws/lambda/${FUNCTION_NAME}"

echo "📋 최근 1시간의 로그 확인 중..."
echo "----------------------------------"
aws logs tail ${LOG_GROUP} \
  --since 1h \
  --region ${REGION} \
  --format short \
  || echo "⚠️  로그를 가져올 수 없습니다. 로그 그룹이 존재하는지 확인하세요."

echo ""
echo "=================================="
echo "💡 팁: 실시간 로그 확인"
echo "aws logs tail ${LOG_GROUP} --follow --region ${REGION}"