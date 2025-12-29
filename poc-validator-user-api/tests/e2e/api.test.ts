import { describe, it, expect } from "vitest";

const API_URL = process.env.API_BASE_URL!;
const API_KEY = process.env.API_KEY!;

if (!API_URL || !API_KEY) {
  throw new Error("BASE_URL and API_KEY environment variables are required.");
}

describe("API E2E Tests", () => {
  let createdUserId: string;

  it("should create a new user", async () => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "E2E Test User",
        email: uniqueEmail,
      }),
    });

    expect(response.status).toBe(201);
    const data: any = await response.json();
    expect(data.Name).toBe("E2E Test User");
    expect(data.UserId).toBeDefined();
    createdUserId = data.UserId;
  });

  it("should get the created user", async () => {
    const response = await fetch(`${API_URL}/users/${createdUserId}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    expect(response.status).toBe(200);
    const data: any = await response.json();
    expect(data.UserId).toBe(createdUserId);
    expect(data.Name).toBe("E2E Test User");
  });

  it("should list users and include the new user", async () => {
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    expect(response.status).toBe(200);
    const users: any = await response.json();
    expect(Array.isArray(users)).toBe(true);
    const user = users.find((u: any) => u.UserId === createdUserId);
    expect(user).toBeDefined();
  });

  it("should delete the user", async () => {
    const response = await fetch(`${API_URL}/users/${createdUserId}`, {
      method: "DELETE",
      headers: {
        "x-api-key": API_KEY,
      },
    });

    expect(response.status).toBe(204);
  });

  it("should return 404 for the deleted user", async () => {
    const response = await fetch(`${API_URL}/users/${createdUserId}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    expect(response.status).toBe(404);
  });

  it("should return 403 (or Deny from authorizer) with invalid API key", async () => {
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        "x-api-key": "invalid-key",
      },
    });

    // Custom authorizer returns 403 by default when Effect is Deny
    expect(response.status).toBe(403);
  });
});
