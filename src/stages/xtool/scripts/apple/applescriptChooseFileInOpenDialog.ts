export const applescriptChooseFileInOpenDialog = (
	app: string,
	file: string,
) => `
tell application "${app}" to activate
tell application "System Events"
  tell process "${app}"
    set frontmost to true

    set dialogFound to false
    repeat 80 times
      try
        if exists sheet 1 of front window then
          set dialogFound to true
          exit repeat
        end if
        if exists window "Open" then
          set dialogFound to true
          exit repeat
        end if
        repeat with w in windows
          try
            if role description of w contains "dialog" then
              set dialogFound to true
              exit repeat
            end if
          end try
        end repeat
      end try

      if dialogFound then exit repeat
      delay 0.1
    end repeat

    if dialogFound is false then error "Timed out waiting for open file dialog"

    keystroke "g" using {command down, shift down}
    delay 0.2
    keystroke "${file}"
    delay 0.5
    key code 36
    delay 0.5
    key code 36
  end tell
end tell
`;
