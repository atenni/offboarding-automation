import { Context } from "aws-lambda";
import { ddbDocClient } from "../ddb/client.js";
import { addItem } from "../ddb/queries.js";
import type {
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2,
} from "aws-lambda";

interface WebhookPayload {
  email: string;
  offboarding_date: string;
  snow_id: string;
}

const QUEUE_TABLE_NAME = process.env.QUEUE_TABLE_NAME ?? "";

export const handler = async (
  event: APIGatewayProxyEventV2, // Function URLs use the same schema
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  const payload = JSON.parse(event.body ?? "");

  // Sanitise input
  const requiredProperties = ["email", "offboarding_date", "snow_id"];
  for (const key of requiredProperties) {
    if (!(key in payload)) throw new Error(`${key} is a required property`);
  }

  // TODO: convert to use `upsertItem`
  const result = await addItem(ddbDocClient, QUEUE_TABLE_NAME, payload);
  const statusCode = result.$metadata.httpStatusCode;

  return {
    statusCode,
    body: JSON.stringify(
      {
        message:
          statusCode === 200
            ? "Successfully added item"
            : "Something went wrong",
        result,
      },
      null,
      2
    ),
  };
};
