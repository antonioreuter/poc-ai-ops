# How to use User HTTP Collection

This directory contains a set of HTTP requests to interact with the **Validator User API**. These requests are designed to be used with the [httpyac](https://httpyac.github.io/) extension for VS Code or any compatible REST Client.

## Prerequisites

1. **httpyac extension**: Install the `httpyac` extension in VS Code.
2. **Environment Variables**: The requests rely on variables defined in `http-client.env.json`.
   - `baseUrl`: The root URL of your deployed API.
   - `apiKey`: The API key required for authorization.

## Steps to Run

### 1. Select Environment

Open `user.http` and use the httpyac environment selector (usually in the VS Code status bar or at the top of the file) to select the desired environment (e.g., `local`, `dev`).

### 2. Execute Requests

You can run requests individually or sequentially:

- **List Users**: Fetches all users currently in the database.
- **Create User**: Creates a new user.
  - **Note**: This request captures the `UserId` from the response and stores it in the variable `{{createdId}}`.
- **Get User**: Retrieves the details of the user created in the previous step using `{{createdId}}`.
- **Delete User**: Removes the user created during the session.

### 3. Variable Flow

The file is structured to flow logically:

1. `createUser` runs and returns a JSON body.
2. `@createdId = {{createUser.UserId}}` extracts the ID.
3. Subsequent requests (`getUser`, `deleteUser`) use `{{createdId}}` in their URL paths.

## Manual Configuration

If you need to change the API key or URL, modify the `http-client.env.json` file in this directory:

```json
{
  "dev": {
    "baseUrl": "https://your-api-id.execute-api.region.amazonaws.com/Prod",
    "apiKey": "your-secret-key"
  }
}
```

## Debugging and Monitoring

If you encounter issues while running these requests:

1. **Structured Logs**: Check CloudWatch Logs for the relevant Lambda function. Logs are provided in JSON format via Pino, making it easy to filter for errors or specific Request IDs.
2. **CloudWatch Alarms**: If the API starts failing, check for active alarms in the CloudWatch console. There are pre-configured alarms for 5XX errors and throttling.
3. **Application Signals**: Use the Application Signals dashboard in the AWS Console to check the **Availability** and **Latency** SLOs for the `UserManagementAPI` service.
