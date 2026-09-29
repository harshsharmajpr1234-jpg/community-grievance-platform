/** DTOs returned by the REST API (shared contract for web, admin and mobile). */
import type { ComplaintPriority, ComplaintStatus, ComplaintUpdateType, ContactPreference, DocumentKind } from "./constants";

export type CategoryDto = { id: string; slug: string; nameEn: string; nameHi: string; icon: string | null; defaultDepartment?: string | null; isActive?: boolean };
export type AreaDto = { id: string; name: string; nameHi: string | null; type?: string; parentId?: string | null; isActive?: boolean };

export type ComplaintDto = {
  id: string;
  code: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  category: { id: string; slug: string; nameEn: string; nameHi: string; icon: string | null } | null;
  area: { id: string; name: string; nameHi: string | null } | null;
  wardNumber: string | null;
  areaSource: "VERIFIED_AREA" | "USER_ENTERED";
  manualAreaName: string | null;
  address: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  contactPreference: ContactPreference | null;
  department: string | null;
  forwardedTo: string | null;
  isPublic: boolean;
  isDemo: boolean;
  duplicateOfId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastUpdateAt: string | Date;
  resolvedAt: string | Date | null;
  closedAt: string | Date | null;
  userId?: string;
  assignedAdminId?: string | null;
  userName?: string | null;
  userMobile?: string | null;
  assignedName?: string | null;
};

export type ComplaintUpdateDto = {
  id: string;
  type: ComplaintUpdateType;
  oldStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus | null;
  message: string | null;
  isPublic: boolean;
  byAdmin: string | null;
  byUser: boolean;
  createdAt: string | Date;
};

export type DocumentDto = { id: string; kind: DocumentKind; originalName: string; mimeType: string; sizeBytes: number; url: string; isPublic: boolean; createdAt: string | Date };

export type ComplaintDetailDto = ComplaintDto & {
  isOwner: boolean;
  documents: DocumentDto[];
  updates: ComplaintUpdateDto[];
  feedback: { id: string; isResolved: boolean; rating: number | null; comment: string | null; createdAt: string | Date }[];
  assignedAdmin: { id: string; name: string; department: string | null } | null;
  resident: { id: string; name: string | null; mobile: string; email: string | null; address: string | null } | null;
  duplicateOf: { id: string; code: string } | null;
};

export type PaginationDto = { page: number; pageSize: number; total: number; totalPages: number };
export type Paged<T> = { items: T[]; pagination: PaginationDto };

export type UserDto = {
  id: string;
  name: string | null;
  mobileMasked: string;
  email: string | null;
  areaId: string | null;
  address: string | null;
  photoUrl: string | null;
  language: string;
  createdAt: string | Date;
};

export type NotificationDto = {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string | Date;
};
