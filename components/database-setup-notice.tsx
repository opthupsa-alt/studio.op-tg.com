"use client"

import { AlertTriangle, Database, ExternalLink, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function DatabaseSetupNotice() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Database className="size-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">إعداد قاعدة البيانات مطلوب</CardTitle>
          <CardDescription>
            يبدو أن جداول قاعدة البيانات غير موجودة. يرجى تنفيذ السكريبتات التالية في Supabase SQL Editor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertTitle>خطوات الإعداد</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>1. افتح <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></p>
              <p>2. نفذ الملفات التالية بالترتيب:</p>
              <ul className="list-disc list-inside mr-4 space-y-1">
                <li><code className="bg-muted px-1 rounded">scripts/001_create_schema.sql</code></li>
                <li><code className="bg-muted px-1 rounded">scripts/002_seed_data.sql</code></li>
              </ul>
              <p>3. أعد تحميل الصفحة بعد تنفيذ السكريبتات</p>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => copyToClipboard("scripts/001_create_schema.sql")}
            >
              {copied ? <Check className="size-4 ml-2" /> : <Copy className="size-4 ml-2" />}
              نسخ مسار السكريبت
            </Button>
            <Button
              className="flex-1"
              onClick={() => window.open("https://supabase.com/dashboard", "_blank")}
            >
              <ExternalLink className="size-4 ml-2" />
              فتح Supabase
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            إعادة تحميل الصفحة
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
