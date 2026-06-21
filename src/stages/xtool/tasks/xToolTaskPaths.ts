/** biome-ignore-all lint/correctness/noInvalidUseBeforeDeclaration: chill im not at work */
const lifecycle = ["xtool-studio-lifecycle"] as const;
const project = ["solder-mask-project"] as const;
const pasteStencils = ["solder-paste-stencils"] as const;

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

const frontStencil = [...pasteStencils, "front-stencil"] as const;
const backStencil = [...pasteStencils, "back-stencil"] as const;

const frontStencilCdp = [...frontStencil, "cdp-session"] as const;
const backStencilCdp = [...backStencil, "cdp-session"] as const;
const frontStencilDevice = [...frontStencil, "device-setup"] as const;
const backStencilDevice = [...backStencil, "device-setup"] as const;
const frontStencilImport = [...frontStencil, "import-dxf"] as const;
const backStencilImport = [...backStencil, "import-dxf"] as const;
const frontStencilSettings = [...frontStencil, "settings"] as const;
const backStencilSettings = [...backStencil, "settings"] as const;
const frontStencilSave = [...frontStencil, "save-project"] as const;
const backStencilSave = [...backStencil, "save-project"] as const;

export const xToolTaskPaths = {
	lifecycle: {
		root: lifecycle,
		checkExisting: [...lifecycle, "check-existing-process"] as const,
		confirmCloseExisting: [...lifecycle, "confirm-close-existing"] as const,
		waitExistingExit: [...lifecycle, "wait-existing-exit"] as const,
		launch: [...lifecycle, "launch-with-cdp-flags"] as const,
		waitShell: [...lifecycle, "wait-shell-target"] as const,
		discardRestoreModal: [...lifecycle, "discard-restore-modal"] as const,
		waitCreateProjectButton: [
			...lifecycle,
			"wait-create-project-button",
		] as const,
		close: [...lifecycle, "close-owned-process"] as const,
	},
	outputFolder: ["output-folder"] as const,
	project,
	pasteStencils: {
		root: pasteStencils,
		front: {
			root: frontStencil,
			cdp: {
				root: frontStencilCdp,
				listTargets: [...frontStencilCdp, "list-targets"] as const,
				connectShell: [...frontStencilCdp, "connect-shell"] as const,
				discardRestoreModal: [
					...frontStencilCdp,
					"discard-restore-modal",
				] as const,
				createEditorProject: [
					...frontStencilCdp,
					"create-editor-project",
				] as const,
				connectEditor: [...frontStencilCdp, "connect-editor"] as const,
				waitForEditorReady: [...frontStencilCdp, "wait-editor-ready"] as const,
			},
			device: {
				root: frontStencilDevice,
				switchDevice: [...frontStencilDevice, "switch-device"] as const,
				openDeviceLibrary: [
					...frontStencilDevice,
					"open-device-library",
				] as const,
				selectF1Ultra: [...frontStencilDevice, "select-f1-ultra"] as const,
				confirmSwitch: [...frontStencilDevice, "confirm-switch"] as const,
				setWindowSize: [...frontStencilDevice, "set-window-size"] as const,
			},
			importDxf: {
				root: frontStencilImport,
				validateDxf: [...frontStencilImport, "validate-dxf"] as const,
				clearBefore: [...frontStencilImport, "clear-selection-before"] as const,
				openImportMenu: [...frontStencilImport, "open-import-menu"] as const,
				chooseDxfFile: [...frontStencilImport, "choose-dxf-file"] as const,
				setX: [...frontStencilImport, "set-x"] as const,
				setY: [...frontStencilImport, "set-y"] as const,
				clearAfter: [...frontStencilImport, "clear-selection-after"] as const,
			},
			settings: {
				root: frontStencilSettings,
				openParameters: [...frontStencilSettings, "open-parameters"] as const,
				selectCut: [...frontStencilSettings, "select-cut"] as const,
				openLaserType: [...frontStencilSettings, "open-laser-type"] as const,
				selectFiberLaser: [
					...frontStencilSettings,
					"select-fiber-laser",
				] as const,
				setPower: [...frontStencilSettings, "set-power"] as const,
				setSpeed: [...frontStencilSettings, "set-speed"] as const,
				setPasses: [...frontStencilSettings, "set-passes"] as const,
			},
			save: {
				root: frontStencilSave,
				removeExisting: [...frontStencilSave, "remove-existing"] as const,
				openSaveAs: [...frontStencilSave, "open-save-as"] as const,
				clickSaveLocally: [...frontStencilSave, "click-save-locally"] as const,
				focusDialog: [...frontStencilSave, "focus-dialog"] as const,
				savePath: [...frontStencilSave, "save-path"] as const,
			},
		},
		back: {
			root: backStencil,
			cdp: {
				root: backStencilCdp,
				listTargets: [...backStencilCdp, "list-targets"] as const,
				connectShell: [...backStencilCdp, "connect-shell"] as const,
				discardRestoreModal: [
					...backStencilCdp,
					"discard-restore-modal",
				] as const,
				createEditorProject: [
					...backStencilCdp,
					"create-editor-project",
				] as const,
				connectEditor: [...backStencilCdp, "connect-editor"] as const,
				waitForEditorReady: [...backStencilCdp, "wait-editor-ready"] as const,
			},
			device: {
				root: backStencilDevice,
				switchDevice: [...backStencilDevice, "switch-device"] as const,
				openDeviceLibrary: [
					...backStencilDevice,
					"open-device-library",
				] as const,
				selectF1Ultra: [...backStencilDevice, "select-f1-ultra"] as const,
				confirmSwitch: [...backStencilDevice, "confirm-switch"] as const,
				setWindowSize: [...backStencilDevice, "set-window-size"] as const,
			},
			importDxf: {
				root: backStencilImport,
				validateDxf: [...backStencilImport, "validate-dxf"] as const,
				clearBefore: [...backStencilImport, "clear-selection-before"] as const,
				openImportMenu: [...backStencilImport, "open-import-menu"] as const,
				chooseDxfFile: [...backStencilImport, "choose-dxf-file"] as const,
				setX: [...backStencilImport, "set-x"] as const,
				setY: [...backStencilImport, "set-y"] as const,
				clearAfter: [...backStencilImport, "clear-selection-after"] as const,
			},
			settings: {
				root: backStencilSettings,
				openParameters: [...backStencilSettings, "open-parameters"] as const,
				selectCut: [...backStencilSettings, "select-cut"] as const,
				openLaserType: [...backStencilSettings, "open-laser-type"] as const,
				selectFiberLaser: [
					...backStencilSettings,
					"select-fiber-laser",
				] as const,
				setPower: [...backStencilSettings, "set-power"] as const,
				setSpeed: [...backStencilSettings, "set-speed"] as const,
				setPasses: [...backStencilSettings, "set-passes"] as const,
			},
			save: {
				root: backStencilSave,
				removeExisting: [...backStencilSave, "remove-existing"] as const,
				openSaveAs: [...backStencilSave, "open-save-as"] as const,
				clickSaveLocally: [...backStencilSave, "click-save-locally"] as const,
				focusDialog: [...backStencilSave, "focus-dialog"] as const,
				savePath: [...backStencilSave, "save-path"] as const,
			},
		},
	},
	cdp: {
		root: cdp,
		listTargets: [...cdp, "list-targets"] as const,
		connectShell: [...cdp, "connect-shell"] as const,
		discardRestoreModal: [...cdp, "discard-restore-modal"] as const,
		createEditorProject: [...cdp, "create-editor-project"] as const,
		connectEditor: [...cdp, "connect-editor"] as const,
		waitForEditorReady: [...cdp, "wait-editor-ready"] as const,
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
