export const applescriptSetWindowSize = (
	app: string,
	width: number,
	height: number,
) => `
tell application "${app}" to activate
tell application "System Events"
  tell process "${app}"
    set position of front window to {0, 0}
    set size of front window to {${width}, ${height}}
  end tell
end tell
`;
