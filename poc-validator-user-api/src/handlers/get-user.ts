import { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../utils/dynamodb";
import logger from "../utils/logger";

const handler: APIGatewayProxyHandler = async (event) => {
  const id = event.pathParameters?.id;
  logger.info({ userId: id }, "Incoming request to get user");
  try {
    if (!id) {
      logger.warn("Request failed: Missing user ID");
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "User ID is required" }),
      };
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { UserId: id },
      })
    );

    if (!result.Item) {
      logger.warn({ userId: id }, "User not found");
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    logger.error({ error, userId: id }, "Error fetching user");
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to fetch user" }),
    };
  }
};

module.exports = { handler };
