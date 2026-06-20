export const applescriptOpenXtoolAndPaste = `
tell application "xTool Studio" to activate
tell application "System Events"
  tell process "xTool Studio"
    set frontmost to true
  end tell
  delay 0.3
  keystroke "v" using {command down}
end tell
`;
