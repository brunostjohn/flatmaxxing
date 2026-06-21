import type { TaskDef } from "@/inkHelpers";

export const solderPasteStencilTasks = [
	{
		id: "solder-paste-stencils",
		label: "Create solder paste stencil projects",
		state: "pending",
		children: [
			{
				id: "front-stencil",
				label: "Create front solder paste stencil",
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
							{
								id: "wait-editor-ready",
								label: "Wait for editor UI",
								state: "pending",
							},
						],
					},
					{
						id: "device-setup",
						label: "Select F1 Ultra",
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
								id: "select-f1-ultra",
								label: "Select F1 Ultra",
								state: "pending",
							},
							{
								id: "confirm-switch",
								label: "Confirm device switch",
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
						id: "import-dxf",
						label: "Import front paste DXF",
						state: "pending",
						children: [
							{
								id: "copy-dxf",
								label: "Copy front DXF file",
								state: "pending",
							},
							{
								id: "clear-selection-before",
								label: "Clear selection before paste",
								state: "pending",
							},
							{ id: "paste-dxf", label: "Paste front DXF", state: "pending" },
							{ id: "set-x", label: "Set X position to 0", state: "pending" },
							{ id: "set-y", label: "Set Y position to 0", state: "pending" },
							{
								id: "clear-selection-after",
								label: "Clear selection after positioning",
								state: "pending",
							},
						],
					},
					{
						id: "settings",
						label: "Open paste settings",
						state: "pending",
						children: [
							{
								id: "open-parameters",
								label: "Open parameter panel",
								state: "pending",
							},
							{
								id: "select-cut",
								label: "Select Cut operation",
								state: "pending",
							},
							{
								id: "open-laser-type",
								label: "Open laser type selector",
								state: "pending",
							},
							{
								id: "select-fiber-laser",
								label: "Select Fiber IR laser",
								state: "pending",
							},
							{
								id: "set-power",
								label: "Set power to 100%",
								state: "pending",
							},
							{
								id: "set-speed",
								label: "Set speed to 6000",
								state: "pending",
							},
							{
								id: "set-passes",
								label: "Set passes to 3",
								state: "pending",
							},
						],
					},
					{
						id: "save-project",
						label: "Save front stencil project",
						state: "pending",
						children: [
							{
								id: "remove-existing",
								label: "Remove existing .xs file",
								state: "pending",
							},
							{
								id: "open-save-as",
								label: "Open Save As menu",
								state: "pending",
							},
							{
								id: "click-save-locally",
								label: "Click Save locally",
								state: "pending",
							},
							{
								id: "focus-dialog",
								label: "Focus save dialog",
								state: "pending",
							},
							{
								id: "save-path",
								label: "Save to target path",
								state: "pending",
							},
						],
					},
				],
			},
			{
				id: "back-stencil",
				label: "Create back solder paste stencil",
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
							{
								id: "wait-editor-ready",
								label: "Wait for editor UI",
								state: "pending",
							},
						],
					},
					{
						id: "device-setup",
						label: "Select F1 Ultra",
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
								id: "select-f1-ultra",
								label: "Select F1 Ultra",
								state: "pending",
							},
							{
								id: "confirm-switch",
								label: "Confirm device switch",
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
						id: "import-dxf",
						label: "Import back paste DXF",
						state: "pending",
						children: [
							{ id: "copy-dxf", label: "Copy back DXF file", state: "pending" },
							{
								id: "clear-selection-before",
								label: "Clear selection before paste",
								state: "pending",
							},
							{ id: "paste-dxf", label: "Paste back DXF", state: "pending" },
							{ id: "set-x", label: "Set X position to 0", state: "pending" },
							{ id: "set-y", label: "Set Y position to 0", state: "pending" },
							{
								id: "clear-selection-after",
								label: "Clear selection after positioning",
								state: "pending",
							},
						],
					},
					{
						id: "settings",
						label: "Open paste settings",
						state: "pending",
						children: [
							{
								id: "open-parameters",
								label: "Open parameter panel",
								state: "pending",
							},
							{
								id: "select-cut",
								label: "Select Cut operation",
								state: "pending",
							},
							{
								id: "open-laser-type",
								label: "Open laser type selector",
								state: "pending",
							},
							{
								id: "select-fiber-laser",
								label: "Select Fiber IR laser",
								state: "pending",
							},
							{
								id: "set-power",
								label: "Set power to 100%",
								state: "pending",
							},
							{
								id: "set-speed",
								label: "Set speed to 6000",
								state: "pending",
							},
							{
								id: "set-passes",
								label: "Set passes to 3",
								state: "pending",
							},
						],
					},
					{
						id: "save-project",
						label: "Save back stencil project",
						state: "pending",
						children: [
							{
								id: "remove-existing",
								label: "Remove existing .xs file",
								state: "pending",
							},
							{
								id: "open-save-as",
								label: "Open Save As menu",
								state: "pending",
							},
							{
								id: "click-save-locally",
								label: "Click Save locally",
								state: "pending",
							},
							{
								id: "focus-dialog",
								label: "Focus save dialog",
								state: "pending",
							},
							{
								id: "save-path",
								label: "Save to target path",
								state: "pending",
							},
						],
					},
				],
			},
		],
	},
] satisfies TaskDef[];
