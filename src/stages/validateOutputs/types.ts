export interface SolderMaskAssetValidation {
  readonly dxfPath: string;
  readonly pngPath: string;
  readonly bounds: { readonly width: number; readonly height: number };
}

export interface StencilAssetValidation {
  readonly dxfPath: string;
  readonly hasPlottableGeometry: boolean;
}

export interface PlannedAlignmentDrillOptions {
  readonly enabled: boolean;
  readonly gerbersDir: string;
  readonly distance: { readonly x: number; readonly y: number };
  readonly diameter: number;
}
