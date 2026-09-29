import type { Bi, Lang } from "./constants";

export const LANG_COOKIE = "updkp_lang";
export const DEFAULT_LANG: Lang = "hi";

/** Pick a bilingual label. */
export function pick(lang: Lang, bi: Bi | undefined | null): string {
  if (!bi) return "";
  return lang === "hi" ? bi.hi : bi.en;
}

/** Inline bilingual helper for one-off strings. */
export function bi(lang: Lang, hi: string, en: string): string {
  return lang === "hi" ? hi : en;
}

const dict = {
  nav_home: { hi: "होम", en: "Home" },
  nav_about: { hi: "हमारे बारे में", en: "About" },
  nav_complaints: { hi: "शिकायतें", en: "Complaints" },
  nav_submit: { hi: "जनसमस्या दर्ज करें", en: "Submit Complaint" },
  nav_track: { hi: "शिकायत की स्थिति देखें", en: "Track Complaint" },
  nav_notices: { hi: "सूचनाएँ", en: "Notices" },
  nav_development: { hi: "विकास कार्य", en: "Development" },
  nav_services: { hi: "सरकारी सेवाएँ", en: "Services" },
  nav_community: { hi: "समुदाय", en: "Community" },
  nav_contact: { hi: "संपर्क", en: "Contact" },
  nav_help: { hi: "सहायता", en: "Help" },
  nav_login: { hi: "लॉगिन", en: "Login" },
  nav_logout: { hi: "लॉगआउट", en: "Logout" },
  nav_profile: { hi: "प्रोफ़ाइल", en: "Profile" },
  nav_notifications: { hi: "सूचना केंद्र", en: "Notifications" },
  nav_my_complaints: { hi: "मेरी शिकायतें", en: "My Complaints" },
  nav_privacy: { hi: "गोपनीयता नीति", en: "Privacy Policy" },
  nav_terms: { hi: "नियम व शर्तें", en: "Terms & Conditions" },
  nav_admin: { hi: "🛡️ एडमिन पैनल", en: "🛡️ Admin Panel" },

  common_loading: { hi: "लोड हो रहा है…", en: "Loading…" },
  common_submit: { hi: "जमा करें", en: "Submit" },
  common_save: { hi: "सहेजें", en: "Save" },
  common_cancel: { hi: "रद्द करें", en: "Cancel" },
  common_search: { hi: "खोजें", en: "Search" },
  common_filter: { hi: "फ़िल्टर", en: "Filter" },
  common_all: { hi: "सभी", en: "All" },
  common_next: { hi: "अगला", en: "Next" },
  common_prev: { hi: "पिछला", en: "Previous" },
  common_no_results: { hi: "कोई रिकॉर्ड नहीं मिला।", en: "No records found." },
  common_back: { hi: "वापस", en: "Back" },
  common_view: { hi: "विवरण देखें", en: "View details" },
  common_required: { hi: "आवश्यक", en: "Required" },
  common_optional: { hi: "वैकल्पिक", en: "Optional" },
  common_error: { hi: "कुछ गलत हो गया। कृपया पुनः प्रयास करें।", en: "Something went wrong. Please try again." },
  common_status: { hi: "स्थिति", en: "Status" },
  common_category: { hi: "श्रेणी", en: "Category" },
  common_locality: { hi: "क्षेत्र / कॉलोनी", en: "Locality" },
  common_priority: { hi: "प्राथमिकता", en: "Priority" },
  common_date: { hi: "दिनांक", en: "Date" },
  common_page: { hi: "पृष्ठ", en: "Page" },
  common_of: { hi: "में से", en: "of" },
  common_demo: { hi: "डेमो डेटा", en: "Demo data" },
  common_official: { hi: "आधिकारिक सरकारी लिंक", en: "Official government link" },
  common_community_info: { hi: "सामुदायिक जानकारी", en: "Community information" },

  home_submit: { hi: "जनसमस्या दर्ज करें", en: "Register a Public Issue" },
  home_track: { hi: "शिकायत की स्थिति देखें", en: "Check Complaint Status" },
  stat_total: { hi: "कुल शिकायतें", en: "Total Complaints" },
  stat_resolved: { hi: "समाधान हुई शिकायतें", en: "Resolved Complaints" },
  stat_pending: { hi: "लंबित शिकायतें", en: "Pending Complaints" },
  stat_notices: { hi: "सक्रिय सूचनाएँ", en: "Active Notices" },

  complaint_id: { hi: "शिकायत आईडी", en: "Complaint ID" },
  complaint_title: { hi: "शिकायत का शीर्षक", en: "Complaint title" },
  complaint_description: { hi: "विस्तृत विवरण", en: "Detailed description" },
  complaint_address: { hi: "पता / लैंडमार्क", en: "Address / landmark" },
  complaint_gps: { hi: "GPS लोकेशन (वैकल्पिक)", en: "GPS location (optional)" },
  complaint_contact: { hi: "संपर्क का माध्यम", en: "Contact preference" },
  complaint_files: { hi: "फोटो / दस्तावेज़", en: "Photo / document" },
  complaint_success: { hi: "आपकी शिकायत सफलतापूर्वक दर्ज हो गई है।", en: "Your complaint has been registered successfully." },
  complaint_submitted_on: { hi: "दर्ज दिनांक", en: "Submitted on" },
  complaint_last_update: { hi: "अंतिम अपडेट", en: "Last update" },
  complaint_department: { hi: "संबंधित विभाग", en: "Assigned department" },
  complaint_timeline: { hi: "पूरी टाइमलाइन", en: "Complete timeline" },
  complaint_updates: { hi: "प्रशासनिक अपडेट", en: "Admin updates" },
  complaint_feedback_resolved: { hi: "समस्या हल हो गई", en: "Problem Resolved" },
  complaint_feedback_exists: { hi: "समस्या अभी भी है", en: "Problem Still Exists" },

  nav_register: { hi: "रजिस्टर", en: "Register" },
  nav_dashboard: { hi: "डैशबोर्ड", en: "Dashboard" },
  login_title: { hi: "लॉगिन", en: "Login" },
  login_identifier: { hi: "मोबाइल नंबर या ईमेल", en: "Mobile number or email" },
  login_password: { hi: "पासवर्ड", en: "Password" },
  login_submit: { hi: "लॉगिन करें", en: "Login" },
  login_forgot: { hi: "पासवर्ड भूल गए?", en: "Forgot password?" },
  login_no_account: { hi: "नया खाता बनाएँ", en: "Create new account" },
  register_title: { hi: "पंजीकरण करें", en: "Register" },
  register_name: { hi: "पूरा नाम", en: "Full name" },
  register_mobile: { hi: "मोबाइल नंबर", en: "Mobile number" },
  register_email: { hi: "ईमेल (वैकल्पिक)", en: "Email (optional)" },
  register_password: { hi: "पासवर्ड", en: "Password" },
  register_confirm: { hi: "पासवर्ड की पुष्टि करें", en: "Confirm password" },
  register_terms: { hi: "मैं नियम व शर्तों और गोपनीयता नीति से सहमत हूँ", en: "I accept the Terms & Conditions and Privacy Policy" },
  register_submit: { hi: "खाता बनाएँ", en: "Create Account" },
  register_success: { hi: "पंजीकरण सफल हुआ। कृपया लॉगिन करें।", en: "Registration successful. Please login." },
  forgot_title: { hi: "पासवर्ड भूल गए", en: "Forgot password" },
  forgot_submit: { hi: "रीसेट लिंक भेजें", en: "Send reset link" },
  reset_title: { hi: "नया पासवर्ड सेट करें", en: "Set a new password" },
  reset_submit: { hi: "पासवर्ड रीसेट करें", en: "Reset password" },

  admin_login: { hi: "एडमिन लॉगिन", en: "Admin login" },
  admin_login_sub: { hi: "केवल अधिकृत कर्मचारी। सभी कार्रवाइयाँ ऑडिट लॉग में दर्ज होती हैं।", en: "Authorised personnel only. All actions are audit logged." },
  admin_email: { hi: "ईमेल", en: "Email" },
  admin_password: { hi: "पासवर्ड", en: "Password" },
  admin_signin: { hi: "साइन इन", en: "Sign in" },
  admin_signing: { hi: "साइन इन हो रहा है…", en: "Signing in…" },
  admin_totp: { hi: "प्रमाणक कोड (2FA)", en: "Authenticator code (2FA)" },
  admin_back: { hi: "← सार्वजनिक साइट पर वापस", en: "← Back to public site" },
  admin_setup: { hi: "प्रथम बार सेटअप", en: "First-time setup" },
  admin_setup_sub: { hi: "पहला SUPER_ADMIN खाता बनाएँ। खाता बनने के बाद यह पृष्ठ अक्षम हो जाता है।", en: "Create the first SUPER_ADMIN account. This page is disabled once an admin exists." },
  admin_setup_done: { hi: "सेटअप पहले ही पूरा हो चुका है।", en: "Setup has already been completed." },
  admin_goto_login: { hi: "लॉगिन पर जाएँ", en: "Go to login" },
  admin_fullname: { hi: "पूरा नाम", en: "Full name" },
  admin_newpwd: { hi: "नया पासवर्ड", en: "New password" },
  admin_pw_hint: { hi: "कम से कम 10 अक्षर — बड़े/छोटे अक्षर व अंक", en: "Min 10 characters with upper, lower case and a digit" },
  admin_create: { hi: "एडमिन खाता बनाएँ", en: "Create admin account" },
  admin_creating: { hi: "बनाया जा रहा है…", en: "Creating…" },
  admin_checking: { hi: "जाँच हो रही है…", en: "Checking…" },
  admin_nosetup: { hi: "अभी कोई एडमिन खाता नहीं है।", en: "No admin account exists yet." },
  admin_runsetup: { hi: "प्रथम बार सेटअप चलाएँ", en: "Run first-time setup" },
  admin_setnew: { hi: "नया पासवर्ड सेट करें", en: "Set a new password" },
  admin_setnew_sub: { hi: "सुरक्षा हेतु आगे बढ़ने से पहले प्रारंभिक पासवर्ड बदलना आवश्यक है।", en: "For security you must change the initial password before continuing." },
  admin_current: { hi: "वर्तमान पासवर्ड", en: "Current password" },
  admin_confirm: { hi: "नए पासवर्ड की पुष्टि करें", en: "Confirm new password" },
  admin_change: { hi: "पासवर्ड बदलें", en: "Change password" },
  admin_saving: { hi: "सहेजा जा रहा है…", en: "Saving…" },
  admin_changed: { hi: "पासवर्ड बदल गया।", en: "Password changed." },
  admin_pw_mismatch: { hi: "पासवर्ड मेल नहीं खाते", en: "Passwords do not match" },
  admin_setup_token: { hi: "सेटअप टोकन (ADMIN_SETUP_TOKEN)", en: "Setup token (ADMIN_SETUP_TOKEN)" },
  admin_nav_dashboard: { hi: "डैशबोर्ड", en: "Dashboard" },
  admin_nav_complaints: { hi: "शिकायतें", en: "Complaints" },
  admin_nav_notices: { hi: "सूचनाएँ", en: "Notices" },
  admin_nav_development: { hi: "विकास कार्य", en: "Development Works" },
  admin_nav_services: { hi: "सेवा निर्देशिका", en: "Services Directory" },
  admin_nav_community: { hi: "समुदाय", en: "Community" },
  admin_nav_areas: { hi: "क्षेत्र/कॉलोनी", en: "Localities" },
  admin_nav_categories: { hi: "श्रेणियाँ", en: "Categories" },
  admin_nav_users: { hi: "निवासी", en: "Residents" },
  admin_nav_admins: { hi: "एडमिन टीम", en: "Admin Team" },
  admin_nav_audit: { hi: "ऑडिट लॉग", en: "Audit Logs" },
  admin_nav_settings: { hi: "सेटिंग्स", en: "Settings" },
  admin_nav_storage: { hi: "स्टोरेज व क्लीनअप", en: "Storage & Cleanup" },
  admin_nav_notifications: { hi: "सूचना केंद्र", en: "Notifications" },
  admin_nav_account: { hi: "मेरा खाता", en: "My Account" },
} as const satisfies Record<string, Bi>;

export type DictKey = keyof typeof dict;

export function t(lang: Lang, key: DictKey): string {
  const entry = dict[key];
  return lang === "hi" ? entry.hi : entry.en;
}

export function normalizeLang(value: string | undefined | null): Lang {
  return value === "en" ? "en" : "hi";
}

export function formatDate(value: Date | string | null | undefined, lang: Lang, withTime = false): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  }).format(d);
}
