const fs = require('fs');
const text = fs.readFileSync('.tmp_tailwind_test2.css', 'utf8');
for (const pat of ['bg-slate-50', 'text-slate-900', 'border-slate-200', 'bg-white', 'bg-transparent', 'to-sky-700']) {
  console.log(pat + ': ' + text.includes(pat));
}
console.log('length', text.length);
