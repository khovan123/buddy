import { Button } from "@/components/ui/button"
import { OpenTicketDialog } from "@/features/library/components/open-ticket-dialog"

export function LibraryRequestCard() {
  return (
    <div className="min-h-96 rounded-xl bg-linear-to-br from-primary to-primary/70 p-6 text-primary-foreground md:col-span-2 2xl:col-span-1">
      <span className="text-2xs inline-flex rounded-full bg-white/20 px-3 py-1 font-bold tracking-widest uppercase">
        Exclusive
      </span>
      <h2 className="mt-4 text-2xl leading-tight font-black">
        Request a Specific Resource
      </h2>
      <p className="mt-3 text-sm text-primary-foreground/85">
        Can&apos;t find what you need? Our creators can build it for you.
      </p>

      <OpenTicketDialog
        trigger={
          <Button variant="secondary" className="mt-6 w-full">
            Open Ticket
          </Button>
        }
      />
    </div>
  )
}
