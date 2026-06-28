import { Option } from "effect";
import type { PngDimensions } from "./types";

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const hasPngSignature = (bytes: Uint8Array) =>
  bytes.length >= 24 &&
  pngSignature.every((byte, index) => bytes[index] === byte);

export const parsePngDimensions = (
  bytes: Uint8Array,
): Option.Option<PngDimensions> => {
  if (!hasPngSignature(bytes)) {
    return Option.none();
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Option.some({
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  });
};
