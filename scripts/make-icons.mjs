import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const ink = [0xed, 0xe6, 0xda];
const background = [0x14, 0x11, 0x0f];

function draw(size, inset) {
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = background[0];
    data[i * 4 + 1] = background[1];
    data[i * 4 + 2] = background[2];
    data[i * 4 + 3] = 255;
  }

  const cx = size / 2;
  const cy = size * 0.64;
  const radius = size * (0.34 - inset);
  const weight = Math.max(1.4, size * 0.014);

  for (let step = 0; step <= 96; step++) {
    const t = step / 96;
    const angle = Math.PI * (1 - t);
    const bump =
      Math.sin(t * Math.PI * 1.35) * size * 0.012 +
      Math.sin(t * 8.1 + 0.4) * size * 0.007;
    const x = cx + Math.cos(angle) * (radius + bump);
    const y = cy - Math.sin(angle) * (radius + bump) * 0.9;
    stamp(data, size, x, y, weight, ink);
  }

  const ticks = [-0.82, -0.38, 0.02, 0.46, 0.84];
  const lengths = [0.045, 0.07, 0.09, 0.055, 0.04];
  ticks.forEach((offset, index) => {
    const angle = Math.PI * (1 - (offset + 1) / 2);
    const outer = radius + size * 0.035;
    const inner = outer - size * lengths[index];
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const r = inner + ((outer - inner) * s) / steps;
      stamp(
        data,
        size,
        cx + Math.cos(angle) * r,
        cy - Math.sin(angle) * r * 0.9,
        weight * 0.85,
        ink,
      );
    }
  });

  const needle = Math.PI / 2;
  const reach = radius * 0.78;
  for (let s = 0; s <= 36; s++) {
    const r = (reach * s) / 36;
    const bow = Math.sin((s / 36) * Math.PI) * size * 0.006;
    stamp(
      data,
      size,
      cx + Math.cos(needle) * r + bow,
      cy - Math.sin(needle) * r * 0.9,
      weight * 0.95,
      ink,
    );
  }
  stamp(data, size, cx + size * 0.006, cy - reach * 0.9, weight * 1.5, ink);
  return data;
}

function stamp(data, size, cx, cy, radius, color) {
  const x0 = Math.max(0, Math.floor(cx - radius - 1));
  const x1 = Math.min(size - 1, Math.ceil(cx + radius + 1));
  const y0 = Math.max(0, Math.floor(cy - radius - 1));
  const y1 = Math.min(size - 1, Math.ceil(cy + radius + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const coverage = Math.max(0, Math.min(1, radius + 0.55 - Math.hypot(x - cx, y - cy)));
      if (coverage <= 0) continue;
      const i = (y * size + x) * 4;
      data[i] = Math.round(data[i] * (1 - coverage) + color[0] * coverage);
      data[i + 1] = Math.round(data[i + 1] * (1 - coverage) + color[1] * coverage);
      data[i + 2] = Math.round(data[i + 2] * (1 - coverage) + color[2] * coverage);
      data[i + 3] = 255;
    }
  }
}

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true });
const targets = [
  ['icon-180.png', 180, 0.02],
  ['icon-192.png', 192, 0.02],
  ['icon-512.png', 512, 0.02],
  ['icon-512-maskable.png', 512, 0.1],
];

for (const [name, size, inset] of targets) {
  const png = encodePng(size, draw(size, inset));
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), png);
}
