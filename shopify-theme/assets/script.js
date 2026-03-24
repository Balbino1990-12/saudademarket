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

  // simple dictionary for static translations (nav + header + pages)
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
    },
    hero: {
      intro: {fr:"Découvrez les",pt:"Descubra os",en:"Discover the"},
      highlight: {fr:"Saveurs du Portugal",pt:"Sabores de Portugal",en:"Flavors of Portugal"},
      sub: {fr:"Livrées en France",pt:"Entregues em França",en:"Delivered to France"},
      features: {
        authentic: {fr:"Produits authentiques",pt:"Produtos autênticos",en:"Authentic products"},
        delivery: {fr:"Livraison rapide",pt:"Entrega rápida",en:"Fast delivery"},
        secure: {fr:"Paiement sécurisé",pt:"Pagamento seguro",en:"Secure payment"}
      },
      cta: {fr:"DÉCOUVRIR LA BOUTIQUE →",pt:"CONHECER A LOJA →",en:"SHOP NOW →"}
    },
    header: {
      search: {fr:"Rechercher un produit...",pt:"Pesquisar um produto...",en:"Search for a product..."},
      account: {fr:"Mon compte",pt:"Minha conta",en:"Account"},
      cart: {fr:"Panier",pt:"Carrinho",en:"Cart"}
    },
    features: {
      authentic: {fr:"PRODUITS AUTHENTIQUES DU PORTUGAL",pt:"PRODUTOS AUTÊNTICOS DE PORTUGAL",en:"Authentic products from Portugal"},
      delivery: {fr:"LIVRAISON RAPIDE EN FRANCE",pt:"ENTREGA RÁPIDA EM FRANÇA",en:"Fast delivery to France"},
      secure: {fr:"PAIEMENT SÉCURISÉ",pt:"PAGAMENTO SEGURO",en:"Secure payment"},
      support: {fr:"SERVICE CLIENT EN FRANÇAIS",pt:"ATENDIMENTO AO CLIENTE EM INGLÊS",en:"Customer service in English"}
    },
    specialties: {
      heading: {fr:"Nos Spécialités Portugaises",pt:"Nossas Especialidades Portuguesas",en:"Our Portuguese Specialties"}
    },
    pages: {
      produits: {
        title: {fr:"Nos Produits",pt:"Nossos Produtos",en:"Our Products"},
        description: {fr:"Explorez notre sélection complète de produits portugais authentiques et délicieux, spécialement importés pour vous.",pt:"Explore nossa seleção completa de produtos portugueses autênticos e deliciosos, especialmente importados para você.",en:"Explore our complete selection of authentic and delicious Portuguese products, specially imported for you."}
      },
      produtos: {
        title: {fr:"Nos Produits",pt:"Nossos Produtos",en:"Our Products"},
        description: {fr:"Explorez notre sélection complète de produits portugais authentiques et délicieux, spécialement importés pour vous.",pt:"Explore nossa seleção completa de produtos portugueses autênticos e deliciosos, especialmente importados para você.",en:"Explore our complete selection of authentic and delicious Portuguese products, specially imported for you."}
      },
      specialites: {
        title: {fr:"Nos Spécialités Portugaises",pt:"Nossas Especialidades Portuguesas",en:"Our Portuguese Specialties"},
        description: {fr:"Découvrez les spécialités les plus savoureuses et authentiques du Portugal, sélectionnées avec soin pour vous.",pt:"Descubra as especialidades mais saborosas e autênticas de Portugal, selecionadas com cuidado para você.",en:"Discover the most delicious and authentic specialties from Portugal, carefully selected for you."}
      },
      especialidades: {
        title: {fr:"Nos Spécialités Portugaises",pt:"Nossas Especialidades Portuguesas",en:"Our Portuguese Specialties"},
        description: {fr:"Découvrez les spécialités les plus savoureuses et authentiques du Portugal, sélectionnées avec soin pour vous.",pt:"Descubra as especialidades mais saborosas e autênticas de Portugal, selecionadas com cuidado para você.",en:"Discover the most delicious and authentic specialties from Portugal, carefully selected for you."}
      },
      vins: {
        title: {fr:"Vin & Porto Portugais",pt:"Vinhos e Porto Portugueses",en:"Portuguese Wine & Port"},
        description: {fr:"Explorez notre sélection exclusive de vins et Portos de qualité supérieure, directement du Portugal.",pt:"Explore nossa seleção exclusiva de vinhos e Portos de qualidade superior, diretamente de Portugal.",en:"Explore our exclusive selection of premium wines and Ports, straight from Portugal."}
      },
      vinhos: {
        title: {fr:"Vin & Porto Portugais",pt:"Vinhos e Porto Portugueses",en:"Portuguese Wine & Port"},
        description: {fr:"Explorez notre sélection exclusive de vins et Portos de qualité supérieure, directement du Portugal.",pt:"Explore nossa seleção exclusiva de vinhos e Portos de qualidade superior, diretamente de Portugal.",en:"Explore our exclusive selection of premium wines and Ports, straight from Portugal."}
      },
      epicerie: {
        title: {fr:"Notre Épicerie",pt:"Nossa Mercearia",en:"Our Grocery"},
        description: {fr:"Trouvez tous les produits de base essentiels pour cuisiner les plats portugais traditionnels authentiques.",pt:"Encontre todos os produtos essenciais para cozinhar os pratos portugueses tradicionais autênticos.",en:"Find all the essential ingredients for cooking authentic traditional Portuguese dishes."}
      },
      mercaria: {
        title: {fr:"Notre Épicerie",pt:"Nossa Mercearia",en:"Our Grocery"},
        description: {fr:"Trouvez tous les produits de base essentiels pour cuisiner les plats portugais traditionnels authentiques.",pt:"Encontre todos os produtos essenciais para cozinhar os pratos portugueses tradicionais autênticos.",en:"Find all the essential ingredients for cooking authentic traditional Portuguese dishes."}
      },
      coffrets: {
        title: {fr:"Coffrets Gourmands",pt:"Cabazes Gourmet",en:"Gourmet Gift Baskets"},
        description: {fr:"Offrez les saveurs du Portugal avec nos coffrets cadeaux luxueux et authentiques, parfaits pour tous les occasions.",pt:"Presenteie com os sabores de Portugal através dos nossos cabazes de presentes luxuosos e autênticos, perfeitos para todas as ocasiões.",en:"Give the flavors of Portugal with our luxurious and authentic gift baskets, perfect for any occasion."}
      },
      cabazes: {
        title: {fr:"Coffrets Gourmands",pt:"Cabazes Gourmet",en:"Gourmet Gift Baskets"},
        description: {fr:"Offrez les saveurs du Portugal avec nos coffrets cadeaux luxueux et authentiques, parfaits pour tous les occasions.",pt:"Presenteie com os sabores de Portugal através dos nossos cabazes de presentes luxuosos e autênticos, perfeitos para todas as ocasiões.",en:"Give the flavors of Portugal with our luxurious and authentic gift baskets, perfect for any occasion."}
      },
      apropos: {
        title: {fr:"À Propos de Nous",pt:"Sobre Nós",en:"About Us"},
        description: {fr:"Portugalsstore.fr est votre source de confiance pour les produits portugais authentiques et de qualité, livrés directement en France.",pt:"PortugalStore.fr é sua fonte confiável de produtos portugueses autênticos e de qualidade, entregues diretamente em Portugal.",en:"PortugalStore.fr is your trusted source for authentic and quality Portuguese products, delivered straight to your door."}
      },
      sobre: {
        title: {fr:"À Propos de Nous",pt:"Sobre Nós",en:"About Us"},
        description: {fr:"Portugalsstore.fr est votre source de confiance pour les produits portugais authentiques et de qualité, livrés directement en France.",pt:"PortugalStore.fr é sua fonte confiável de produtos portugueses autênticos e de qualidade, entregues diretamente em Portugal.",en:"PortugalStore.fr is your trusted source for authentic and quality Portuguese products, delivered straight to your door."}
      },
      contact: {
        title: {fr:"Nous Contacter",pt:"Entre em Contato",en:"Contact Us"},
        description: {fr:"Avez des questions ? Notre service client en français est prêt à vous aider. Contactez-nous pour tout renseignement sur nos produits.",pt:"Tem dúvidas? Gostaríamos de ouvir de você. Entre em contato conosco e responderemos o mais rápido possível.",en:"Have questions? Our customer service is ready to help you. Contact us for any information about our products."}
      },
      contactos: {
        title: {fr:"Nous Contacter",pt:"Entre em Contato",en:"Contact Us"},
        description: {fr:"Avez des questions ? Notre service client en français est prêt à vous aider. Contactez-nous pour tout renseignement sur nos produits.",pt:"Tem dúvidas? Gostaríamos de ouvir de você. Entre em contato conosco e responderemos o mais rápido possível.",en:"Have questions? Our customer service is ready to help you. Contact us for any information about our products."}
      }
    }
  };

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

  // menu toggle for mobile
  const menuToggle = document.getElementById('menuToggle');
  const themeNav = document.querySelector('nav.theme-nav');
  if(menuToggle && themeNav){
    menuToggle.style.display = 'none'; // originally hidden, CSS handles display
    menuToggle.addEventListener('click', ()=>{
      themeNav.classList.toggle('active');
    });
  }

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
});
