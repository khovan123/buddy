export const RESOURCE_ALLOWED_FILE_EXTENSIONS = [".txt", ".docx", ".md", ".pdf"]

export const RESOURCE_FILE_ACCEPT = [
  ...RESOURCE_ALLOWED_FILE_EXTENSIONS,
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
].join(",")

export const RESOURCE_ALLOWED_FILE_TYPES_COPY = ".txt, .docx, .md, or .pdf"

export function isAllowedResourceFileName(fileName: string) {
  const normalized = fileName.trim().toLowerCase()
  return RESOURCE_ALLOWED_FILE_EXTENSIONS.some((extension) =>
    normalized.endsWith(extension)
  )
}
