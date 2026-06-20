export const applescriptCopyFileToClipboard = (file: string) => `
set the clipboard to (read (POSIX file "${file}") as «class PNGf»)
`;
