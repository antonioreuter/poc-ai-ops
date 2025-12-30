# User Management API Infrastructure (AWS CDK)

This directory contains the AWS CDK infrastructure for the User Management API. It has been refactored into modular constructs for better maintainability and observability.

## Technical Architecture

The infrastructure is organized into the following constructs:

- **DatabaseConstruct**: Manages the Amazon DynamoDB table (`PocValidator-Users-CDK`) and its Global Secondary Index (`EmailIndex`).
- **UserFunctionsConstruct**: Manages all AWS Lambda functions (Authorizer, Create, Get, List, Delete) with:
  - Runtime: Node.js 22
  - Architecture: ARM64
  - Tracing: Active (AWS X-Ray)
  - Bundling: esbuild
- **UserApiConstruct**: Orchestrates the Amazon API Gateway REST API and its integration with Lambda functions and the custom authorizer.
- **MonitoringConstruct**: Implements the observability layer:
  - **Application Signals**: Automated service discovery and SLOs (Availability, Latency).
  - **Alarms**: CloudWatch alarms for 5XX errors, Lambda throttling, and DynamoDB throttling.
  - **SNS Topic**: `user-management-api-alarms` for consolidated alerts.

## Observability & Tagging

To support autonomous AI remediation, the following tags are applied to all resources:

- `Service`: `UserManagementAPI`
- `RepositoryName`: `antonioreuter/poc-ai-ops/poc-validator-user-api`
- `GitCommit`: The specific git hash of the deployed version.

## Key Commands

- `npm run build`: Compiles TypeScript to `dist/`.
- `npm run test`: Executes infrastructure unit tests using Vitest.
- `npx cdk deploy`: Deploys the stack to your AWS account.
- `npx cdk synth`: Generates the CloudFormation template.

## Requirements

- Node.js 22.x
- AWS CDK CLI
- Bootstrapped AWS Account (Version 30+)
