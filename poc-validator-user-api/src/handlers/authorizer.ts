import {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  // In a real scenario, fetch this from Secrets Manager
  const VALID_API_KEY = "validator-secret-key-123";
  const requestKey =
    event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"];

  const effect = requestKey === VALID_API_KEY ? "Allow" : "Deny";

  // Use wildcard for Resource to allow caching to work across different paths/methods
  // Modified to force redeploy with TTL 0
  const resource = event.methodArn.split("/").slice(0, 2).join("/") + "/*";
  
  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};
