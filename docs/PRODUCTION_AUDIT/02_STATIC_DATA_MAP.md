# 02 - خريطة البيانات الثابتة (Static Data Map)

## تاريخ التدقيق: 2026-01-26

---

## 1. ملخص تنفيذي

### التصنيف
| النوع | العدد | الحالة |
|-------|-------|--------|
| بيانات ثابتة مقبولة (Config) | 12 | ✅ لا تحتاج تغيير |
| بيانات ثابتة تحتاج ربط بـ DB | 3 | ⚠️ تحتاج إصلاح |
| CRUD غير مكتمل | 2 | ❌ يجب إكمال |
| UI شكلي بدون منطق | 4 | ❌ يجب ربط |

---

## 2. البيانات الثابتة المقبولة (Configuration)

هذه البيانات ثابتة بطبيعتها ولا تحتاج لتخزينها في قاعدة البيانات:

### 2.1 Labels و Colors (مقبولة)

| الملف | السطر | المتغير | الوصف | القرار |
|-------|-------|---------|-------|--------|
| `lib/types.ts` | 146-156 | `STATUS_LABELS` | تسميات الحالات | ✅ مقبول |
| `lib/types.ts` | 158-164 | `GOAL_LABELS` | تسميات الأهداف | ✅ مقبول |
| `lib/types.ts` | 166-176 | `STATUS_COLORS` | ألوان الحالات | ✅ مقبول |
| `lib/types.ts` | 178-184 | `POST_TYPE_LABELS` | تسميات أنواع البوست | ✅ مقبول |
| `lib/types.ts` | 186-192 | `POST_TYPE_COLORS` | ألوان أنواع البوست | ✅ مقبول |
| `components/team-content.tsx` | 55-61 | `roleLabels` | تسميات الأدوار | ✅ مقبول |
| `components/team-content.tsx` | 63-69 | `roleColors` | ألوان الأدوار | ✅ مقبول |

### 2.2 UI Options (مقبولة)

| الملف | السطر | المتغير | الوصف | القرار |
|-------|-------|---------|-------|--------|
| `components/post-side-panel.tsx` | 73-79 | `goalOptions` | خيارات الأهداف | ✅ مقبول |
| `components/post-side-panel.tsx` | 81-90 | `statusOptions` | خيارات الحالات | ✅ مقبول |
| `components/post-side-panel.tsx` | 92-98 | `postTypeOptions` | خيارات أنواع البوست | ✅ مقبول |
| `components/filter-panel.tsx` | 28-37 | `statusOptions` | خيارات الفلترة | ✅ مقبول |
| `components/filter-panel.tsx` | 39-45 | `goalOptions` | خيارات الفلترة | ✅ مقبول |
| `components/filter-panel.tsx` | 47-53 | `contentTypeOptions` | خيارات نوع المحتوى | ✅ مقبول (غير مستخدم) |

### 2.3 Navigation و Views (مقبولة)

| الملف | السطر | المتغير | الوصف | القرار |
|-------|-------|---------|-------|--------|
| `components/app-sidebar.tsx` | 48-69 | `mainNavItems` | عناصر التنقل الرئيسية | ✅ مقبول |
| `components/app-sidebar.tsx` | 71-86 | `managementItems` | عناصر الإدارة | ✅ مقبول |
| `components/view-switcher.tsx` | 18-24 | `views` | أنواع العرض | ✅ مقبول |
| `components/kanban-view.tsx` | 20-25 | `workColumns` | أعمدة العمل | ✅ مقبول |
| `components/kanban-view.tsx` | 28-33 | `reviewColumns` | أعمدة المراجعة | ✅ مقبول |
| `components/calendar-view.tsx` | 31-32 | `weekDays/weekDaysShort` | أسماء الأيام | ✅ مقبول |

### 2.4 Platform Icons (مقبولة)

| الملف | السطر | المتغير | الوصف | القرار |
|-------|-------|---------|-------|--------|
| `components/platform-icon.tsx` | 8-56 | `platformConfig` | إعدادات المنصات | ✅ مقبول (icons ثابتة) |

---

## 3. البيانات التي تحتاج ربط بقاعدة البيانات ⚠️

### 3.1 التعليقات الوهمية

| الملف | السطر | المشكلة | الحل المطلوب |
|-------|-------|---------|--------------|
| `components/post-side-panel.tsx` | 474-486 | تعليق ثابت "سارة أحمد" | جلب التعليقات الحقيقية من `comments` table |

**الكود الحالي:**
```tsx
// Sample comments
<div className="flex gap-3 p-3 rounded-lg bg-muted/50">
  <Avatar className="size-8">
    <AvatarFallback className="bg-primary text-primary-foreground text-xs">س</AvatarFallback>
  </Avatar>
  <div className="flex-1">
    <div className="flex items-center gap-2 mb-1">
      <span className="font-medium text-sm">سارة أحمد</span>
      <span className="text-xs text-muted-foreground">منذ ساعتين</span>
    </div>
    <p className="text-sm">المحتوى ممتاز! يرجى إضافة هاشتاغات أكثر.</p>
  </div>
</div>
```

**الحل:**
```tsx
// جلب التعليقات من post.comments
{post?.comments?.map((comment) => (
  <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
    <Avatar className="size-8">
      <AvatarFallback>{comment.user?.full_name?.charAt(0)}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <span className="font-medium text-sm">{comment.user?.full_name}</span>
      <p className="text-sm">{comment.comment}</p>
    </div>
  </div>
))}
```

### 3.2 أسماء الأشهر العربية

| الملف | السطر | المشكلة | الحل المطلوب |
|-------|-------|---------|--------------|
| `app/share/[clientId]/[year]/[month]/page.tsx` | 83-86 | مصفوفة ثابتة | استخدام date-fns locale |

**الكود الحالي:**
```tsx
const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
]
const monthName = monthNames[monthNum - 1]
```

**الحل:**
```tsx
import { format } from "date-fns"
import { ar } from "date-fns/locale"

const monthName = format(new Date(yearNum, monthNum - 1), "MMMM", { locale: ar })
```

### 3.3 اختيار الخطة الافتراضية

| الملف | السطر | المشكلة | الحل المطلوب |
|-------|-------|---------|--------------|
| `components/dashboard-content.tsx` | 168 | `plans[0]` - أول خطة فقط | اختيار الخطة حسب الشهر الحالي والعميل |

**الكود الحالي:**
```tsx
const activePlan = plans[0]
```

**الحل:**
```tsx
// البحث عن خطة الشهر الحالي للعميل المحدد
const currentMonth = currentDate.getMonth() + 1
const currentYear = currentDate.getFullYear()
const activePlan = plans.find(p => 
  p.year === currentYear && 
  p.month === currentMonth
) || plans[0]
```

---

## 4. CRUD غير مكتمل ❌

### 4.1 إدارة أعضاء الفريق

| الملف | السطر | الوظيفة | الحالة |
|-------|-------|---------|--------|
| `components/team-content.tsx` | 77-84 | `handleCreateMember` | ❌ TODO فقط |
| `components/team-content.tsx` | 201-204 | تعديل العضو | ❌ غير مربوط |
| `components/team-content.tsx` | 206-209 | حذف العضو | ❌ غير مربوط |

**الكود الحالي:**
```tsx
const handleCreateMember = async () => {
  // TODO: Implement team member creation
  console.log("Creating member:", { name: newMemberName, email: newMemberEmail, role: newMemberRole })
  setIsDialogOpen(false)
  // ...
}
```

**الحل المطلوب:**
1. إنشاء Server Action في `lib/actions.ts`:
   - `createTeamMember(data)`
   - `updateTeamMember(id, data)`
   - `deleteTeamMember(id)`
2. ربط الدوال بالـ UI

### 4.2 إدارة العملاء

| الملف | السطر | الوظيفة | الحالة |
|-------|-------|---------|--------|
| `components/clients-content.tsx` | 53-58 | `handleCreateClient` | ❌ TODO فقط |
| `components/clients-content.tsx` | 167-169 | تعديل العميل | ❌ غير مربوط |
| `components/clients-content.tsx` | 172-175 | حذف العميل | ❌ غير مربوط |

**الكود الحالي:**
```tsx
const handleCreateClient = async () => {
  // TODO: Implement client creation
  console.log("Creating client:", { name: newClientName, color: newClientColor })
  setIsDialogOpen(false)
  // ...
}
```

**الحل المطلوب:**
1. إنشاء Server Action في `lib/actions.ts`:
   - `createClient(data)`
   - `updateClient(id, data)`
   - `deleteClient(id)`
2. ربط الدوال بالـ UI

---

## 5. UI شكلي بدون منطق ❌

### 5.1 إرسال التعليقات

| الملف | السطر | المشكلة |
|-------|-------|---------|
| `components/post-side-panel.tsx` | 502-505 | زر "إرسال التعليق" بدون handler |

**الكود الحالي:**
```tsx
<Button className="w-full" disabled={!newComment.trim()}>
  <Send className="size-4 ml-2" />
  إرسال التعليق
</Button>
```

**الحل:**
```tsx
<Button 
  className="w-full" 
  disabled={!newComment.trim()}
  onClick={async () => {
    await addComment(post!.id, newComment, "internal")
    setNewComment("")
  }}
>
```

### 5.2 رفع الملفات

| الملف | السطر | المشكلة |
|-------|-------|---------|
| `components/post-side-panel.tsx` | 287-298 | منطقة رفع الملفات بدون handler |

**الكود الحالي:**
```tsx
<div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
  <Plus className="size-8 mx-auto text-muted-foreground mb-2" />
  <p className="text-sm text-muted-foreground">
    اسحب الملفات هنا أو انقر للاختيار
  </p>
</div>
```

**الحل المطلوب:**
1. إضافة Supabase Storage bucket
2. إنشاء upload handler
3. ربط الـ UI بالـ handler

### 5.3 حفظ نسخ المنصات (Variants)

| الملف | السطر | المشكلة |
|-------|-------|---------|
| `components/post-side-panel.tsx` | 353-394 | تعديل variants محلياً فقط |

**المشكلة:** التعديلات على variants تُحفظ في state فقط ولا تُرسل لقاعدة البيانات.

**الحل:**
1. إضافة حفظ variants في `handleSave`
2. استخدام `createPostVariant` و `updatePostVariant` من `lib/actions.ts`

### 5.4 صفحة الإعدادات

| الملف | المشكلة |
|-------|---------|
| `app/(dashboard)/settings/page.tsx` | صفحة شكلية بدون وظائف |

**الحل المطلوب:**
1. إضافة إعدادات الحساب
2. إضافة إعدادات الإشعارات
3. ربط بقاعدة البيانات

---

## 6. جدول الأولويات

| الأولوية | العنصر | الملف | الجهد المقدر |
|----------|--------|-------|--------------|
| 🔴 عالية | CRUD الفريق | `team-content.tsx` | 2-3 ساعات |
| 🔴 عالية | CRUD العملاء | `clients-content.tsx` | 2-3 ساعات |
| 🟡 متوسطة | التعليقات | `post-side-panel.tsx` | 1-2 ساعة |
| 🟡 متوسطة | حفظ Variants | `post-side-panel.tsx` | 2 ساعات |
| 🟢 منخفضة | رفع الملفات | `post-side-panel.tsx` | 3-4 ساعات |
| 🟢 منخفضة | صفحة الإعدادات | `settings/page.tsx` | 4-5 ساعات |

---

## 7. ملخص الإصلاحات المطلوبة

### الملفات التي تحتاج تعديل:
1. `lib/actions.ts` - إضافة CRUD للفريق والعملاء
2. `components/team-content.tsx` - ربط CRUD
3. `components/clients-content.tsx` - ربط CRUD
4. `components/post-side-panel.tsx` - ربط التعليقات + Variants + الملفات
5. `components/dashboard-content.tsx` - إصلاح اختيار الخطة
6. `app/share/[clientId]/[year]/[month]/page.tsx` - استخدام date-fns

### الملفات التي لا تحتاج تعديل:
- جميع ملفات الـ types والـ labels (مقبولة كـ config)
- ملفات الـ navigation (مقبولة كـ config)
- ملفات الـ views (تعمل بشكل صحيح)
