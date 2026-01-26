export type PostStatus = 
  | "idea"
  | "draft"
  | "design"
  | "internal_review"
  | "client_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "posted"

export type PostType = "post" | "reel" | "video" | "story" | "carousel"

export type MainGoal = "awareness" | "engagement" | "leads" | "messages" | "sales"

export type Platform = {
  id: string
  key: string
  name: string
  icon: string | null
  created_at: string
}

export type Client = {
  id: string
  name: string
  status: "active" | "inactive"
  brand_primary_color: string | null
  logo_url: string | null
  icon_url: string | null
  timezone: string | null
  created_at: string
}

export type TeamMember = {
  id: string
  user_id: string | null
  full_name: string
  email: string | null
  role: "admin" | "manager" | "writer" | "designer" | "client"
  client_id: string | null
  avatar_url: string | null
  status: "active" | "inactive"
  created_at: string
}

export type Plan = {
  id: string
  client_id: string
  year: number
  month: number
  status: "draft" | "active" | "archived"
  created_at: string
  client?: Client
}

export type PostVariant = {
  id: string
  post_id: string
  platform_id: string
  caption: string | null
  hashtags: string | null
  cta: string | null
  design_notes: string | null
  status: "draft" | "ready" | "approved"
  created_at: string
  updated_at: string
  platform?: Platform
}

export type Post = {
  id: string
  plan_id: string
  client_id: string
  publish_date: string
  title: string
  description: string | null
  post_type: PostType
  main_goal: MainGoal | null
  status: PostStatus
  assigned_writer: string | null
  assigned_designer: string | null
  created_by: string | null
  locked: boolean
  position: number
  created_at: string
  updated_at: string
  plan?: Plan
  client?: Client
  platforms?: Platform[]
  variants?: PostVariant[]
  comments?: Comment[]
  approvals?: Approval[]
  assets?: Asset[]
  writer?: TeamMember
  designer?: TeamMember
}

export type Asset = {
  id: string
  post_id: string
  variant_id: string | null
  type: "image" | "video" | "link" | "file"
  url: string
  name: string | null
  created_at: string
}

export type Comment = {
  id: string
  post_id: string
  user_id: string | null
  scope: "internal" | "client"
  comment: string
  created_at: string
  user?: TeamMember
}

export type Approval = {
  id: string
  post_id: string
  client_user_id: string | null
  status: "approved" | "rejected" | "pending"
  note: string | null
  created_at: string
  approver?: TeamMember
}

export type CalendarDay = {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  posts: Post[]
}

export type ViewMode = "calendar" | "grid" | "kanban" | "list" | "monthly-grid" | "instagram"

export type FilterState = {
  clients: string[]
  platforms: string[]
  statuses: PostStatus[]
  goals: MainGoal[]
  dateRange: {
    start: Date | null
    end: Date | null
  }
  search: string
}

export const STATUS_LABELS: Record<PostStatus, string> = {
  idea: "فكرة",
  draft: "مسودة",
  design: "تصميم",
  internal_review: "مراجعة داخلية",
  client_review: "مراجعة العميل",
  approved: "معتمد",
  rejected: "مرفوض",
  scheduled: "مجدول",
  posted: "منشور",
}

export const GOAL_LABELS: Record<MainGoal, string> = {
  awareness: "الوعي",
  engagement: "التفاعل",
  leads: "العملاء المحتملين",
  messages: "الرسائل",
  sales: "المبيعات",
}

export const STATUS_COLORS: Record<PostStatus, string> = {
  idea: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  design: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  internal_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  client_review: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  scheduled: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  posted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
}

export const POST_TYPE_LABELS: Record<PostType, string> = {
  post: "منشور",
  reel: "ريلز",
  video: "فيديو",
  story: "ستوري",
  carousel: "كاروسيل",
}

export const POST_TYPE_COLORS: Record<PostType, string> = {
  post: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reel: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  video: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  story: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  carousel: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
}
