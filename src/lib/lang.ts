import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang } from "@/shared/i18n";
import type { Lang } from "@/shared/constants";

/** Server-side language resolution (cookie based). */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}
