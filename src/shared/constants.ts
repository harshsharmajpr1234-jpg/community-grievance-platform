/**
 * Shared domain constants — used by the web app, API routes, admin panel and
 * the mobile app (apps/mobile copies the same contract).
 */
export const COMPLAINT_STATUSES = [
  "SUBMITTED",
  "VERIFIED",
  "ASSIGNED",
  "FORWARDED",
  "IN_PROGRESS",
  "ACTION_TAKEN",
  "RESOLVED",
  "REJECTED",
  "DUPLICATE",
  "NEEDS_INFORMATION",
  "CLOSED",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

/** Main lifecycle used for the visual timeline. */
export const MAIN_FLOW: ComplaintStatus[] = [
  "SUBMITTED",
  "VERIFIED",
  "ASSIGNED",
  "FORWARDED",
  "IN_PROGRESS",
  "ACTION_TAKEN",
  "RESOLVED",
];

export const OPEN_STATUSES: ComplaintStatus[] = [
  "SUBMITTED",
  "VERIFIED",
  "ASSIGNED",
  "FORWARDED",
  "IN_PROGRESS",
  "ACTION_TAKEN",
  "NEEDS_INFORMATION",
];
export const CLOSED_STATUSES: ComplaintStatus[] = ["RESOLVED", "REJECTED", "DUPLICATE", "CLOSED"];

export const COMPLAINT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type ComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];

export const CONTACT_PREFERENCES = ["SMS", "CALL", "EMAIL", "NONE"] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

export const DOCUMENT_KINDS = ["IMAGE", "VIDEO", "DOCUMENT"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const COMPLAINT_UPDATE_TYPES = [
  "STATUS_CHANGE",
  "INTERNAL_NOTE",
  "PUBLIC_UPDATE",
  "INFO_REQUEST",
  "USER_RESPONSE",
  "ASSIGNMENT",
  "FORWARD",
  "FEEDBACK",
  "DUPLICATE",
] as const;
export type ComplaintUpdateType = (typeof COMPLAINT_UPDATE_TYPES)[number];

export const NOTICE_CATEGORIES = [
  "PUBLIC_NOTICE",
  "GOVERNMENT_INFO",
  "WATER",
  "ELECTRICITY",
  "ROAD",
  "SANITATION",
  "COMMUNITY",
  "EMERGENCY",
  "OTHER",
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const NOTICE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type NoticeStatus = (typeof NOTICE_STATUSES)[number];

export const PROJECT_STATUSES = ["PLANNED", "STARTED", "IN_PROGRESS", "COMPLETED", "DELAYED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const COMMUNITY_POST_TYPES = [
  "EVENT",
  "CLEANLINESS_DRIVE",
  "AWARENESS",
  "INITIATIVE",
  "VOLUNTEER",
  "ANNOUNCEMENT",
] as const;
export type CommunityPostType = (typeof COMMUNITY_POST_TYPES)[number];

export const COMMUNITY_POST_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type CommunityPostStatus = (typeof COMMUNITY_POST_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "COMPLAINT_SUBMITTED",
  "COMPLAINT_VERIFIED",
  "COMPLAINT_ASSIGNED",
  "COMPLAINT_STATUS_CHANGED",
  "INFO_REQUESTED",
  "COMPLAINT_RESOLVED",
  "NOTICE",
  "COMMUNITY",
  "NEW_COMPLAINT",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ADMIN_ROLES = ["SUPER_ADMIN", "COMPLAINT_ADMIN", "CONTENT_ADMIN", "MODERATOR", "VIEWER"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const AREA_TYPES = ["CITY", "ZONE", "LOCALITY", "STREET"] as const;
export type AreaType = (typeof AREA_TYPES)[number];

export const SERVICE_CATEGORIES = [
  "MUNICIPAL",
  "WATER",
  "ELECTRICITY",
  "EMERGENCY",
  "HEALTH",
  "POLICE",
  "FIRE",
  "GRIEVANCE_PORTAL",
  "OTHER",
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export type Lang = "hi" | "en";
export type Bi = { hi: string; en: string };

export const STATUS_LABELS: Record<ComplaintStatus, Bi> = {
  SUBMITTED: { hi: "दर्ज", en: "Submitted" },
  VERIFIED: { hi: "सत्यापित", en: "Verified" },
  ASSIGNED: { hi: "सौंपी गई", en: "Assigned" },
  FORWARDED: { hi: "अग्रेषित", en: "Forwarded" },
  IN_PROGRESS: { hi: "कार्य प्रगति पर", en: "In Progress" },
  ACTION_TAKEN: { hi: "कार्रवाई की गई", en: "Action Taken" },
  RESOLVED: { hi: "समाधान हो गया", en: "Resolved" },
  REJECTED: { hi: "अस्वीकृत", en: "Rejected" },
  DUPLICATE: { hi: "डुप्लिकेट", en: "Duplicate" },
  NEEDS_INFORMATION: { hi: "जानकारी आवश्यक", en: "Needs Information" },
  CLOSED: { hi: "बंद", en: "Closed" },
};

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  SUBMITTED: "bg-sky-100 text-sky-800 ring-sky-200",
  VERIFIED: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  ASSIGNED: "bg-violet-100 text-violet-800 ring-violet-200",
  FORWARDED: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 ring-amber-200",
  ACTION_TAKEN: "bg-lime-100 text-lime-800 ring-lime-200",
  RESOLVED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 ring-rose-200",
  DUPLICATE: "bg-slate-100 text-slate-700 ring-slate-200",
  NEEDS_INFORMATION: "bg-orange-100 text-orange-800 ring-orange-200",
  CLOSED: "bg-slate-200 text-slate-800 ring-slate-300",
};

export const PRIORITY_LABELS: Record<ComplaintPriority, Bi> = {
  LOW: { hi: "कम", en: "Low" },
  MEDIUM: { hi: "सामान्य", en: "Medium" },
  HIGH: { hi: "उच्च", en: "High" },
  URGENT: { hi: "अत्यावश्यक", en: "Urgent" },
};

export const PRIORITY_COLORS: Record<ComplaintPriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export const CONTACT_LABELS: Record<ContactPreference, Bi> = {
  SMS: { hi: "SMS", en: "SMS" },
  CALL: { hi: "फ़ोन कॉल", en: "Phone call" },
  EMAIL: { hi: "ईमेल", en: "Email" },
  NONE: { hi: "संपर्क न करें", en: "Do not contact" },
};

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, Bi> = {
  PUBLIC_NOTICE: { hi: "सार्वजनिक सूचना", en: "Public Notice" },
  GOVERNMENT_INFO: { hi: "सरकारी जानकारी", en: "Government Information" },
  WATER: { hi: "पानी", en: "Water" },
  ELECTRICITY: { hi: "बिजली", en: "Electricity" },
  ROAD: { hi: "सड़क", en: "Road" },
  SANITATION: { hi: "सफाई", en: "Sanitation" },
  COMMUNITY: { hi: "समुदाय", en: "Community" },
  EMERGENCY: { hi: "आपातकाल", en: "Emergency" },
  OTHER: { hi: "अन्य", en: "Other" },
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, Bi> = {
  PLANNED: { hi: "योजना में", en: "Planned" },
  STARTED: { hi: "शुरू", en: "Started" },
  IN_PROGRESS: { hi: "प्रगति पर", en: "In Progress" },
  COMPLETED: { hi: "पूर्ण", en: "Completed" },
  DELAYED: { hi: "विलंबित", en: "Delayed" },
};

export const COMMUNITY_TYPE_LABELS: Record<CommunityPostType, Bi> = {
  EVENT: { hi: "स्थानीय कार्यक्रम", en: "Local Event" },
  CLEANLINESS_DRIVE: { hi: "स्वच्छता अभियान", en: "Cleanliness Drive" },
  AWARENESS: { hi: "जन-जागरूकता", en: "Public Awareness" },
  INITIATIVE: { hi: "सामुदायिक पहल", en: "Community Initiative" },
  VOLUNTEER: { hi: "स्वयंसेवा", en: "Volunteer Activity" },
  ANNOUNCEMENT: { hi: "स्थानीय घोषणा", en: "Local Announcement" },
};

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, Bi> = {
  MUNICIPAL: { hi: "नगर निगम सेवाएँ", en: "Municipal Services" },
  WATER: { hi: "जल सेवाएँ", en: "Water Services" },
  ELECTRICITY: { hi: "बिजली सेवाएँ", en: "Electricity Services" },
  EMERGENCY: { hi: "आपातकालीन संपर्क", en: "Emergency Contacts" },
  HEALTH: { hi: "स्वास्थ्य सेवाएँ", en: "Health Services" },
  POLICE: { hi: "पुलिस संपर्क", en: "Police Contacts" },
  FIRE: { hi: "अग्निशमन सेवा", en: "Fire Services" },
  GRIEVANCE_PORTAL: { hi: "जन-शिकायत पोर्टल", en: "Public Grievance Portals" },
  OTHER: { hi: "अन्य सेवाएँ", en: "Other Services" },
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  COMPLAINT_ADMIN: "Complaint Admin",
  CONTENT_ADMIN: "Content Admin",
  MODERATOR: "Moderator",
  VIEWER: "Viewer",
};

export const AREA_TYPE_LABELS: Record<AreaType, Bi> = {
  CITY: { hi: "शहर", en: "City" },
  ZONE: { hi: "क्षेत्र", en: "Zone" },
  LOCALITY: { hi: "कॉलोनी / मोहल्ला", en: "Locality / Colony" },
  STREET: { hi: "गली / एरिया", en: "Street / Area" },
};

export const BRAND = {
  name: "Jan Samasya Nivaran Manch",
  nameHi: "जन समस्या निवारण मंच",
  short: "JSNM",
  subtitle: "Ward 12, 13 & 14",
  subtitleHi: "वार्ड 12, 13 एवं 14",
  tagline: "वार्ड 12, 13 एवं 14 के स्थानीय नागरिकों का अपना नागरिक मंच",
  taglineEn: "An independent local civic platform for Ward 12, 13 & 14 residents",
  secondaryTagline: "जन समस्या से समाधान तक...",
  secondaryTaglineEn: "From public issue to resolution...",
  complaintPrefix: "JSM",
};

export const ATTACHMENT_RETENTION_DAYS = 90;

/** Upload policy defaults (can be overridden by system settings / env). Production allows images + PDF only. */
export const UPLOAD_DEFAULTS = {
  imageMaxMb: 5,
  documentMaxMb: 10,
  maxFilesPerComplaint: 6,
  imageMimes: ["image/jpeg", "image/png", "image/webp"],
  documentMimes: ["application/pdf"],
};

export const COMPLAINT_CODE_REGEX = /^(JSM|DPF)-\d{4}-\d{6}$/;
export const MOBILE_REGEX = /^[6-9]\d{9}$/;

export const VERIFIED_LANDMARKS = [
  "सीतावाली फाटक",
  "नाड़ी का फाटक अंडरपास",
  "नाड़ी का फाटक रेलवे ब्रिज",
  "पारस क्लिनिक",
  "विकास पब्लिक स्कूल",
  "राजेन्द्र सैनिट्री",
  "कौशिक स्कूल",
  "कृष्णा डिजिटल स्टोर",
  "श्याम किराना स्टोर",
  "श्याम डिपार्टमेंट स्टोर",
  "श्मशान घाट",
  "नांगल गांव",
  "निवारू पुलिया",
  "नांगल पुलिया",
  "200 फीट बाईपास",
  "सर्विस लाइन",
  "आटा मिल",
  "इंडस्ट्रियल एरिया",
  "कमानी फैक्ट्री",
  "रेलवे लाइन",
] as const;
