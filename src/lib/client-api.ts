"use client";

import type { Lang } from "@/shared/constants";

/** Small fetch wrapper for the JSON API envelope { success, data | error }. */
export class ClientApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    credentials: "same-origin",
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...(headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  let payload: { success: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok || !payload || !payload.success) {
    const err = payload?.error;
    throw new ClientApiError(err?.code ?? "REQUEST_FAILED", err?.message ?? `Request failed (${res.status})`, res.status, err?.details);
  }
  return payload.data as T;
}

/**
 * Bilingual API error messages. Known error codes are translated so the
 * Hindi/English switch covers validation, success-adjacent and error text;
 * unknown errors fall back to the server message (English).
 */
const ERROR_STRINGS: Record<string, { hi: string; en: string }> = {
  INVALID_CREDENTIALS: { hi: "ईमेल या पासवर्ड गलत है।", en: "Invalid email or password." },
  MOBILE_EXISTS: { hi: "इस मोबाइल नंबर से खाता पहले से मौजूद है। कृपया लॉगिन करें।", en: "An account with this mobile number already exists. Please login." },
  EMAIL_EXISTS: { hi: "इस ईमेल से खाता पहले से मौजूद है। कृपया लॉगिन करें।", en: "An account with this email already exists. Please login." },
  RATE_LIMITED: { hi: "बहुत अधिक प्रयास। कृपया कुछ समय बाद पुनः प्रयास करें।", en: "Too many attempts. Please try again later." },
  ACCOUNT_LOCKED: { hi: "सुरक्षा कारणों से खाता अस्थायी रूप से लॉक है। कृपया बाद में प्रयास करें।", en: "Account temporarily locked for security. Please try again later." },
  ACCOUNT_DISABLED: { hi: "यह खाता निष्क्रिय कर दिया गया है। कृपया सहायता से संपर्क करें।", en: "This account has been disabled. Please contact support." },
  NOT_FOUND: { hi: "रिकॉर्ड नहीं मिला।", en: "Record not found." },
  VALIDATION_ERROR: { hi: "कृपया फ़ॉर्म की जाँच करें और पुनः प्रयास करें।", en: "Please check the form and try again." },
  INVALID_JSON: { hi: "अनुरोध समझा नहीं जा सका। पुनः प्रयास करें।", en: "The request could not be understood. Please retry." },
  EMAIL_NOT_CONFIGURED: { hi: "पासवर्ड रीसेट सेवा वर्तमान में उपलब्ध नहीं है। कृपया सहायता से संपर्क करें।", en: "Password reset service is currently unavailable. Please contact support." },
  RESET_TOKEN_INVALID: { hi: "यह रीसेट लिंक अमान्य है या समाप्त हो गई है। कृपया नया लिंक माँगें।", en: "This reset link is invalid or has expired. Please request a new one." },
  UNAUTHORIZED: { hi: "कृपया लॉगिन करके जारी रखें।", en: "Please login to continue." },
  FORBIDDEN: { hi: "आपके पास यह कार्रवाई करने की अनुमति नहीं है।", en: "You do not have permission to perform this action." },
  PASSWORD_CHANGE_REQUIRED: { hi: "जारी रखने से पहले कृपया अपना पासवर्ड बदलें।", en: "Please change your password before continuing." },
  COMPLAINT_CLOSED: { hi: "यह शिकायत बंद है। समस्या दोबारा होने पर नई शिकायत दर्ज करें।", en: "This complaint is closed. Register a new complaint if the problem recurs." },
  TOO_MANY_FILES: { hi: "प्रति शिकायत अधिकतम 6 फ़ाइलें।", en: "Maximum 6 files per complaint." },
  FILE_TOO_LARGE: { hi: "फ़ाइल का आकार सीमा से अधिक है।", en: "File size exceeds the limit." },
  UNSUPPORTED_FILE_TYPE: { hi: "केवल JPG, PNG, WEBP फोटो और PDF दस्तावेज़ मान्य हैं।", en: "Only JPG, PNG, WEBP photos and PDF documents are allowed." },
  FILE_SIGNATURE_MISMATCH: { hi: "फ़ाइल की सामग्री उसके प्रकार से मेल नहीं खाती।", en: "File content does not match its type." },
  HAS_CHILDREN: { hi: "पहले child क्षेत्र हटाएँ या स्थानांतरित करें।", en: "Remove or move child areas first." },
  DATABASE_ERROR: { hi: "डेटाबेस कनेक्शन समस्या। कृपया कुछ समय बाद पुनः प्रयास करें।", en: "Database connection issue. Please try again in a moment." },
  DUPLICATE_ENTRY: { hi: "इस विवरण से खाता या रिकॉर्ड पहले से मौजूद है।", en: "A record with these details already exists." },
  INTERNAL_ERROR: { hi: "कुछ गलत हो गया। कृपया पुनः प्रयास करें।", en: "Something went wrong. Please try again." },
};

export function apiErrorMessage(lang: Lang, err: unknown): string {
  if (err instanceof ClientApiError) {
    if (err.code === "VALIDATION_ERROR" && err.message && err.message !== "VALIDATION_ERROR") {
      return err.message;
    }
    const mapped = ERROR_STRINGS[err.code];
    if (mapped) return lang === "hi" ? mapped.hi : mapped.en;
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return lang === "hi" ? ERROR_STRINGS.INTERNAL_ERROR.hi : ERROR_STRINGS.INTERNAL_ERROR.en;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}
