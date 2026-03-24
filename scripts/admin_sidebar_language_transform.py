import re
from pathlib import Path

files = [
    'backend/admin/index.html',
    'backend/admin/products.html',
    'backend/admin/users.html',
    'backend/admin/categories.html',
    'backend/admin/roles.html'
]

# New universal updateLanguageUI function
new_update_function = '''        function updateLanguageUI(lang) {
            const langBtn = document.getElementById('langBtn');
            const langMap = { en: 'EN', fr: 'FR', pt: 'PT' };
            if (langBtn) {
                langBtn.textContent = langMap[lang] || 'EN';
            }
            document.querySelectorAll('.lang-option').forEach(opt => {
                opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
            });

            document.querySelectorAll('.sidebar-item').forEach(item => {
                const icon = item.querySelector('.sidebar-icon');
                let label = item.querySelector('.sidebar-label');
                if (!label) {
                    label = document.createElement('span');
                    label.className = 'sidebar-label';
                    if (icon && icon.nextSibling) {
                        icon.insertAdjacentElement('afterend', label);
                    } else if (icon) {
                        icon.parentNode.insertBefore(label, icon.nextSibling);
                    } else {
                        item.appendChild(label);
                    }
                }

                const fromData = item.getAttribute(`data-label-${lang}`)
                    || item.getAttribute('data-label-en')
                    || item.getAttribute('data-label-fr')
                    || item.getAttribute('data-label-pt');

                if (fromData) {
                    label.textContent = fromData;
                } else {
                    const fr = item.querySelector('.sidebar-label-fr');
                    const en = item.querySelector('.sidebar-label-en');
                    const pt = item.querySelector('.sidebar-label-pt');
                    const source = (lang === 'fr' ? fr : lang === 'pt' ? pt : en) || en || fr || pt;
                    if (source) label.textContent = source.textContent.trim();
                }

                // Hide old multi language label spans if present
                item.querySelectorAll('.sidebar-label-fr, .sidebar-label-en, .sidebar-label-pt').forEach(s => {
                    s.style.display = 'none';
                });
            });
        }
'''

for file_path in files:
    p = Path(file_path)
    text = p.read_text(encoding='utf-8')

    # Replace updateLanguageUI function
    text = re.sub(
        r"function updateLanguageUI\(lang\) \{[\s\S]*?\n\s*\}\n",
        new_update_function,
        text,
        flags=re.MULTILINE
    )

    # Replace sidebar-item blocks to one label + data-label attrs
    def replace_item(m):
        open_tag = m.group(1)
        inside = m.group(2)
        close_tag = m.group(3)

        # existing and fallback translations
        fr = re.search(r'<span class="sidebar-label-fr">\s*([^<]+?)\s*</span>', inside)
        en = re.search(r'<span class="sidebar-label-en">\s*([^<]+?)\s*</span>', inside)
        pt = re.search(r'<span class="sidebar-label-pt">\s*([^<]+?)\s*</span>', inside)

        fr_text = fr.group(1).strip() if fr else None
        en_text = en.group(1).strip() if en else None
        pt_text = pt.group(1).strip() if pt else None

        # build updated open tag with data-label-*
        tag = open_tag
        if 'data-label-fr=' not in tag and fr_text:
            tag = tag.rstrip('>') + f' data-label-fr="{fr_text}">'
        if 'data-label-en=' not in tag and en_text:
            tag = tag.rstrip('>') + f' data-label-en="{en_text}">'
        if 'data-label-pt=' not in tag and pt_text:
            tag = tag.rstrip('>') + f' data-label-pt="{pt_text}">'

        # get icon (if any)
        icon = re.search(r'(<span class="sidebar-icon">.*?</span>)', inside, flags=re.S)
        iconhtml = icon.group(1).strip() if icon else ''

        # new label text default to en / fr / pt
        default_label = en_text or fr_text or pt_text or ''
        new_inner = ''
        if iconhtml:
            new_inner += f'\n                    {iconhtml}\n'
        new_inner += f'                    <span class="sidebar-label">{default_label}</span>\n'

        return f'{tag}{new_inner}                {close_tag}'

    text = re.sub(
        r'(<a[^>]*class="sidebar-item"[^>]*>)(.*?)(</a>)',
        replace_item,
        text,
        flags=re.S
    )

    p.write_text(text, encoding='utf-8')
    print('updated', file_path)
