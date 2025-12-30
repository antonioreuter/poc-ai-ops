#!/bin/bash

# Exit on error
set -e

# Default values
REGION=${1:-"eu-west-1"}
PROFILE=${2:-"default"}

echo "Starting CI/CD Pipeline..."
echo "[LOG] Using Region: $REGION"
echo "[LOG] Using Profile: $PROFILE"

# 1. Run Root Unit Tests
echo "[LOG] Running application unit tests..."
npm run test:unit

# 2. Run Infrastructure Tests
echo "[LOG] Running infrastructure unit tests..."
cd infrastructure
npm test -- --run
cd ..

# 3. Validate CDK Synthesis
echo "[LOG] Validating CDK infrastructure..."
cd infrastructure
npx cdk synth --region $REGION --profile $PROFILE > /dev/null
cd ..

# 4. Deploy Application
echo "[LOG] Deploying application via CDK..."
cd infrastructure
npx cdk deploy --require-approval never --region $REGION --profile $PROFILE
cd ..

# 5. Update .env for E2E Tests
echo "[LOG] Updating .env file with the deployed API URL..."
STACK_NAME="PocValidatorUserApiStack"
NEW_API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text | sed 's/\/$//')

if [ -z "$NEW_API_URL" ] || [ "$NEW_API_URL" == "None" ]; then
    echo "Error: Could not fetch API URL from CloudFormation stack."
    exit 1
fi

echo "[LOG] Fetched API URL: $NEW_API_URL"

# Create .env if it doesn't exist
touch .env

if grep -q "API_BASE_URL=" .env; then
    sed -i "s|API_BASE_URL=.*|API_BASE_URL=$NEW_API_URL|" .env
else
    echo "API_BASE_URL=$NEW_API_URL" >> .env
fi

# 6. Run E2E Tests
echo "[LOG] Running end-to-end tests..."
npm run test:e2e

echo "CI/CD Pipeline completed successfully."
