/**
 * Runs once when the Next.js server starts. Seeds reference data (and demo
 * data in development) when the database is empty, and logs integration status.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startupEnvCheck } = await import("@/server/startup-check");
      startupEnvCheck();
      const { seedIfEmpty } = await import("@/db/seed");
      await seedIfEmpty();
    } catch (err: any) {
      const msg = err?.message || String(err);
      // Strip credentials from diagnostic log output
      const safeMsg = msg.replace(/mongodb(?:\+srv)?:\/\/[^@]+@/gi, "mongodb+srv://<redacted>@");
      console.error("[instrumentation] STARTUP_DATABASE_ERROR: MongoDB connection or initialization failed:", safeMsg);
    }
  }
}

