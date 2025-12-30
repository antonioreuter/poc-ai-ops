import { APIGatewayProxyHandler } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../utils/dynamodb";
import logger from "../utils/logger";

const handler: APIGatewayProxyHandler = async (event) => {
  const id = event.pathParameters?.id;
  logger.info({ userId: id }, "Incoming request to delete user");
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

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { UserId: id },
      })
    );

    logger.info({ userId: id }, "User deleted successfully");

    return {
      statusCode: 204,
      body: "",
    };
  } catch (error) {
    logger.error({ error, userId: id }, "Error deleting user");
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to delete user" }),
    };
  }
};

module.exports = { handler };
