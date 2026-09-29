import type {
  AdminRole,
  AreaType,
  CommunityPostStatus,
  CommunityPostType,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintUpdateType,
  ContactPreference,
  DocumentKind,
  NoticeCategory,
  NoticeStatus,
  NotificationType,
  ProjectStatus,
} from "@/shared/constants";

export interface User {
  id: string;
  mobile: string;
  name: string | null;
  email: string | null;
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  areaId: string | null;
  ward?: string | null;
  address: string | null;
  photoUrl: string | null;
  language: "hi" | "en";
  isActive: boolean;
  deletionRequestedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
  department?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplaintCategory {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  icon: string | null;
  defaultDepartment: string | null;
  isAvailable?: boolean;
  isActive?: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Area {
  id: string;
  code?: string;
  name: string;
  nameHi?: string | null;
  type: AreaType;
  parentId?: string | null;
  wardNumber?: string | null;
  description?: string | null;
  isActive?: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Complaint {
  id: string;
  code: string;
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  areaId: string | null;
  wardNumber?: string | null;
  areaSource?: "VERIFIED_AREA" | "USER_ENTERED";
  manualAreaName?: string | null;
  address?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priority: ComplaintPriority;
  contactPreference?: ContactPreference;
  status: ComplaintStatus;
  department?: string | null;
  forwardedTo?: string | null;
  assignedAdminId?: string | null;
  duplicateOfId?: string | null;
  isPublic?: boolean;
  isDemo?: boolean;
  submittedIp?: string | null;
  lastUpdateAt: Date;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplaintUpdate {
  id: string;
  complaintId: string;
  adminId?: string | null;
  userId?: string | null;
  type: ComplaintUpdateType;
  oldStatus?: ComplaintStatus | null;
  newStatus?: ComplaintStatus | null;
  message?: string | null;
  isPublic?: boolean;
  createdAt: Date;
}

export interface ComplaintDocument {
  id: string;
  complaintId: string;
  kind: DocumentKind;
  uploaderUserId?: string | null;
  uploadedByUserId?: string | null;
  uploaderAdminId?: string | null;
  uploadedByAdminId?: string | null;
  fileName?: string;
  storedName?: string;
  originalName: string;
  mimeType: string;
  fileSize?: number;
  sizeBytes?: number;
  storageProvider?: string;
  isPublic?: boolean;
  createdAt: Date;
}

export interface ComplaintFeedback {
  id: string;
  complaintId: string;
  userId: string;
  isResolved: boolean;
  rating?: number | null;
  comment?: string | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId?: string | null;
  adminId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  referenceType?: string | null;
  referenceId?: string | null;
  isRead?: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

export interface Notice {
  id: string;
  slug?: string;
  title: string;
  titleHi?: string | null;
  description: string;
  descriptionHi?: string | null;
  category: NoticeCategory;
  priority: ComplaintPriority;
  status: NoticeStatus;
  publishDate: Date;
  publishedAt?: Date | null;
  expiryDate?: Date | null;
  expiresAt?: Date | null;
  isPinned: boolean;
  isDemo?: boolean;
  createdByAdminId?: string | null;
  imageUrl?: string | null;
  attachmentUrl?: string | null;
  area?: { id?: string; name: string; nameHi?: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DevelopmentProject {
  id: string;
  slug?: string;
  name: string;
  nameHi?: string | null;
  title?: string;
  description: string;
  location: string;
  category?: string;
  department: string;
  areaId?: string | null;
  estimatedCost?: number | null;
  status: ProjectStatus;
  progress: number;
  startDate?: Date | null;
  expectedCompletion?: Date | null;
  targetCompletionDate?: Date | null;
  contractorName?: string | null;
  sourceNote?: string | null;
  isPublished: boolean;
  isDemo?: boolean;
  createdByAdminId?: string | null;
  photos?: string[];
  documents?: { name: string; url: string }[];
  updates?: { id: string; createdAt: Date; progress: number | null; message: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityPost {
  id: string;
  userId?: string;
  authorUserId?: string | null;
  type: CommunityPostType;
  title: string;
  content: string;
  eventDate?: Date | null;
  location?: string | null;
  areaId?: string | null;
  status: CommunityPostStatus;
  viewCount?: number;
  upvoteCount?: number;
  approvedByAdminId?: string | null;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  adminId?: string | null;
  adminEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string | null;
  updatedAt: Date;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface GovernmentService {
  id: string;
  name: string;
  nameHi?: string | null;
  department: string;
  category: string;
  phone?: string | null;
  website?: string | null;
  description: string;
  isEmergency: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface Counter {
  key: string;
  value: number;
}

export type AuditLogSelect = AuditLog;
