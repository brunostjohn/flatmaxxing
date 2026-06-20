const project = ["solder-mask-project"] as const;

const cdp = [...project, "cdp-session"] as const;
const device = [...project, "device-setup"] as const;
const frontMask = [...project, "front-mask"] as const;
const backMask = [...project, "back-mask"] as const;
const settings = [...project, "settings"] as const;
const save = [...project, "save-project"] as const;

const frontPasteFirst = [...frontMask, "paste-first"] as const;
const frontPasteSecond = [...frontMask, "paste-second"] as const;
const backPasteFirst = [...backMask, "paste-first"] as const;
const backPasteSecond = [...backMask, "paste-second"] as const;

export const xToolTaskPaths = {
	outputFolder: ["output-folder"] as const,
	project,
	cdp: {
		root: cdp,
		listTargets: [...cdp, "list-targets"] as const,
		connectShell: [...cdp, "connect-shell"] as const,
		createEditorProject: [...cdp, "create-editor-project"] as const,
		connectEditor: [...cdp, "connect-editor"] as const,
	},
	device: {
		root: device,
		switchDevice: [...device, "switch-device"] as const,
		openDeviceLibrary: [...device, "open-device-library"] as const,
		selectM1Ultra: [...device, "select-m1-ultra"] as const,
		confirmSwitch: [...device, "confirm-switch"] as const,
		selectFlatMode: [...device, "select-flat-mode"] as const,
		selectInkjetPrinting: [...device, "select-inkjet-printing"] as const,
		setWindowSize: [...device, "set-window-size"] as const,
	},
	frontMask: {
		root: frontMask,
		readDxf: [...frontMask, "read-dxf"] as const,
		parseDxf: [...frontMask, "parse-dxf"] as const,
		measureBounds: [...frontMask, "measure-bounds"] as const,
		copyPng: [...frontMask, "copy-png"] as const,
		pasteFirst: {
			root: frontPasteFirst,
			clearBefore: [...frontPasteFirst, "clear-selection-before"] as const,
			paste: [...frontPasteFirst, "paste"] as const,
			scaleToFit: [...frontPasteFirst, "scale-to-fit"] as const,
			setWidth: [...frontPasteFirst, "set-width"] as const,
			setX: [...frontPasteFirst, "set-x"] as const,
			setY: [...frontPasteFirst, "set-y"] as const,
			clearAfter: [...frontPasteFirst, "clear-selection-after"] as const,
		},
		pasteSecond: {
			root: frontPasteSecond,
			clearBefore: [...frontPasteSecond, "clear-selection-before"] as const,
			paste: [...frontPasteSecond, "paste"] as const,
			scaleToFit: [...frontPasteSecond, "scale-to-fit"] as const,
			setWidth: [...frontPasteSecond, "set-width"] as const,
			setX: [...frontPasteSecond, "set-x"] as const,
			setY: [...frontPasteSecond, "set-y"] as const,
			clearAfter: [...frontPasteSecond, "clear-selection-after"] as const,
		},
	},
	backMask: {
		root: backMask,
		readDxf: [...backMask, "read-dxf"] as const,
		parseDxf: [...backMask, "parse-dxf"] as const,
		measureBounds: [...backMask, "measure-bounds"] as const,
		copyPng: [...backMask, "copy-png"] as const,
		pasteFirst: {
			root: backPasteFirst,
			clearBefore: [...backPasteFirst, "clear-selection-before"] as const,
			paste: [...backPasteFirst, "paste"] as const,
			scaleToFit: [...backPasteFirst, "scale-to-fit"] as const,
			setWidth: [...backPasteFirst, "set-width"] as const,
			setX: [...backPasteFirst, "set-x"] as const,
			setY: [...backPasteFirst, "set-y"] as const,
			clearAfter: [...backPasteFirst, "clear-selection-after"] as const,
		},
		pasteSecond: {
			root: backPasteSecond,
			clearBefore: [...backPasteSecond, "clear-selection-before"] as const,
			paste: [...backPasteSecond, "paste"] as const,
			scaleToFit: [...backPasteSecond, "scale-to-fit"] as const,
			setWidth: [...backPasteSecond, "set-width"] as const,
			setX: [...backPasteSecond, "set-x"] as const,
			setY: [...backPasteSecond, "set-y"] as const,
			clearAfter: [...backPasteSecond, "clear-selection-after"] as const,
		},
	},
	settings: {
		root: settings,
		openParameters: [...settings, "open-parameters"] as const,
		setIntensity: [...settings, "set-intensity"] as const,
		setPasses: [...settings, "set-passes"] as const,
		clearSelection: [...settings, "clear-selection"] as const,
	},
	save: {
		root: save,
		removeExisting: [...save, "remove-existing"] as const,
		openSaveAs: [...save, "open-save-as"] as const,
		clickSaveLocally: [...save, "click-save-locally"] as const,
		focusDialog: [...save, "focus-dialog"] as const,
		savePath: [...save, "save-path"] as const,
	},
} as const;
