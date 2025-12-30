import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as applicationsignals from 'aws-cdk-lib/aws-applicationsignals';
import * as path from 'path';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 0. Enable Application Signals Discovery
    new applicationsignals.CfnDiscovery(this, 'AppSignalsDiscovery', {});

    // 1. DynamoDB Table
    const table = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'UserId', type: dynamodb.AttributeType.STRING },
      tableName: 'PocValidator-Users-CDK',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'Email', type: dynamodb.AttributeType.STRING },
    });

    // 2. ADOT Layer ARN for Ireland (eu-west-1)
    // Note: 901920570463 is the official AWS account for ADOT managed layers
    const ADOT_LAYER_ARN = `arn:aws:lambda:${this.region}:901920570463:layer:aws-otel-nodejs-arm64-ver-1-30-2:1`;

    // 3. Common Lambda Configuration
    const commonProps: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      bundling: {
        minify: true,
        target: 'node22',
        // CRITICAL: Stop esbuild from bundling OTel. The Layer provides these.
        externalModules: [
          '@aws-sdk/*',
          '@opentelemetry/api',
          '@opentelemetry/sdk-node',
          '@opentelemetry/auto-instrumentations-node'
        ],
      },
      environment: {
        TABLE_NAME: table.tableName,
        // FIXED: Use /opt/otel-handler for Node.js (NOT otel-instrument)
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler', 
        OTEL_SERVICE_NAME: 'UserManagementAPI-CDK',
        OTEL_PROPAGATORS: 'tracecontext,baggage,b3,xray',
        OTEL_RESOURCE_ATTRIBUTES: 'service.name=UserManagementAPI-CDK,deployment.environment=Prod',
        OTEL_AWS_APPLICATION_SIGNALS_ENABLED: 'true',
        OTEL_AWS_APPLICATION_SIGNALS_EXPORTER_ENDPOINT: 'http://localhost:4316/v1/metrics',
        OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
        OTEL_METRICS_EXPORTER: 'none',
      },
    };

    // 4. Functions
    const authorizerFn = new nodejs.NodejsFunction(this, 'AuthorizerFunction', {
      ...commonProps,
      entry: path.join(__dirname, '../../src/handlers/authorizer.ts'),
    });

    const createUserFn = new nodejs.NodejsFunction(this, 'CreateUserFunction', {
      ...commonProps,
      entry: path.join(__dirname, '../../src/handlers/create-user.ts'),
    });

    const getUserFn = new nodejs.NodejsFunction(this, 'GetUserFunction', {
      ...commonProps,
      entry: path.join(__dirname, '../../src/handlers/get-user.ts'),
    });

    const listUsersFn = new nodejs.NodejsFunction(this, 'ListUsersFunction', {
      ...commonProps,
      entry: path.join(__dirname, '../../src/handlers/list-users.ts'),
    });

    const deleteUserFn = new nodejs.NodejsFunction(this, 'DeleteUserFunction', {
      ...commonProps,
      entry: path.join(__dirname, '../../src/handlers/delete-user.ts'),
    });

    // Database Permissions
    table.grantReadWriteData(createUserFn);
    table.grantReadData(getUserFn);
    table.grantReadData(listUsersFn);
    table.grantReadWriteData(deleteUserFn);

    // Apply Layers and Managed Policies to all functions
    const allFunctions = [authorizerFn, createUserFn, getUserFn, listUsersFn, deleteUserFn];

    allFunctions.forEach(fn => {
      // UNIQUE CONSTRUCT ID: Using fn.node.id prevents duplicate ID errors
      fn.addLayers(lambda.LayerVersion.fromLayerVersionArn(
        this, 
        `AdotLayer-${fn.node.id}`, 
        ADOT_LAYER_ARN
      ));

      // Use the strings directly to avoid the Metadata Validation warning
      fn.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLambdaApplicationSignalsExecutionRolePolicy'));
      fn.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'));
    });

    // 5. API Gateway
    const api = new apigateway.RestApi(this, 'UserApi', {
      restApiName: 'User Management API (CDK)',
      deployOptions: {
        stageName: 'Prod',
        tracingEnabled: true,
      },
    });

    const auth = new apigateway.RequestAuthorizer(this, 'ApiKeyAuthorizer', {
      handler: authorizerFn,
      identitySources: [apigateway.IdentitySource.header('x-api-key')],
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    const users = api.root.addResource('users');
    users.addMethod('GET', new apigateway.LambdaIntegration(listUsersFn), { authorizer: auth });
    users.addMethod('POST', new apigateway.LambdaIntegration(createUserFn), { authorizer: auth });

    const user = users.addResource('{id}');
    user.addMethod('GET', new apigateway.LambdaIntegration(getUserFn), { authorizer: auth });
    user.addMethod('DELETE', new apigateway.LambdaIntegration(deleteUserFn), { authorizer: auth });

    // Tags for Application Signals discovery
    cdk.Tags.of(this).add('Service', 'UserManagementAPI');
    cdk.Tags.of(this).add('RepositoryName', 'antonioreuter/poc-ai-ops/poc-validator-user-api');
    
    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });
  }
}