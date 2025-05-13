# Next Steps Checklist for Filo API Deployment & Setup

This checklist outlines the necessary tasks to fully deploy and operationalize your Filo API based on our discussions.

## I. Codebase & Local Configuration (`apps/api`)

*   [X] **Logging (Pino & Vector):**
    *   [X] Pino logger configured in `main.ts` and `app.module.ts` for structured, environment-specific logging.
    *   [X] `vector.toml` created in `apps/api/` for log forwarding to Loki.
*   [X] **Health & Metrics Endpoints:**
    *   [X] `/api/v1/health` endpoint created in `AppController`.
    *   [X] `/api/v1/metrics` (Prometheus) and `/api/v1/metrics/health-detailed` (Terminus) created in `MetricsController`.
    *   [ ] (Optional) Implement custom Prometheus metrics (Counters, Gauges, Histograms) relevant to your application logic in `apps/api/src/modules/metrics/metrics.controller.ts`.
*   [X] **Dockerfile & Docker Ignore:**
    *   [X] `apps/api/Dockerfile` created and configured for monorepo structure.
    *   [X] `apps/api/.dockerignore` and root `.dockerignore` created.
*   [X] **Deployment Configurations (`apps/api/deployment/`):**
    *   [X] `docker-compose.dev.yml` created, reviewed, and updated with build context, hot-reloading, and dev-specific settings.
    *   [X] `docker-compose.staging.yml` created, reviewed, and updated for staging environment.
    *   [X] `docker-compose.prod.yml` created, reviewed, and updated for production environment.
    *   [X] All necessary environment variables for `nestjs_app` (including Clerk, DB, Redis, throttling, Google OAuth, memory/chunk settings) are listed in the `environment` section of each Docker Compose file (to be sourced from `.env` files).
    *   [X] `prometheus.yml` created with scrape configs for `nestjs-api` and `node-exporter` (placeholder for server IP).
    *   [X] Prometheus service added to `docker-compose.dev.yml`, `docker-compose.staging.yml`, and `docker-compose.prod.yml`.
*   [ ] **Nginx Configuration Template (`apps/api/filo-api.nginx.conf`):**
    *   [X] Template created.
    *   [ ] **Action:** Before server deployment, customize this file: replace `your_domain.com`, update SSL paths, review `client_max_body_size`, and `upstream` details.

## II. Server Setup (Hetzner CX22)

*   [ ] **Domain & DNS:**
    *   [ ] Ensure your domain name is pointed via DNS A/AAAA records to your Hetzner server's public IP.
*   [ ] **Install Essential Software:**
    *   [ ] Nginx: `sudo apt update && sudo apt install nginx -y`.
    *   [ ] Docker & Docker Compose: Follow official installation guides.
    *   [ ] Certbot: `sudo apt install certbot python3-certbot-nginx -y`.
*   [ ] **Configure Nginx (using `filo-api.nginx.conf`):**
    *   [ ] Place customized config at `/etc/nginx/sites-available/your_domain.com.conf`.
    *   [ ] Symlink to `sites-enabled`.
    *   [ ] Test (`sudo nginx -t`) and reload Nginx.
*   [ ] **Setup SSL/TLS with Certbot:**
    *   [ ] Run Certbot: `sudo certbot --nginx -d your_domain.com [-d www.your_domain.com]`.
    *   [ ] Verify auto-renewal: `sudo certbot renew --dry-run`.
*   [ ] **Configure Firewall (Hetzner Cloud Firewall or ufw):**
    *   [X] Rules discussed (SSH restricted, HTTP/S allowed).
    *   [ ] **Action:** Implement these rules.
*   [ ] **Host Metrics with `node_exporter`:**
    *   [ ] **Action:** Install `node_exporter` on the Hetzner server (e.g., download binary, set up systemd service). Typically exposes metrics on port `9100`.
    *   [ ] **Action:** Update `apps/api/deployment/prometheus.yml` target for `node-exporter` job with server IP: `'YOUR_HETZNER_SERVER_IP:9100'`.
*   [ ] **Configure `logrotate` for Nginx:**
    *   [ ] **Action:** Verify or create a log rotation configuration for Nginx logs in `/etc/logrotate.d/nginx`.
*   [ ] **Setup PostgreSQL Database Backups:**
    *   [X] Strategy discussed (pg_dump, script, cron, .pgpass, off-site copy).
    *   [ ] **Action:** Implement the backup script, cron job, `.pgpass` file, and off-site copy mechanism.

## III. Deployment Process & CI/CD

*   [ ] **Docker Registry Setup:** Choose and configure.
*   [ ] **`.env` Files for Each Environment:**
    *   [ ] **Action:** In `apps/api/deployment/`, create `.env.dev`, `.env.staging`, and `.env` (for prod) with all necessary environment variables (DB credentials, Clerk keys, API keys, `PORT`, `NODE_ENV`, `SERVICE_NAME`, Throttling, Google OAuth, Memory/Chunk, Loki, etc.). **Ensure these are in `.gitignore`**.
*   [ ] **(Optional but Recommended) CI/CD Pipeline (e.g., GitHub Actions):**
    *   [ ] Implement CI/CD stages: checkout, setup, lint/test, Docker build/push, deploy.
    *   [ ] Securely manage secrets for CI/CD.

## IV. Monitoring & Visualization (Grafana)

*   [X] Loki for Logs: Setup via Vector and Docker Compose is complete.
*   [X] Prometheus for Metrics: Setup in Docker Compose is complete.
*   [ ] **Grafana Configuration:**
    *   [ ] **Action:** If using self-hosted Grafana (or Grafana Cloud), add Loki as a data source (using `LOKI_ENDPOINT` from your Vector/Loki setup).
    *   [ ] **Action:** Add Prometheus as a data source (pointing to `http://prometheus_service_name:9090` or `http://YOUR_SERVER_IP:PROMETHEUS_PORT`).
    *   [ ] **Action:** Create/Import dashboards in Grafana for:
        *   Logs from Loki.
        *   NestJS application metrics from Prometheus.
        *   Host metrics from `node_exporter` (via Prometheus).
    *   [ ] (Optional) Set up alerts in Grafana.

## V. Testing and Verification (Post-Deployment)

*   [ ] **API Functionality:** Test all endpoints.
*   [ ] **Logging Pipeline:**
    *   [ ] Verify NestJS app logs (JSON) to `stdout`.
    *   [ ] Verify Vector collects logs and sends them to Loki (check Vector logs).
    *   [ ] Verify logs are queryable in Grafana with correct labels and fields.
*   [ ] **Metrics Pipeline:**
    *   [ ] Verify Prometheus scrapes `/api/v1/metrics` from `nestjs_app`.
    *   [ ] Verify Prometheus scrapes `node_exporter`.
    *   [ ] Verify metrics are visible and queryable in Grafana.
*   [ ] **Health Checks:** Manually check and observe Docker status.
*   [ ] **Database Backups:** Test backup script and perform a test restoration.
*   [ ] **Security:** Review Nginx SSL, firewall rules.

This checklist should provide a clear path forward. Good luck! 