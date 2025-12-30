#!/bin/bash

# Default values
REGION=${1:-"eu-west-1"}
PROFILE=${2:-"default"}

echo "[LOG] Using Region: $REGION"
echo "[LOG] Using Profile: $PROFILE"

# Navigate to the infrastructure directory
cd infrastructure

# Deploy the CDK stack
echo "[LOG] Deploying infrastructure via CDK..."
npx cdk deploy --require-approval never --region $REGION --profile $PROFILE

if [ $? -eq 0 ]; then
    echo "Deployment successful."
else
    echo "Deployment failed."
    exit 1
fi
