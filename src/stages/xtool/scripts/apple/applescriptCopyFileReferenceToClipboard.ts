export const applescriptCopyFileReferenceToClipboard = (file: string) => `
set theFile to POSIX file "${file}" as alias
tell application "Finder"
  activate
  reveal theFile
end tell
tell application "System Events"
  keystroke "c" using command down
end tell
`;
