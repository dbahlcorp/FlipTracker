const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(width, height, r, g, b, bgR, bgG, bgB) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Build scanlines — draw a rounded square icon on bg color
  const raw = Buffer.alloc(height * (1 + width * 3));
  const pad = Math.floor(width * 0.15);
  const radius = Math.floor(width * 0.18);

  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const offset = y * (1 + width * 3) + 1 + x * 3;
      // Check if inside rounded rect
      const inX = x >= pad && x < width - pad;
      const inY = y >= pad && y < height - pad;
      let inside = false;
      if (inX && inY) {
        // Corner check
        const cx = [pad + radius, width - pad - radius];
        const cy = [pad + radius, height - pad - radius];
        const nearCornerX = x < pad + radius ? cx[0] : (x > width - pad - radius ? cx[1] : x);
        const nearCornerY = y < pad + radius ? cy[0] : (y > height - pad - radius ? cy[1] : y);
        const dist = Math.sqrt((x - nearCornerX) ** 2 + (y - nearCornerY) ** 2);
        inside = dist <= radius || (x >= pad + radius && x <= width - pad - radius) || (y >= pad + radius && y <= height - pad - radius);
        inside = inside && inX && inY;
      }
      raw[offset]     = inside ? r   : (bgR !== undefined ? bgR : 255);
      raw[offset + 1] = inside ? g   : (bgG !== undefined ? bgG : 255);
      raw[offset + 2] = inside ? b   : (bgB !== undefined ? bgB : 255);
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

function makeSolidPNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0;
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b;
  }
  const rows = Array(height).fill(row);
  const compressed = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

console.log('Generating icon.png (1024x1024)...');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), makePNG(1024, 1024, 34, 197, 94, 255, 255, 255));

console.log('Generating adaptive-icon.png (1024x1024)...');
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), makePNG(1024, 1024, 34, 197, 94, 255, 255, 255));

console.log('Generating splash.png (1284x2778)...');
fs.writeFileSync(path.join(assetsDir, 'splash.png'), makeSolidPNG(1284, 2778, 255, 255, 255));

console.log('Generating favicon.png (64x64)...');
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), makePNG(64, 64, 34, 197, 94, 255, 255, 255));

console.log('Done! Assets written to ./assets/');
