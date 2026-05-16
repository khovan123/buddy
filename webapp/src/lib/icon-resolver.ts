import {
  BookOpen,
  FolderOpen,
  GraduationCap,
  Globe,
  Heart,
  LayoutGrid,
  Lightbulb,
  MapPin,
  Palette,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { IconKey } from "@/features/intro/services/intro.service"

/* ------------------------------------------------------------------ */
/*  Icon key → component mapping                                       */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<IconKey, LucideIcon> = {
  BookOpen,
  FolderOpen,
  GraduationCap,
  Globe,
  Heart,
  LayoutGrid,
  Lightbulb,
  MapPin,
  Palette,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
}

export function resolveIcon(key: IconKey): LucideIcon {
  return ICON_MAP[key]
}
