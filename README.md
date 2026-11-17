# KaaGazz

KaaGazz is a recycling coordination platform that connects institutions, NGOs,
recyclers, and operations administrators. Institutions can request pickups for
used paper, NGOs can submit material demand, recyclers can manage collection
routes, and administrators can approve partners and monitor network impact.

The application is designed for a serverless AWS deployment, but the frontend
and backend can also be run locally during development.

## What it includes

- Role-based workflows for institutions, NGOs, recyclers, and administrators
- Partner registration, approval, login, and profile management
- Pickup request queueing and automated dispatch scheduling
- Recycler route, load, and sorting workflows
- NGO material demand and allocation tracking
- Admin approval, partner directory, network monitoring, and impact reports
- JWT authentication, password reset flow, request validation, CORS controls,
  and rate limiting
- DynamoDB persistence, SQS-backed collection processing, and scheduled jobs
- CloudFront in front of the API for TLS, compression, and a stable endpoint

## Architecture

```text
React + Vite frontend
          |
          v
CloudFront -> API Gateway -> Express Lambda API
                                  |
                    +-------------+-------------+
                    |                           |
                DynamoDB                 SQS + worker Lambda
                                                |
                                      Scheduler Lambda
```

The backend can run as a regular Express server locally or as Lambda handlers
through AWS SAM. The frontend reads the API origin from `VITE_API_URL`.

## Technology

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express 5, JWT, bcryptjs
- **AWS:** Lambda, API Gateway, CloudFront, DynamoDB, SQS, EventBridge, CloudWatch
- **Infrastructure:** AWS Serverless Application Model (SAM)

## Repository layout

```text
.
├── backend/       Express API, Lambda handlers, services, routes, and SAM template
├── frontend/      React application and Vite configuration
├── SETUP.md       Detailed AWS deployment and operations runbook
└── README.md      Project overview and quick-start guide
```

## Prerequisites

- Node.js 24 or compatible current Node.js release
- npm
- AWS CLI and AWS SAM CLI for cloud deployment
- Docker Desktop only if you need `sam local`
- AWS credentials with access to the resources listed in [SETUP.md](./SETUP.md)

## Local development

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure the backend

Copy the example environment file and replace the placeholder values:

```bash
cp backend/.env.example backend/.env
```

At minimum, use a random `JWT_SECRET` with at least 32 characters. Keep
`backend/.env` private; it is ignored by Git. The local backend expects access
to the configured AWS DynamoDB table and SQS queue unless you provide an
equivalent local setup.

### 3. Configure the frontend

Create `frontend/.env.local`:

```dotenv
VITE_API_URL=http://localhost:5050/api
```

If the backend is deployed, use the `CdnUrl` CloudFormation output instead.

### 4. Start both applications

In one terminal:

```bash
cd backend
npm start
```

In another terminal:

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the frontend terminal, normally
`http://localhost:5173`.

## Useful commands

### Frontend

```bash
cd frontend
npm run dev       # Start Vite development server
npm run build     # Create a production build in dist/
npm run lint      # Run ESLint
npm run preview   # Preview the production build
```

### Backend

```bash
cd backend
npm start         # Start the local Express server
npm run dev       # Start with nodemon
npm run check     # Check handlers and load the application
```

The backend health endpoint is available at
`http://localhost:5050/api/health`.

## Deploying to AWS

The complete deployment process, required IAM permissions, SAM parameters,
CloudFormation outputs, first-user registration, and frontend hosting options
are documented in [SETUP.md](./SETUP.md).

The short version is:

```bash
cd backend
sam build --template-file template.yaml
sam deploy --guided
```

After deployment:

1. Read the `CdnUrl` output from CloudFormation.
2. Set `VITE_API_URL` to that URL plus `/api`.
3. Build the frontend with `npm run build`.
4. Host `frontend/dist` using AWS Amplify Hosting or another static host.
5. Set the deployed frontend origin in `CorsAllowedOrigins`.

Do not commit generated SAM configuration, credentials, JWT secrets, password
hashes, or `.env` files.

## Security notes

- Use a unique random JWT secret in every environment.
- Set `CORS_ALLOWED_ORIGINS` / `CorsAllowedOrigins` to the real frontend origin
  in deployed environments; do not rely on the empty development default.
- Use a dedicated AWS identity with only the permissions required to deploy
  and operate the stack.
- Treat admin credentials, reset tokens, AWS credentials, and deployment
  parameter values as secrets.
- Review CloudWatch logs and API rate-limit settings before exposing a
  production deployment.

## Status and contribution

This repository is under active development. Before opening a pull request,
run the frontend lint/build checks and the backend check command, then describe
any AWS or environment-specific validation that was not run locally.
