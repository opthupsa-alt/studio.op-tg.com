import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, client_id } = body

    // Validate required fields
    if (!email || !password || !full_name || !client_id) {
      return NextResponse.json(
        { error: "جميع الحقول مطلوبة: البريد الإلكتروني، كلمة المرور، الاسم، العميل" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "صيغة البريد الإلكتروني غير صحيحة" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      )
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables")
      return NextResponse.json(
        { error: "خطأ في إعدادات الخادم - يرجى التواصل مع المسؤول" },
        { status: 500 }
      )
    }

    // Verify the requesting user is admin/manager
    const supabase = await createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Auth error:", userError)
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      )
    }

    const { data: currentMember, error: memberQueryError } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (memberQueryError) {
      console.error("Error fetching current member:", memberQueryError)
      return NextResponse.json(
        { error: "خطأ في التحقق من صلاحياتك" },
        { status: 500 }
      )
    }

    if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
      return NextResponse.json(
        { error: "فقط المشرفين والمديرين يمكنهم إنشاء مستخدمين للعملاء" },
        { status: 403 }
      )
    }

    // Use Admin API to create user without email confirmation
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check if email already exists in Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email === email)
    
    let authUserId: string
    
    if (existingAuthUser) {
      // User exists in Auth - check if they exist in team_members
      const { data: existingMember } = await supabaseAdmin
        .from("team_members")
        .select("id, client_id")
        .eq("user_id", existingAuthUser.id)
        .single()
      
      if (existingMember) {
        // User exists in both Auth and team_members
        if (existingMember.client_id === client_id) {
          return NextResponse.json(
            { error: "هذا المستخدم مرتبط بالفعل بهذا العميل" },
            { status: 400 }
          )
        } else {
          return NextResponse.json(
            { error: "هذا البريد الإلكتروني مستخدم بالفعل لعميل آخر" },
            { status: 400 }
          )
        }
      }
      
      // User exists in Auth but NOT in team_members - reuse the auth user
      console.log("Reusing existing auth user:", existingAuthUser.id)
      authUserId = existingAuthUser.id
      
      // Update password and metadata for the existing user
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: "client",
        },
      })
    } else {
      // Create new user with admin API - email is automatically confirmed
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: "client",
        },
      })

      if (authError) {
        console.error("Error creating auth user:", authError)
        
        if (authError.message.includes("already registered")) {
          return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 400 })
        }
        if (authError.message.includes("password")) {
          return NextResponse.json({ error: "كلمة المرور ضعيفة جداً" }, { status: 400 })
        }
        
        return NextResponse.json({ error: `خطأ في إنشاء الحساب: ${authError.message}` }, { status: 400 })
      }

      if (!authData.user) {
        return NextResponse.json({ error: "فشل في إنشاء المستخدم - لم يتم إرجاع بيانات" }, { status: 500 })
      }
      
      authUserId = authData.user.id
    }

    // Create team member linked to auth user (without status if column doesn't exist)
    const insertData: Record<string, string> = {
      user_id: authUserId,
      email,
      full_name,
      role: "client",
      client_id,
    }

    // Try with status first, if fails try without
    let teamMember = null
    let memberError = null

    const { data: tm1, error: err1 } = await supabaseAdmin
      .from("team_members")
      .insert({ ...insertData, status: "active" })
      .select()
      .single()

    if (err1) {
      // If status column doesn't exist, try without it
      if (err1.message.includes("status")) {
        console.log("Status column not found, inserting without it")
        const { data: tm2, error: err2 } = await supabaseAdmin
          .from("team_members")
          .insert(insertData)
          .select()
          .single()
        
        teamMember = tm2
        memberError = err2
      } else {
        memberError = err1
      }
    } else {
      teamMember = tm1
    }

    if (memberError) {
      // Rollback: delete auth user if team member creation fails (only if we created a new user)
      if (!existingAuthUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }
      console.error("Error creating team member:", memberError)
      return NextResponse.json({ error: `خطأ في ربط المستخدم بالعميل: ${memberError.message}` }, { status: 500 })
    }

    return NextResponse.json({ 
      data: teamMember,
      message: "تم إنشاء المستخدم بنجاح"
    })
  } catch (error) {
    console.error("Error in create-client-user:", error)
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع - يرجى المحاولة مرة أخرى" },
      { status: 500 }
    )
  }
}
