import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { docClient, TABLE_NAME } from "../utils/dynamodb";
import logger from "../utils/logger";

const handler: APIGatewayProxyHandler = async (event) => {
  logger.info({ event }, "Incoming request to create user");
  try {
    if (!event.body) throw new Error("Missing body");
    const body = JSON.parse(event.body);
    
    if (!body.email) {
      logger.warn("Request failed: Missing email");
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Email is required" }),
      };
    }

    // Check if email already exists
    const existingEmail = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "EmailIndex",
        KeyConditionExpression: "Email = :email",
        ExpressionAttributeValues: {
          ":email": body.email,
        },
      })
    );

    if (existingEmail.Items && existingEmail.Items.length > 0) {
      logger.warn({ email: body.email }, "Conflict: Email already exists");
      return {
        statusCode: 409,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Email already exists" }),
      };
    }

    const userId = uuidv4();
    const newUser = {
      UserId: userId,
      Name: body.name,
      Email: body.email,
      CreatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: newUser,
      })
    );

    logger.info({ userId }, "User created successfully");

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    };
  } catch (error) {
    logger.error({ error }, "Error creating user");
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to create user" }),
    };
  }
};

module.exports = { handler };
