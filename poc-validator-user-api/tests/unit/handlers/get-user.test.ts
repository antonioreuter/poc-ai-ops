import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "../../../src/handlers/get-user";
import { docClient } from "../../../src/utils/dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";

vi.mock("../../../src/utils/dynamodb", () => ({
  docClient: {
    send: vi.fn(),
  },
  TABLE_NAME: "PocValidator-Users",
}));

describe("get-user handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch a user successfully", async () => {
    const event = {
      pathParameters: { id: "123" },
    } as unknown as APIGatewayProxyEvent;

    (docClient.send as any).mockResolvedValue({
      Item: { UserId: "123", Name: "John Doe" },
    });

    const result = (await handler(event, {} as any, () => {})) as any;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.Name).toBe("John Doe");
    expect(body.UserId).toBe("123");
  });

  it("should return 404 if user not found", async () => {
    const event = {
      pathParameters: { id: "123" },
    } as unknown as APIGatewayProxyEvent;

    (docClient.send as any).mockResolvedValue({ Item: null });

    const result = (await handler(event, {} as any, () => {})) as any;

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe("User not found");
  });

  it("should return 400 if ID is missing", async () => {
    const event = {
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(event, {} as any, () => {})) as any;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe("User ID is required");
  });
});
