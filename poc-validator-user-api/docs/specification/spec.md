# Technical Specification: Validator User API

## 1. Project Structure

The project follows a modular structure separated into application logic and infrastructure definitions.

```text
poc-validator-user-api/
├── CICD.sh             # Orchestration script for tests and deployment
├── deploy.sh           # Deployment script
├── package.json        # Main dependencies (Lambda handlers + Pino)
├── src/                # Lambda source code
│   ├── handlers/       # Operation handlers (Create, Get, List, Delete, Authorizer)
│   └── utils/          # Shared utilities (Logger, DynamoDB)
└── infrastructure/     # AWS CDK Infrastructure
    ├── lib/
    │   ├── constructs/ # Modular CDK Constructs (Database, Functions, Api, Monitoring)
    │   └── infrastructure-stack.ts # Stack orchestrator
    └── test/           # Infrastructure unit tests
```

---

## 2. Configuration & Dependencies

### `package.json` (Application)

Core dependencies include AWS SDK v3, `uuid` for ID generation, and **Pino** for structured logging.

```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "pino": "^10.1.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "vitest": "^4.0.16"
  }
}
```

---

## 3. Infrastructure (AWS CDK)

### Tagging Strategy (Agent Readiness)

All resources are tagged to allow the Sentry Agent to trace incidents back to the source code:

- `Service`: `UserManagementAPI`
- `RepositoryName`: `antonioreuter/poc-ai-ops/poc-validator-user-api`
- `GitCommit`: Dynamic value fetched via `git rev-parse HEAD`.

### Monitoring & Alarms

- **SLO (Availability)**: 99.9% success rate.
- **SLO (Latency)**: 99% of requests < 1s.
- **SNS Topic**: `user-management-api-alarms` for notifications.
- **Alarms**: 5XX Errors, Lambda Throttling, DynamoDB Read/Write Throttling.

---

## 4. Application Logic

### Structured Logging (Pino)

All handlers use a centralized logger configured in `src/utils/logger.ts`. Logs are emitted in JSON format:

```json
{"level":30,"time":1767105331676,"service":"poc-validator-user-api","event":{...},"msg":"Incoming request"}
```

### Authentication

A custom Lambda authorizer (`src/handlers/authorizer.ts`) validates the `x-api-key` header against a pre-shared secret.

### Database

Amazon DynamoDB is used with a partition key `UserId` (UUID). A GSI `EmailIndex` is supported if email-based lookups are required in the future.

---

## 5. Deployment Lifecycle

The deployment is managed by `./CICD.sh`, which performs:

1.  **Application Unit Tests**: Verifies handler logic and structured logging.
2.  **Infrastructure Tests**: Verifies CDK resource configuration and compliance.
3.  **Synthesis & Deployment**: Uses CDK to provision resources with Git commit tagging.
4.  **E2E Tests**: Validates the live endpoint after deployment.
5.  **Performance Tests**: (Optional) executes load tests using k6.
