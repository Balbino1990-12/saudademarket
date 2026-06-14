const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/translations.json', 'utf8'));

console.log('\n🔍 Translation Keys Validation\n');

['en', 'fr', 'pt'].forEach(lang => {
    const keys = Object.keys(data[lang]);
    console.log(`${lang.toUpperCase()}: ${keys.length} keys`);
    
    // Check for any object values instead of strings
    const issues = keys.filter(k => typeof data[lang][k] !== 'string');
    if (issues.length > 0) {
        console.log(`  ⚠️  Non-string values for: ${issues.join(', ')}`);
    }
});

// List specific nav keys
console.log('\n📌 Navigation Keys:');
['nav.home', 'nav.products', 'nav.specialties', 'nav.wine', 'nav.grocery', 'nav.gifts', 'nav.about', 'nav.contact'].forEach(key => {
    console.log(`  ${key}:`);
    console.log(`    EN: "${data.en[key]}"`);
    console.log(`    FR: "${data.fr[key]}"`);
    console.log(`    PT: "${data.pt[key]}"`);
});

