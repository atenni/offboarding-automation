import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type {
  GetCommandOutput,
  PutCommandOutput,
  QueryCommandInput,
  QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";

export interface PrimaryKey {
  email: string;
}
export interface GSI1 {
  status: "QUEUED" | "IN_PROGRESS" | "ERROR" | "SUCCESS";
  offboarding_date: string;
}

export interface QueueTableItem extends PrimaryKey, GSI1 {
  snow_id: string;
  created_at?: string;
  // updated_at?: string;
}

export async function addItem(
  client: DynamoDBDocumentClient,
  table: string,
  item: QueueTableItem
): Promise<PutCommandOutput> {
  const TableName = table;
  const Item = {
    created_at: new Date().toISOString(), // default value
    ...item, // overrides `created_at` if supplied in `item` (ie. when an item is updated)
    updated_at: new Date().toISOString(), // always override
  };

  const command = new PutCommand({ TableName, Item });

  return client.send(command);
}

/**
 * Get items from the QueueTable by PK (email address).
 *
 * If `key` is PK shaped, get item by email address.
 * If `key` is GSI1 shaped, query GSI 'status' index with `sortKeyComparison`
 */
async function getItems(
  client: DynamoDBDocumentClient,
  table: string,
  key: PrimaryKey | GSI1,
  sortKeyComparison?: "=" | "<" | "<=" | ">" | ">=" | "begins_with" // implement between,val1,val2?
): Promise<QueryCommandOutput> {
  const TableName = table;
  let commandOptions: QueryCommandInput;

  if (isPk(key)) {
    // key is PK, lookup item by email
    commandOptions = {
      TableName,
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": key.email },
    };
  } else {
    // key is GSI1, lookup items by status index
    let expression;
    if (!sortKeyComparison) {
      expression = "#GSI1PK = :status";
    } else if (sortKeyComparison.startsWith("begins")) {
      expression =
        "#GSI1PK = :status AND begins_with(#GSI1SK, :offboarding_date";
    } else {
      expression = `#GSI1PK = :status AND #GSI1SK ${sortKeyComparison} :offboarding_date`;
    }

    commandOptions = {
      TableName,
      IndexName: "status",
      KeyConditionExpression: expression,
      ExpressionAttributeNames: {
        "#GSI1PK": "status",
        "#GSI1SK": "offboarding_date",
      },
      ExpressionAttributeValues: {
        ":status": key.status,
        ":offboarding_date": key.offboarding_date,
      },
    };
  }

  const command = new QueryCommand(commandOptions);

  return client.send(command);
}

/**
 * TODO: implement this
 *
 * Utility query to allow for updating the primary key of an item, which isn't
 * possible via the built in UpdateCommand (which can only update document
 * attributes).
 *
 * To do this we:
 *   1. Check if the item exists
 *   2. If it doesn't exist: create it
 *   3. If if does exist: delete it and create new item with updated info
 */
export async function upsertItem(
  client: DynamoDBDocumentClient,
  table: string,
  item: QueueTableItem
): Promise<PutCommandOutput> {
  const existingItem = await getItems(client, table, { email: item.email });

  if (existingItem.Items) {
    // Item exists in DB – delete it, then recreate a modified version of it
  } else {
    // Item doesn't exist - create record
    return addItem(client, table, item);
  }
}
/**
 * Convenience function for the common case of getting the offboarding queue
 * for a given date. Defaults to today.
 *
 * Usage:
 *   @example
 *   import { ddbDocClient } from "/lib/ddb/client";
 *   const TABLE_NAME = process.env.TABLE_NAME;
 *
 *   const todaysResults = await getOffboardingQueueForDate(
 *     ddbDocClient, TABLE_NAME
 *   );
 *   const specificDaysResults = await getOffboardingQueueForDate(
 *     ddbDocClient,
 *     TABLE_NAME,
 *     "2023-01-01"
 *   );
 *
 * @param client - a DynamoDBDocumentClient
 * @param table - name of the DDB QueueOffboardingTable
 * @param date - YYYY-MM-DD format, defaults to today (Sydney time)
 */
export async function getOffboardingQueueForDate(
  client: DynamoDBDocumentClient,
  table: string,
  date?: string
): Promise<QueryCommandOutput> {
  // If date isn't provided, default to today (Sydney time)
  date = date ?? getTodaysDateString();
  const key: GSI1 = {
    status: "QUEUED",
    offboarding_date: date,
  };

  return getItems(client, table, key, "=");
}

/**
 * TODO: Fetch item and update `status` to IN_PROGRESS
 */
function getItemForProcessing() {}

/**
 * TODO: Delete all items in table (for development)
 */
function _deleteAllItems() {}

/**
 * TODO: Add fixture test data to table (for development)
 */
function _addTestDataToTable() {}

// Utilities

/** Type predicate for `PrimaryKey` */
export function isPk(key: PrimaryKey | GSI1): key is PrimaryKey {
  return "email" in key ? true : false;
}

function getTodaysDateString(timeZone = "Australia/Sydney") {
  // Get today's date in Sydney time in YYYY-MM-DD format
  // This will be a lot easier to do when `Temporal` lands
  const now = new Date();
  const year = now.toLocaleDateString("en-AU", { timeZone, year: "numeric" });
  const month = now.toLocaleDateString("en-AU", { timeZone, month: "2-digit" });
  const day = now.toLocaleDateString("en-AU", { timeZone, day: "2-digit" });
  return `${year}-${month}-${day}`;
}
