import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: { JWT_SECRET: "test-secret", MONGODB_DB_NAME: "janSamasyaDB" },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
