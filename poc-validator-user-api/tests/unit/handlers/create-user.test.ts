import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "../../../src/handlers/create-user";
import { docClient } from "../../../src/utils/dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";

vi.mock("../../../src/utils/dynamodb", () => ({
  docClient: {
    send: vi.fn(),
  },
  TABLE_NAME: "PocValidator-Users",
}));

describe("create-user handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a user successfully", async () => {
    const event = {
      body: JSON.stringify({ name: "John Doe", email: "john@example.com" }),
    } as unknown as APIGatewayProxyEvent;

    // Mock QueryCommand (no existing user)
    (docClient.send as any).mockResolvedValueOnce({ Items: [] });
    // Mock PutCommand
    (docClient.send as any).mockResolvedValueOnce({});

    const result = (await handler(event, {} as any, () => {})) as any;

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.Name).toBe("John Doe");
    expect(body.Email).toBe("john@example.com");
    expect(body.UserId).toBeDefined();
    expect(docClient.send).toHaveBeenCalledTimes(2);
  });

  it("should return 409 if email already exists", async () => {
    const event = {
      body: JSON.stringify({ name: "John Doe", email: "john@example.com" }),
    } as unknown as APIGatewayProxyEvent;

    // Mock QueryCommand (existing user)
    (docClient.send as any).mockResolvedValueOnce({ Items: [{ Email: "john@example.com" }] });

    const result = (await handler(event, {} as any, () => {})) as any;

    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body).error).toBe("Email already exists");
    expect(docClient.send).toHaveBeenCalledTimes(1);
  });

  it("should return 400 if email is missing", async () => {
    const event = {
      body: JSON.stringify({ name: "John Doe" }),
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(event, {} as any, () => {})) as any;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe("Email is required");
  });

  it("should return 500 if there is a DynamoDB error", async () => {
    const event = {
      body: JSON.stringify({ name: "John Doe", email: "john@example.com" }),
    } as unknown as APIGatewayProxyEvent;

    (docClient.send as any).mockRejectedValue(new Error("DynamoDB error"));

    const result = (await handler(event, {} as any, () => {})) as any;

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe("Failed to create user");
  });

  it("should return 500 if body is missing", async () => {
    const event = {} as unknown as APIGatewayProxyEvent;

    const result = (await handler(event, {} as any, () => {})) as any;

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe("Failed to create user");
  });
});
