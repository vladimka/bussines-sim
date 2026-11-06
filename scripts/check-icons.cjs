const fs = require('fs');
for (const f of ['icon-192.png', 'icon-384.png', 'icon-512.png']) {
  const buf = fs.readFileSync('public/' + f);
  const ok = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  console.log(f, ok ? 'VALID PNG' : 'INVALID', buf.length, 'bytes');
}
