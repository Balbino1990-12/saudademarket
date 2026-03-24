document.addEventListener('DOMContentLoaded', () => {
  let translations = {};
  let currentLang = localStorage.getItem('adminLang') || 'en';

  // load the shared translations file
  fetch('/translations.json')
    .then(res => res.json())
    .then(data => {
      translations = data;
      initializeLanguageUI();
      setLanguage(currentLang);
    })
    .catch(err => console.error('Failed to load translations:', err));

  // Initialize language UI with modern interactions
  function initializeLanguageUI() {
    const langBtn = document.getElementById('langBtn');
    const langOptions = document.querySelectorAll('.lang-option, [data-lang]');

    if (langBtn) {
      langBtn.addEventListener('click', (e) => {
        const dd = document.querySelector('.lang-dropdown, .lang-options');
        if (dd) {
          dd.classList.toggle('active');
          langBtn.classList.toggle('active');
          e.stopPropagation();
        }
      });
    }

    // Handle both .lang-option and [data-lang] selectors
    langOptions.forEach(btn => {
      if (btn !== langBtn) { // Avoid double-binding to button
        btn.addEventListener('click', (e) => {
          const lang = btn.getAttribute('data-lang');
          if (lang) {
            // Add smooth transition effect
            document.documentElement.style.opacity = '0.95';
            
            setLanguage(lang);
            localStorage.setItem('adminLang', lang);
            
            const dd = document.querySelector('.lang-dropdown, .lang-options');
            if (dd) {
              dd.classList.remove('active');
              const btn = document.getElementById('langBtn');
              if (btn) btn.classList.remove('active');
            }
            
            // Fade in effect
            setTimeout(() => {
              document.documentElement.style.opacity = '1';
            }, 100);
            
            // Dispatch custom event for language change
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
          }
        });
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.lang-selector')) {
        const dd = document.querySelector('.lang-dropdown, .lang-options');
        const btn = document.getElementById('langBtn');
        if (dd) {
          dd.classList.remove('active');
          if (btn) btn.classList.remove('active');
        }
      }
    });
  }

  function setLanguage(lang) {
    const langBtn = document.getElementById('langBtn');
    const langOptions = document.querySelectorAll('.lang-option, [data-lang]');

    currentLang = lang;
    
    // Update button display with smooth animation
    if (langBtn) {
      const langNames = { en: 'English', fr: 'Français', pt: 'Português' };
      langBtn.style.opacity = '0.8';
      setTimeout(() => {
        langBtn.textContent = langNames[lang] || lang.toUpperCase();
        // Restore icon
        langBtn.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 8px; width: 100%;">
          <span style="font-size: 16px;">🌐</span>
          <span>${langNames[lang] || lang.toUpperCase()}</span>
        </span>`;
        langBtn.style.opacity = '1';
      }, 150);
    }

    // Update active indicator
    langOptions.forEach(opt => opt.classList.remove('active'));
    const activeOpt = document.querySelector(`.lang-option[data-lang="${lang}"], [data-lang="${lang}"]`);
    if (activeOpt) {
      activeOpt.classList.add('active');
      activeOpt.style.animation = 'none';
      setTimeout(() => {
        activeOpt.style.animation = '';
      }, 10);
    }

    // Expose global translate function for other scripts
    window.translate = function(key) {
      const parts = key.split('.');
      let val = translations[currentLang];
      for (const p of parts) {
        if (!val) break;
        val = val[p];
      }
      return val || key;
    };

    // Also expose getLang function
    window.getLang = function() {
      return currentLang;
    };

    // Update all elements with data-i18n attribute with smooth transition
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = getTranslation(key, translations[lang]);
      if (value !== null && value !== undefined) {
        // Smooth text transition
        el.style.opacity = '0.8';
        setTimeout(() => {
          el.textContent = value;
          el.style.opacity = '1';
        }, 75);
      }
    });

    // Update elements with data-i18n-btn for buttons
    document.querySelectorAll('[data-i18n-btn]').forEach(el => {
      const key = el.getAttribute('data-i18n-btn');
      const value = getTranslation(key, translations[lang]);
      if (value !== null && value !== undefined) {
        el.innerHTML = value;
      }
    });

    // Update elements with data-i18n-placeholder for input placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = getTranslation(key, translations[lang]);
      if (value !== null && value !== undefined) {
        el.placeholder = value;
      }
    });

    // Update title if it has translation
    if (translations[lang]?.meta?.title) {
      document.title = translations[lang].meta.title;
    }

    // Dispatch event to allow other scripts to update dynamic content
    window.dispatchEvent(new CustomEvent('i18nLanguageChanged', { 
      detail: { lang, translations: translations[lang] } 
    }));
  }

  // Helper function to get nested translation
  function getTranslation(key, langData) {
    const parts = key.split('.');
    let val = langData;
    for (const p of parts) {
      if (!val) break;
      val = val[p];
    }
    return val;
  }

  // Add smooth transition styles
  const style = document.createElement('style');
  style.textContent = `
    html {
      transition: opacity 0.3s ease;
    }
    [data-i18n] {
      transition: opacity 0.3s ease;
    }
    .lang-selector button {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `;
  document.head.appendChild(style);
});