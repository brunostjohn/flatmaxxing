export const applescriptEsc = `
tell application "xTool Studio" to activate
delay 0.2

tell application "System Events"
  tell process "xTool Studio"
    set frontmost to true
  end tell

  delay 0.2
  key code 53
  delay 0.15
  key code 53
end tell
`;
