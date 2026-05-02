# 🚢 Deployment Plan & Production Architecture

This document outlines the deployment strategy and architectural scalability of ChainLogic AI.

## 1. Local & Prototyping Environment (Docker)
The current repository is fully containerized using **Docker** and **Docker Compose**.
This guarantees that the development and demo environments are perfectly reproducible without complex dependency management.

* **Backend Service**: `python:3.11-slim` running FastAPI (Uvicorn).
* **Frontend Service**: `node:18-alpine` running Next.js.
* **Orchestration**: `docker-compose` bridges the frontend and backend over an isolated network (`chainlogic_net`).

## 2. Serverless PaaS Deployment (Vercel & Render)
For instant cloud accessibility without managing AWS infrastructure, the codebase is natively engineered to support decoupled PaaS hosting:
* **Frontend:** Hosted on **Vercel**, utilizing dynamic environment variables (`NEXT_PUBLIC_API_URL`) to seamlessly connect to the cloud backend.
* **Backend:** Hosted on **Render**, utilizing their native Python Docker abstraction. Render manages the Uvicorn workers and automatically restarts the ephemeral SQLite database for fresh prototype testing.
* **CI/CD:** Both Vercel and Render automatically detect GitHub `main` branch pushes to trigger zero-downtime rolling updates.

## 3. Enterprise Scalability Strategy (AWS Cloud)
For a full multi-tenant SME rollout, the architecture transitions seamlessly to enterprise cloud infrastructure:

1. **API Gateway & Load Balancing**: 
   - Traffic routes through an AWS Application Load Balancer (ALB).
   - Rate limiting is applied at the API Gateway level to prevent DDoS.

2. **Container Orchestration (Fargate/EKS)**:
   - The decoupled FastAPI and Next.js Docker images are pushed to Elastic Container Registry (ECR).
   - They are deployed on AWS Fargate (Serverless Containers) which automatically scales instances horizontally when supply chain disruptions spike (e.g., during a global logistical crisis).

3. **Database Migration (SQLite to PostgreSQL/RDS)**:
   - While SQLite is optimal for this "Zero-Config" hackathon prototype, the backend is fully abstracted using the **SQLAlchemy ORM**.
   - For production, migrating to **Amazon RDS (PostgreSQL)** requires **zero code changes**. We simply inject a new `DATABASE_URL` via the `.env` file, and SQLAlchemy automatically translates all ORM models to the PostgreSQL dialect, enabling high concurrency and ACID compliance at enterprise scale.

4. **Secrets Management**:
   - The `.env` file holding Z.AI and OpenRouter credentials is replaced by **AWS Secrets Manager**, injecting credentials into the containers securely at runtime.

5. **CI/CD Pipeline Integration**:
   - Any push to the `main` branch triggers **GitHub Actions**.
   - The pipeline runs `pytest` and `ESLint`. If tests pass, it automatically builds the new Docker images and pushes them to AWS ECR for zero-downtime rolling updates.

---
*ChainLogic AI is designed not just as a proof-of-concept, but as an enterprise-ready microservice capable of robust production scaling.*
