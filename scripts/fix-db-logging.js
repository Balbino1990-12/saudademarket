const fs = require('fs');
const path = 'src/config/database.js';
let text = fs.readFileSync(path, 'utf8');
text = text.replace("const DB_NAME = process.env.DB_NAME || 'portugalstore_db';\n", "const DB_NAME = process.env.DB_NAME || 'portugalstore_db';\nconst isTestMode = process.env.NODE_ENV === 'test';\nconst log = (...args) => { if (!isTestMode) console.log(...args); };\nconst warn = (...args) => { if (!isTestMode) console.warn(...args); };\nconst errLog = (...args) => { if (!isTestMode) console.error(...args); };\n");
text = text.replace(/console\.log\(/g, 'log(');
text = text.replace(/console\.warn\(/g, 'warn(');
text = text.replace(/console\.error\(/g, 'errLog(');
fs.writeFileSync(path, text, 'utf8');
console.log('Patched', path);
