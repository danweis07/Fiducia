# AWS Deployment Guide for Fiducia

Complete end-to-end deployment instructions for running the Fiducia digital banking platform on AWS.

## Architecture Overview

```
                    ┌──────────────┐
                    │  Route 53    │
                    │  (DNS)       │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  CloudFront  │
                    │  (CDN + SSL) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼───────┐        ┌───────▼──────┐
       │  S3 Bucket   │        │  ALB         │
       │  (Frontend)  │        │  (API Router)│
       └──────────────┘        └───────┬──────┘
                                       │
                               ┌───────▼──────┐
                               │  ECS Fargate  │
                               │  (API/Edge    │
                               │   Functions)  │
                               └───────┬──────┘
                                       │
                          ┌────────────┼────────────┐
                          │                         │
                   ┌──────▼───────┐        ┌───────▼──────┐
                   │  RDS         │        │  ElastiCache │
                   │  PostgreSQL  │        │  Redis       │
                   └──────────────┘        └──────────────┘
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed (for building container images)
- Node.js 20+ (for building the frontend)
- A registered domain name (optional but recommended)

## Deployment Options

### Option A: Small / Single-Instance (Docker Compose on EC2)

Best for development, staging, or small credit unions with < 10,000 members.

1. Launch an EC2 instance (t3.large or larger, Amazon Linux 2023)
2. Install Docker and Docker Compose
3. Copy the deployment files:
   ```bash
   scp -r deploy/aws/ ec2-user@<instance-ip>:~/fiducia-deploy/
   ```
4. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```
5. Start services:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

### Option B: Production (CloudFormation + ECS)

Best for production workloads. Uses managed services for reliability and scalability.

Follow the sections below in order.

## 1. Networking (VPC, Subnets, Security Groups)

Create a VPC with public and private subnets across two availability zones.

```bash
aws cloudformation create-stack \
  --stack-name fiducia-network \
  --template-body file://cloudformation.yaml \
  --parameters \
    ParameterKey=DomainName,ParameterValue=banking.example.com \
    ParameterKey=AcmCertificateArn,ParameterValue=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID
```

**Security groups to create:**

| Security Group | Inbound Rules         | Purpose                   |
| -------------- | --------------------- | ------------------------- |
| `sg-alb`       | 80/443 from 0.0.0.0/0 | Application Load Balancer |
| `sg-ecs`       | 3000 from `sg-alb`    | ECS Fargate tasks         |
| `sg-rds`       | 5432 from `sg-ecs`    | PostgreSQL database       |
| `sg-redis`     | 6379 from `sg-ecs`    | ElastiCache Redis         |

All resources in private subnets should use a NAT Gateway for outbound internet access.

## 2. SSL/TLS Certificates

Request a certificate in AWS Certificate Manager (ACM). For CloudFront, the certificate **must** be in `us-east-1`.

```bash
aws acm request-certificate \
  --domain-name banking.example.com \
  --validation-method DNS \
  --region us-east-1
```

Validate the certificate via DNS (add the CNAME record ACM provides to your Route 53 hosted zone or DNS provider).

## 3. Database (RDS PostgreSQL)

Create an RDS PostgreSQL 15 instance in the private subnets.

```bash
aws rds create-db-instance \
  --db-instance-identifier fiducia-db \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --engine-version 15 \
  --master-username postgres \
  --master-user-password <STRONG_PASSWORD> \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-rds-id \
  --db-subnet-group-name fiducia-db-subnets \
  --multi-az \
  --storage-encrypted \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --no-publicly-accessible
```

After creation, apply migrations:

```bash
# From a bastion host or via SSM Session Manager
psql $DATABASE_URL < supabase/migrations/*.sql
```

**Recommended RDS settings:**

- Multi-AZ for production
- Automated backups with 30-day retention
- Enable Performance Insights
- Enable Enhanced Monitoring
- Storage encryption with AWS-managed key or CMK

## 4. Cache (ElastiCache Redis)

```bash
aws elasticache create-replication-group \
  --replication-group-id fiducia-cache \
  --replication-group-description "Fiducia session and query cache" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --cache-subnet-group-name fiducia-cache-subnets \
  --security-group-ids sg-redis-id \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled
```

## 5. Frontend (S3 + CloudFront)

The existing `cloudformation.yaml` in this directory deploys S3 + CloudFront for the frontend SPA.

```bash
# Build the frontend
cd apps/web
npm run build

# Deploy the CloudFormation stack (creates S3 bucket + CloudFront)
aws cloudformation create-stack \
  --stack-name fiducia-frontend \
  --template-body file://deploy/aws/cloudformation.yaml \
  --parameters \
    ParameterKey=DomainName,ParameterValue=banking.example.com \
    ParameterKey=AcmCertificateArn,ParameterValue=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID

# Upload built assets to S3
aws s3 sync apps/web/dist/ s3://$(aws cloudformation describe-stacks \
  --stack-name fiducia-frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
  --output text) --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(aws cloudformation describe-stacks \
    --stack-name fiducia-frontend \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text) \
  --paths "/*"
```

## 6. API / Edge Functions (ECS Fargate)

Create an ECS cluster and deploy the API service:

```bash
# Create ECR repository
aws ecr create-repository --repository-name fiducia-api

# Build and push the API image
docker build -t fiducia-api supabase/functions/
aws ecr get-login-password | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com
docker tag fiducia-api:latest <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/fiducia-api:latest
docker push <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/fiducia-api:latest
```

Create an ECS task definition with the following environment variables (see section 7 below), then create an ECS service behind the ALB.

For Kubernetes-based deployments, use the Helm chart at `helm/` instead.

## 7. Environment Variables

All environment variables that must be configured for production:

### API / Edge Functions (ECS Tasks)

| Variable                    | Description                           | Example                                                                  |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`              | PostgreSQL connection string          | `postgresql://postgres:pw@fiducia-db.xxx.rds.amazonaws.com:5432/fiducia` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations | `eyJ...`                                                                 |
| `JWT_SECRET`                | Secret for signing/verifying JWTs     | 64+ character random string                                              |
| `REDIS_URL`                 | ElastiCache Redis endpoint            | `rediss://fiducia-cache.xxx.cache.amazonaws.com:6379`                    |
| `ALLOWED_ORIGINS`           | Allowed CORS origins **(required in production)** | `https://banking.example.com`                                  |

### Frontend (Build-time Variables)

These are baked into the frontend bundle at build time via Vite:

| Variable                 | Description                   | Example                           |
| ------------------------ | ----------------------------- | --------------------------------- |
| `VITE_SUPABASE_URL`      | URL of the API service        | `https://api.banking.example.com` |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous key          | `eyJ...`                          |
| `VITE_DEMO_MODE`         | Enable demo mode (no backend) | `false`                           |

### Secrets Management

Store secrets in AWS Secrets Manager or SSM Parameter Store:

```bash
aws ssm put-parameter \
  --name "/fiducia/production/database-url" \
  --type SecureString \
  --value "postgresql://..."

aws ssm put-parameter \
  --name "/fiducia/production/jwt-secret" \
  --type SecureString \
  --value "$(openssl rand -base64 48)"
```

Reference these in ECS task definitions using the `secrets` field rather than `environment`.

## 8. DNS (Route 53)

If using Route 53, create alias records pointing to CloudFront (frontend) and the ALB (API):

```bash
# Frontend: banking.example.com -> CloudFront
# API: api.banking.example.com -> ALB
```

## 9. Monitoring

- Enable CloudWatch Container Insights for ECS
- Set up RDS Performance Insights
- Use the Prometheus/Grafana configs in `monitoring/` for application-level metrics
- Configure CloudWatch Alarms for:
  - RDS CPU > 80%
  - ECS task count < desired
  - 5xx error rate > 1%
  - ALB target response time > 2s

## 10. CI/CD Pipeline

Example GitHub Actions workflow for automated deployments:

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run validate
      - run: npm run build --workspace=@fiducia/web
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1
      - run: aws s3 sync apps/web/dist/ s3://${{ secrets.S3_BUCKET }} --delete
      - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} --paths "/*"
```

## Cost Estimate (Production)

| Service           | Instance/Size          | Monthly Cost (approx.) |
| ----------------- | ---------------------- | ---------------------- |
| RDS PostgreSQL    | db.r6g.large, Multi-AZ | $350                   |
| ElastiCache Redis | cache.r6g.large x2     | $300                   |
| ECS Fargate       | 2 tasks, 1 vCPU/2GB    | $75                    |
| CloudFront        | 100 GB transfer        | $15                    |
| S3                | < 1 GB storage         | $1                     |
| ALB               | 1 ALB                  | $25                    |
| NAT Gateway       | 1 per AZ               | $70                    |
| **Total**         |                        | **~$836/month**        |

For the single-instance Docker Compose option, a `t3.large` EC2 instance costs approximately $60/month.
