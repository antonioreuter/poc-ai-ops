import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as applicationsignals from 'aws-cdk-lib/aws-applicationsignals';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface MonitoringProps {
  api: apigateway.RestApi;
  functions: lambda.IFunction[];
  table: dynamodb.ITable;
  serviceName: string;
}

export class MonitoringConstruct extends Construct {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    // 1. SNS Topic for Notifications
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'User Management API Alarms',
      topicName: 'user-management-api-alarms',
    });

    // 2. SLOs using Application Signals
    // Availability SLO: 99.9% success rate over 7 days
    new applicationsignals.CfnServiceLevelObjective(this, 'AvailabilitySLO', {
      name: `${props.serviceName}-Availability`,
      sli: {
        sliMetric: {
          metricDataQueries: [
            {
              id: 'm1',
              metricStat: {
                metric: {
                  namespace: 'AWS/ApplicationSignals',
                  metricName: 'SuccessRate',
                  dimensions: [
                    { name: 'Service', value: props.serviceName },
                  ],
                },
                period: 60,
                stat: 'Average',
              },
              returnData: true,
            },
          ],
        },
        metricThreshold: 99.9,
        comparisonOperator: 'GreaterThanOrEqualTo',
      },
      goal: {
        attainmentGoal: 99.9,
        interval: {
          rollingInterval: {
            duration: 7,
            durationUnit: 'DAY',
          },
        },
      },
    });

    // Latency SLO: 99% of requests below 1s (1000ms)
    new applicationsignals.CfnServiceLevelObjective(this, 'LatencySLO', {
      name: `${props.serviceName}-Latency`,
      sli: {
        sliMetric: {
          metricDataQueries: [
            {
              id: 'm1',
              metricStat: {
                metric: {
                  namespace: 'AWS/ApplicationSignals',
                  metricName: 'Latency',
                  dimensions: [
                    { name: 'Service', value: props.serviceName },
                  ],
                },
                period: 60,
                stat: 'Average',
              },
              returnData: true,
            },
          ],
        },
        metricThreshold: 1000,
        comparisonOperator: 'LessThanOrEqualTo',
      },
      goal: {
        attainmentGoal: 99.0,
        interval: {
          rollingInterval: {
            duration: 7,
            durationUnit: 'DAY',
          },
        },
      },
    });

    // 3. CloudWatch Alarms
    
    // API Gateway 5XX Errors
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      metric: props.api.metricServerError({
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'API Gateway returned 5XX errors',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api5xxAlarm.addAlarmAction(new cw_actions.SnsAction(this.alarmTopic));

    // Lambda Throttles (aggregated across all functions)
    props.functions.forEach(fn => {
      const throttleAlarm = new cloudwatch.Alarm(this, `${fn.node.id}ThrottleAlarm`, {
        metric: fn.metricThrottles({
          period: cdk.Duration.minutes(1),
          statistic: 'Sum',
        }),
        threshold: 1,
        evaluationPeriods: 1,
        alarmDescription: `Lambda function ${fn.node.id} is being throttled`,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      throttleAlarm.addAlarmAction(new cw_actions.SnsAction(this.alarmTopic));
    });

    // DynamoDB Throttles
    const tableReadThrottleAlarm = new cloudwatch.Alarm(this, 'TableReadThrottleAlarm', {
      metric: props.table.metric('ReadThrottleEvents', {
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'DynamoDB table read operations are being throttled',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    tableReadThrottleAlarm.addAlarmAction(new cw_actions.SnsAction(this.alarmTopic));

    const tableWriteThrottleAlarm = new cloudwatch.Alarm(this, 'TableWriteThrottleAlarm', {
      metric: props.table.metric('WriteThrottleEvents', {
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'DynamoDB table write operations are being throttled',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    tableWriteThrottleAlarm.addAlarmAction(new cw_actions.SnsAction(this.alarmTopic));
  }
}
