"use client"

import { useState } from "react"
import { Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicGridView } from "@/components/public-grid-view"
import type { Post } from "@/lib/types"

interface SharePasswordFormProps {
  correctPassword: string
  posts: Post[]
  clientColor?: string | null
}

export function SharePasswordForm({ correctPassword, posts, clientColor }: SharePasswordFormProps) {
  const [password, setPassword] = useState("")
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === correctPassword) {
      setIsUnlocked(true)
      setError("")
    } else {
      setError("كلمة المرور غير صحيحة")
    }
  }

  if (isUnlocked) {
    return posts.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg">لا توجد منشورات لهذا الشهر</p>
      </div>
    ) : (
      <PublicGridView posts={posts} clientColor={clientColor} />
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Lock className="size-8 text-amber-600" />
          </div>
          <CardTitle>صفحة محمية</CardTitle>
          <CardDescription>
            هذه الصفحة محمية بكلمة مرور. أدخل كلمة المرور للمتابعة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError("")
                  }}
                  className="pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              فتح الصفحة
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
