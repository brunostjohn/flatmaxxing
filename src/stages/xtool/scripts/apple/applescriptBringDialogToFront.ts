export const applescriptBringDialogToFront = (app: string) => `
tell application "${app}" to activate
tell application "System Events"
  tell process "${app}"
    set frontmost to true
    repeat with w in windows
      try
        set value of attribute "AXMinimized" of w to false
      end try
    end repeat
    repeat 80 times
      try
        if exists sheet 1 of front window then
          perform action "AXRaise" of front window
          return "sheet"
        end if
        if exists window "Save" then
          perform action "AXRaise" of window "Save"
          return "window"
        end if
        -- sometimes save dialog title is filename-ish, not literally "Save"
        repeat with w in windows
          try
            if role description of w contains "dialog" then
              perform action "AXRaise" of w
              return "dialog"
            end if
          end try
        end repeat
      end try
      delay 0.1
    end repeat
    error "Timed out waiting for save dialog"
  end tell
end tell
`;
