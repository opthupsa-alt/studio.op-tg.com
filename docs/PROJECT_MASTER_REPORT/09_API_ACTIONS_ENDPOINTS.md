# 09 - API Actions & Endpoints
## قائمة Server Actions و API Routes

**تاريخ التقرير:** 2026-01-26

---

## 1. Server Actions (lib/actions.ts)

### Posts Actions

| Action | الوظيفة | الأدوار المسموحة | Input Validation | Tenant Scope |
|--------|---------|-----------------|------------------|--------------|
| `createPost` | إنشاء بوست جديد | Admin, Manager, Writer, Designer | ✅ required fields | ✅ via plan_id |
| `updatePost` | تعديل بوست | Admin, Manager, Writer, Designer (not locked) | ✅ id required | ✅ via RLS |
| `deletePost` | حذف بوست | Admin, Manager | ✅ id required | ✅ via RLS |
| `updatePostStatus` | تغيير حالة البوست | حسب workflow rules | ✅ id, status | ✅ via RLS |
| `updatePostDate` | تغيير تاريخ النشر | Admin, Manager, Writer, Designer | ✅ id, date | ✅ via RLS |
| `submitForReview` | إرسال للمراجعة | Admin, Manager, Writer, Designer | ✅ id | ✅ via RLS |
| `approvePost` | موافقة على البوست | Admin, Manager, Client | ✅ id, client check | ✅ explicit check |
| `rejectPost` | رفض البوست | Admin, Manager, Client | ✅ id, feedback, client check | ✅ explicit check |

### تفاصيل createPost
```typescript
export async function createPost(data: {
  plan_id: string      // required
  client_id: string    // required
  title: string        // required
  main_goal?: string   // optional
  status: PostStatus   // required
  publish_date: string // required
  platform_ids?: string[] // optional
}) {
  // 1. إنشاء البوست
  // 2. إضافة المنصات (post_platforms)
  // 3. revalidatePath
}
```

### تفاصيل updatePost
```typescript
export async function updatePost(id: string, data: {
  title?: string
  main_goal?: string
  status?: PostStatus
  publish_date?: string | null
}) {
  // 1. التحقق من المستخدم
  // 2. جلب team_member
  // 3. منع Client من التعديل
  // 4. فحص locked (إلا للـ admin/manager)
  // 5. تحديث البوست
}
```

---

### Clients Actions

| Action | الوظيفة | الأدوار المسموحة | Input Validation | Tenant Scope |
|--------|---------|-----------------|------------------|--------------|
| `createClientRecord` | إنشاء عميل | Admin, Manager | ✅ name required | N/A (creates tenant) |
| `updateClientRecord` | تعديل عميل | Admin, Manager | ✅ id, data | ✅ via RLS |
| `deleteClientRecord` | حذف عميل | Admin, Manager | ✅ id | ✅ via RLS |
| `createClientUser` | إنشاء مستخدم عميل | Admin, Manager | ✅ email, password, client_id | ✅ explicit |

### تفاصيل createClientUser
```typescript
export async function createClientUser(data: {
  email: string
  full_name: string
  client_id: string
  password: string
}) {
  // 1. إنشاء Auth user (signUp)
  // 2. إنشاء team_member مع role='client'
  // 3. ربط client_id
}
```

---

### Team Actions

| Action | الوظيفة | الأدوار المسموحة | Input Validation | Tenant Scope |
|--------|---------|-----------------|------------------|--------------|
| `createTeamMemberWithAuth` | إنشاء عضو مع Auth | Admin, Manager | ✅ email, password, role | N/A |
| `updateTeamMember` | تعديل عضو | Admin, Manager | ✅ id, data | ✅ via RLS |
| `deleteTeamMember` | حذف عضو | Admin, Manager | ✅ id | ✅ via RLS |
| `deleteClientUser` | حذف مستخدم عميل | Admin, Manager | ✅ id | ✅ via RLS |

---

### Plans Actions

| Action | الوظيفة | الأدوار المسموحة | Input Validation | Tenant Scope |
|--------|---------|-----------------|------------------|--------------|
| `createPlan` | إنشاء خطة | Admin, Manager | ✅ client_id, year, month | ✅ via client_id |
| `getOrCreatePlan` | جلب أو إنشاء خطة | Admin, Manager | ✅ client_id, year, month | ✅ via client_id |
| `deletePlan` | حذف خطة | Admin, Manager | ✅ id | ✅ via RLS |

---

### Comments Actions

| Action | الوظيفة | الأدوار المسموحة | Input Validation | Tenant Scope |
|--------|---------|-----------------|------------------|--------------|
| `addComment` | إضافة تعليق | الجميع | ✅ post_id, comment, scope | ✅ via post RLS |
| `deleteComment` | حذف تعليق | Admin, Manager, Owner | ✅ id | ✅ via RLS |

### تفاصيل addComment
```typescript
export async function addComment(data: {
  post_id: string
  comment: string
  scope: "internal" | "client"
}) {
  // scope = 'internal' → للفريق فقط
  // scope = 'client' → مرئي للعميل أيضاً
}
```

---

### Assets Actions

| Action | الوظيفة | الأدوار المسموحة | Input Validation | Tenant Scope |
|--------|---------|-----------------|------------------|--------------|
| `uploadAsset` | رفع ملف | Admin, Manager, Writer, Designer | ✅ post_id, file | ✅ via post |
| `deleteAsset` | حذف ملف | Admin, Manager, Writer, Designer | ✅ id | ✅ via RLS |

---

### Variants Actions

| Action | الوظيفة | الأدوار المسموحة | Input Validation | Tenant Scope |
|--------|---------|-----------------|------------------|--------------|
| `createVariant` | إنشاء نسخة | Admin, Manager, Writer, Designer | ✅ post_id, platform_id | ✅ via post |
| `updateVariant` | تعديل نسخة | Admin, Manager, Writer, Designer | ✅ id, data | ✅ via RLS |

---

### Notifications Actions

| Action | الوظيفة | الأدوار المسموحة | Input Validation | Tenant Scope |
|--------|---------|-----------------|------------------|--------------|
| `markNotificationAsRead` | تحديد كمقروء | Owner | ✅ id | ✅ user_id check |
| `markAllNotificationsAsRead` | تحديد الكل كمقروء | Owner | - | ✅ user_id check |

---

## 2. API Routes

### /api/posts/[id]/approve
```typescript
// app/api/posts/[id]/approve/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // يستدعي approvePost action
}
```

### /api/posts/[id]/status
```typescript
// app/api/posts/[id]/status/route.ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { status } = await request.json()
  // يستدعي updatePostStatus action
}
```

### /api/posts/[id]/date
```typescript
// app/api/posts/[id]/date/route.ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { date } = await request.json()
  // يستدعي updatePostDate action
}
```

---

## 3. جدول ملخص الصلاحيات

| Action | Admin | Manager | Writer | Designer | Client |
|--------|-------|---------|--------|----------|--------|
| createPost | ✅ | ✅ | ✅ | ✅ | ❌ |
| updatePost | ✅ | ✅ | 🟡* | 🟡* | ❌ |
| deletePost | ✅ | ✅ | ❌ | ❌ | ❌ |
| approvePost | ✅ | ✅ | ❌ | ❌ | ✅** |
| rejectPost | ✅ | ✅ | ❌ | ❌ | ✅** |
| createClient | ✅ | ✅ | ❌ | ❌ | ❌ |
| createTeamMember | ✅ | ✅ | ❌ | ❌ | ❌ |
| uploadAsset | ✅ | ✅ | ✅ | ✅ | ❌ |
| addComment | ✅ | ✅ | ✅ | ✅ | ✅ |

**ملاحظات:**
- 🟡* = فقط إذا لم يكن البوست مقفل
- ✅** = فقط لبوستات عميله في حالة `client_review`

---

## 4. Input Validation Details

### createPost
```typescript
// Validation
if (!data.plan_id) return { error: "plan_id required" }
if (!data.client_id) return { error: "client_id required" }
if (!data.title) return { error: "title required" }
if (!data.publish_date) return { error: "publish_date required" }
```

### updatePost
```typescript
// Validation
if (!id) return { error: "id required" }
// + locked check
// + role check
```

### approvePost / rejectPost
```typescript
// Validation
if (!id) return { error: "id required" }
// + user authentication
// + role check
// + client_id ownership check (for clients)
```

---

## 5. أمثلة Test Calls

### إنشاء بوست
```typescript
const result = await createPost({
  plan_id: "plan-uuid",
  client_id: "client-uuid",
  title: "بوست تجريبي",
  status: "idea",
  publish_date: "2026-02-01",
  platform_ids: ["instagram-uuid", "tiktok-uuid"]
})
// Expected: { data: { id: "new-post-uuid", ... } }
```

### موافقة على بوست
```typescript
const result = await approvePost("post-uuid", "ممتاز!")
// Expected: { success: true }
// أو { error: "You can only approve your own client's posts" }
```

### إضافة تعليق
```typescript
const result = await addComment({
  post_id: "post-uuid",
  comment: "يرجى تعديل الصورة",
  scope: "client"
})
// Expected: { data: { id: "comment-uuid", ... } }
```

---

## 6. الفجوات والمخاطر

| الفجوة | المستوى | الوصف |
|--------|---------|-------|
| 🟡 No rate limiting | متوسط | يمكن spam الـ actions |
| 🟡 No input sanitization | متوسط | XSS محتمل في التعليقات |
| 🟡 No audit logging | منخفض | لا يوجد سجل للعمليات |
| ✅ Auth check | آمن | كل action يتحقق من المستخدم |
| ✅ Role check | آمن | كل action يتحقق من الدور |
| 🟡 RLS dependency | متوسط | يعتمد على RLS للعزل |

---

## 7. التوصيات

### P1 - مهم
1. إضافة **rate limiting** للـ actions
2. إضافة **input sanitization** (escape HTML)
3. إضافة **audit logging**

### P2 - تحسينات
1. إضافة **request validation** باستخدام Zod
2. إضافة **error codes** موحدة
3. إضافة **API documentation** (OpenAPI)
