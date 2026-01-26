-- =====================================================
-- Notifications System
-- Version: 008
-- Date: 2026-01-26
-- =====================================================

-- =====================================================
-- 1. Create notifications table
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info' | 'success' | 'warning' | 'error'
  link TEXT, -- Optional link to navigate to
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- 2. Enable RLS
-- =====================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- System can insert notifications for any user (via service role)
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 3. Function to create notification
-- =====================================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Trigger to create notifications on post status change
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_post_status_change()
RETURNS TRIGGER AS $$
DECLARE
  post_title TEXT;
  writer_user_id UUID;
  designer_user_id UUID;
  client_user_id UUID;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  post_title := NEW.title;

  -- Get assigned users
  SELECT tm.user_id INTO writer_user_id
  FROM team_members tm
  WHERE tm.id = NEW.assigned_writer;

  SELECT tm.user_id INTO designer_user_id
  FROM team_members tm
  WHERE tm.id = NEW.assigned_designer;

  -- Notify based on new status
  CASE NEW.status
    WHEN 'design' THEN
      -- Notify designer
      IF designer_user_id IS NOT NULL THEN
        PERFORM create_notification(
          designer_user_id,
          'منشور جاهز للتصميم',
          'المنشور "' || post_title || '" جاهز للتصميم',
          'info',
          '/calendar'
        );
      END IF;
    
    WHEN 'internal_review' THEN
      -- Notify managers
      INSERT INTO notifications (user_id, title, message, type, link)
      SELECT tm.user_id, 'منشور للمراجعة الداخلية', 
             'المنشور "' || post_title || '" جاهز للمراجعة الداخلية',
             'info', '/calendar'
      FROM team_members tm
      WHERE tm.role IN ('admin', 'manager') AND tm.user_id IS NOT NULL;
    
    WHEN 'client_review' THEN
      -- Notify client
      SELECT tm.user_id INTO client_user_id
      FROM team_members tm
      WHERE tm.role = 'client' 
        AND tm.client_id = NEW.client_id
        AND tm.user_id IS NOT NULL
      LIMIT 1;
      
      IF client_user_id IS NOT NULL THEN
        PERFORM create_notification(
          client_user_id,
          'منشور بانتظار موافقتك',
          'المنشور "' || post_title || '" بانتظار موافقتك',
          'warning',
          '/client-portal'
        );
      END IF;
    
    WHEN 'approved' THEN
      -- Notify writer
      IF writer_user_id IS NOT NULL THEN
        PERFORM create_notification(
          writer_user_id,
          'تمت الموافقة على المنشور',
          'تمت الموافقة على المنشور "' || post_title || '"',
          'success',
          '/calendar'
        );
      END IF;
    
    WHEN 'rejected' THEN
      -- Notify writer and designer
      IF writer_user_id IS NOT NULL THEN
        PERFORM create_notification(
          writer_user_id,
          'تم رفض المنشور',
          'تم رفض المنشور "' || post_title || '" - يرجى مراجعة الملاحظات',
          'error',
          '/calendar'
        );
      END IF;
      
      IF designer_user_id IS NOT NULL THEN
        PERFORM create_notification(
          designer_user_id,
          'تم رفض المنشور',
          'تم رفض المنشور "' || post_title || '" - يرجى مراجعة الملاحظات',
          'error',
          '/calendar'
        );
      END IF;
    
    ELSE
      -- No notification for other statuses
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS post_status_change_notification ON posts;
CREATE TRIGGER post_status_change_notification
  AFTER UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_post_status_change();

-- =====================================================
-- Done!
-- =====================================================
SELECT 'Notifications system created successfully!' as result;
