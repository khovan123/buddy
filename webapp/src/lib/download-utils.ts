export function triggerFileDownload(url: string, filename?: string) {
  const anchor = document.createElement("a")
  anchor.href = url
  if (filename) {
    anchor.download = filename
  }
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export function getFileNameFromPath(sourcePath: string) {
  const [cleanPath] = sourcePath.split("?")
  const parts = cleanPath.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? "resource"
}

export async function downloadFilesSequentially(
  sourcePaths: string[],
  delayMs = 150
) {
  for (const sourcePath of sourcePaths) {
    triggerFileDownload(sourcePath, getFileNameFromPath(sourcePath))
    await new Promise((resolve) => {
      globalThis.window.setTimeout(resolve, delayMs)
    })
  }
}
