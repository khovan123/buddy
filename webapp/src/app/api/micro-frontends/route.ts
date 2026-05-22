import { NextResponse } from "next/server"

import {
  microFrontendRuntime,
  microFrontends,
  type MicroFrontendDefinition,
} from "@/config/micro-frontends"

export const dynamic = "force-static"

export function GET() {
  return NextResponse.json({
    runtime: microFrontendRuntime,
    microFrontends: microFrontends.map((definition) => {
      const { entry: _entry, ...microFrontend } = definition as MicroFrontendDefinition

      return microFrontend
    }),
  })
}
