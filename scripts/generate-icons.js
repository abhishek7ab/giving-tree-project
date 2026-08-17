const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height) {
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    function createChunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length, 0);
        const typeBuf = Buffer.from(type, 'ascii');
        const toCrc = Buffer.concat([typeBuf, data]);
        const crc = crc32(toCrc);
        const crcBuf = Buffer.alloc(4);
        crcBuf.writeUInt32BE(crc >>> 0, 0);
        return Buffer.concat([len, typeBuf, data, crcBuf]);
    }

    // CRC32 implementation
    function crc32(buf) {
        let table = crc32.table;
        if (!table) {
            table = new Uint32Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let k = 0; k < 8; k++) {
                    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
                }
                table[i] = c;
            }
            crc32.table = table;
        }
        let c = 0 ^ (-1);
        for (let i = 0; i < buf.length; i++) {
            c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xFF];
        }
        return (c ^ (-1)) >>> 0;
    }

    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // 8 bit depth
    ihdrData[9] = 6; // RGBA
    ihdrData[10] = 0;
    ihdrData[11] = 0;
    ihdrData[12] = 0;
    const ihdrChunk = createChunk('IHDR', ihdrData);

    // Pixel data: draw an emerald green badge (#10b981) with dark background (#0f172a)
    const rawData = Buffer.alloc(height * (1 + width * 4));
    let offset = 0;
    const cx = width / 2;
    const cy = height / 2;
    const r = width * 0.44;

    for (let y = 0; y < height; y++) {
        rawData[offset++] = 0; // Filter type 0
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= r) {
                // Inside circular emerald badge
                // Emerald green #10b981 -> (16, 185, 129)
                // Draw a leaf / sprout highlight in the center
                const innerDist = Math.sqrt((dx * 0.9) * (dx * 0.9) + (dy * 1.1) * (dy * 1.1));
                if (innerDist < r * 0.55 && (dy > -r * 0.4 && dy < r * 0.35)) {
                    // Crisp white leaf symbol
                    rawData[offset++] = 255;
                    rawData[offset++] = 255;
                    rawData[offset++] = 255;
                    rawData[offset++] = 255;
                } else {
                    rawData[offset++] = 16;
                    rawData[offset++] = 185;
                    rawData[offset++] = 129;
                    rawData[offset++] = 255;
                }
            } else {
                // Transparent background
                rawData[offset++] = 0;
                rawData[offset++] = 0;
                rawData[offset++] = 0;
                rawData[offset++] = 0;
            }
        }
    }

    const compressed = zlib.deflateSync(rawData);
    const idatChunk = createChunk('IDAT', compressed);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, '..', 'frontend', 'assets');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

sizes.forEach(size => {
    const png = createPng(size, size);
    const filePath = path.join(outDir, `icon-${size}.png`);
    fs.writeFileSync(filePath, png);
    console.log(`Generated: ${filePath}`);
});
