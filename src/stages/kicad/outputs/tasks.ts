import type { TaskDef } from "@/inkHelpers";

export const kicadOutputTasks: TaskDef[] = [
  {
    id: "gerbers",
    label: "Generating Gerbers...",
    state: "pending",
  },
  {
    id: "drill",
    label: "Generating drill files...",
    state: "pending",
  },
  {
    id: "svg",
    label: "Generating SVG files...",
    state: "pending",
  },
  {
    id: "png",
    label: "Generating PNG files...",
    state: "pending",
    children: [
      {
        id: "front",
        label: "Generating front PNG file...",
        state: "pending",
      },
      {
        id: "back",
        label: "Generating back PNG file...",
        state: "pending",
      },
    ],
  },
  {
    id: "board-image",
    label: "Generating board image...",
    state: "pending",
    children: [
      {
        id: "svg",
        label: "Generating board image SVG...",
        state: "pending",
      },
      {
        id: "png",
        label: "Generating board image PNG...",
        state: "pending",
      },
    ],
  },
  {
    id: "dxf",
    label: "Generating DXF files...",
    state: "pending",
    children: [
      {
        id: "paste-without-edge-cuts",
        label: "Generating paste DXF files without edge cuts...",
        state: "pending",
      },
      {
        id: "mask-with-edge-cuts",
        label: "Generating mask DXF files with edge cuts...",
        state: "pending",
      },
    ],
  },
  {
    id: "place",
    label: "Generating place files...",
    state: "pending",
    children: [
      {
        id: "front",
        label: "Generating front pos file...",
        state: "pending",
      },
      {
        id: "back",
        label: "Generating back pos file...",
        state: "pending",
      },
    ],
  },
];
