import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { docClient, TABLE_NAME } from "../utils/dynamodb";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) throw new Error("Missing body");
    const body = JSON.parse(event.body);
    
    if (!body.email) {
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

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to create user" }),
    };
  }
};
