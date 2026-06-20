export const applescriptSave = (app: string, dir: string) => `
tell application "System Events"
  repeat 50 times
    try
      tell process "${app}"
        if exists sheet 1 of front window then exit repeat
        if exists window "Save" then exit repeat
      end tell
    end try
    delay 0.1
  end repeat
  keystroke "g" using {command down, shift down}
  delay 0.2
  keystroke "${dir}"
  delay 1
  key code 36
  delay 0.5
  delay 0.2
  key code 36
  delay 3
  try
    tell process "${app}"
      if exists button "Replace" of sheet 1 of front window then
        click button "Replace" of sheet 1 of front window
      end if
    end tell
  end try
end tell
`;
