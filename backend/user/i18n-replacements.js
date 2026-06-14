// Improved translation function to replace in dashboard.html
// This function translates all elements with data-i18n attributes

function applyTranslations() {
    if (!translations[currentLanguage]) {
        console.warn('[Dashboard] No translations found for:', currentLanguage);
        return;
    }

    const trans = translations[currentLanguage];
    console.log('[Dashboard] Applying translations for language:', currentLanguage);

    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key && trans[key]) {
            // Check if element has child elements
            const hasChildren = element.children.length > 0;
            
            if (hasChildren) {
                // Preserve child elements, only update own text
                const childHTML = Array.from(element.children).map(child => child.outerHTML).join('');
                element.innerHTML = trans[key] + childHTML;
            } else {
                // No children, safe to update textContent
                element.textContent = trans[key];
            }
            console.log('[Dashboard] Translated [' + key + ']: "' + trans[key] + '"');
        }
    });

    console.log('[Dashboard] ✅ All translations applied');
}

