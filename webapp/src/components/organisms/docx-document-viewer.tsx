import { DocumentReaderToolbar } from "@/components/organisms/document-reader-toolbar"

type DocxDocumentViewerProps = {
  htmlContent: string
  fontScale: number
  sourceLabel: string
  pageCountHint: string
  onDecreaseFont: () => void
  onIncreaseFont: () => void
}

export function DocxDocumentViewer({
  htmlContent,
  fontScale,
  sourceLabel,
  pageCountHint,
  onDecreaseFont,
  onIncreaseFont,
}: DocxDocumentViewerProps) {
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
        // react-doctor-ignore
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  )
}
