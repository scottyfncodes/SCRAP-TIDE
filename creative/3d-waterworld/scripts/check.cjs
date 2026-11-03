const v = require('gltf-validator'); const fs = require('fs');
const f = process.argv[2];
v.validateBytes(new Uint8Array(fs.readFileSync(f)), { uri: f, maxIssues: 50 }).then((r) => console.log(JSON.stringify(r, null, 1))).catch((e) => { console.error(e); process.exit(1); });
