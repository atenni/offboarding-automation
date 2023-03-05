import * as cdk from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime, FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class QueueOffboardingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // "NodejsFunction"
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html
    const webhookHandler = new NodejsFunction(this, "webhookHandler", {
      entry: "./lib/functions/webhook_handler.ts",
      runtime: Runtime.NODEJS_18_X,
    });
    const funcURL = webhookHandler.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });

    // This will be written to the defined `outputsFile` in cdk.json
    new cdk.CfnOutput(this, "WebhookFunctionURL", { value: funcURL.url });
  }
}
