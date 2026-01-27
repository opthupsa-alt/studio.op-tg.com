-- إضافة أعمدة رؤية العميل في جدول المنشورات
-- visible_to_client: هل المنشور مرئي للعميل؟
-- awaiting_client_approval: هل المنشور ينتظر موافقة العميل؟

-- إضافة عمود visible_to_client
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN DEFAULT false;

-- إضافة عمود awaiting_client_approval  
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS awaiting_client_approval BOOLEAN DEFAULT false;

-- تحديث المنشورات الموجودة بحالة client_review لتكون مرئية ومنتظرة للموافقة
UPDATE posts 
SET visible_to_client = true, awaiting_client_approval = true 
WHERE status = 'client_review';

-- تحديث المنشورات المعتمدة/المجدولة/المنشورة لتكون مرئية
UPDATE posts 
SET visible_to_client = true 
WHERE status IN ('approved', 'scheduled', 'posted');

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_posts_visible_to_client ON posts(visible_to_client);
CREATE INDEX IF NOT EXISTS idx_posts_awaiting_client_approval ON posts(awaiting_client_approval);
CREATE INDEX IF NOT EXISTS idx_posts_client_visibility ON posts(client_id, visible_to_client);
