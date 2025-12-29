import { APIGatewayProxyHandler } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../utils/dynamodb";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "User ID is required" }),
      };
    }

    console.log(`Deleting user with ID: ${id}`);

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { UserId: id },
      })
    );

    return {
      statusCode: 204,
      body: "",
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to delete user" }),
    };
  }
};
