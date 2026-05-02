# Team Collab

A simple team coordination tool. Warmup scaffold.

## Stack

- Next.js 14 (App Router) + TypeScript
- Deploys to Google Cloud Run as a container

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000
```

## Build & run container locally

```bash
docker build -t team-collab .
docker run --rm -p 3000:3000 team-collab
```

## Deploy to Cloud Run

GCP project: `green-chalice-489806-f8` · Region: `us-central1`

### One-time setup

```bash
PROJECT_ID=green-chalice-489806-f8
REGION=us-central1
AR_REPO=team-collab

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com
gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location="$REGION"
```

For the GitHub Actions deploy, set up Workload Identity Federation, then add repo secrets:
- `GCP_WIF_PROVIDER` — full provider resource name
- `GCP_DEPLOYER_SA` — deployer service account email (needs `roles/run.admin`, `roles/artifactregistry.writer`, `roles/iam.serviceAccountUser`)

### Manual deploy

```bash
IMAGE="us-central1-docker.pkg.dev/green-chalice-489806-f8/team-collab/team-collab:$(git rev-parse --short HEAD)"
gcloud auth configure-docker us-central1-docker.pkg.dev
docker build -t "$IMAGE" .
docker push "$IMAGE"
gcloud run deploy team-collab --image="$IMAGE" --region=us-central1 --allow-unauthenticated --port=3000
```

### Auto deploy

Push to `main` → GitHub Actions builds, pushes to Artifact Registry, and deploys to Cloud Run.

## Routes

- `/` — task list (local-only, in browser)
- `/api/health` — Cloud Run liveness probe
