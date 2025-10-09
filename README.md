# DigitalOcean Managed PostgreSQL to Spaces Backup

Use App Platform Scheduled Jobs to automatically backup Managed PostgreSQL databases to DigitalOcean Spaces.

## Deploy to DigitalOcean App Platform

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/digitalocean/postgres-spaces-backups/tree/main)

## Configuration

| Variable                      | Required | Description           | Default  |
| ----------------------------- | -------- | --------------------- | -------- |
| `DO_SPACES_ACCESS_KEY_ID`     | ✅       | Spaces access key     | -        |
| `DO_SPACES_SECRET_ACCESS_KEY` | ✅       | Spaces secret key     | -        |
| `DO_SPACES_BUCKET`            | ✅       | Bucket name           | -        |
| `DO_SPACES_ENDPOINT`          | ✅       | Spaces endpoint       | -        |
| `BACKUP_DATABASE_URL`         | ✅       | PostgreSQL connection | -        |
| `POSTGRES_VERSION`            | ❌       | PostgreSQL version    | `17`     |
| `BACKUP_FILE_PREFIX`          | ❌       | File prefix           | `backup` |

## Test Local

### 1. Update Environment Variables

Create `.env` file:

```bash
# Required
DO_SPACES_ACCESS_KEY_ID=your_access_key
DO_SPACES_SECRET_ACCESS_KEY=your_secret_key
DO_SPACES_BUCKET=your_bucket_name
BACKUP_DATABASE_URL=postgresql://user:pass@host:port/db
DO_SPACES_ENDPOINT=spaces_endpoint

# Optional
POSTGRES_VERSION=17
BACKUP_FILE_PREFIX=backup
```

### 2. Run Locally

```bash
npm install
npm run build
npm run start
```

### 3. Run with Docker

```bash
./docker-run.sh
```
