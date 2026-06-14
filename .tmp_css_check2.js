const fs=require('fs');
const text=fs.readFileSync('backend/admin/dist/admin-tailwind.css','utf8');
const idx=text.indexOf('slate');
console.log('index', idx);
if (idx>=0) console.log(text.slice(Math.max(0,idx-40), idx+120));
