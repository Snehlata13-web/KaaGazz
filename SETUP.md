# KaaGazz setup

This project uses AWS SAM to create the backend resources. You do not need to create DynamoDB, SQS, Lambda, API Gateway, or CloudFront manually.

> Note: CloudFront distributions take roughly 5-15 minutes to deploy, so the first `sam deploy` after this change is slower than previous ones.

## 1. Install local tools

On macOS with Homebrew:

```bash
brew install awscli aws-sam-cli
```

Install and start Docker Desktop if you want to run `sam local`.

Verify:

```bash
aws --version
sam --version
```

## 2. Configure AWS credentials

Use an AWS IAM Identity Center profile or an IAM user with permission to deploy CloudFormation, Lambda, API Gateway, CloudFront, DynamoDB, SQS, CloudWatch Logs, IAM, and EventBridge.

For a basic local profile:

```bash
aws configure
```

Use the same region everywhere, for example `ap-southeast-2`.

Confirm access:

```bash
aws sts get-caller-identity
```

## 3. Create deployment secrets

Generate a JWT secret:

```bash
openssl rand -base64 48
```

Generate an admin password hash. Replace the example password in your local terminal:

```bash
cd backend
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" 'replace-this-password'
```

Keep the resulting hash private. Do not commit it.

## 4. Deploy the backend

```bash
cd backend
sam build --template-file template.yaml
sam deploy --guided
```

For the guided prompts:

- Stack name: `kaagaz-dev`
- AWS Region: your selected region
- `JwtSecret`: the random secret from step 3
- `AdminEmail`: your operations email
- `AdminPasswordHash`: the bcrypt hash from step 3
- `CorsAllowedOrigins`: your frontend origin, for example `https://main.d123.amplifyapp.com`. Leave empty only for local development; empty means every origin is allowed.
- `CloudFrontPriceClass`: keep `PriceClass_200` so Indian edge locations are included.
- `CacheTtlSeconds`: keep `60` unless you want fresher admin dashboards.
- Confirm changes: `Y`
- Allow SAM to create IAM roles: `Y`
- Save arguments to samconfig: `Y`

At the final SAM config prompts, do not type `y` as a filename. Use the defaults:

```text
Save arguments to configuration file [Y/n]: y
SAM configuration file [samconfig.toml]: <press Enter>
SAM configuration environment [default]: <press Enter>
```

The file is ignored by Git because it can contain deployment parameter values.

SAM will create:

- `EcoPaperData` DynamoDB table with `GSI1`, `GSI2` and `GSI3`, and TTL enabled on the `ttl` attribute
- Collection SQS queue and dead-letter queue
- API Lambda and an explicit HTTP API Gateway with request throttling and JSON access logs
- A CloudFront distribution in front of that API
- SQS worker Lambda
- Daily automatic dispatch scheduler Lambda
- IAM permissions between these resources

Get deployment outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name kaagaz-dev \
  --query 'Stacks[0].Outputs' \
  --output table
```

The outputs include:

- `CdnUrl` — the CloudFront endpoint. This is what the frontend should use.
- `ApiUrl` — the direct API Gateway origin, useful for bypassing the CDN while debugging.
- `DistributionId` — needed if you ever have to invalidate the CDN cache.
- `CorsMode` — warns you if the API is still accepting every origin.

Copy the `ApiUrl` and `QueueUrl` values into `backend/.env` only when running the backend locally against AWS.

> **Upgrading an existing stack:** the API used to be an implicit SAM resource and is now declared explicitly, so redeploying creates a **new API Gateway ID and a new URL**. Your old `execute-api` URL will stop working. Take `CdnUrl` from the outputs and update `frontend/.env.local`, then rebuild the frontend.

## 5. Register the first institution

Use the deployed API URL from the CloudFormation output:

```bash
curl -X POST "$API_URL/api/auth/register/institution" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Greenfield College",
    "category": "COLLEGE",
    "department": "Library",
    "contactPerson": "Ananya Shah",
    "phone": "+61 400 000 000",
    "email": "ananya@greenfield.edu.au",
    "password": "replace-with-a-strong-password",
    "city": "Sydney",
    "address": "1 Example Street, Sydney"
  }'
```

Login:

```bash
curl -X POST "$API_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "ananya@greenfield.edu.au",
    "password": "replace-with-a-strong-password"
  }'
```

Use the returned token for protected calls:

```bash
curl -X POST "$API_URL/api/pickups" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "institutionId": "INSTITUTION_ID_FROM_REGISTRATION",
    "materialTypes": ["Rough notebooks", "Exam answer sheets"],
    "estimatedWeightKg": 240,
    "city": "Sydney",
    "pickupAddress": "1 Example Street, Sydney"
  }'
```

## 6. Run the frontend

Set the API URL in `frontend/.env.local` to the `CdnUrl` output, which routes through CloudFront:

```bash
VITE_API_URL=https://d111111abcdef8.cloudfront.net/api
```

Then run:

```bash
cd frontend
npm install
npm run dev
```

## 7. Host the frontend with CDN

For the fastest deployment, use AWS Amplify Hosting:

- Connect the repository.
- Set the app root to `frontend`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Add `VITE_API_URL` as an environment variable, set to the `CdnUrl` output.

Amplify serves the frontend through its own CloudFront distribution, so the static site does not need one created by hand.

## CDN and caching

There are two separate layers, and they do different jobs.

**CloudFront in front of the API** (`ApiDistribution` in `template.yaml`) does *not* cache `/api/*`. Every data route is authenticated and tenant-specific, so edge-caching it would mean putting the bearer token in the cache key and tying cache correctness to token lifetime. What the distribution actually buys you:

- TLS and HTTP/3 terminated at an edge location near the user instead of in Sydney
- Warm keep-alive connections from the edge to API Gateway
- gzip/brotli compression of JSON responses
- One stable domain, and a place to attach a custom domain or AWS WAF later without touching application code

`/health` is the one genuinely public response, so it is the one path with an edge cache behaviour (10 seconds). That also keeps uptime probes off the Lambda.

**The origin cache** (`backend/src/services/cache.service.js`) is where the real saving is. `getAdminSummary()`, `getNetworkImpact()` and `listApprovedPartners()` each scanned the entire DynamoDB table on every request, so admin dashboard cost grew with total table size rather than with traffic. Those three are now read-through cached for `CacheTtlSeconds`, and the write paths that change them evict them.

The cache is an in-process `Map`, which works because Lambda reuses warm containers. The tradeoffs to know:

- It is **not shared between containers**. An eviction in one container is invisible to the others, so the TTL is the real bound on staleness, not the invalidation calls.
- It is bounded (`CACHE_MAX_ENTRIES`, default 500) so a long-lived container cannot grow without limit.
- It never fails a request. Any cache error degrades to a cache miss.
- `GET /health` reports the live cache status, so you can confirm it is enabled.

Set `CACHE_ENABLED=false` to bypass it while debugging.

## Rate limiting

`express-rate-limit` was already a dependency but had never been wired up, so `/api/auth/login` accepted unlimited password guesses. It is now active in `backend/src/middleware/ratelimit.middleware.js`:

- Credential endpoints: 10 per 15 minutes, keyed on IP **and** submitted email, so one attacker cannot lock a victim out by exhausting their quota.
- General API: 120/minute, keyed on the verified JWT subject when present so an office behind one NAT address is not treated as a single client.
- Writes: 30/minute.

Counters live in process, so they are per warm container rather than an exact global ceiling. API Gateway's `DefaultRouteSettings` throttling (100 req/s, 200 burst) is the hard account-wide backstop that stops a spike becoming an unbounded Lambda and DynamoDB bill.

## Redis decision

Redis is intentionally not provisioned. DynamoDB stores durable business state, SQS handles asynchronous work, and the in-process cache above already removes the full-table scans that were the actual cost problem.

ElastiCache would require VPC networking, private subnets, security groups, Lambda VPC configuration, VPC endpoints for DynamoDB and SQS (because a VPC-attached Lambda loses its default route to public AWS endpoints), and connection lifecycle management. Realistic floor cost is around USD 100/month, versus zero today, and it adds ENI cold-start latency.

Add it only for a demonstrated need that an in-process cache genuinely cannot serve — exact global rate limiting, distributed locks, or a working set too large for Lambda memory. Do not add it just because the stack list mentions it.

## Local-only mode

Without AWS resources, the backend can start and expose `/health`, but registration and queue-backed pickup requests cannot complete because they require DynamoDB and SQS.

```bash
cd backend
npm start
```

The default local port is `5000`; use `PORT=5050 npm start` if macOS AirPlay is occupying port 5000.
