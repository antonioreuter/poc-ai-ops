### 1. Project Structure

Create the following directory structure:

```text
poc-validator-user-api/
├── package.json
├── tsconfig.json
├── template.yaml
└── src/
    ├── handlers/
    │   ├── authorizer.ts
    │   ├── create-user.ts
    │   ├── get-user.ts
    │   ├── list-users.ts
    │   └── delete-user.ts
    └── utils/
        └── dynamodb.ts

```

---

### 2. Configuration Files

#### `package.json`

Includes AWS SDK v3, uuid, and testing tools.

```json
{
  "name": "poc-validator-user-api",
  "version": "1.0.0",
  "description": "Serverless User API for AI Agent Validation",
  "main": "app.js",
  "scripts": {
    "test": "vitest",
    "build": "esbuild src/**/*.ts --bundle --platform=node --target=node18 --outdir=dist"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "esbuild": "^0.19.0",
    "typescript": "^5.0.0",
    "vitest": "^0.34.0"
  }
}
```

---

### 3. Infrastructure: `template.yaml`

**Key Highlights:**

- **Globals Section:** Applies the `Service`, `RepositoryName`, and `HashCommit` tags to all functions automatically.
- **DynamoDB:** Standard On-Demand table.

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Description: Validator User API - Agent Ready

Parameters:
  RepositoryName:
    Type: String
    Description: The repository name for tagging
  CommitHash:
    Type: String
    Description: The Git commit hash for tagging

Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 10
    Architectures:
      - x86_64
    Environment:
      Variables:
        TABLE_NAME: !Ref UsersTable
    # --- CRITICAL: AGENT TAGGING ---
    Tags:
      Service: UserManagementAPI
      RepositoryName: !Ref RepositoryName
      HashCommit: !Ref CommitHash

Resources:
  # --- 1. Database ---
  UsersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: UserId
          AttributeType: S
      KeySchema:
        - AttributeName: UserId
          KeyType: HASH

  # --- 2. API Gateway ---
  UserApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: Prod
      Auth:
        DefaultAuthorizer: ApiKeyAuthorizer
        Authorizers:
          ApiKeyAuthorizer:
            FunctionPayloadType: REQUEST
            FunctionArn: !GetAtt AuthorizerFunction.Arn
            Identity:
              Headers:
                - x-api-key

  # --- 3. Lambda Functions ---

  # Custom Authorizer
  AuthorizerFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/handlers/
      Handler: authorizer.handler
      Metadata:
        BuildMethod: esbuild
        BuildProperties:
          Minify: true
          Target: "node18"
          EntryPoints:
            - authorizer.ts

  # Create User (POST)
  CreateUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/handlers/
      Handler: create-user.handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref UsersTable
      Events:
        PostUser:
          Type: Api
          Properties:
            RestApiId: !Ref UserApi
            Path: /users
            Method: post
      Metadata:
        BuildMethod: esbuild
        BuildProperties:
          Minify: true
          Target: "node18"
          EntryPoints:
            - create-user.ts

  # Get User (GET)
  GetUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/handlers/
      Handler: get-user.handler
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref UsersTable
      Events:
        GetUser:
          Type: Api
          Properties:
            RestApiId: !Ref UserApi
            Path: /users/{id}
            Method: get
      Metadata:
        BuildMethod: esbuild
        BuildProperties:
          Minify: true
          Target: "node18"
          EntryPoints:
            - get-user.ts

  # List Users (GET)
  ListUsersFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/handlers/
      Handler: list-users.handler
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref UsersTable
      Events:
        ListUsers:
          Type: Api
          Properties:
            RestApiId: !Ref UserApi
            Path: /users
            Method: get
      Metadata:
        BuildMethod: esbuild
        BuildProperties:
          Minify: true
          Target: "node18"
          EntryPoints:
            - list-users.ts

  # Delete User (DELETE)
  DeleteUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/handlers/
      Handler: delete-user.handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref UsersTable
      Events:
        DeleteUser:
          Type: Api
          Properties:
            RestApiId: !Ref UserApi
            Path: /users/{id}
            Method: delete
      Metadata:
        BuildMethod: esbuild
        BuildProperties:
          Minify: true
          Target: "node18"
          EntryPoints:
            - delete-user.ts

  # --- 4. Networking (CloudFront + Route53) ---

  # SSL Certificate
  ApiCertificate:
    Type: AWS::CertificateManager::Certificate
    Properties:
      DomainName: !Ref DomainName
      ValidationMethod: DNS
      DomainValidationOptions:
        - DomainName: !Ref DomainName
          HostedZoneId: !Ref HostedZoneId

  # CloudFront Distribution
  ApiDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        Aliases:
          - !Ref DomainName
        ViewerCertificate:
          AcmCertificateArn: !Ref ApiCertificate
          SslSupportMethod: sni-only
        Origins:
          - Id: ApiGatewayOrigin
            DomainName: !Sub "${UserApi}.execute-api.${AWS::Region}.amazonaws.com"
            CustomOriginConfig:
              OriginProtocolPolicy: https-only
        DefaultCacheBehavior:
          TargetOriginId: ApiGatewayOrigin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods: [DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT]
          ForwardedValues:
            QueryString: true
            Headers:
              - Authorization
              - x-api-key

  # DNS Record
  ApiDNSRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZoneId
      Name: !Ref DomainName
      Type: A
      AliasTarget:
        HostedZoneId: Z2FDTNDATAQYW2 # This is the specific Zone ID for CloudFront
        DNSName: !GetAtt ApiDistribution.DomainName

Outputs:
  ApiUrl:
    Description: "API Gateway endpoint URL"
    Value: !Sub "https://${UserApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"
  CustomDomainUrl:
    Description: "Custom Domain URL"
    Value: !Sub "https://${DomainName}/"
```

---

### 4. Application Logic (TypeScript)

#### `src/utils/dynamodb.ts`

Helper to initialize the client.

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.TABLE_NAME || "";
```

#### `src/handlers/authorizer.ts`

Simple header-based validation.

```typescript
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

  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: event.methodArn,
        },
      ],
    },
  };
};
```

#### `src/handlers/create-user.ts`

```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { docClient, TABLE_NAME } from "../utils/dynamodb";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) throw new Error("Missing body");
    const body = JSON.parse(event.body);
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
      body: JSON.stringify(newUser),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create user" }),
    };
  }
};
```

#### `src/handlers/get-user.ts`

```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../utils/dynamodb";

export const handler: APIGatewayProxyHandler = async (event) => {
  const id = event.pathParameters?.id;

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { UserId: id },
    })
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "User not found" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
};
```

_(Note: `list-users.ts` and `delete-user.ts` follow similar patterns using `ScanCommand` and `DeleteCommand` respectively.)_

---

### 5. Deployment

To deploy this into your AWS account, ensure you have the `git` commit hash available (as required by the tagging strategy).

**1. Build the source:**

```bash
npm install
sam build

```

**2. Deploy with Tags:**
Replace the parameters with your actual domain info.

```bash
sam deploy --guided \
  --parameter-overrides \
    RepositoryName="poc-validator-user-api" \
    CommitHash=$(git rev-parse HEAD)

```

**Next Step:** Would you like me to write the unit tests for the `create-user` handler using Vitest to complete the requirements?
