export const TUTORIAL_ALLOWED_FILE_EXTENSION = ".mp4"
export const TUTORIAL_ALLOWED_MIME_TYPE = "video/mp4"
export const TUTORIAL_FILE_ACCEPT = `${TUTORIAL_ALLOWED_FILE_EXTENSION},${TUTORIAL_ALLOWED_MIME_TYPE}`
export const TUTORIAL_ALLOWED_FILE_TYPE_COPY = ".mp4"

export function isAllowedTutorialFileName(fileName: string) {
  return fileName.trim().toLowerCase().endsWith(TUTORIAL_ALLOWED_FILE_EXTENSION)
}
