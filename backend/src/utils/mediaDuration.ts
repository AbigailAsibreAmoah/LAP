import { openSync, readSync, closeSync, fstatSync } from 'node:fs';

/**
 * Reads the duration of an MP4/MOV/M4A file from its `mvhd` box without decoding it,
 * so the server can enforce video length rules itself instead of trusting the browser.
 * Returns null for other containers (e.g. WebM, MP3), where the browser-measured value is used.
 */
export function mp4DurationSeconds(path: string): number | null {
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size;
    const head = Buffer.alloc(8);
    // Walk top-level boxes to find `moov` (it may sit at the end of the file).
    let offset = 0;
    while (offset + 8 <= size) {
      readSync(fd, head, 0, 8, offset);
      let boxSize = head.readUInt32BE(0);
      const type = head.toString('latin1', 4, 8);
      let headerLen = 8;
      if (boxSize === 1) {
        const big = Buffer.alloc(8);
        readSync(fd, big, 0, 8, offset + 8);
        boxSize = Number(big.readBigUInt64BE(0));
        headerLen = 16;
      } else if (boxSize === 0) boxSize = size - offset;
      if (boxSize < headerLen) return null;
      if (type === 'moov') {
        const len = Math.min(boxSize - headerLen, 64 * 1024 * 1024);
        const moov = Buffer.alloc(len);
        readSync(fd, moov, 0, len, offset + headerLen);
        const i = moov.indexOf('mvhd', 0, 'latin1');
        if (i < 4) return null;
        const version = moov[i + 4];
        const timescale = version === 1 ? moov.readUInt32BE(i + 4 + 20) : moov.readUInt32BE(i + 4 + 12);
        const duration = version === 1 ? Number(moov.readBigUInt64BE(i + 4 + 24)) : moov.readUInt32BE(i + 4 + 16);
        return timescale ? duration / timescale : null;
      }
      offset += boxSize;
    }
    return null;
  } finally {
    closeSync(fd);
  }
}
