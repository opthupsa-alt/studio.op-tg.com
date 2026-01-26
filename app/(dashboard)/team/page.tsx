import { Suspense } from "react"
import { getTeamMembers, getClients, getTeamMemberClients } from "@/lib/data"
import { TeamContent } from "@/components/team-content"

export default async function TeamPage() {
  const [teamMembers, clients, teamMemberClients] = await Promise.all([
    getTeamMembers(),
    getClients(),
    getTeamMemberClients(),
  ])

  return (
    <Suspense fallback={<TeamSkeleton />}>
      <TeamContent 
        teamMembers={teamMembers} 
        clients={clients} 
        teamMemberClients={teamMemberClients}
      />
    </Suspense>
  )
}

function TeamSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="h-16 border-b bg-background animate-pulse" />
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
