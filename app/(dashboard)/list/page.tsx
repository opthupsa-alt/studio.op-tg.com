import { Suspense } from "react"
import { getPlatforms, getClients, getPosts, getPlans } from "@/lib/data"
import { DashboardContent } from "@/components/dashboard-content"
import { PageLoading } from "@/components/loading-spinner"

export default async function ListPage() {
  const [platforms, clients, posts, plans] = await Promise.all([
    getPlatforms(),
    getClients(),
    getPosts(),
    getPlans(),
  ])

  return (
    <Suspense fallback={<PageLoading />}>
      <DashboardContent
        platforms={platforms}
        clients={clients}
        posts={posts}
        plans={plans}
        defaultView="list"
      />
    </Suspense>
  )
}
