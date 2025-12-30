import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface UserApiProps {
  authorizerFn: lambda.IFunction;
  createUserFn: lambda.IFunction;
  getUserFn: lambda.IFunction;
  listUsersFn: lambda.IFunction;
  deleteUserFn: lambda.IFunction;
}

export class UserApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: UserApiProps) {
    super(scope, id);

    this.api = new apigateway.RestApi(this, 'UserApi', {
      restApiName: 'User Management API (CDK)',
      deployOptions: {
        stageName: 'Prod',
        tracingEnabled: true,
      },
    });

    const auth = new apigateway.RequestAuthorizer(this, 'ApiKeyAuthorizer', {
      handler: props.authorizerFn,
      identitySources: [apigateway.IdentitySource.header('x-api-key')],
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    const users = this.api.root.addResource('users');
    users.addMethod('GET', new apigateway.LambdaIntegration(props.listUsersFn), { authorizer: auth });
    users.addMethod('POST', new apigateway.LambdaIntegration(props.createUserFn), { authorizer: auth });

    const user = users.addResource('{id}');
    user.addMethod('GET', new apigateway.LambdaIntegration(props.getUserFn), { authorizer: auth });
    user.addMethod('DELETE', new apigateway.LambdaIntegration(props.deleteUserFn), { authorizer: auth });
  }
}
