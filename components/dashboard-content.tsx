"use client"

import React, { useEffect } from "react"

import { useState, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { addMonths, subMonths, format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { CalendarView } from "@/components/calendar-view"
import { GridView } from "@/components/grid-view"
import { KanbanView } from "@/components/kanban-view"
import { ListView } from "@/components/list-view"
import { MonthlyGridView } from "@/components/monthly-grid-view"
import { PostSidePanel } from "@/components/post-side-panel"
import { FilterPanel } from "@/components/filter-panel"
import { createPost, updatePost, deletePost, submitForReview } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"
import type { Post, Platform, Client, Plan, ViewMode, FilterState, PostStatus, TeamMember } from "@/lib/types"

interface DashboardContentProps {
  platforms: Platform[]
  clients: Client[]
  posts: Post[]
  plans: Plan[]
  defaultView?: ViewMode
}

const defaultFilters: FilterState = {
  clients: [],
  platforms: [],
  statuses: [],
  goals: [],
  dateRange: { start: null, end: null },
  search: "",
}

export function DashboardContent({
  platforms,
  clients,
  posts: initialPosts,
  plans,
  defaultView = "calendar",
}: DashboardContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isNewPost, setIsNewPost] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [draggedPost, setDraggedPost] = useState<Post | null>(null)
  const [newPostDate, setNewPostDate] = useState<Date | undefined>()
  const [localPosts, setLocalPosts] = useState<Post[]>(initialPosts)
  const [currentUserRole, setCurrentUserRole] = useState<string>("admin")

  // تحديث localPosts عند تغيير initialPosts (من الخادم)
  useEffect(() => {
    setLocalPosts(initialPosts)
  }, [initialPosts])

  // جلب دور المستخدم الحالي
  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: teamMember } = await supabase
          .from("team_members")
          .select("role")
          .eq("user_id", user.id)
          .single()
        
        if (teamMember) {
          setCurrentUserRole(teamMember.role)
        }
      }
    }
    
    fetchUserRole()
  }, [])

  // Filter posts - use localPosts for optimistic updates
  const filteredPosts = useMemo(() => {
    return localPosts.filter((post: Post) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!post.title.toLowerCase().includes(query)) {
          return false
        }
      }

      // Client filter
      if (filters.clients.length > 0) {
        if (!post.client_id || !filters.clients.includes(post.client_id)) {
          return false
        }
      }

      // Platform filter
      if (filters.platforms.length > 0) {
        const postPlatformIds = post.platforms?.map((p: Platform) => p.id) || []
        if (!filters.platforms.some((id) => postPlatformIds.includes(id))) {
          return false
        }
      }

      // Status filter
      if (filters.statuses.length > 0) {
        if (!filters.statuses.includes(post.status)) {
          return false
        }
      }

      // Goal filter
      if (filters.goals.length > 0) {
        if (!post.main_goal || !filters.goals.includes(post.main_goal)) {
          return false
        }
      }

      return true
    })
  }, [localPosts, searchQuery, filters])

  // Handlers
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    router.push(`/?view=${mode}`, { scroll: false })
  }

  const handleNewPost = () => {
    setSelectedPost(null)
    setIsNewPost(true)
    setNewPostDate(undefined)
    setIsPanelOpen(true)
  }

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    setIsNewPost(false)
    setIsPanelOpen(true)
  }

  const handleDayClick = (date: Date) => {
    setSelectedPost(null)
    setIsNewPost(true)
    setNewPostDate(date)
    setIsPanelOpen(true)
  }

  const handlePanelClose = () => {
    setIsPanelOpen(false)
    setSelectedPost(null)
    setIsNewPost(false)
    setNewPostDate(undefined)
  }

  const handleSavePost = async (data: Partial<Post>) => {
    if (isNewPost) {
      // Find the correct plan for the selected date and client
      const postDate = newPostDate || new Date()
      const postYear = postDate.getFullYear()
      const postMonth = postDate.getMonth() + 1
      
      // Find plan for this month/year, or use first available plan
      // Use client filter if only one client is selected
      const clientFilter = filters.clients.length === 1 ? filters.clients[0] : null
      
      let activePlan = plans.find(p => 
        p.year === postYear && 
        p.month === postMonth &&
        (!clientFilter || p.client_id === clientFilter)
      )
      
      // If no plan for this month, use first plan matching client filter
      if (!activePlan) {
        activePlan = clientFilter 
          ? plans.find(p => p.client_id === clientFilter) || plans[0]
          : plans[0]
      }
      
      if (!activePlan) {
        console.error("No active plan found")
        return
      }

      const result = await createPost({
        plan_id: activePlan.id,
        client_id: activePlan.client_id,
        title: data.title || "منشور جديد",
        main_goal: data.main_goal || undefined,
        status: data.status || "draft",
        publish_date: data.publish_date || format(postDate, "yyyy-MM-dd"),
      })

      if (result.error) {
        console.error("Error creating post:", result.error)
      } else if (result.data) {
        // Add new post to local state
        setLocalPosts(prev => [...prev, result.data as Post])
        handlePanelClose()
        // Refresh to get updated data from server
        router.refresh()
      }
    } else if (selectedPost) {
      // Update existing post
      const result = await updatePost(selectedPost.id, {
        title: data.title,
        main_goal: data.main_goal || undefined,
        status: data.status,
        publish_date: data.publish_date,
      })

      if (result.error) {
        console.error("Error updating post:", result.error)
      } else if (result.data) {
        // Update post in local state
        setLocalPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, ...result.data } : p))
        handlePanelClose()
        // Refresh to get updated data from server
        router.refresh()
      }
    }
  }

  const handleDeletePost = async (postId: string) => {
    // Optimistic delete
    setLocalPosts(prev => prev.filter(p => p.id !== postId))
    handlePanelClose()
    
    const result = await deletePost(postId)
    if (result.error) {
      console.error("Error deleting post:", result.error)
      // Revert on error - reload page
      router.refresh()
    }
  }

  const handleSubmitForReview = async (postId: string) => {
    // Optimistic update
    setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'client_review' as PostStatus } : p))
    handlePanelClose()
    
    const result = await submitForReview(postId)
    if (result.error) {
      console.error("Error submitting for review:", result.error)
      // Revert on error
      router.refresh()
    }
  }

  const handleDragStart = (post: Post) => {
    setDraggedPost(post)
  }

  const handleDragOver = (e: React.DragEvent, _target: Date | PostStatus) => {
    e.preventDefault()
    e.currentTarget.classList.add("drop-target")
  }

  const handleCalendarDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.currentTarget.classList.remove("drop-target")

    if (!draggedPost) return
    
    const postId = draggedPost.id
    const newDate = format(date, "yyyy-MM-dd")
    const oldDate = draggedPost.publish_date
    
    // Optimistic update - update UI immediately
    setLocalPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, publish_date: newDate } : p
    ))
    setDraggedPost(null)
    
    try {
      const response = await fetch(`/api/posts/${postId}/date`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish_date: newDate }),
      })
      
      if (!response.ok) {
        // Revert on error
        setLocalPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, publish_date: oldDate } : p
        ))
        const data = await response.json()
        console.error("Error updating post date:", data.error)
      }
    } catch (error) {
      // Revert on error
      setLocalPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, publish_date: oldDate } : p
      ))
      console.error("Error updating post date:", error)
    }
  }

  const handleKanbanDrop = async (e: React.DragEvent, status: PostStatus) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove("drop-target")

    if (!draggedPost) return
    
    const postId = draggedPost.id
    const oldStatus = draggedPost.status
    
    // Optimistic update - update UI immediately
    setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p))
    setDraggedPost(null)
    
    try {
      const response = await fetch(`/api/posts/${postId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      
      if (!response.ok) {
        // Revert on error
        setLocalPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, status: oldStatus } : p
        ))
        const data = await response.json()
        console.error("Error updating post status:", data.error)
      }
    } catch (error) {
      // Revert on error
      setLocalPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, status: oldStatus } : p
      ))
      console.error("Error updating post status:", error)
    }
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([])
    } else {
      setSelectedPosts(filteredPosts.map((p: Post) => p.id))
    }
  }

  const handleResetFilters = () => {
    setFilters(defaultFilters)
    setSearchQuery("")
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DashboardHeader
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onNewPost={handleNewPost}
        onFilterToggle={() => setIsFilterOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedClient={filters.clients.length === 1 ? clients.find(c => c.id === filters.clients[0]) : null}
      />

      <main className="flex-1 overflow-auto">
        {viewMode === "calendar" && (
          <CalendarView
            currentDate={currentDate}
            posts={filteredPosts}
            onPostClick={handlePostClick}
            onDayClick={handleDayClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleCalendarDrop}
          />
        )}

        {viewMode === "grid" && (
          <GridView posts={filteredPosts} onPostClick={handlePostClick} />
        )}

        {viewMode === "kanban" && (
          <KanbanView
            posts={filteredPosts}
            onPostClick={handlePostClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleKanbanDrop}
            canDrag={["admin", "manager"].includes(currentUserRole)}
          />
        )}

        {viewMode === "list" && (
          <ListView
            posts={filteredPosts}
            onPostClick={handlePostClick}
            onDelete={handleDeletePost}
            selectedPosts={selectedPosts}
            onSelectPost={handleSelectPost}
            onSelectAll={handleSelectAll}
          />
        )}

        {viewMode === "monthly-grid" && (
          <MonthlyGridView
            posts={filteredPosts}
            platforms={platforms}
            onPostClick={handlePostClick}
          />
        )}
      </main>

      <PostSidePanel
        post={selectedPost}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        onSave={handleSavePost}
        onDelete={handleDeletePost}
        onSubmitForReview={handleSubmitForReview}
        platforms={platforms}
        isNew={isNewPost}
        defaultDate={newPostDate}
      />

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        platforms={platforms}
        clients={clients}
        onReset={handleResetFilters}
      />
    </div>
  )
}
