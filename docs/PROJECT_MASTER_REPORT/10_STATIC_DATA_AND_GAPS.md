# 10 - Static Data & Gaps
## البيانات الثابتة والفجوات

**تاريخ التقرير:** 2026-01-26

---

## 1. البيانات الثابتة (Hardcoded/Mocks)

### في lib/types.ts

| البيانات | الملف | السطر | الوصف |
|----------|-------|-------|-------|
| `STATUS_LABELS` | `lib/types.ts` | 147-157 | تسميات الحالات بالعربية |
| `GOAL_LABELS` | `lib/types.ts` | 159-165 | تسميات الأهداف بالعربية |
| `STATUS_COLORS` | `lib/types.ts` | 167-177 | ألوان الحالات |
| `POST_TYPE_LABELS` | `lib/types.ts` | 179-185 | تسميات أنواع البوستات |
| `POST_TYPE_COLORS` | `lib/types.ts` | 187-193 | ألوان أنواع البوستات |

```typescript
// مثال
export const STATUS_LABELS: Record<PostStatus, string> = {
  idea: "فكرة",
  draft: "مسودة",
  design: "تصميم",
  // ...
}
```

**هل يحتاج نقل لـ DB؟** ❌ لا - هذه ثوابت UI مقبولة

---

### في lib/workflow.ts

| البيانات | الملف | السطر | الوصف |
|----------|-------|-------|-------|
| `ALLOWED_TRANSITIONS` | `lib/workflow.ts` | 4-14 | الانتقالات المسموحة بين الحالات |
| `ROLE_PERMISSIONS` | `lib/workflow.ts` | 17-23 | صلاحيات الأدوار للحالات |
| `LOCKED_STATUSES` | `lib/workflow.ts` | 26 | الحالات التي تُقفل البوست |

**هل يحتاج نقل لـ DB؟** 🟡 ممكن - لكن الأفضل إبقاؤه في الكود للأداء

---

### في components/app-sidebar.tsx

| البيانات | الملف | السطر | الوصف |
|----------|-------|-------|-------|
| `homeItem` | `app-sidebar.tsx` | 52-57 | عنصر الصفحة الرئيسية |
| `viewItems` | `app-sidebar.tsx` | 60-85 | عناصر طرق العرض |
| `contentItems` | `app-sidebar.tsx` | 88-101 | عناصر إدارة المحتوى |
| `systemItems` | `app-sidebar.tsx` | 104-117 | عناصر إدارة النظام |

**هل يحتاج نقل لـ DB؟** ❌ لا - هذه تكوين UI ثابت

---

### في components/dashboard-home.tsx

| البيانات | الملف | السطر | الوصف |
|----------|-------|-------|-------|
| `roleLabels` | `dashboard-home.tsx` | 80-86 | تسميات الأدوار |
| `statusLabels` | `dashboard-home.tsx` | 88-98 | تسميات الحالات (مكرر) |
| `statusColors` | `dashboard-home.tsx` | 100-110 | ألوان الحالات (مكرر) |

**هل يحتاج نقل لـ DB؟** ❌ لا - لكن يُفضل توحيدها مع `lib/types.ts`

---

### في components/platform-icon.tsx

| البيانات | الملف | الوصف |
|----------|-------|-------|
| Platform icons mapping | `platform-icon.tsx` | ربط المنصات بالأيقونات |

```typescript
const platformIcons: Record<string, React.ComponentType> = {
  instagram: Instagram,
  tiktok: TikTok,
  // ...
}
```

**هل يحتاج نقل لـ DB؟** ❌ لا - الأيقونات في الكود

---

## 2. البيانات التي تحتاج نقل لـ DB

### المنصات (Platforms)
**الحالة الحالية:** ✅ موجودة في DB
```sql
-- scripts/001_create_schema.sql
INSERT INTO platforms (key, name, icon) VALUES
  ('instagram', 'Instagram', 'instagram'),
  ('tiktok', 'TikTok', 'tiktok'),
  -- ...
```

### الأدوار (Roles)
**الحالة الحالية:** ❌ Hardcoded في الكود
```typescript
role: "admin" | "manager" | "writer" | "designer" | "client"
```

**هل يحتاج نقل لـ DB؟** 🟡 ممكن مستقبلاً لدعم أدوار مخصصة

---

## 3. Views/Widgets تعمل شكل فقط

### 3.1 Settings Page
**الملف:** `app/(dashboard)/settings/page.tsx`

| العنصر | الحالة | الوصف |
|--------|--------|-------|
| تغيير الاسم | 🟡 UI فقط | لا يحفظ في DB |
| تغيير البريد | 🟡 UI فقط | لا يحفظ في DB |
| تغيير كلمة المرور | 🟡 UI فقط | لا يحفظ في DB |
| تغيير المظهر | ✅ يعمل | يحفظ في localStorage |

### 3.2 Kanban Drag & Drop
**الملف:** `components/kanban-view.tsx`

| العنصر | الحالة | الوصف |
|--------|--------|-------|
| عرض الأعمدة | ✅ يعمل | يعرض البوستات حسب الحالة |
| سحب وإفلات | ❌ غير مُفعّل | الكود موجود لكن معطل |

### 3.3 Reports/Analytics
**الحالة:** ❌ غير موجود

| العنصر | الحالة |
|--------|--------|
| تقارير الأداء | ❌ |
| إحصائيات مفصلة | ❌ |
| تصدير البيانات | ❌ |

### 3.4 Audit Log
**الحالة:** ❌ غير موجود

| العنصر | الحالة |
|--------|--------|
| سجل العمليات | ❌ |
| تتبع التغييرات | ❌ |
| من فعل ماذا ومتى | ❌ |

---

## 4. البيانات المكررة (Duplicated)

| البيانات | الملفات | التوصية |
|----------|---------|---------|
| Status Labels | `lib/types.ts`, `dashboard-home.tsx` | توحيد في `lib/types.ts` |
| Status Colors | `lib/types.ts`, `dashboard-home.tsx` | توحيد في `lib/types.ts` |
| Role Labels | `app-sidebar.tsx`, `dashboard-home.tsx` | إنشاء `lib/constants.ts` |

---

## 5. ما المطلوب لتحويلها إلى DB

### الأدوار المخصصة (مستقبلي)
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### إعدادات المستخدم
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'ar',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Audit Log
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. ملخص الفجوات

| الفجوة | الأولوية | التأثير | الحل |
|--------|----------|---------|------|
| Settings لا تحفظ | P2 | UX | إضافة user_settings table |
| Kanban drag معطل | P1 | UX | تفعيل الكود الموجود |
| لا يوجد Audit Log | P2 | Security/Compliance | إضافة audit_log table |
| لا يوجد Reports | P2 | Business | إضافة صفحة تقارير |
| بيانات مكررة | P3 | Maintenance | توحيد في ملف واحد |

---

## 7. التوصيات

### الآن (P1)
1. تفعيل **Kanban drag & drop**
2. توحيد **الثوابت المكررة**

### قريباً (P2)
1. إضافة **user_settings** table
2. إضافة **audit_log** table
3. إضافة صفحة **Reports**

### مستقبلاً (P3)
1. نظام **أدوار مخصصة**
2. **Localization** كامل
3. **Export** للبيانات
