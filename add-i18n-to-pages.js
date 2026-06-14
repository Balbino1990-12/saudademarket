#!/usr/bin/env node
/**
 * Automated i18n Setup Script
 * Adds i18n.js script tag and language selector to all HTML pages
 * Usage: node add-i18n-to-pages.js
 */

const fs = require('fs');
const path = require('path');

// Directories to scan
const directories = [
    'public',
    'backend/admin',
    'backend/user'
];

// Pattern to find HTML files
const htmlPattern = /\.html$/;

// i18n script tag to add
const i18nScriptTag = '    <script src="/js/i18n.js"></script>\n';

// Language selector HTML
const languageSelectorHtml = `        </header>
        
        <!-- Language Selector Script -->
        <script>
            // Add language selector after page loads
            window.addEventListener('load', () => {
                i18n.addLanguageSelector();
            });
        </script>`;

let filesProcessed = 0;
let filesUpdated = 0;

// Helper: Scan directory recursively
function scanDirectory(dir) {
    let files = [];
    
    try {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                files = files.concat(scanDirectory(fullPath));
            } else if (htmlPattern.test(item)) {
                files.push(fullPath);
            }
        });
    } catch (err) {
        console.warn(`⚠️ Could not scan directory ${dir}:`, err.message);
    }
    
    return files;
}

// Helper: Add i18n to HTML file
function addI18nToFile(filePath) {
    filesProcessed++;
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if already has i18n script
        if (content.includes('i18n.js')) {
            console.log(`⏭️  ${filePath} - Already has i18n support`);
            return false;
        }
        
        // Add script tag before closing </head>
        if (content.includes('</head>')) {
            content = content.replace(
                '</head>',
                i18nScriptTag + '</head>'
            );
            filesUpdated++;
            console.log(`✅ ${filePath} - Added i18n support`);
            
            // Write updated file
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        } else {
            console.warn(`⚠️  ${filePath} - No </head> tag found, skipping`);
            return false;
        }
    } catch (err) {
        console.error(`❌ ${filePath} - Error:`, err.message);
        return false;
    }
}

// Main execution
console.log('🌍 Starting AI Translator Setup...\n');

const allFiles = [];
directories.forEach(dir => {
    const fullDir = path.join(__dirname, dir);
    if (fs.existsSync(fullDir)) {
        console.log(`📁 Scanning: ${dir}`);
        allFiles.push(...scanDirectory(fullDir));
    } else {
        console.warn(`⚠️  Directory not found: ${dir}`);
    }
});

console.log(`\nFound ${allFiles.length} HTML files\n`);

// Process each file
allFiles.forEach(file => {
    addI18nToFile(file);
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Setup Complete!`);
console.log(`📊 Total files processed: ${filesProcessed}`);
console.log(`🔄 Files updated: ${filesUpdated}`);
console.log(`${'='.repeat(50)}\n`);

console.log('Next steps:');
console.log('1. Add data-i18n attributes to translatable elements');
console.log('2. Add translation keys to /public/translations.json');
console.log('3. Test language switching on your pages');
console.log('\nSee I18N_GUIDE.md for detailed documentation');

