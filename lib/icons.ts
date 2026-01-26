import { ImageIcon, Video, FileText, Music, Link, type LucideIcon } from "lucide-react"
import React from "react"

export type ContentType = "image" | "video" | "text" | "audio" | "link"

export const contentTypeIcons: Record<ContentType, LucideIcon> = {
  image: ImageIcon,
  video: Video,
  text: FileText,
  audio: Music,
  link: Link,
}

export function ContentIcon({ type, className }: { type: ContentType; className?: string }) {
  const Icon = contentTypeIcons[type] || FileText
  return React.createElement(Icon, { className })
}
