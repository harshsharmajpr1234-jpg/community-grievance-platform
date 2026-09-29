import { pingDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.NETLIFY);
  const databaseConfigured = Boolean(process.env.MONGODB_URI);
  const dbName = process.env.MONGODB_DB_NAME || "janSamasyaDB";

  if (isProduction && !databaseConfigured) {
    return Response.json(
      {
        status: "error",
        code: "CONFIGURATION_ERROR",
        message: "MONGODB_URI environment variable is missing",
        success: false,
      },
      { status: 503 }
    );
  }

  const isHealthy = await pingDatabase();
  if (isHealthy) {
    return Response.json({
      status: "ok",
      database: "mongodb",
      databaseName: dbName,
      dbName,
      success: true,
      ok: true,
    });
  }

  return Response.json(
    {
      status: "error",
      code: "DATABASE_UNAVAILABLE",
      message: "Could not connect to MongoDB Atlas",
      success: false,
      ok: false,
    },
    { status: 503 }
  );
}
