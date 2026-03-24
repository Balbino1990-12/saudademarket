import pathlib, re

files = [
    'backend/admin/index.html',
    'backend/admin/products.html',
    'backend/admin/users.html',
    'backend/admin/categories.html',
    'backend/admin/roles.html'
]

old_snippet = re.compile(r"\s*function updateLanguageUI\(lang\) \{[\s\S]*?document\.querySelectorAll\('\.lang-option'\)\.forEach\(opt => \{[\s\S]*?\}\);[\s\n]*\}", re.S)

new_snippet = '''        function updateLanguageUI(lang) {
            const langBtn = document.getElementById('langBtn');
            const langMap = { en: 'EN', fr: 'FR', pt: 'PT' };
            if (langBtn) {
                langBtn.textContent = langMap[lang] || 'EN';
            }
            document.querySelectorAll('.lang-option').forEach(opt => {
                opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
            });

            // Show only the selected language for sidebar labels.
            document.querySelectorAll('.sidebar-item').forEach(item => {
                const frLabel = item.querySelector('.sidebar-label-fr');
                const enLabel = item.querySelector('.sidebar-label-en');

                if (frLabel) {
                    frLabel.style.display = (lang === 'fr') ? 'inline' : 'none';
                }
                if (enLabel) {
                    enLabel.style.display = (lang === 'en') ? 'inline' : 'none';
                }

                if (lang === 'pt') {
                    if (frLabel) frLabel.style.display = 'none';
                    if (enLabel) enLabel.style.display = 'none';
                }
            });
        }
'''

for f in files:
    p = pathlib.Path(f)
    text = p.read_text(encoding='utf-8')
    match = old_snippet.search(text)
    if match:
        updated = old_snippet.sub(new_snippet, text, count=1)
        p.write_text(updated, encoding='utf-8')
        print('updated', f)
    else:
        print('skipped', f, 'pattern not found')
