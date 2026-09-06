const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, getPixel) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function getEduSpherePixel(x, y, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const nx = (x - cx) / (width / 2);
  const ny = (y - cy) / (height / 2);

  const cornerRadius = 0.28;
  const qx = Math.max(0, Math.abs(nx) - (1 - cornerRadius));
  const qy = Math.max(0, Math.abs(ny) - (1 - cornerRadius));
  const d = Math.sqrt(qx * qx + qy * qy);

  if (d > cornerRadius) {
    return [0, 0, 0, 0];
  }

  const gradT = (ny + 1) / 2;
  let bgR = Math.round(99 + (67 - 99) * gradT);
  let bgG = Math.round(102 + (56 - 102) * gradT);
  let bgB = Math.round(241 + (202 - 241) * gradT);

  const capY = ny + 0.05;
  const diamondDist = Math.abs(nx) * 1.5 + Math.abs(capY + 0.15) * 2.2;
  const isCapDiamond = diamondDist < 0.65;
  const isCapBase = Math.abs(nx) < 0.35 && capY > 0.05 && capY < 0.35;
  const distCenter = Math.sqrt(nx * nx + (ny + 0.05) * (ny + 0.05));
  const isCenterGlow = distCenter < 0.15;

  if (isCapDiamond || isCapBase || isCenterGlow) {
    return [255, 255, 255, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.join(process.cwd(), 'public');
const assetsDir = path.join(publicDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const png192 = createPng(192, 192, getEduSpherePixel);
const png512 = createPng(512, 512, getEduSpherePixel);
const png64 = createPng(64, 64, getEduSpherePixel);

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), png192);
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png64);

const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#4338ca" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="28" fill="url(#grad)" />
  <polygon points="50,22 82,38 50,54 18,38" fill="#ffffff" />
  <path d="M30,46 L30,64 C30,72 70,72 70,64 L70,46" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" />
  <path d="M78,40 L82,56 C82,60 86,60 86,56 L82,40" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon);

console.log('✓ Successfully generated all PWA icons & favicons.');

