import type { PostStatus } from "@/lib/types"

// تعريف الانتقالات المسموحة بين الحالات
const ALLOWED_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  idea: ["draft"],
  draft: ["idea", "design"],
  design: ["draft", "internal_review"],
  internal_review: ["design", "client_review"],
  client_review: ["internal_review", "approved", "rejected"],
  approved: ["scheduled"],
  rejected: ["draft"],
  scheduled: ["approved", "posted"],
  posted: [],
}

// الأدوار المسموح لها بالانتقال لحالات معينة
const ROLE_PERMISSIONS: Record<string, PostStatus[]> = {
  admin: ["idea", "draft", "design", "internal_review", "client_review", "approved", "rejected", "scheduled", "posted"],
  manager: ["idea", "draft", "design", "internal_review", "client_review", "approved", "rejected", "scheduled", "posted"],
  writer: ["idea", "draft", "design", "internal_review"],
  designer: ["idea", "draft", "design", "internal_review"],
  client: ["approved", "rejected"],
}

// الحالات التي تتطلب قفل البوست
const LOCKED_STATUSES: PostStatus[] = ["approved", "scheduled", "posted"]

export interface WorkflowValidation {
  valid: boolean
  error?: string
  shouldLock?: boolean
  shouldUnlock?: boolean
}

/**
 * التحقق من صحة انتقال الحالة
 */
export function validateStatusTransition(
  currentStatus: PostStatus,
  newStatus: PostStatus,
  userRole: string = "admin",
  isLocked: boolean = false
): WorkflowValidation {
  // التحقق من أن الحالة الجديدة مختلفة
  if (currentStatus === newStatus) {
    return { valid: true }
  }

  // التحقق من أن البوست غير مقفل (إلا للـ admin/manager)
  if (isLocked && !["admin", "manager"].includes(userRole)) {
    return {
      valid: false,
      error: "لا يمكن تعديل بوست مقفل",
    }
  }

  // التحقق من صلاحية الدور
  const allowedForRole = ROLE_PERMISSIONS[userRole] || []
  if (!allowedForRole.includes(newStatus)) {
    return {
      valid: false,
      error: `ليس لديك صلاحية للانتقال إلى حالة "${newStatus}"`,
    }
  }

  // التحقق من صحة الانتقال
  const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus] || []
  
  // السماح للـ admin/manager بالقفز بين الحالات
  if (["admin", "manager"].includes(userRole)) {
    return {
      valid: true,
      shouldLock: LOCKED_STATUSES.includes(newStatus),
      shouldUnlock: !LOCKED_STATUSES.includes(newStatus) && isLocked,
    }
  }

  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `لا يمكن الانتقال من "${currentStatus}" إلى "${newStatus}"`,
    }
  }

  return {
    valid: true,
    shouldLock: LOCKED_STATUSES.includes(newStatus),
    shouldUnlock: !LOCKED_STATUSES.includes(newStatus) && isLocked,
  }
}

/**
 * الحصول على الحالات المتاحة للانتقال
 */
export function getAvailableTransitions(
  currentStatus: PostStatus,
  userRole: string = "admin"
): PostStatus[] {
  const allowedForRole = ROLE_PERMISSIONS[userRole] || []
  
  // للـ admin/manager: جميع الحالات متاحة
  if (["admin", "manager"].includes(userRole)) {
    return allowedForRole.filter(s => s !== currentStatus)
  }

  // للباقي: فقط الانتقالات المسموحة
  const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus] || []
  return allowedTransitions.filter(s => allowedForRole.includes(s))
}

/**
 * التحقق من إمكانية تعديل البوست
 */
export function canEditPost(
  userRole: string,
  isLocked: boolean,
  assignedWriterId?: string | null,
  assignedDesignerId?: string | null,
  currentUserId?: string
): boolean {
  // Admin و Manager يمكنهم التعديل دائماً
  if (["admin", "manager"].includes(userRole)) {
    return true
  }

  // إذا كان البوست مقفل، لا يمكن التعديل
  if (isLocked) {
    return false
  }

  // Writer يمكنه التعديل إذا كان مسند له
  if (userRole === "writer" && assignedWriterId === currentUserId) {
    return true
  }

  // Designer يمكنه التعديل إذا كان مسند له
  if (userRole === "designer" && assignedDesignerId === currentUserId) {
    return true
  }

  // Client لا يمكنه التعديل
  return false
}

/**
 * التحقق من إمكانية الموافقة/الرفض
 */
export function canApproveOrReject(
  userRole: string,
  currentStatus: PostStatus
): boolean {
  // فقط العميل يمكنه الموافقة/الرفض
  // وفقط عندما تكون الحالة "client_review"
  return userRole === "client" && currentStatus === "client_review"
}
