import { defineConfig, devices } from "@playwright/test";

// E2E runs an isolated stack: its own API port + local database, and a production Next build.
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql+psycopg://localhost/socially_e2e";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: 0,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile/ },
  ],
  webServer: [
    {
      command: "(createdb socially_e2e 2>/dev/null || true) && uv run alembic upgrade head && uv run uvicorn app.main:app --port 8100",
      cwd: "../api",
      url: "http://localhost:8100/health/ready",
      env: {
        DATABASE_URL: E2E_DB,
        MIGRATION_DATABASE_URL: E2E_DB,
        SECRET_KEY: "e2e-secret-key-that-is-long-enough-0123456789",
        FRONTEND_ORIGINS: '["http://localhost:3100"]',
        MEDIA_ROOT: "/tmp/socially-e2e-media",
        REGISTER_LIMIT_PER_HOUR: "1000",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "pnpm exec next build && pnpm exec next start --port 3100",
      url: "http://localhost:3100/login",
      env: { API_ORIGIN: "http://localhost:8100" },
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
