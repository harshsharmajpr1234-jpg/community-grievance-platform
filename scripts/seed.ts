import "dotenv/config";
import { seedDatabase } from "../src/db/seed";

const demo = process.argv.includes("--demo") || process.env.SEED_DEMO_DATA === "true";
if (demo && process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo data with NODE_ENV=production.");
  process.exit(1);
}

seedDatabase({ demo })
  .then((r) => {
    console.log("Seed result:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
