"use client"

import { useState } from "react"

import { AnimatePresence, motion } from "framer-motion"

import { ContactCards } from "@/features/intro/components/contact-cards"
import { ContactSalesForm } from "@/features/intro/components/contact-sales-form"
import { ContactSupportForm } from "@/features/intro/components/contact-support-form"

/* ------------------------------------------------------------------ */
/*  Contact content — orchestrator                                     */
/* ------------------------------------------------------------------ */

type ContactView = "main" | "sales" | "support"

export function ContactContent() {
  const [view, setView] = useState<ContactView>("main")

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <section className="py-20 md:py-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {view === "main" && <ContactCards onNavigate={setView} />}
            {view === "sales" && (
              <ContactSalesForm onBack={() => setView("main")} />
            )}
            {view === "support" && (
              <ContactSupportForm onBack={() => setView("main")} />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  )
}
