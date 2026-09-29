import { ok, withHandler } from "@/server/api";
import { publicStats } from "@/server/services/complaints";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => ok(await publicStats()));
