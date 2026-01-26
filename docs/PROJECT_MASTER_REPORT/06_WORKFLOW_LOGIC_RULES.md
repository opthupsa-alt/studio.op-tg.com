# 06 - Workflow Logic & Rules
## منطق سير العمل والقواعد

**تاريخ التقرير:** 2026-01-26

---

## 1. حالات البوست (Post Statuses)

```
┌─────────┐
│  idea   │ ─────► فكرة أولية
└────┬────┘
     │
     ▼
┌─────────┐
│  draft  │ ─────► مسودة (كتابة المحتوى)
└────┬────┘
     │
     ▼
┌─────────┐
│ design  │ ─────► تصميم (إنتاج المرئيات)
└────┬────┘
     │
     ▼
┌──────────────────┐
│ internal_review  │ ─────► مراجعة داخلية (الفريق)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  client_review   │ ─────► مراجعة العميل
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐  ┌──────────┐
│approved │  │ rejected │
│ (locked)│  │(unlocked)│
└────┬────┘  └────┬─────┘
     │            │
     ▼            │
┌──────────┐      │
│scheduled │      │
└────┬─────┘      │
     │            │
     ▼            │
┌─────────┐       │
│ posted  │       │
└─────────┘       │
                  │
                  ▼
            العودة لـ draft
```

---

## 2. الانتقالات المسموحة

### جدول الانتقالات
| من | إلى | المسموح لهم |
|----|-----|-------------|
| `idea` | `draft` | Admin, Manager, Writer, Designer |
| `draft` | `idea` | Admin, Manager, Writer, Designer |
| `draft` | `design` | Admin, Manager, Writer, Designer |
| `design` | `draft` | Admin, Manager, Writer, Designer |
| `design` | `internal_review` | Admin, Manager, Writer, Designer |
| `internal_review` | `design` | Admin, Manager |
| `internal_review` | `client_review` | Admin, Manager |
| `client_review` | `internal_review` | Admin, Manager |
| `client_review` | `approved` | Admin, Manager, **Client** |
| `client_review` | `rejected` | Admin, Manager, **Client** |
| `approved` | `scheduled` | Admin, Manager |
| `rejected` | `draft` | Admin, Manager, Writer, Designer |
| `scheduled` | `approved` | Admin, Manager |
| `scheduled` | `posted` | Admin, Manager |
| `posted` | - | لا يمكن التغيير |

### الكود المصدري
```typescript
// lib/workflow.ts
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
```

---

## 3. صلاحيات الأدوار للحالات

### جدول الصلاحيات
| الدور | الحالات المسموحة |
|-------|-----------------|
| `admin` | جميع الحالات |
| `manager` | جميع الحالات |
| `writer` | idea, draft, design, internal_review |
| `designer` | idea, draft, design, internal_review |
| `client` | approved, rejected فقط |

### الكود المصدري
```typescript
// lib/workflow.ts
const ROLE_PERMISSIONS: Record<string, PostStatus[]> = {
  admin: ["idea", "draft", "design", "internal_review", "client_review", "approved", "rejected", "scheduled", "posted"],
  manager: ["idea", "draft", "design", "internal_review", "client_review", "approved", "rejected", "scheduled", "posted"],
  writer: ["idea", "draft", "design", "internal_review"],
  designer: ["idea", "draft", "design", "internal_review"],
  client: ["approved", "rejected"],
}
```

---

## 4. قواعد القفل (Locking)

### الحالات التي تُقفل البوست
```typescript
const LOCKED_STATUSES: PostStatus[] = ["approved", "scheduled", "posted"]
```

### قواعد القفل
| القاعدة | التفاصيل |
|---------|----------|
| **متى يُقفل** | عند الموافقة (`approved`) |
| **من يستطيع التعديل بعد القفل** | Admin, Manager فقط |
| **متى يُفتح** | عند الرفض (`rejected`) |
| **ماذا يحدث عند القفل** | `locked = true` في قاعدة البيانات |

### الكود المصدري
```typescript
// lib/actions.ts - approvePost
const { error: updateError } = await supabase
  .from("posts")
  .update({ 
    status: "approved", 
    locked: true,  // ← يُقفل البوست
    updated_at: new Date().toISOString() 
  })
  .eq("id", id)

// lib/actions.ts - rejectPost
const { error: updateError } = await supabase
  .from("posts")
  .update({ 
    status: "rejected", 
    locked: false,  // ← يُفتح البوست للتعديل
    updated_at: new Date().toISOString() 
  })
  .eq("id", id)
```

---

## 5. ماذا يحدث عند الرفض

### التدفق
```
1. العميل يرفض البوست مع سبب
2. status = 'rejected'
3. locked = false (يُفتح للتعديل)
4. يُنشأ سجل في approvals مع note = سبب الرفض
5. يمكن للفريق تعديل البوست
6. يمكن إعادة إرساله للمراجعة (draft → ... → client_review)
```

### الكود
```typescript
// lib/actions.ts - rejectPost
const { error: approvalError } = await supabase.from("approvals").insert({
  post_id: id,
  approver_id: teamMember.id,
  status: "rejected",
  note: feedback,  // ← سبب الرفض
  created_at: new Date().toISOString(),
})
```

---

## 6. قواعد عدم القفز بين الحالات

### للمستخدمين العاديين (Writer/Designer)
```typescript
// lib/workflow.ts - validateStatusTransition
const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus] || []
if (!allowedTransitions.includes(newStatus)) {
  return {
    valid: false,
    error: `لا يمكن الانتقال من "${currentStatus}" إلى "${newStatus}"`,
  }
}
```

### للـ Admin/Manager
```typescript
// يمكنهم القفز بين أي حالتين
if (["admin", "manager"].includes(userRole)) {
  return {
    valid: true,
    shouldLock: LOCKED_STATUSES.includes(newStatus),
    shouldUnlock: !LOCKED_STATUSES.includes(newStatus) && isLocked,
  }
}
```

---

## 7. التحقق من إمكانية التعديل

### الدالة
```typescript
// lib/workflow.ts
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
```

---

## 8. التحقق من إمكانية الموافقة/الرفض

### الدالة
```typescript
// lib/workflow.ts
export function canApproveOrReject(
  userRole: string,
  currentStatus: PostStatus
): boolean {
  // فقط العميل يمكنه الموافقة/الرفض
  // وفقط عندما تكون الحالة "client_review"
  return userRole === "client" && currentStatus === "client_review"
}
```

### ملاحظة
Admin و Manager يمكنهم أيضاً الموافقة/الرفض (تم إضافته في Server Action)

---

## 9. ثغرات محتملة

| الثغرة | المستوى | الوصف | الحل |
|--------|---------|-------|------|
| 🟡 Status bypass via API | متوسط | قد يتم تجاوز التحقق عبر API مباشر | RLS + Server Action validation |
| 🟡 Locked bypass | متوسط | قد يتم تعديل بوست مقفل عبر SQL | RLS policy على UPDATE |
| 🟡 Client approval of other client | متوسط | عميل يوافق على بوست عميل آخر | ✅ تم معالجته في Server Action |
| 🟡 No workflow audit | منخفض | لا يوجد سجل لتغييرات الحالة | إضافة audit_log |

---

## 10. سيناريوهات الاختبار

### السيناريو 1: تدفق طبيعي
```
1. إنشاء بوست (idea)
2. تحويل لـ draft
3. تحويل لـ design
4. تحويل لـ internal_review
5. تحويل لـ client_review
6. العميل يوافق → approved + locked
7. تحويل لـ scheduled
8. تحويل لـ posted
```

### السيناريو 2: رفض وإعادة إرسال
```
1. بوست في client_review
2. العميل يرفض مع سبب
3. status = rejected, locked = false
4. الفريق يعدل البوست
5. تحويل لـ draft → design → internal_review → client_review
6. العميل يوافق
```

### السيناريو 3: محاولة تعديل بوست مقفل
```
1. بوست approved (locked = true)
2. Writer يحاول التعديل
3. يجب أن يفشل مع رسالة خطأ
4. Admin يحاول التعديل
5. يجب أن ينجح
```

### السيناريو 4: محاولة قفز الحالة
```
1. بوست في draft
2. Writer يحاول تحويله مباشرة لـ client_review
3. يجب أن يفشل
4. Manager يحاول نفس الشيء
5. يجب أن ينجح (Admin/Manager يمكنهم القفز)
```

---

## 11. ملخص القواعد

| القاعدة | التطبيق |
|---------|---------|
| الانتقالات المتسلسلة | ✅ مُطبق للـ Writer/Designer |
| القفز للـ Admin/Manager | ✅ مُطبق |
| القفل عند الموافقة | ✅ مُطبق |
| الفتح عند الرفض | ✅ مُطبق |
| منع تعديل المقفل | ✅ مُطبق في Server Action |
| سجل الموافقات | ✅ مُطبق في approvals table |
| سجل تغييرات الحالة | ❌ غير موجود (audit_log) |
