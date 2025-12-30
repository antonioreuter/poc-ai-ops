import { APIGatewayProxyHandler } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../utils/dynamodb";
import logger from "../utils/logger";

const handler: APIGatewayProxyHandler = async (event) => {
  logger.info("Incoming request to list users");
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );

    logger.info({ count: result.Items?.length }, "Users retrieved successfully");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result.Items || []),
    };
  } catch (error) {
    logger.error({ error }, "Error listing users");
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to list users" }),
    };
  }
};

module.exports = { handler };
