import * as dotenv from "dotenv";
dotenv.config(); // Picks up AWS_PROFILE if it's in .env

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const ddbDocClient = DynamoDBDocumentClient.from(client);
