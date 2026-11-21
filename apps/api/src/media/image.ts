const MAX_SIDE = 1280;

export function decodeImage(input: string): Buffer {
  const trimmed = input.trim().replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  return Buffer.from(trimmed, "base64");
}

export function readImageInfo(buf: Buffer): { type: "jpeg" | "png"; width: number; height: number } | null {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width === 0 || height === 0) return null;
    return { type: "png", width, height };
  }
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1] ?? 0;
    if (marker === 0xd8) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9) return null;
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (offset + 9 >= buf.length) return null;
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      if (width === 0 || height === 0) return null;
      return { type: "jpeg", width, height };
    }
    if (offset + 4 > buf.length) return null;
    const size = buf.readUInt16BE(offset + 2);
    if (size < 2) return null;
    offset += 2 + size;
  }
  return null;
}

export function imageProblem(buf: Buffer, maxBytes: number): string | null {
  if (buf.length > maxBytes) return "La imagen supera el tamaño permitido.";
  const info = readImageInfo(buf);
  if (!info) return "La imagen debe ser JPEG o PNG.";
  if (Math.max(info.width, info.height) > MAX_SIDE) {
    return "El lado mayor de la imagen debe ser de 1280 px o menos.";
  }
  return null;
}
