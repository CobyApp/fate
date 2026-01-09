#!/bin/bash

# 프론트엔드 배포 스크립트
# 사용법: ./deploy-frontend.sh [environment]

set -e

ENVIRONMENT=${1:-dev}
REGION="ap-northeast-1"
STACK_NAME="fate-stack-${ENVIRONMENT}"

echo "🚀 프론트엔드 배포 시작..."
echo "환경: ${ENVIRONMENT}"
echo "리전: ${REGION}"
echo "스택 이름: ${STACK_NAME}"

# 1. CloudFormation 스택에서 필요한 값 가져오기
echo "📋 CloudFormation 스택 정보 가져오기..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucket`].OutputValue' \
  --output text)

if [ -z "$BUCKET_NAME" ] || [ "$BUCKET_NAME" == "None" ]; then
  echo "❌ 오류: FrontendBucket을 찾을 수 없습니다."
  echo "CloudFormation 템플릿을 먼저 배포했는지 확인하세요."
  exit 1
fi

echo "✅ S3 버킷: ${BUCKET_NAME}"

# 2. 프론트엔드 빌드
echo "🔨 프론트엔드 빌드 중..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ 오류: dist 디렉토리가 생성되지 않았습니다."
  exit 1
fi

# 3. S3에 업로드
echo "📤 S3에 업로드 중..."
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
  --region ${REGION} \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

# HTML 파일은 캐시하지 않음 (React Router를 위해)
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
  --region ${REGION} \
  --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html"

echo "✅ 업로드 완료!"

# 4. CloudFront 캐시 무효화
echo "🔄 CloudFront 캐시 무효화 중..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendDistributionId`].OutputValue' \
  --output text)

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)
  
  echo "✅ 캐시 무효화 생성됨: ${INVALIDATION_ID}"
  echo "⏳ 캐시 무효화가 완료되기까지 몇 분 걸릴 수 있습니다."
else
  echo "⚠️  경고: CloudFront Distribution ID를 찾을 수 없습니다."
fi

# 5. 배포 완료 정보 출력
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
  --output text)

echo ""
echo "🎉 배포 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "프론트엔드 URL: ${FRONTEND_URL}"
echo "S3 버킷: ${BUCKET_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
