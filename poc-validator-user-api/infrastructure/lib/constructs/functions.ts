import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

interface UserFunctionsProps {
  table: dynamodb.ITable;
  serviceName: string;
}

export class UserFunctionsConstruct extends Construct {
  public readonly authorizerFn: nodejs.NodejsFunction;
  public readonly createUserFn: nodejs.NodejsFunction;
  public readonly getUserFn: nodejs.NodejsFunction;
  public readonly listUsersFn: nodejs.NodejsFunction;
  public readonly deleteUserFn: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: UserFunctionsProps) {
    super(scope, id);

    const region = cdk.Stack.of(this).region;
    const ADOT_LAYER_ARN = `arn:aws:lambda:${region}:901920570463:layer:aws-otel-nodejs-arm64-ver-1-30-2:1`;

    const commonProps: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      layers: [lambda.LayerVersion.fromLayerVersionArn(this, 'AdotLayer', ADOT_LAYER_ARN)],
      bundling: {
        minify: true,
        target: 'node22',
        externalModules: [
          '@aws-sdk/*',
          '@opentelemetry/api',
          '@opentelemetry/sdk-node',
          '@opentelemetry/auto-instrumentations-node'
        ],
      },
      environment: {
        OTEL_SERVICE_NAME: props.serviceName,
        TABLE_NAME: props.table.tableName,
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
        OTEL_PROPAGATORS: 'tracecontext,baggage,b3,xray',
        OTEL_RESOURCE_ATTRIBUTES: `service.name=${props.serviceName},deployment.environment=Production`,
        OTEL_AWS_APPLICATION_SIGNALS_ENABLED: 'true',
        OTEL_AWS_APPLICATION_SIGNALS_EXPORTER_ENDPOINT: 'http://localhost:4316/v1/metrics',
        OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
        OTEL_METRICS_EXPORTER: 'none',
      },
    };

    this.authorizerFn = this.createFunction('AuthorizerFunction', '../../../src/handlers/authorizer.ts', commonProps);
    this.createUserFn = this.createFunction('CreateUserFunction', '../../../src/handlers/create-user.ts', commonProps);
    this.getUserFn = this.createFunction('GetUserFunction', '../../../src/handlers/get-user.ts', commonProps);
    this.listUsersFn = this.createFunction('ListUsersFunction', '../../../src/handlers/list-users.ts', commonProps);
    this.deleteUserFn = this.createFunction('DeleteUserFunction', '../../../src/handlers/delete-user.ts', commonProps);

    // Apply Layers and Managed Policies
    const allFunctions = [
      this.authorizerFn,
      this.createUserFn,
      this.getUserFn,
      this.listUsersFn,
      this.deleteUserFn
    ];

    allFunctions.forEach(fn => {
      fn.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLambdaApplicationSignalsExecutionRolePolicy'));
      fn.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'));
    });

    // Database Permissions
    props.table.grantReadWriteData(this.createUserFn);
    props.table.grantReadData(this.getUserFn);
    props.table.grantReadData(this.listUsersFn);
    props.table.grantReadWriteData(this.deleteUserFn);
  }

  private createFunction(id: string, entryPath: string, commonProps: Partial<nodejs.NodejsFunctionProps>): nodejs.NodejsFunction {
    return new nodejs.NodejsFunction(this, id, {
      ...commonProps,
      entry: path.join(__dirname, entryPath),
    });
  }
}
