import Link from "next/link"

import { Globe, Share2 } from "lucide-react"

import { getServerTranslator } from "@/i18n/server"

import { Button } from "../ui/button"
import { Separator } from "../ui/separator"

export async function SiteFooter() {
  const { t } = await getServerTranslator()

  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:flex lg:justify-between">
        <div className="sm:col-span-2 lg:max-w-xs">
          <p className="mb-4 text-lg font-semibold text-foreground">Buddy</p>
          <p className="text-sm text-muted-foreground">
            {t("intro.footer.tagline")}
          </p>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-foreground">{t("intro.footer.company")}</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link href="/about" className="block hover:text-foreground">
              {t("intro.footer.aboutUs")}
            </Link>
            <Link href="/pricing" className="block hover:text-foreground">
              {t("intro.nav.pricing")}
            </Link>
            <Link href="/how-it-works" className="block hover:text-foreground">
              {t("intro.footer.howItWorks")}
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-foreground">{t("intro.footer.resources")}</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link href="/faq" className="block hover:text-foreground">
              {t("intro.footer.helpCenter")}
            </Link>
            <Link href="/contact" className="block hover:text-foreground">
              {t("intro.nav.contact")}
            </Link>
            <Link href="/explore" className="block hover:text-foreground">
              {t("intro.nav.explore")}
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-foreground">{t("intro.footer.support")}</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link href="/sitemap.xml" className="block hover:text-foreground">
              {t("intro.footer.sitemap")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-6">
        <Separator />
        <div className="flex w-full flex-col items-center justify-between gap-3 py-5 text-sm text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} {t("intro.footer.rights")}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label={t("common.language")}>
              <Globe className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={t("common.share")}>
              <Share2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
