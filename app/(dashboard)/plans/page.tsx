import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getClients, getPlans } from "@/lib/data"
import { PlansContent } from "@/components/plans-content"

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user's team member info
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role, client_id")
    .eq("user_id", user.id)
    .single()

  if (!teamMember) {
    redirect("/auth/login")
  }

  // Redirect clients to client portal
  if (teamMember.role === "client") {
    redirect("/client-portal")
  }

  const clients = await getClients()
  const plans = await getPlans()

  return <PlansContent clients={clients} plans={plans} />
}
