/**
 * A small QR Code encoder (ISO/IEC 18004, model 2): byte mode, error correction level L or M,
 * versions 1–10. Pure and dependency-free: text in, a square matrix of booleans (true = dark) out.
 * Based on the reference algorithm described by Project Nayuki (https://www.nayuki.io/page/qr-code-generator-library).
 */

const MAX_VERSION_SUPPORTED = 10;

// Per error correction level, indexed by version (index 0 unused).
const ECC_PER_BLOCK = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
};
const BLOCKS = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
};
const FORMAT_BITS = { L: 1, M: 0 };

/** Modules available for data and error correction in a version. */
function rawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

const dataCodewords = (version, ecl) => Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[ecl][version] * BLOCKS[ecl][version];

// ---------- Reed–Solomon over GF(2^8) ----------
function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => { result[i] ^= gfMultiply(coef, factor); });
  }
  return result;
}

// ---------- data codewords ----------
function encodeData(bytes, version, ecl) {
  const capacity = dataCodewords(version, ecl) * 8;
  const bits = [];
  const push = (value, length) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  push(0b0100, 4); // byte mode
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, capacity - bits.length)); // terminator
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));
  return codewords;
}

function addEccAndInterleave(data, version, ecl) {
  const blocks = BLOCKS[ecl][version];
  const eccLen = ECC_PER_BLOCK[ecl][version];
  const raw = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blocks - (raw % blocks);
  const shortLen = Math.floor(raw / blocks);
  const divisor = rsDivisor(eccLen);
  const all = [];
  for (let i = 0, k = 0; i < blocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, divisor);
    if (i < shortBlocks) dat.push(0);
    all.push([...dat, ...ecc]);
  }
  const result = [];
  for (let i = 0; i < all[0].length; i++) {
    all.forEach((block, j) => {
      if (i !== shortLen - eccLen || j >= shortBlocks) result.push(block[i]);
    });
  }
  return result;
}

// ---------- the matrix ----------
function alignmentPositions(version, size) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos);
  return result;
}

function buildMatrix(codewords, version, ecl, mask) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => { modules[y][x] = dark; fixed[y][x] = true; };

  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); } // timing
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) { // finders and separators
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    }
  }
  const align = alignmentPositions(version, size);
  const last = align.length - 1;
  align.forEach((ax, i) => align.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));

  // Format information (error correction level and mask), protected by a BCH code.
  const data = (FORMAT_BITS[ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const format = ((data << 10) | rem) ^ 0x5412;
  const bit = (value, i) => ((value >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) set(8, i, bit(format, i));
  set(8, 7, bit(format, 6));
  set(8, 8, bit(format, 7));
  set(7, 8, bit(format, 8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(format, i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(format, i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(format, i));
  set(8, size - 8, true); // the dark module

  if (version >= 7) {
    let r = version;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const info = (version << 12) | r;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, bit(info, i));
      set(b, a, bit(info, i));
    }
  }

  // Data, in the zig-zag order, with the mask applied to non-function modules.
  const masked = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ][mask];
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (fixed[y][x]) continue;
        const dark = i < codewords.length * 8 && bit(codewords[i >>> 3], 7 - (i & 7));
        i++;
        modules[y][x] = dark !== masked(x, y);
      }
    }
  }
  return modules;
}

/** Penalty per the standard's four rules; the mask with the lowest score is used. */
function penalty(m) {
  const size = m.length;
  let score = 0;
  const lines = [...m, ...m[0].map((_, x) => m.map((row) => row[x]))];
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) run++;
      else { if (run >= 5) score += run - 2; run = 1; }
    }
    const text = line.map((d) => (d ? 1 : 0)).join('');
    for (const pattern of ['10111010000', '00001011101']) for (let k = text.indexOf(pattern); k !== -1; k = text.indexOf(pattern, k + 1)) score += 40;
  }
  let dark = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (m[y][x]) dark++;
      if (x < size - 1 && y < size - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
    }
  }
  score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  return score;
}

/**
 * Encodes text as a QR code, or returns null when it does not fit in version 10.
 * @param {string} text
 * @param {{ ecl?: 'L' | 'M', maxVersion?: number, mask?: number }} options
 * @returns {{ version: number, size: number, modules: boolean[][] } | null}
 */
export function encodeQr(text, { ecl = 'L', maxVersion = MAX_VERSION_SUPPORTED, mask } = {}) {
  const bytes = [...new TextEncoder().encode(text)];
  for (let version = 1; version <= Math.min(maxVersion, MAX_VERSION_SUPPORTED); version++) {
    const countBits = version <= 9 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 > dataCodewords(version, ecl) * 8) continue;
    const codewords = addEccAndInterleave(encodeData(bytes, version, ecl), version, ecl);
    const masks = mask === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [mask];
    let best = null;
    for (const m of masks) {
      const modules = buildMatrix(codewords, version, ecl, m);
      const score = masks.length > 1 ? penalty(modules) : 0;
      if (!best || score < best.score) best = { modules, score };
    }
    return { version, size: best.modules.length, modules: best.modules };
  }
  return null;
}

/**
 * Draws a QR code with half blocks, two module rows per line, inside a quiet zone.
 * Always dark modules on a light background, whatever the terminal's own colors, since
 * that is what phone cameras read. Without colors, it relies on a dark terminal.
 */
export function qrLines({ modules }, { depth = 256, quiet = 2 } = {}) {
  const size = modules.length + quiet * 2;
  const dark = (x, y) => {
    const mx = x - quiet;
    const my = y - quiet;
    return mx >= 0 && my >= 0 && mx < modules.length && my < modules.length && modules[my][mx];
  };
  const lines = [];
  for (let y = 0; y < size; y += 2) {
    let line = '';
    for (let x = 0; x < size; x++) {
      const top = dark(x, y);
      const bottom = y + 1 < size && dark(x, y + 1);
      // With colors: black ink on white. Without: light characters are the light modules.
      line += depth ? (top ? (bottom ? '█' : '▀') : bottom ? '▄' : ' ') : !top ? (!bottom ? '█' : '▀') : !bottom ? '▄' : ' ';
    }
    lines.push(depth ? `\x1b[30;107m${line}\x1b[0m` : line);
  }
  return lines;
}
