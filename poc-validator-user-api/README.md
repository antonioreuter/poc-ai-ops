# Validator User API

This is a production-representative User Management API built with Node.js 22, TypeScript, and AWS CDK. It serves as the target system for verifying the autonomous remediation capabilities of the **Sentry Agent**.

## Features

- **CRUD Operations**: Manage users (Create, Get, List, Delete) stored in Amazon DynamoDB.
- **Secure API**: Protected by a Custom Lambda Authorizer using API keys.
- **Observability**:
  - **Structured Logging**: Uses [Pino](https://getpino.io/) for machine-readable JSON logs.
  - **OpenTelemetry (ADOT)**: Integrated with AWS Distro for OpenTelemetry for tracing and metrics.
  - **Real-time Monitoring**: AWS Application Signals with pre-configured SLOs and CloudWatch Alarms.
- **Traceability**: All resources are tagged with the specific `GitCommit` hash for environment parity.

## Project Structure

- `src/`: Application source code (Lambda handlers).
- `infrastructure/`: CDK infrastructure code (TypeScript).
- `tests/`:
  - `unit/`: Handler logic tests.
  - `e2e/`: API integration tests.
  - `performance/`: Load tests using k6.
- `http-collections/`: Sample HTTP requests for quick testing.

## Getting Started

### 1. Prerequisites

- Node.js 22.x
- AWS CLI configured with valid credentials.
- CDK bootstrapped (version 30+).

### 2. Full Pipeline (Test & Deploy)

```bash
./CICD.sh
```

### 3. Manual Deployment

```bash
./deploy.sh
```

## API Documentation

The API base URL is provided in the CDK stack outputs after deployment.

| Endpoint      | Method | Description       |
| :------------ | :----- | :---------------- |
| `/users`      | POST   | Create a new user |
| `/users`      | GET    | List all users    |
| `/users/{id}` | GET    | Get user by ID    |
| `/users/{id}` | DELETE | Delete user by ID |

**Header**: `x-api-key: validator-secret-key-123`
