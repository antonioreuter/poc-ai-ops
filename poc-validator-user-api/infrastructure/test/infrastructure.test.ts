import { test, expect, describe } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { InfrastructureStack } from '../lib/infrastructure-stack';

describe('Infrastructure Stack', () => {
  const app = new cdk.App();
  const stack = new InfrastructureStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  test('DynamoDB Table is configured correctly', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'PocValidator-Users-CDK',
      AttributeDefinitions: [
        { AttributeName: 'UserId', AttributeType: 'S' },
        { AttributeName: 'Email', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'UserId', KeyType: 'HASH' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'EmailIndex',
          KeySchema: [
            { AttributeName: 'Email', KeyType: 'HASH' },
          ],
        },
      ],
    });
  });

  test('Lambda functions use Node.js 22 and ARM64', () => {
    template.allResourcesProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
      TracingConfig: {
        Mode: 'Active',
      },
    });
  });

  test('Lambda functions have OTel and Application Signals enabled', () => {
    // Check if functions have the required environment variables
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          OTEL_SERVICE_NAME: 'User-Management-API-CDK',
          OTEL_AWS_APPLICATION_SIGNALS_ENABLED: 'true',
          AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
        }),
      },
    });
  });

  test('API Gateway is configured with Authorizer', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'User Management API (CDK)',
    });

    template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
      Type: 'REQUEST',
      IdentitySource: 'method.request.header.x-api-key',
    });
  });

  test('Lambda functions have correct IAM policies for DynamoDB', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(["dynamodb:PutItem"]),
          }),
        ]),
      },
    });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(["dynamodb:GetItem"]),
          }),
        ]),
      },
    });
  });

  test('Stack should have the required Tags on Lambda functions', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'Service', Value: 'User-Management-API-CDK' }),
      ]),
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'Environment', Value: 'Production' }),
      ]),
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'RepositoryName', Value: 'antonioreuter/poc-ai-ops/poc-validator-user-api' }),
      ]),
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'GitCommit' }),
      ]),
    });
  });
});
