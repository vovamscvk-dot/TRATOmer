// Генератор иконок: чёрный квадрат + золотое кольцо бюджета. Без зависимостей — zlib из stdlib.
const zlib = require('zlib'), fs = require('fs');

const BG = [0x0E, 0x0E, 0x10], GOLD = [0xD9, 0xB4, 0x5B];

function draw(size) {
  const c = size / 2, R = size * 0.30, W = size * 0.085;
  const px = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c;
    const d = Math.hypot(dx, dy);
    // угол от верха по часовой; кольцо разомкнуто сверху на 60°
    let a = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    const onArc = a >= 30 && a <= 330;
    const edge = Math.max(Math.abs(d - R) - W / 2, 0);
    const ring = onArc ? Math.max(0, 1 - edge / 1.5) : 0;
    // точка-остриё в начале дуги
    const tip = Math.max(0, 1 - Math.max(Math.hypot(dx - R * Math.sin(Math.PI / 6), dy + R * Math.cos(Math.PI / 6)) - W / 2, 0) / 1.5);
    const k = Math.min(1, ring + tip);
    const o = (y * size + x) * 3;
    for (let ch = 0; ch < 3; ch++) px[o + ch] = Math.round(BG[ch] * (1 - k) + GOLD[ch] * k);
  }
  // PNG: тип 2 (RGB), фильтр 0 на каждой строке
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let TBL = null;
function crc32(buf) {
  if (!TBL) {
    TBL = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TBL[n] = c; }
  }
  let c = -1;
  for (const b of buf) c = TBL[(c ^ b) & 0xFF] ^ (c >>> 8);
  return c ^ -1;
}

for (const s of [192, 512]) fs.writeFileSync(`icon-${s}.png`, draw(s));
fs.writeFileSync('apple-touch-icon.png', draw(180));
console.log('icons written');
