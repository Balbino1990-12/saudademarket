$file = 'd:\Upwork project\portugalstore.fr\backend\user\dashboard.html'
$content = Get-Content $file -Raw

# Find the old functions using a simple string search
$oldCode = 'function applyTranslations() {
            if (!translations[currentLanguage]) {
                console.warn(''[Dashboard] No translations found for:'', currentLanguage);
                return;
            }

            const trans = translations[currentLanguage];
            const translationMap = {
                ''Dashboard'': ''userDisplayName'',
                ''PortugalStore'': ''storeName'',
                ''My Products'': ''myProductsCard'',
                ''Categories'': ''categoriesCard'',
                ''Activities'': ''activitiesCard'',
                ''🚪 Logout'': ''logoutBtn''
            };

            // Translate common UI elements if they exist
            const textNodes = getElementsToTranslate(trans);
            textNodes.forEach(({ element, key }) => {
                if (trans[key]) {
                    element.textContent = trans[key];
                }
            });
        }

        function getElementsToTranslate(trans) {
            const elements = [];
            
            // Translate sidebar menu items
            const sidebarItems = [
                { selector: ''[data-section="dashboard"]'', key: ''dashboard'' },
                { selector: ''[data-section="products"]'', key: ''products'' },
                { selector: ''[data-section="categories"]'', key: ''categories'' },
                { selector: ''[data-section="orders"]'', key: ''orders'' },
                { selector: ''[data-section="settings"]'', key: ''settings'' }
            ];

            sidebarItems.forEach(item => {
                const el = document.querySelector(item.selector);
                if (el) {
                    const span = el.querySelector(''span:not(.sidebar-icon)'');
                    if (span) {
                        elements.push({ element: span, key: item.key, trans });
                    }
                }
            });

            return elements.map(({ element, key }) => ({
                element,
                key,
                apply: () => {
                    if (trans[key]) {
                        element.textContent = trans[key];
                    }
                }
            }));
        }'

$newCode = 'function applyTranslations() {
            if (!translations[currentLanguage]) {
                console.warn(''[Dashboard] No translations found for:'', currentLanguage);
                return;
            }

            const trans = translations[currentLanguage];
            console.log(''[Dashboard] Applying translations for language:'', currentLanguage);

            // Translate all elements with data-i18n attribute
            document.querySelectorAll(''[data-i18n]'').forEach(element => {
                const key = element.getAttribute(''data-i18n'');
                if (key && trans[key]) {
                    // Check if element has child elements
                    const hasChildren = element.children.length > 0;
                    
                    if (hasChildren) {
                        // Preserve child elements, only update own text
                        const childHTML = Array.from(element.children).map(child => child.outerHTML).join('''');
                        element.innerHTML = trans[key] + childHTML;
                    } else {
                        // No children, safe to update textContent
                        element.textContent = trans[key];
                    }
                    console.log(''[Dashboard] Translated ['''' + key + ''''']: "'' +  trans[key] + ''"'');
                }
            });

            console.log(''[Dashboard] ✅ All translations applied'');
        }'

if ($content -contains $oldCode) {
    $content = $content -replace [regex]::Escape($oldCode), $newCode
    Set-Content $file $content
    Write-Host "Updated translation functions"
} else {
    Write-Host "Old code not found"
}
