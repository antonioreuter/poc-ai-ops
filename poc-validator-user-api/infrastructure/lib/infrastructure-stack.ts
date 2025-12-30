import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as applicationsignals from 'aws-cdk-lib/aws-applicationsignals';
import { DatabaseConstruct } from './constructs/database';
import { UserFunctionsConstruct } from './constructs/functions';
import { UserApiConstruct } from './constructs/api';
import { MonitoringConstruct } from './constructs/monitoring';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const SERVICE_NAME = 'User-Management-API-CDK';

    // 0. Enable Application Signals Discovery
    new applicationsignals.CfnDiscovery(this, 'AppSignalsDiscovery', {});

    // 1. Data Storage
    const database = new DatabaseConstruct(this, 'Database');

    // 2. Compute (Lambda Functions)
    const functions = new UserFunctionsConstruct(this, 'Functions', {
      table: database.table,
      serviceName: SERVICE_NAME,
    });

    // 3. API Gateway
    const userApi = new UserApiConstruct(this, 'Api', {
      authorizerFn: functions.authorizerFn,
      createUserFn: functions.createUserFn,
      getUserFn: functions.getUserFn,
      listUsersFn: functions.listUsersFn,
      deleteUserFn: functions.deleteUserFn,
    });

    // 4. Monitoring (SLOs and Alarms)
    new MonitoringConstruct(this, 'Monitoring', {
      api: userApi.api,
      functions: [
        functions.authorizerFn,
        functions.createUserFn,
        functions.getUserFn,
        functions.listUsersFn,
        functions.deleteUserFn,
      ],
      table: database.table,
      serviceName: SERVICE_NAME,
    });

    // Tags for Application Signals discovery
    cdk.Tags.of(this).add('Service', SERVICE_NAME);
    cdk.Tags.of(this).add('Environment', 'Production');
    cdk.Tags.of(this).add('RepositoryName', 'antonioreuter/poc-ai-ops/poc-validator-user-api');
    
    // Add Git Commit Tag
    const gitCommit = process.env.GIT_COMMIT_HASH || 
                      process.env.GITHUB_SHA || 
                      (() => {
                        try {
                          return require('child_process').execSync('git rev-parse HEAD').toString().trim();
                        } catch (e) {
                          return 'unknown';
                        }
                      })();
    cdk.Tags.of(this).add('GitCommit', gitCommit);
    
    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: userApi.api.url,
      description: 'API Gateway endpoint URL',
    });
  }
}