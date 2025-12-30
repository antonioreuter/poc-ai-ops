import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseConstruct extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'UserId', type: dynamodb.AttributeType.STRING },
      tableName: 'PocValidator-Users-CDK',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Override logical ID to match existing table and avoid re-creation conflict
    (this.table.node.defaultChild as dynamodb.CfnTable).overrideLogicalId('UsersTable9725E9C8');

    this.table.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'Email', type: dynamodb.AttributeType.STRING },
    });
  }
}
