import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const isPublicRoute = request.nextUrl.pathname.startsWith('/share')

  // Protect dashboard routes - redirect to login if not authenticated
  const isProtectedRoute = 
    !isPublicRoute && (
      request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname.startsWith('/calendar') ||
      request.nextUrl.pathname.startsWith('/grid') ||
      request.nextUrl.pathname.startsWith('/kanban') ||
      request.nextUrl.pathname.startsWith('/list') ||
      request.nextUrl.pathname.startsWith('/clients') ||
      request.nextUrl.pathname.startsWith('/team') ||
      request.nextUrl.pathname.startsWith('/settings') ||
      request.nextUrl.pathname.startsWith('/plans') ||
      request.nextUrl.pathname.startsWith('/client-portal')
    )
  
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (request.nextUrl.pathname.startsWith('/auth') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Role-based access control for authenticated users
  if (user && isProtectedRoute) {
    // Get user's role from team_members
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role, client_id')
      .eq('user_id', user.id)
      .single()

    const userRole = teamMember?.role || 'client'

    // Admin-only routes
    const adminOnlyRoutes = ['/team', '/clients', '/settings']
    
    // Client should be redirected to client portal
    if (userRole === 'client') {
      // Allow client portal access
      if (request.nextUrl.pathname.startsWith('/client-portal')) {
        // OK - client can access their portal
      } else {
        // Redirect client to their portal
        const url = request.nextUrl.clone()
        url.pathname = '/client-portal'
        return NextResponse.redirect(url)
      }
    }

    // Non-admin/manager trying to access admin routes
    if (adminOnlyRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
      if (!['admin', 'manager'].includes(userRole)) {
        const url = request.nextUrl.clone()
        url.pathname = '/calendar'
        return NextResponse.redirect(url)
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
