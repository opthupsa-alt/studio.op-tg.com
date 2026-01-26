import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Target, AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-destructive/5">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Target className="size-8" />
          </div>
          <h1 className="text-2xl font-bold text-center">الهدف الأمثل للتسويق</h1>
          <p className="text-muted-foreground text-center mt-1">منصة تخطيط المحتوى</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-10 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl">حدث خطأ في المصادقة</CardTitle>
            <CardDescription className="text-base mt-2">
              عذراً، حدث خطأ أثناء محاولة المصادقة. يرجى المحاولة مرة أخرى.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">الأسباب المحتملة:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>انتهت صلاحية رابط التأكيد</li>
                <li>تم استخدام الرابط مسبقاً</li>
                <li>الرابط غير صالح</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/auth/login">
                  تسجيل الدخول
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/auth/sign-up">
                  إنشاء حساب جديد
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
