#!/usr/bin/env node
import * as dotenv from "dotenv";
dotenv.config();

import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { QueueOffboardingStack } from "../lib/queue-offboarding-stack";
// import { ProcessOffboardingStack } from "../lib/process-offboarding-stack";

const app = new App();

// Consider hardcoding PRODUCTION values, and overriding with DEV if defined
const env = {
  account: process.env.CDK_PRODUCTION_ACCOUNT ?? process.env.CDK_DEV_ACCOUNT,
  region: process.env.CDK_PRODUCTION_REGION ?? process.env.CDK_DEV_REGION,
};

new QueueOffboardingStack(app, "QueueOffboardingStack", { env });

// new ProcessOffboardingStack(app, 'ProcessOffboardingStack', {});
