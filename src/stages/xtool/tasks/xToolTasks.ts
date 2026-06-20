import type { TaskDef } from "@/inkHelpers";

export const xToolTasks = [
	{
		id: "output-folder",
		label: "Prepare xTool output folder",
		state: "pending",
	},
	{
		id: "solder-mask-project",
		label: "Create solder mask project",
		state: "pending",
		children: [
			{
				id: "cdp-session",
				label: "Connect to xTool Studio",
				state: "pending",
				children: [
					{
						id: "list-targets",
						label: "List CDP targets",
						state: "pending",
					},
					{
						id: "connect-shell",
						label: "Connect to xTool shell window",
						state: "pending",
					},
					{
						id: "create-editor-project",
						label: "Create editor project",
						state: "pending",
					},
					{
						id: "connect-editor",
						label: "Connect to new editor window",
						state: "pending",
					},
				],
			},
			{
				id: "device-setup",
				label: "Configure device and mode",
				state: "pending",
				children: [
					{
						id: "switch-device",
						label: "Open device switcher",
						state: "pending",
					},
					{
						id: "open-device-library",
						label: "Open device library",
						state: "pending",
					},
					{
						id: "select-m1-ultra",
						label: "Select M1 Ultra",
						state: "pending",
					},
					{
						id: "confirm-switch",
						label: "Confirm device switch",
						state: "pending",
					},
					{
						id: "select-flat-mode",
						label: "Select flat surface mode",
						state: "pending",
					},
					{
						id: "select-inkjet-printing",
						label: "Select inkjet printing",
						state: "pending",
					},
					{
						id: "set-window-size",
						label: "Set xTool Studio window size",
						state: "pending",
					},
				],
			},
			{
				id: "front-mask",
				label: "Import front solder mask",
				state: "pending",
				children: [
					{
						id: "read-dxf",
						label: "Read front DXF",
						state: "pending",
					},
					{
						id: "parse-dxf",
						label: "Parse front DXF",
						state: "pending",
					},
					{
						id: "measure-bounds",
						label: "Measure front bounds",
						state: "pending",
					},
					{
						id: "copy-png",
						label: "Copy front PNG to clipboard",
						state: "pending",
					},
					{
						id: "paste-first",
						label: "Paste first front copy",
						state: "pending",
						children: [
							{
								id: "clear-selection-before",
								label: "Clear selection before paste",
								state: "pending",
							},
							{ id: "paste", label: "Paste PNG", state: "pending" },
							{
								id: "scale-to-fit",
								label: "Click scale to fit",
								state: "pending",
							},
							{ id: "set-width", label: "Set mask width", state: "pending" },
							{ id: "set-x", label: "Set X position", state: "pending" },
							{ id: "set-y", label: "Set Y position", state: "pending" },
							{
								id: "clear-selection-after",
								label: "Clear selection after positioning",
								state: "pending",
							},
						],
					},
					{
						id: "paste-second",
						label: "Paste second front copy",
						state: "pending",
						children: [
							{
								id: "clear-selection-before",
								label: "Clear selection before paste",
								state: "pending",
							},
							{ id: "paste", label: "Paste PNG", state: "pending" },
							{
								id: "scale-to-fit",
								label: "Click scale to fit",
								state: "pending",
							},
							{ id: "set-width", label: "Set mask width", state: "pending" },
							{ id: "set-x", label: "Set X position", state: "pending" },
							{ id: "set-y", label: "Set Y position", state: "pending" },
							{
								id: "clear-selection-after",
								label: "Clear selection after positioning",
								state: "pending",
							},
						],
					},
				],
			},
			{
				id: "back-mask",
				label: "Import back solder mask",
				state: "pending",
				children: [
					{ id: "read-dxf", label: "Read back DXF", state: "pending" },
					{ id: "parse-dxf", label: "Parse back DXF", state: "pending" },
					{
						id: "measure-bounds",
						label: "Measure back bounds",
						state: "pending",
					},
					{
						id: "copy-png",
						label: "Copy back PNG to clipboard",
						state: "pending",
					},
					{
						id: "paste-first",
						label: "Paste first back copy",
						state: "pending",
						children: [
							{
								id: "clear-selection-before",
								label: "Clear selection before paste",
								state: "pending",
							},
							{ id: "paste", label: "Paste PNG", state: "pending" },
							{
								id: "scale-to-fit",
								label: "Click scale to fit",
								state: "pending",
							},
							{ id: "set-width", label: "Set mask width", state: "pending" },
							{ id: "set-x", label: "Set X position", state: "pending" },
							{ id: "set-y", label: "Set Y position", state: "pending" },
							{
								id: "clear-selection-after",
								label: "Clear selection after positioning",
								state: "pending",
							},
						],
					},
					{
						id: "paste-second",
						label: "Paste second back copy",
						state: "pending",
						children: [
							{
								id: "clear-selection-before",
								label: "Clear selection before paste",
								state: "pending",
							},
							{ id: "paste", label: "Paste PNG", state: "pending" },
							{
								id: "scale-to-fit",
								label: "Click scale to fit",
								state: "pending",
							},
							{ id: "set-width", label: "Set mask width", state: "pending" },
							{ id: "set-x", label: "Set X position", state: "pending" },
							{ id: "set-y", label: "Set Y position", state: "pending" },
							{
								id: "clear-selection-after",
								label: "Clear selection after positioning",
								state: "pending",
							},
						],
					},
				],
			},
			{
				id: "settings",
				label: "Configure inkjet settings",
				state: "pending",
				children: [
					{
						id: "open-parameters",
						label: "Open parameter panel",
						state: "pending",
					},
					{
						id: "set-intensity",
						label: "Set intensity to 100",
						state: "pending",
					},
					{ id: "set-passes", label: "Set passes to 3", state: "pending" },
					{
						id: "clear-selection",
						label: "Clear final selection",
						state: "pending",
					},
				],
			},
			{
				id: "save-project",
				label: "Save xTool project",
				state: "pending",
				children: [
					{
						id: "remove-existing",
						label: "Remove existing .xs file",
						state: "pending",
					},
					{ id: "open-save-as", label: "Open Save As menu", state: "pending" },
					{
						id: "click-save-locally",
						label: "Click Save locally",
						state: "pending",
					},
					{ id: "focus-dialog", label: "Focus save dialog", state: "pending" },
					{ id: "save-path", label: "Save to target path", state: "pending" },
				],
			},
		],
	},
] satisfies TaskDef[];
