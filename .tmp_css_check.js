const fs = require('fs');
const text = fs.readFileSync('backend/admin/dist/admin-tailwind.css','utf8');
const patterns = ['text-3xl','bg-slate-50','border-slate-200','bg-slate-100','flex','min-h-screen'];
patterns.forEach(p => console.log(p + ': ' + text.includes(p)));
console.log('length ' + text.length);
