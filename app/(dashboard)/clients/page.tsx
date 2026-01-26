import { Suspense } from "react"
import { getClients, getPlatforms } from "@/lib/data"
import { ClientsContent } from "@/components/clients-content"

export default async function ClientsPage() {
  const [clients, platforms] = await Promise.all([
    getClients(),
    getPlatforms(),
  ])

  return (
    <Suspense fallback={<ClientsSkeleton />}>
      <ClientsContent clients={clients} platforms={platforms} />
    </Suspense>
  )
}

function ClientsSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="h-16 border-b bg-background animate-pulse" />
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
