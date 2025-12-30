import { test, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Infrastructure from '../lib/infrastructure-stack';

test('DynamoDB Table and API Gateway Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Infrastructure.InfrastructureStack(app, 'MyTestStack');
  // THEN
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'PocValidator-Users-CDK',
  });

  template.hasResourceProperties('AWS::ApiGateway::RestApi', {
    Name: 'User Management API (CDK)',
  });
});
