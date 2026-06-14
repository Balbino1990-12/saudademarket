/* Minimal theme JS: loads data.json from assets and wires language selector */
document.addEventListener('DOMContentLoaded', ()=>{
  const langBtn = document.getElementById('langBtn');
  const langOptions = document.querySelectorAll('.lang-option');
  // determine language from query parameter or localStorage
  const params = new URLSearchParams(window.location.search);
  const localeParam = params.get('locale');
  let currentLang = localeParam || localStorage.getItem('lang') || 'fr';
  if(localeParam) localStorage.setItem('lang', localeParam);
  const flagMap = {fr:'🇫🇷',pt:'🇵🇹',en:'🇬🇧'};
  function updateLangBtn(lang){
    if(langBtn){
      const flag = flagMap[lang]||'';
      langBtn.textContent = flag + ' ' + lang.toUpperCase();
    }
  }
  if(langBtn) updateLangBtn(currentLang);

  // fallback static translations (used if JSON fails to load)
  const staticTranslations = {
    nav: {
      home: {fr:"ACCUEIL",pt:"INÍCIO",en:"HOME"},
      products: {fr:"PRODUITS",pt:"PRODUTOS",en:"PRODUCTS"},
      specialties: {fr:"SPÉCIALITÉS",pt:"ESPECIALIDADES",en:"SPECIALTIES"},
      wine: {fr:"VIN & PORTO",pt:"VINHOS & PORTO",en:"WINE & PORT"},
      grocery: {fr:"ÉPICERIE",pt:"MERCEARIA",en:"GROCERY"},
      gifts: {fr:"COFFRETS",pt:"CABAZES",en:"GIFT BOXES"},
      about: {fr:"À PROPOS",pt:"SOBRE NÓS",en:"ABOUT US"},
      contact: {fr:"CONTACT",pt:"CONTACTOS",en:"CONTACT"},
      subtitle: {fr:">> Découvrir", pt:">> Conhecer", en:">> Discover"}
    }
    // ... (other fallback translations can be added if needed)
  };

  // Load translations from JSON file
  let translations = null;
  function loadTranslations(callback) {
    fetch('/shopify-theme/assets/translations.json')
      .then(r => r.json())
      .then(json => {
        translations = json;
        callback();
      })
      .catch(() => {
        translations = staticTranslations;
        callback();
      });
  }

  function applyStaticTranslations(lang){
    const dict = translations || staticTranslations;
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.dataset.i18n.split('.');
      let txt = dict?.[key[0]]?.[key[1]]?.[lang];
      if(txt){
        if(el.tagName.toLowerCase()==='input'){
          el.placeholder = txt;
          el.setAttribute('aria-label', txt);
        } else if(el.tagName.toLowerCase()==='a' || el.tagName.toLowerCase()==='button'){
          // icons have their own styling; keep icon markup and only update accessibility attributes
          if(el.classList.contains('icon')){
            if(el.hasAttribute('title')) el.setAttribute('title', txt);
            el.setAttribute('aria-label', txt);
          } else {
            if(el.hasAttribute('title')) el.setAttribute('title', txt);
            el.textContent = txt;
          }
        } else {
          el.textContent = txt;
        }
      }
    });
  }

  // Load translations then apply
  loadTranslations(() => {
    applyStaticTranslations(currentLang);
    // ...existing code for dynamic content, menu, etc...
  });

  function applyStaticTranslations(lang){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.dataset.i18n.split('.');
      let txt = staticTranslations[key[0]]?.[key[1]]?.[lang];
      if(txt){
        if(el.tagName.toLowerCase()==='input'){
          el.placeholder = txt;
          el.setAttribute('aria-label', txt);
        } else if(el.tagName.toLowerCase()==='a' || el.tagName.toLowerCase()==='button'){
          // icons have their own styling; keep icon markup and only update accessibility attributes
          if(el.classList.contains('icon')){
            if(el.hasAttribute('title')) el.setAttribute('title', txt);
            el.setAttribute('aria-label', txt);
          } else {
            if(el.hasAttribute('title')) el.setAttribute('title', txt);
            el.textContent = txt;
          }
        } else {
          el.textContent = txt;
        }
      }
    });
  }

  // Only show the first word in each header menu item (original, before unified logic)
  // document.addEventListener('DOMContentLoaded', () => {
  //   document.querySelectorAll('nav ul li a').forEach(link => {
  //     // Remove line breaks and trim
  //     const text = link.textContent.replace(/\n/g, ' ').trim();
  //     // Split by space and keep only the first word
  //     const firstWord = text.split(/\s+/)[0];
  //     link.textContent = firstWord;
  //   });
  // });

  // Language dropdown
  if(langBtn){
    langBtn.addEventListener('click', e=>{document.querySelector('.lang-dropdown').classList.toggle('active');e.stopPropagation();});
  }
  document.addEventListener('click', ()=>document.querySelector('.lang-dropdown')?.classList.remove('active'));

  // clicking a language option now should navigate with locale param
  langOptions.forEach(btn=>{
    btn.addEventListener('click', e=>{
      const l=e.target.dataset.lang;
      localStorage.setItem('lang', l);
      updateLangBtn(l);
      const url = new URL(window.location.href);
      url.searchParams.set('locale', l);
      window.location.href = url.toString();
    });
  });

  // menu toggle for mobile (original logic, products menu handled separately)
  const menuToggle = document.getElementById('menuToggle');
  const themeNav = document.querySelector('nav.theme-nav');
  if(menuToggle && themeNav){
    menuToggle.style.display = 'none'; // originally hidden, CSS handles display
    menuToggle.addEventListener('click', ()=>{
      themeNav.classList.toggle('active');
    });
  }

  // Restore original products menu toggle (if any custom logic existed, add here)
  // Example: If products menu had its own toggle, re-enable it here
  // const productsMenu = document.querySelector('.products-menu');
  // if(productsMenu) {
  //   productsMenu.addEventListener('click', (e) => {
  //     productsMenu.classList.toggle('open');
  //     e.stopPropagation();
  //   });
  //   document.addEventListener('click', () => productsMenu.classList.remove('open'));
  // }

  // apply translations on load
  applyStaticTranslations(currentLang);

  // Load dynamic content (categories + specialties)
  fetch('/assets/data.json').then(r=>r.json()).then(data=>{
    const lang = localStorage.getItem('lang')||'fr';
    const catCont = document.getElementById('categories');
    if(catCont && data.categories){
      // only populate if there are no existing category links (e.g. liquid output)
      if(catCont.querySelectorAll('a.category').length === 0){
        catCont.innerHTML='';
        data.categories.forEach(cat=>{
          const name = cat['name_'+lang]||cat.name_fr;
          const subtitle = staticTranslations.nav?.subtitle?.[lang] || '>> Découvrir';
          const a=document.createElement('a');a.className='category';a.href=cat.link||'#';a.innerHTML=`<img src="${cat.image}" alt="${name}"/><p>${name}</p><span class="subtitle">${subtitle}</span>`;
          catCont.appendChild(a);
        });
      }
    }
    const specCont=document.querySelector('.specialty-list');
    if(specCont && data.specialties){specCont.innerHTML='';data.specialties.forEach(s=>{const name=s['name_'+(localStorage.getItem('lang')||'fr')]||s.name_fr;const d=document.createElement('div');d.className='specialty';d.innerHTML=`<img src="${s.image}" alt="${name}"/><p>${name}</p>`;specCont.appendChild(d);});}
  }).catch(()=>{});
  // End of dynamic content loading
});

  // Show buyer name in header if logged in
  document.addEventListener('DOMContentLoaded', function() {
    var buyerName = localStorage.getItem('buyerName');
    var buyerNameSpan = document.getElementById('buyer-name');
    if (buyerName && buyerNameSpan) {
      buyerNameSpan.textContent = buyerName;
      buyerNameSpan.style.display = 'inline';
    } else if (buyerNameSpan) {
      buyerNameSpan.textContent = '';
      buyerNameSpan.style.display = 'none';
    }
  });

// Move profile translations into staticTranslations
// Add this inside staticTranslations if not already present:
// staticTranslations.profile = {
//   all_profiles: {
//     fr: "Voir tous les profils",
//     en: "View all profiles",
//     pt: "Ver todos os perfis"
//   },
//   settings_privacy: {
//     fr: "Paramètres & confidentialité",
//     en: "Settings & privacy",
//     pt: "Configurações & privacidade"
//   },
//   orders_history: {
//     fr: "Historique des commandes",
//     en: "Order history",
//     pt: "Histórico de pedidos"
//   },
//   help_support: {
//     fr: "Aide & support",
//     en: "Help & support",
//     pt: "Ajuda & suporte"
//   },
//   display_accessibility: {
//     fr: "Affichage & accessibilité",
//     en: "Display & accessibility",
//     pt: "Exibição & acessibilidade"
//   },
//   feedback: {
//     fr: "Retour (CTRL B)",
//     en: "Feedback (CTRL B)",
//     pt: "Feedback (CTRL B)"
//   },
//   logout: {
//     fr: "Déconnexion",
//     en: "Logout",
//     pt: "Sair"
//   }
// };

