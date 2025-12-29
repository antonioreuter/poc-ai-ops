#!/bin/bash

# Default values
REGION=${1:-"eu-west-1"}
PROFILE=${2:-"default"}
STACK_NAME="poc-validator-user-api"

echo "Using Region: $REGION"
echo "Using Profile: $PROFILE"

# Build the application
echo "Building application..."
export PATH=$PATH:$(pwd)/node_modules/.bin
sam build

if [ $? -ne 0 ]; then
    echo "Build failed. Exiting."
    exit 1
fi

# Deploy the application
echo "Deploying application..."
sam deploy \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile $PROFILE \
    --resolve-s3 \
    --capabilities CAPABILITY_IAM \
    --no-confirm-changeset \
    --parameter-overrides \
        RepositoryName="poc-validator-user-api" \
        CommitHash=$(git rev-parse HEAD 2>/dev/null || echo "no-git")

if [ $? -eq 0 ]; then
    echo "Deployment successful!"
else
    echo "Deployment failed."
    exit 1
fi
