import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Target, Mail, CheckCircle2 } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
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
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                  <Mail className="size-10 text-success" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-success-foreground" />
                </div>
              </div>
            </div>
            <CardTitle className="text-xl">تم إنشاء الحساب بنجاح!</CardTitle>
            <CardDescription className="text-base mt-2">
              تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد وتأكيد حسابك.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">ملاحظة:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>تحقق من مجلد الرسائل غير المرغوب فيها إذا لم تجد الرسالة</li>
                <li>رابط التأكيد صالح لمدة 24 ساعة</li>
              </ul>
            </div>
            <Button asChild className="w-full">
              <Link href="/auth/login">
                العودة إلى صفحة تسجيل الدخول
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
