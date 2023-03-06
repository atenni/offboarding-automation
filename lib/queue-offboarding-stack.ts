import * as cdk from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import { Runtime, FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class QueueOffboardingStack extends cdk.Stack {
  queueTable: ddb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB "Queue" table
    this.queueTable = new ddb.Table(this, "OffboardingQueue", {
      partitionKey: { name: "email", type: ddb.AttributeType.STRING },
      pointInTimeRecovery: true,
    });
    this.queueTable.addGlobalSecondaryIndex({
      indexName: "status",
      partitionKey: { name: "status", type: ddb.AttributeType.STRING },
      sortKey: { name: "offboarding_date", type: ddb.AttributeType.STRING },
    });
    // This will be written to the defined `outputsFile` in cdk.json
    new cdk.CfnOutput(this, "OffboardingQueueTableName", {
      value: this.queueTable.tableName,
    });

    // Create lambda webhook handler via `NodejsFunction`
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html
    const webhookHandler = new NodejsFunction(this, "webhookHandler", {
      entry: "./lib/functions/webhook-handler.ts",
      runtime: Runtime.NODEJS_18_X,
      environment: {
        QUEUE_TABLE_NAME: this.queueTable.tableName,
      },
    });
    const funcURL = webhookHandler.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
      cors: {
        // This could be improved by tightening "Allow origin" and setting "Allow credentials"
        allowedOrigins: ["*"],
        allowedMethods: [cdk.aws_lambda.HttpMethod.POST],
      },
    });
    // Connect DDB and Lambda
    this.queueTable.grantReadWriteData(webhookHandler);
    // This will be written to the defined `outputsFile` in cdk.json
    new cdk.CfnOutput(this, "WebhookFunctionURL", { value: funcURL.url });
  }
}
