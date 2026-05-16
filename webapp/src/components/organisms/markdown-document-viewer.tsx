import Link from "next/link"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { DocumentReaderToolbar } from "@/components/organisms/document-reader-toolbar"

type MarkdownDocumentViewerProps = {
  content: string
  fontScale: number
  sourceLabel: string
  pageCountHint: string
  onDecreaseFont: () => void
  onIncreaseFont: () => void
}

export function MarkdownDocumentViewer({
  content,
  fontScale,
  sourceLabel,
  pageCountHint,
  onDecreaseFont,
  onIncreaseFont,
}: MarkdownDocumentViewerProps) {
  return (
    <div className="space-y-3">
      <DocumentReaderToolbar
        sourceLabel={sourceLabel}
        pageCountHint={pageCountHint}
        fontScale={fontScale}
        canScaleContent={true}
        onDecreaseFont={onDecreaseFont}
        onIncreaseFont={onIncreaseFont}
      />

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        style={{ fontSize: `${fontScale}rem` }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ children, href }) => (
              <Link
                href={href ?? "#"}
                className="text-primary underline underline-offset-4"
              >
                {children}
              </Link>
            ),
            code: ({ children }) => (
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                {children}
              </code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  )
}
