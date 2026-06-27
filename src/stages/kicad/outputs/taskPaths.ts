const png = ["png"] as const;
const boardImage = ["board-image"] as const;
const dxf = ["dxf"] as const;
const place = ["place"] as const;

export const kicadOutputTaskPaths = {
  gerbers: ["gerbers"] as const,
  drill: ["drill"] as const,
  svg: ["svg"] as const,
  png: {
    root: png,
    front: [...png, "front"] as const,
    back: [...png, "back"] as const,
  },
  boardImage: {
    root: boardImage,
    svg: [...boardImage, "svg"] as const,
    png: [...boardImage, "png"] as const,
  },
  dxf: {
    root: dxf,
    paste: [...dxf, "paste-without-edge-cuts"] as const,
    mask: [...dxf, "mask-with-edge-cuts"] as const,
  },
  place: {
    root: place,
    front: [...place, "front"] as const,
    back: [...place, "back"] as const,
  },
} as const;
