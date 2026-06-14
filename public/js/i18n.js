/**
 * Global i18n (Internationalization) Module
 * Provides translation functionality across all pages
 * Supports English (EN), French (FR), Portuguese (PT)
 */

const i18n = (() => {
    let currentLanguage = localStorage.getItem('adminLanguage') || localStorage.getItem('selectedLanguage') || 'fr';
    let translations = {};
    let isLoading = false;

    // API for AI-powered translations
    const TRANSLATION_API = 'https://api.mymemory.translated.net/get';
    const SUPPORTED_LANGUAGES = {
        'en': { name: 'English', flag: '🇬🇧', code: 'en' },
        'fr': { name: 'Français', flag: '🇫🇷', code: 'fr' },
        'pt': { name: 'Português', flag: '🇵🇹', code: 'pt' }
    };

    /**
     * Initialize i18n system
     */
    async function init() {
        console.log('[i18n] Initializing with language:', currentLanguage);
        
        // Load static translations
        await loadTranslations();
        
        // Set document language
        document.documentElement.lang = currentLanguage;
        
        // Apply translations
        applyTranslations();
        
        console.log('[i18n] ✅ Initialization complete');
    }

    /**
     * Load translations from server
     */
    async function loadTranslations() {
        try {
            const isAdmin = window.location.pathname.startsWith('/admin');
            const translationsPath = isAdmin ? '/admin/translations.json' : '/translations.json';
            const response = await fetch(translationsPath);
            if (response.ok) {
                translations = await response.json();
                console.log('[i18n] ✅ Loaded static translations from', translationsPath);
            } else {
                console.warn('[i18n] Could not load translations:', response.status, 'from', translationsPath);
            }
        } catch (err) {
            console.error('[i18n] Error loading translations:', err);
        }
    }

    /**
     * Get translation for a key
     */
    function t(key, defaultValue = key) {
        if (!translations[currentLanguage] || !translations[currentLanguage][key]) {
            console.warn(`[i18n] Missing translation: ${key} for language ${currentLanguage}`);
            return defaultValue;
        }
        return translations[currentLanguage][key];
    }

    /**
     * Translate text that's not in the static translations
     * Uses AI API for real-time translation
     */
    async function translate(text, targetLang = currentLanguage) {
        if (!text || text.trim().length === 0) return '';
        if (targetLang === 'en') return text; // No translation needed for English
        
        try {
            const params = new URLSearchParams({
                q: text,
                langpair: `en|${targetLang}`
            });
            
            const response = await fetch(`${TRANSLATION_API}?${params}`);
            const data = await response.json();
            
            if (data.responseStatus === 200 && data.responseData.translatedText) {
                return data.responseData.translatedText;
            }
            return text;
        } catch (err) {
            console.error(`[i18n] Translation error for "${text}" to ${targetLang}:`, err);
            return text;
        }
    }

    /**
     * Apply translations to all elements with data-i18n attribute
     */
    function applyTranslations() {
        console.log(`[i18n] Applying translations for language: ${currentLanguage}`);
        
        let translatedCount = 0;
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key && translations[currentLanguage] && translations[currentLanguage][key]) {
                const translatedText = translations[currentLanguage][key];
                
                // Check if element has child elements
                const hasChildren = element.children.length > 0;
                
                if (hasChildren) {
                    // Preserve child elements, only update own text
                    const childHTML = Array.from(element.children).map(child => child.outerHTML).join('');
                    element.innerHTML = translatedText + childHTML;
                } else {
                    // No children, safe to update textContent
                    element.textContent = translatedText;
                }
                translatedCount++;
            }
        });
        
        console.log(`[i18n] ✅ Translated ${translatedCount} elements`);
    }

    /**
     * Switch to a different language
     */
    async function setLanguage(lang) {
        if (!SUPPORTED_LANGUAGES[lang]) {
            console.warn('[i18n] Unsupported language:', lang);
            return;
        }
        
        if (lang === currentLanguage) return;
        
        currentLanguage = lang;
        localStorage.setItem('selectedLanguage', lang);
        localStorage.setItem('adminLanguage', lang);
        document.documentElement.lang = lang;
        
        console.log('[i18n] Language switched to:', lang);
        applyTranslations();
        
        // Dispatch custom event for language change
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }

    /**
     * Get current language
     */
    function getLanguage() {
        return currentLanguage;
    }

    /**
     * Get language info
     */
    function getLanguageInfo(lang = currentLanguage) {
        return SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES['en'];
    }

    /**
     * Get all supported languages
     */
    function getLanguages() {
        return SUPPORTED_LANGUAGES;
    }

    /**
     * Add language selector to page
     */
    function addLanguageSelector(containerId = null) {
        let container = document.getElementById(containerId);
        
        if (!container) {
            // Create default selector
            container = document.createElement('div');
            container.id = 'i18n-language-selector';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
            `;
            document.body.appendChild(container);
        }
        
        const html = `
            <div style="position: relative; display: inline-block;">
                <button id="i18n-lang-btn" style="
                    padding: 8px 12px;
                    background: linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.3s ease;
                ">
                    <span id="i18n-flag">${getLanguageInfo().flag}</span>
                    <span id="i18n-code">${getLanguageInfo().code.toUpperCase()}</span>
                </button>
                <div id="i18n-dropdown" style="
                    position: absolute;
                    bottom: 100%;
                    right: 0;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.15);
                    display: none;
                    min-width: 150px;
                    margin-bottom: 8px;
                ">
                    ${Object.values(SUPPORTED_LANGUAGES).map(lang => `
                        <div class="i18n-option" data-lang="${lang.code}" style="
                            padding: 10px 16px;
                            cursor: pointer;
                            border-bottom: 1px solid #f1f5f9;
                            transition: all 0.2s ease;
                            ${lang.code === currentLanguage ? 'background: #1e3a8a; color: white;' : ''}
                        " onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${lang.code === currentLanguage ? '#1e3a8a' : 'white'}'; this.style.color='${lang.code === currentLanguage ? 'white' : 'black'}'">
                            ${lang.flag} ${lang.name}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add event listeners
        const langBtn = document.getElementById('i18n-lang-btn');
        const dropdown = document.getElementById('i18n-dropdown');
        
        langBtn.addEventListener('click', () => {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        document.querySelectorAll('.i18n-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const lang = e.target.closest('.i18n-option').getAttribute('data-lang');
                setLanguage(lang);
                updateLanguageSelectorUI();
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#i18n-lang-btn') && !e.target.closest('#i18n-dropdown')) {
                dropdown.style.display = 'none';
            }
        });
    }

    /**
     * Update language selector UI after language change
     */
    function updateLanguageSelectorUI() {
        const flag = document.getElementById('i18n-flag');
        const code = document.getElementById('i18n-code');
        
        if (flag) flag.textContent = getLanguageInfo().flag;
        if (code) code.textContent = getLanguageInfo().code.toUpperCase();
        
        // Update active option
        document.querySelectorAll('.i18n-option').forEach(option => {
            const lang = option.getAttribute('data-lang');
            if (lang === currentLanguage) {
                option.style.background = '#1e3a8a';
                option.style.color = 'white';
            } else {
                option.style.background = 'white';
                option.style.color = 'black';
            }
        });
    }

    /**
     * Batch translate multiple texts
     */
    async function translateBatch(texts, targetLang = currentLanguage) {
        const results = {};
        
        for (const text of texts) {
            results[text] = await translate(text, targetLang);
        }
        
        return results;
    }

    // Public API
    return {
        init,
        t,
        translate,
        setLanguage,
        getLanguage,
        getLanguageInfo,
        getLanguages,
        addLanguageSelector,
        applyTranslations,
        translateBatch,
        SUPPORTED_LANGUAGES
    };
})();

// Expose i18n helpers globally for pages that rely on window.translate/window.setLanguage/window.i18n
if (typeof window !== 'undefined') {
    window.i18n = i18n;
    window.translate = i18n.t;
    window.setLanguage = i18n.setLanguage;
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}

