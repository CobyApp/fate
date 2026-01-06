# AWS 인프라 설정

이 디렉토리는 AWS 서비스 설정을 포함합니다.

## 구조

```
aws/
├── lambda/
│   ├── fate-calculator/     # 사주 계산 Lambda 함수
│   └── get-fate-history/    # 사주 기록 조회 Lambda 함수
├── cloudformation/
│   └── template.yaml        # CloudFormation/SAM 템플릿
└── README.md
```

## 배포 방법

### 1. AWS SAM CLI 설치

```bash
# macOS
brew install aws-sam-cli

# 또는 pip
pip install aws-sam-cli
```

### 2. AWS 자격 증명 설정

```bash
aws configure
```

### 3. Lambda 함수 패키징 및 배포

```bash
cd aws/cloudformation

# 빌드
sam build

# 배포
sam deploy --guided
```

또는 CloudFormation으로 직접 배포:

```bash
aws cloudformation create-stack \
  --stack-name fate-stack \
  --template-body file://template.yaml \
  --capabilities CAPABILITY_IAM
```

## 환경 변수

- `FATE_TABLE_NAME`: DynamoDB 테이블 이름

## API 엔드포인트

배포 후 출력되는 API URL을 사용하여 다음 엔드포인트에 접근할 수 있습니다:

- `POST /fate` - 사주 계산
- `GET /fate` - 최근 사주 기록 조회
- `GET /fate/{id}` - 특정 사주 기록 조회
