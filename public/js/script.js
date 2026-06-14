document.addEventListener('DOMContentLoaded', () => {
    // Redirect any non-existing page route back to index
    const validRoutes = new Set([
        '/',
        '/index.html',
        '/produits.html',
        '/produtos.html',
        '/produits.html',
        '/specialites.html',
        '/especialidades.html',
        '/cabazes.html',
        '/epicerie.html',
        '/coffrets.html',
        '/vin-porto.html',
        '/vinhos-porto.html',
        '/mercaria.html',
        '/apropos.html',
        '/sobre.html',
        '/contact.html',
        '/contactos.html',
        '/cart.html',
        '/checkout.html',
        '/user/login.html',
        '/buyer-profile.html',
        '/buyer-cart.html',
        '/order-history.html',
        '/settings.html',
        '/profiles.html',
        '/help-support.html',
        '/display-accessibility.html',
        '/feedback.html'
    ]);

    const currentPath = window.location.pathname.replace(/\/+$/, '');
    const normalizedPath = currentPath === '' ? '/' : currentPath;
    const isCartHistoryRoute = normalizedPath.startsWith('/cart.html');

    // Normalize nav links to absolute paths to avoid relative resolution from /cart.html/XYZ.
    document.querySelectorAll('nav a').forEach((anchor) => {
        const href = anchor.getAttribute('href');
        if (href && !href.startsWith('/') && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#') && !href.startsWith('mailto:')) {
            anchor.setAttribute('href', `/${href}`);
        }
    });

    // Global storage for specialties data
    let specialtiesData = [];

    // Helper to load specialties from backend API with fallback to static data.json
    function loadSpecialtiesData() {
        return fetch('/api/specialties')
            .then(r => {
                if (!r.ok) throw new Error('API specialties not available');
                return r.json();
            })
            .then(apiData => {
                // normalize possible shapes: {data: [...] } or array
                const items = Array.isArray(apiData) ? apiData : (Array.isArray(apiData.data) ? apiData.data : []);
                if (items.length) return items;
                throw new Error('Empty API specialties');
            })
            .catch(() => {
                // fallback to static file
                return fetch('/data.json')
                    .then(r => r.json())
                    .then(data => Array.isArray(data.specialties) ? data.specialties : [] )
                    .catch(err => { console.error('Failed to load specialties data:', err); return []; });
            });
    }

    // Dynamically add specialties to header menu (try API first)
    loadSpecialtiesData().then(items => {
        specialtiesData = items || [];
        buildSpecialtyMenu(typeof currentLang !== 'undefined' ? currentLang : (localStorage.getItem('lang') || 'fr'));
    }).catch(err => console.error('Failed to load specialties data:', err));

    // Real-time updates: try socket events first, fallback to polling
    function refreshSpecialtiesIfChanged(newItems) {
        try {
            const oldSlugs = (specialtiesData || []).map(s => ((s.name_en||s.name_fr||'') .toString().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,''))).join('|');
            const newSlugs = (newItems || []).map(s => ((s.name_en||s.name_fr||'') .toString().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,''))).join('|');
            if (oldSlugs !== newSlugs) {
                specialtiesData = newItems || [];
                const lang = typeof currentLang !== 'undefined' ? currentLang : (localStorage.getItem('lang') || 'fr');
                buildSpecialtyMenu(lang);
                // update homepage tiles if present
                if (typeof specialtiesContainer !== 'undefined' && specialtiesContainer) {
                    specialtiesContainer.innerHTML = '';
                    specialtiesData.forEach(sp => {
                        const div = document.createElement('div');
                        div.className = 'specialty';
                        const displayName = sp['name_' + lang] || sp.name_fr || sp.name_en || '';
                        div.innerHTML = `\n                            <img src="${sp.image || '/images/placeholder.jpg'}" alt="${(displayName||'').replace(/\"/g,'')}" />\n                            <p>${displayName}</p>\n                        `;
                        div.style.cursor = 'pointer';
                        div.addEventListener('click', () => {
                            const baseName = sp.name_en || sp['name_' + lang] || sp.name_fr || '';
                            const slug = String(baseName || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
                            window.location.href = `specialites.html?name=${encodeURIComponent(slug)}`;
                        });
                        specialtiesContainer.appendChild(div);
                    });
                }
            }
        } catch (err) { console.warn('Failed to refresh specialties:', err); }
    }

    // Socket.io based live update (if socket available)
    const liveSocket = (window.io && typeof io === 'function') ? io() : null;
    if (liveSocket) {
        liveSocket.on('specialties_updated', () => {
            loadSpecialtiesData().then(refreshSpecialtiesIfChanged).catch(() => {});
        });
        liveSocket.on('specialties.update', () => {
            loadSpecialtiesData().then(refreshSpecialtiesIfChanged).catch(() => {});
        });
    }

    // Polling fallback: every 30 seconds
    setInterval(() => {
        loadSpecialtiesData().then(refreshSpecialtiesIfChanged).catch(() => {});
    }, 30000);

    // Function to build/rebuild specialty menu items
    function buildCategoryMenu(lang) {
        const row = document.getElementById('headerCategoryRow');
        if (!row) return;

        const categoriesToUse = Array.isArray(categoryData) && categoryData.length
            ? categoryData
            : (Array.isArray(window.__STATIC_CATEGORIES__) ? window.__STATIC_CATEGORIES__ : []);

        row.innerHTML = '';

        if (!categoriesToUse.length) return;

        categoriesToUse.slice(0, 8).forEach(cat => {
            const label = getCategoryDisplayName(cat, lang) || cat.name_fr || cat.name_en || '';
            const id = cat.id || cat.category_id || '';
            const href = id ? getCategoryRoutePath(id) : (cat.link || '/produits.html');
            const chip = document.createElement('a');
            chip.className = 'header-category-chip';
            chip.href = href;
            chip.textContent = label;
            row.appendChild(chip);
        });
    }

    function buildSpecialtyMenu(lang) {
        if (!specialtiesData || specialtiesData.length === 0) return;

        const anchor = document.getElementById('specialties-menu-anchor');
        if (!anchor) return;

        // Remove existing specialty menu items (but keep the anchor)
        const nav = anchor.parentNode;
        const existingSpecialtyItems = nav.querySelectorAll('li');
        existingSpecialtyItems.forEach(li => {
            if (li.id !== 'specialties-menu-anchor' && li.querySelector('a[href*="specialites.html"]')) {
                li.remove();
            }
        });

        // Add specialty menu items with current language
        specialtiesData.forEach(spec => {
            const name = spec[`name_${lang}`] || spec.name_fr || spec.name_en || spec.name_pt;
            const slug = (name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
            const li = document.createElement('li');
            li.innerHTML = `<a href="/specialites.html?name=${encodeURIComponent(slug)}">${name}</a>`;
            anchor.parentNode.insertBefore(li, anchor);
        });

        // After adding items, attach click handlers to persist selected specialty and restore active state
        const specialtyLinks = Array.from(anchor.parentNode.querySelectorAll('a[href*="specialites.html"]'));
        specialtyLinks.forEach(a => {
            a.addEventListener('click', (e) => {
                const href = a.getAttribute('href') || '';
                const m = href.match(/name=([^&]+)/);
                if (m && m[1]) {
                    try { localStorage.setItem('activeSpecialty', decodeURIComponent(m[1])); } catch (err) { localStorage.setItem('activeSpecialty', m[1]); }
                }
            });
        });

        // If user previously selected a specialty, mark it active now and ensure PRODUCTS is not active
        try {
            const saved = localStorage.getItem('activeSpecialty');
            if (saved) {
                const savedLink = specialtyLinks.find(a => (a.getAttribute('href')||'').includes(saved));
                if (savedLink) {
                    specialtyLinks.forEach(x => x.classList.remove('active'));
                    savedLink.classList.add('active');
                    // remove PRODUCTS active state if present
                    const prodAnchor = document.querySelector('nav a[data-i18n="nav.products"]');
                    if (prodAnchor) prodAnchor.classList.remove('active');
                }
            }
        } catch (e) { /* ignore */ }
    }

    // Set active class on nav anchors
    function setActiveNavByI18n(key) {
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        const target = document.querySelector(`nav a[data-i18n="${key}"]`);
        if (target) target.classList.add('active');
    }

    // Read buyer display name from localStorage (used to show name in header)
    function getBuyerDisplayName() {
        try {
            const explicit = localStorage.getItem('buyerName');
            if (explicit) return explicit;
            const cur = localStorage.getItem('currentUser');
            if (!cur) return null;
            const u = JSON.parse(cur || '{}');
            return (u.first_name || u.name || u.username || (u.last_name && u.first_name ? `${u.first_name} ${u.last_name}` : '')) || null;
        } catch (e) {
            return null;
        }
    }

    function showBuyerNameIfLogged() {
        const name = getBuyerDisplayName();
        if (!name) return;
        const actions = document.querySelector('.header-actions');
        if (!actions) return;
        let span = document.getElementById('buyer-name');
        if (!span) {
            span = document.createElement('span');
            span.id = 'buyer-name';
            span.className = 'header-buyer';
            const cart = actions.querySelector('.icon.cart');
            if (cart) cart.insertAdjacentElement('afterend', span);
            else actions.appendChild(span);
        }
        // Build icon + text safely
        span.innerHTML = '';
        const icon = document.createElement('span');
        icon.className = 'buyer-icon';
        icon.innerHTML = '<i class="fa fa-user" aria-hidden="true"></i>';
        const text = document.createElement('span');
        text.className = 'buyer-text';
        text.textContent = name;
        span.appendChild(icon);
        span.appendChild(text);
        span.style.display = 'inline-flex';
    }

    

    // When any specialty menu link is clicked, mark the PRODUCTS nav item active
    document.addEventListener('click', (ev) => {
        const a = ev.target.closest && ev.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (href.includes('specialites.html')) {
            // Persist selected specialty slug (if present) so it can be re-highlighted after navigation
            const m = href.match(/name=([^&]+)/);
            if (m && m[1]) {
                try { localStorage.setItem('activeSpecialty', decodeURIComponent(m[1])); } catch (err) { localStorage.setItem('activeSpecialty', m[1]); }
            }
            // Do not mark PRODUCTS active here; the specialty link itself will be highlighted on the specialties page.
            return;
        }
        // If user clicks PRODUCTS or any other main nav directly, clear saved specialty and mark the clicked nav active
        if (a.dataset && a.dataset.i18n) {
            try { localStorage.removeItem('activeSpecialty'); } catch (e) {}
            setActiveNavByI18n(a.dataset.i18n);
            // show buyer name for PRODUCTS click as well
            if (a.dataset.i18n === 'nav.products') showBuyerNameIfLogged();
        }
    });

    // On page load, set active nav based on current location and query params
    function markActiveFromLocation() {
        const params = new URLSearchParams(window.location.search);
        // If we're on the specialties listing with a selected name, highlight the chosen specialty only
        if (normalizedPath.endsWith('/specialites.html') || normalizedPath === '/specialites.html' || window.location.pathname.endsWith('/specialites.html')) {
            const name = params.get('name') || (function(){ try { return localStorage.getItem('activeSpecialty'); } catch(e){ return null; } })();
            // remove any existing nav active states
            document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
            if (name) {
                // try to find the dynamically-inserted specialty link and mark it active
                const specLink = Array.from(document.querySelectorAll('nav a')).find(a => {
                    const h = a.getAttribute('href') || '';
                    return h.includes('specialites.html') && h.includes(name);
                });
                if (specLink) {
                    specLink.classList.add('active');
                    // when specialty is active, show buyer name if logged (same as PRODUCTS behavior)
                    showBuyerNameIfLogged();
                }
            }
            return;
        }

        // Default: mark nav item whose href matches current path
        document.querySelectorAll('nav a').forEach(a => {
            const href = (a.getAttribute('href') || '').replace(/\/+$/g, '');
            const cur = normalizedPath.replace(/^\//, '');
            if (href === cur || ('/' + href) === normalizedPath) {
                a.classList.add('active');
                if (a.dataset && a.dataset.i18n === 'nav.products') showBuyerNameIfLogged();
            }
        });
    }

    // Run after initial DOM setup
    markActiveFromLocation();


    function normalizeProductNameRoute(name) {
        if (!name) return '';
        return encodeURIComponent(name.trim());
    }

    function slugify(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function getCategoryPathPrefix(path) {
        if (path.startsWith('/produtos')) return '/produtos/categoria';
        if (path.startsWith('/products')) return '/products/category';
        return '/produits/categorie';
    }

    function getCategoryRoutePath(categoryIdOrName) {
        if (!categoryIdOrName) return '/produits.html';
        // If it's a name string, slugify it; if it's a number, use it as-is
        const pathComponent = /^\d+$/.test(String(categoryIdOrName)) 
            ? categoryIdOrName 
            : slugify(String(categoryIdOrName));
        return `${getCategoryPathPrefix(normalizedPath)}/${pathComponent}`;
    }

    function getCategoryIdFromPath(path) {
        const match = path.match(/\/(?:produits\/categorie|produtos\/categoria|products\/category)\/([a-z0-9\-]+)/i);
        return match ? match[1] : null;
    }

    function renderRatingStars(ratingValue) {
        const roundedValue = Math.round(Math.max(0, Math.min(5, Number(ratingValue) || 0)) * 2) / 2;
        const fullStars = Math.floor(roundedValue);
        const halfStar = roundedValue - fullStars === 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
        let stars = '';

        for (let i = 0; i < fullStars; i += 1) {
            stars += '<span class="star full" aria-hidden="true">★</span>';
        }

        if (halfStar) {
            stars += '<span class="star half" aria-hidden="true">★</span>';
        }

        for (let i = 0; i < emptyStars; i += 1) {
            stars += '<span class="star empty" aria-hidden="true">â˜†</span>';
        }

        return stars;
    }

    const PRODUCTS_PER_PAGE = 15; // show 15 products per page on produits list
    let currentProductsOriginal = [];
    let currentProducts = [];
    let currentProductsLang = 'fr';
    let currentProductsPage = 1;
    let currentProductSort = 'price_asc';
    let currentProductStockFilter = 'all';
    let currentProductCategoryFilter = 'all';
    let productToolbarInitialized = false;

    const productFilterSelect = document.getElementById('productFilter');
    const productSortSelect = document.getElementById('productSort');
    const productCategoryFilterSelect = document.getElementById('productCategoryFilter');

    const savedProductsKey = 'savedProducts';
    const savedCountEl = document.getElementById('savedCount');
    const viewSavedProductsBtn = document.getElementById('viewSavedProductsBtn');
    const savedProductsModal = document.getElementById('savedProductsModal');
    const savedProductsList = document.getElementById('savedProductsList');
    const savedProductsEmpty = document.getElementById('savedProductsEmpty');
    const closeSavedProductsModalBtn = document.getElementById('closeSavedProductsModal');

    const isProductNameRoute = /^\/produits\/.+|^\/produtos\/.+|^\/products\/.+/i.test(normalizedPath);
    const isCategoryListingRoute = /^\/produits\/categorie\/[a-z0-9\-]+|^\/produtos\/categoria\/[a-z0-9\-]+|^\/products\/category\/[a-z0-9\-]+/i.test(normalizedPath);

    function loadSavedProducts() {
        try {
            return JSON.parse(localStorage.getItem(savedProductsKey) || '{}');
        } catch {
            return {};
        }
    }

    function saveSavedProducts(data) {
        localStorage.setItem(savedProductsKey, JSON.stringify(data || {}));
    }

    function isProductSaved(productId) {
        const saved = loadSavedProducts();
        return Boolean(saved && saved[productId]);
    }

    function updateSavedCountLabel() {
        if (!savedCountEl) return;
        const count = Object.keys(loadSavedProducts()).length;
        savedCountEl.textContent = String(count);
    }

    function trackAnalyticsPageView() {
        try {
            const payload = {
                path: window.location.pathname,
                referrer: document.referrer || '',
                userAgent: navigator.userAgent || '',
                timestamp: new Date().toISOString()
            };

            fetch('/api/analytics/pageview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).catch(() => {
                // Ignore tracking failures on the client
            });
        } catch (err) {
            console.warn('Analytics pageview tracking failed:', err);
        }
    }

    function setProductCardSavedState(card, saved) {
        if (!card) return;
        const btn = card.querySelector('.save-product-btn');
        if (!btn) return;
        updateSaveButtonState(btn, saved);
    }

    function updateSaveButtonState(button, saved) {
        if (!button) return;
        button.classList.toggle('saved', saved);
        button.textContent = saved ? (translations[currentProductsLang]?.['product.saved_state'] || 'Saved') : (translations[currentProductsLang]?.['product.save'] || 'Save');
    }

        let translations = {};
        let currentLang = localStorage.getItem('lang') || 'fr';
        let lang = currentLang;
        window.translations = translations;
        window.lang = lang;
        window.currentLang = currentLang;

        function toggleSavedProduct(item) {
            if (!item || !item.id) return;
            const saved = loadSavedProducts();
            const productId = String(item.id);
            if (saved[productId]) {
                delete saved[productId];
            } else {
                saved[productId] = {
                    id: String(item.id),
                    name: item.name || '',
                    price: Number(item.price) || 0,
                    image: item.image || '',
                    savedAt: new Date().toISOString()
                };
            }

        saveSavedProducts(saved);
        updateSavedCountLabel();
        renderSavedProductsModal();
    }

    function openSavedProductsModal() {
        if (!savedProductsModal) return;
        renderSavedProductsModal();
        savedProductsModal.classList.add('active');
        savedProductsModal.setAttribute('aria-hidden', 'false');
    }

    function closeSavedProductsModal() {
        if (!savedProductsModal) return;
        savedProductsModal.classList.remove('active');
        savedProductsModal.setAttribute('aria-hidden', 'true');
    }

    function renderSavedProductsModal() {
        if (!savedProductsModal || !savedProductsList || !savedProductsEmpty) return;
        const savedItems = Object.values(loadSavedProducts());
        savedProductsList.innerHTML = '';

        if (savedItems.length === 0) {
            savedProductsEmpty.style.display = 'block';
            return;
        }

        savedProductsEmpty.style.display = 'none';

        savedItems.forEach(item => {
            const row = document.createElement('div');
            row.className = 'saved-product-row';

            const info = document.createElement('div');
            info.className = 'saved-product-info';
            const title = document.createElement('strong');
            title.textContent = item.name || `Product ${item.id}`;
            const meta = document.createElement('span');
            meta.textContent = `EUR ${Number(item.price || 0).toFixed(2)}`;
            info.appendChild(title);
            info.appendChild(meta);

            const actions = document.createElement('div');
            actions.className = 'saved-product-actions';

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'add-to-cart-btn';
            addBtn.textContent = translations[currentProductsLang]?.['product.add_to_cart'] || 'Add to cart';
            addBtn.addEventListener('click', () => {
                addToCart({ id: item.id, name: item.name, price: Number(item.price || 0) });
            });

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-saved-btn';
            removeBtn.textContent = translations[currentProductsLang]?.['product.remove'] || 'Remove';
            removeBtn.addEventListener('click', () => {
                const saved = loadSavedProducts();
                delete saved[String(item.id)];
                saveSavedProducts(saved);
                updateSavedCountLabel();
                setProductCardSavedState(document.querySelector(`.category[data-product-id="${item.id}"]`), false);
                renderSavedProductsModal();
            });

            actions.appendChild(addBtn);
            actions.appendChild(removeBtn);
            row.appendChild(info);
            row.appendChild(actions);
            savedProductsList.appendChild(row);
        });
    }

    if (viewSavedProductsBtn) {
        viewSavedProductsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openSavedProductsModal();
        });
    }

    if (closeSavedProductsModalBtn) {
        closeSavedProductsModalBtn.addEventListener('click', closeSavedProductsModal);
    }

    if (savedProductsModal) {
        savedProductsModal.addEventListener('click', (e) => {
            if (e.target === savedProductsModal) {
                closeSavedProductsModal();
            }
        });
    }

    updateSavedCountLabel();

    if (!isProductNameRoute) {
        // store source page for return routing in detail view
        sessionStorage.setItem('originPage', window.location.pathname + window.location.search);
    }

    if (!validRoutes.has(normalizedPath) && !isProductNameRoute && !isCategoryListingRoute && !isCartHistoryRoute) {
        window.location.replace('/index.html');
        return;
    }

    // Ensure profile button is after language selector in all pages
    const profileBtn = document.getElementById('profileBtn');
    const langContainer = document.querySelector('.language-selector');
    if (profileBtn && langContainer && langContainer.parentNode) {
        langContainer.parentNode.insertBefore(profileBtn, langContainer.nextSibling);
        const profileDropdown = document.getElementById('profileDropdown');
        if (profileDropdown) {
            langContainer.parentNode.insertBefore(profileDropdown, profileBtn.nextSibling);
        }
    }

    function getLoginLabel(lang) {
        const fallback = { fr: 'Connexion', en: 'Login', pt: 'Entrar' };
        if (translations && translations[lang] && typeof translations[lang]['login.button'] === 'string' && translations[lang]['login.button'].trim().length > 0) {
            return translations[lang]['login.button'];
        }
        return fallback[lang] || fallback.fr;
    }

    function createProfileButtonHtml(label) {
        const buttonLabel = label || getLoginLabel(currentLang);
        return `<svg class="profile-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span class="profile-label">${buttonLabel}</span>`;
    }

    function getProductCategoryName(product, lang) {
        if (!product || typeof product !== 'object') return '';
        return (product[`category_name_${lang}`] || product.category_name || product.category || product.category_name_en || product.category_name_fr || product.category_name_pt || '').toString().trim();
    }

    function getCategoryDisplayName(category, lang) {
        if (!category || typeof category !== 'object') return '';
        return (category[`name_${lang}`] || category.name_en || category.name_fr || category.name_pt || category.name || '').toString().trim();
    }

    function isImagePath(value) {
        return typeof value === 'string' && (/^(\/images\/|https?:\/\/).+\.(jpe?g|png|gif|webp)$/i).test(value);
    }

    let dbCategories = [];
    let categoryFilterMap = {};

    function buildCategoryTree(categories, lang) {
        const categoryMap = new Map();
        categories.forEach(category => {
            const id = Number(category.id);
            categoryMap.set(id, {
                ...category,
                id,
                parent_id: category.parent_id !== undefined && category.parent_id !== null ? Number(category.parent_id) : null,
                children: []
            });
        });

        const roots = [];
        categoryMap.forEach(category => {
            if (category.parent_id && categoryMap.has(category.parent_id) && category.parent_id !== category.id) {
                categoryMap.get(category.parent_id).children.push(category);
            } else {
                roots.push(category);
            }
        });

        function sortTree(nodes) {
            nodes.sort((a, b) => {
                const nameA = getCategoryDisplayName(a, lang) || '';
                const nameB = getCategoryDisplayName(b, lang) || '';
                return nameA.localeCompare(nameB, getLocaleForLanguage(lang), { sensitivity: 'base' });
            });
            nodes.forEach(node => {
                if (node.children && node.children.length) {
                    sortTree(node.children);
                }
            });
        }

        sortTree(roots);
        return roots;
    }

    function buildCategoryDescendantMap(tree, lang) {
        const map = {};

        function collect(node) {
            const label = getCategoryDisplayName(node, lang) || '';
            const descendants = [label];
            node.children.forEach(child => {
                const childDescendants = collect(child);
                descendants.push(...childDescendants);
            });
            map[label] = descendants;
            return descendants;
        }

        tree.forEach(root => collect(root));
        return map;
    }

    function appendCategoryOption(category, select, lang, depth = 0) {
        const label = getCategoryDisplayName(category, lang) || '';
        const option = document.createElement('option');
        option.value = label;
        option.textContent = `${'— '.repeat(depth)}${label}`;
        select.appendChild(option);

        if (category.children && category.children.length) {
            category.children.forEach(child => appendCategoryOption(child, select, lang, depth + 1));
        }
    }

    // Ensure AI chat widget is available on all pages that include script.js
    (function ensureChatWidget() {
        function createWidgetHtml() {
            const container = document.createElement('div');
            container.id = 'aiChatWidget';
            container.setAttribute('aria-hidden', 'true');
            container.innerHTML = `
                <div id="aiChatLauncher" title="Live Chat">💬</div>
                <div id="aiChatPanel">
                    <div id="aiChatHeader">
                        <strong>Live Chat</strong>
                        <button id="aiChatClose">✕</button>
                    </div>
                    <div id="aiChatMessages" role="log" aria-live="polite"></div>
                    <form id="aiChatForm">
                        <textarea id="aiChatInput" rows="2" placeholder="Type your message..."></textarea>
                        <button type="submit" id="aiChatSend">Send</button>
                    </form>
                </div>
            `;

            const style = document.createElement('style');
            style.textContent = `
                #aiChatWidget { position: fixed; right: 18px; bottom: 18px; z-index: 9999; font-family: Inter, "Segoe UI", Arial, sans-serif; }
                #aiChatLauncher { width: 60px; height: 60px; border-radius: 999px; background: linear-gradient(135deg, #c41e1e 0%, #a31717 100%); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 30px rgba(196, 30, 30, 0.28); cursor: pointer; font-size: 1.05rem; font-weight: 700; letter-spacing: 0.02em; border: 1px solid rgba(255,255,255,0.18); transition: transform 0.18s ease, box-shadow 0.18s ease; }
                #aiChatLauncher:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 18px 36px rgba(196, 30, 30, 0.34); }
                #aiChatPanel { display:none; width: 360px; max-width: calc(100vw - 24px); height: 460px; background: #fff; border-radius: 18px; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.18); overflow: hidden; margin-bottom: 10px; border: 1px solid #e5eefb; }
                #aiChatHeader { background: linear-gradient(135deg, #c41e1e 0%, #a31717 100%); color: #fff; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
                #aiChatHeader strong { font-size: 0.98rem; }
                #aiChatMessages { padding: 12px; height: calc(100% - 150px); overflow: auto; background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%); }
                .ai-msg { margin-bottom: 10px; padding: 9px 11px; border-radius: 14px; max-width: 88%; font-size: 0.92rem; line-height: 1.4; box-shadow: 0 6px 14px rgba(148, 163, 184, 0.12); }
                .ai-msg.user { background: linear-gradient(135deg, #c41e1e 0%, #a31717 100%); color: #fff; margin-left: auto; border-bottom-right-radius: 6px; }
                .ai-msg.bot { background: #fff; color: #111827; border: 1px solid #e5efff; border-bottom-left-radius: 6px; }
                #aiChatForm { display:flex; gap:8px; padding: 12px; border-top: 1px solid #edf3ff; background: #fff; }
                #aiChatInput { flex: 1; padding: 10px 12px; border-radius: 12px; border: 1px solid #dbe7ff; resize: none; font-size: 0.92rem; background: #f8fbff; color: #111827; }
                #aiChatInput:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
                #aiChatSend { background: linear-gradient(135deg, #c41e1e 0%, #a31717 100%); color: #fff; border: none; padding: 10px 12px; border-radius: 12px; cursor: pointer; font-weight: 600; box-shadow: 0 8px 16px rgba(196, 30, 30, 0.22); }
                #aiChatSend:hover { filter: brightness(1.03); }
                #aiChatClose { background: rgba(255,255,255,0.12); color: #fff; border: none; width: 28px; height: 28px; border-radius: 999px; font-size: 0.95rem; cursor: pointer; }
                #aiChatClose:hover { background: rgba(255,255,255,0.18); }
            `;

            document.body.appendChild(container);
            document.head.appendChild(style);
        }

        function loadWidgetScript() {
            if (document.querySelector('script[src="/js/chat-widget.js"]')) return;
            const s = document.createElement('script');
            s.src = '/js/chat-widget.js';
            s.defer = true;
            document.body.appendChild(s);
        }

        const existingLauncher = document.getElementById('aiChatLauncher');
        const existingPanel = document.getElementById('aiChatPanel');
        if (!document.getElementById('aiChatWidget') && !(existingLauncher && existingPanel)) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => { createWidgetHtml(); loadWidgetScript(); });
            } else {
                createWidgetHtml(); loadWidgetScript();
            }
        } else {
            // widget already present (page-specific include), still ensure script is loaded
            loadWidgetScript();
        }
    })();

    

    function renderCategorySidebar(tree, lang) {
        const sidebarTree = document.getElementById('productCategorySidebarTree');
        if (!sidebarTree) return;

        sidebarTree.innerHTML = '';

        const allButton = document.createElement('a');
        allButton.className = 'sidebar-category-button';
        allButton.setAttribute('data-category-value', 'all');
        allButton.setAttribute('href', '/produits');
        allButton.textContent = translations[lang]?.['product.filter.category_all'] || 'All categories';
        allButton.addEventListener('click', (e) => {
            e.preventDefault();
            selectSidebarCategory('all', lang);
        });
        sidebarTree.appendChild(allButton);

        tree.forEach(category => {
            sidebarTree.appendChild(createSidebarCategoryNode(category, lang, 0));
        });

        updateCategorySidebarSelection();
    }

    function createSidebarCategoryNode(category, lang, depth) {
        const container = document.createElement('div');
        container.className = 'sidebar-category-item';

        const label = getCategoryDisplayName(category, lang) || '';
        const link = document.createElement('a');
        link.className = 'sidebar-category-button';
        link.setAttribute('data-category-value', label);
        try {
            link.setAttribute('href', getCategoryRoutePath(label));
        } catch (e) {
            link.setAttribute('href', '/produits');
        }
        link.textContent = label;
        link.style.paddingLeft = `${depth * 12 + 14}px`;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            selectSidebarCategory(label, lang);
        });

        container.appendChild(link);

        if (category.children && category.children.length) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'sidebar-category-children';
            category.children.forEach(child => {
                childrenContainer.appendChild(createSidebarCategoryNode(child, lang, depth + 1));
            });
            container.appendChild(childrenContainer);
        }

        return container;
    }

    function selectSidebarCategory(value, lang) {
        currentProductCategoryFilter = value;
        if (productCategoryFilterSelect) {
            productCategoryFilterSelect.value = value;
        }
        updateProductsView(lang);
        updateCategorySidebarSelection();
        try {
            const base = '/produits';
            let newPath = base;
            if (value && value !== 'all') {
                const slug = slugify(value);
                newPath = `${base}/categorie/${slug}`;
            }
            // Only push state if pathname would change
            if (window.location.pathname !== newPath) {
                history.pushState({ productCategory: value }, '', newPath);
            }
        } catch (e) {
            console.warn('Failed to update URL for category selection', e);
        }
    }

    // When user navigates with back/forward, restore category selection if possible
    window.addEventListener('popstate', (ev) => {
        try {
            const path = window.location.pathname || '';
            const match = path.match(/\/produits(?:\.html)?(?:\/categorie\/([^\/]+))?/);
            if (match) {
                const slug = match[1];
                if (!slug) {
                    // go to all
                    currentProductCategoryFilter = 'all';
                    if (productCategoryFilterSelect) productCategoryFilterSelect.value = 'all';
                    updateProductsView(currentProductsLang);
                    updateCategorySidebarSelection();
                    return;
                }

                // try to map slug back to a category label using loaded categories
                const mapKeys = Object.keys(categoryFilterMap || {});
                const found = mapKeys.find(k => slugify(k) === slug);
                if (found) {
                    currentProductCategoryFilter = found;
                    if (productCategoryFilterSelect) productCategoryFilterSelect.value = found;
                    updateProductsView(currentProductsLang);
                    updateCategorySidebarSelection();
                }
            }
        } catch (e) {
            console.warn('popstate handling failed', e);
        }
    });

    function updateCategorySidebarSelection() {
        document.querySelectorAll('.sidebar-category-button').forEach(btn => {
            const val = btn.getAttribute('data-category-value') || 'all';
            if (currentProductCategoryFilter === val) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function loadCategoryFilterFromDb(lang) {
        if (!productCategoryFilterSelect) return Promise.resolve();

        return fetch('/api/categories')
            .then(r => {
                if (!r.ok) throw new Error('Categories endpoint failed');
                return r.json();
            })
            .then(categories => {
                if (!Array.isArray(categories)) throw new Error('Invalid categories response');

                dbCategories = categories;
                const currentValue = productCategoryFilterSelect.value || 'all';
                const translationsForLang = translations[lang] || {};
                const allCategoriesLabel = translationsForLang['product.filter.category_all'] || 'All categories';

                productCategoryFilterSelect.innerHTML = `<option value="all">${allCategoriesLabel}</option>`;

                const categoryTree = buildCategoryTree(categories, lang);
                categoryFilterMap = buildCategoryDescendantMap(categoryTree, lang);

                categoryTree.forEach(category => {
                    const rootLabel = getCategoryDisplayName(category, lang) || '';
                    if (!rootLabel) return;

                    const rootOption = document.createElement('option');
                    rootOption.value = rootLabel;
                    rootOption.textContent = rootLabel;
                    productCategoryFilterSelect.appendChild(rootOption);

                    if (category.children && category.children.length) {
                        category.children.forEach(child => appendCategoryOption(child, productCategoryFilterSelect, lang, 1));
                    }
                });

                if (Object.prototype.hasOwnProperty.call(categoryFilterMap, currentValue)) {
                    productCategoryFilterSelect.value = currentValue;
                } else {
                    productCategoryFilterSelect.value = 'all';
                    currentProductCategoryFilter = 'all';
                }

                renderCategorySidebar(categoryTree, lang);

                // If the page was loaded with a category path, try to select it
                try {
                    const pathSlug = getCategoryIdFromPath(window.location.pathname || '') || null;
                    if (pathSlug) {
                        const mapKeys = Object.keys(categoryFilterMap || {});
                        const found = mapKeys.find(k => slugify(k) === pathSlug);
                        if (found) {
                            currentProductCategoryFilter = found;
                            if (productCategoryFilterSelect) productCategoryFilterSelect.value = found;
                            updateProductsView(lang);
                            updateCategorySidebarSelection();
                        }
                    }
                } catch (e) {
                    console.warn('Failed to apply initial category from URL', e);
                }
            })
            .catch(err => {
                console.warn('Failed to load categories from DB, falling back to product categories:', err);
                populateCategoryFilterOptions(currentProductsOriginal, lang);
            });
    }

    const languageLocales = {
        fr: 'fr-FR',
        en: 'en-US',
        pt: 'pt-PT'
    };

    function getLocaleForLanguage(lang) {
        return languageLocales[lang] || lang || 'fr-FR';
    }

    function getProductToolbarTranslations(lang) {
        const translation = translations[lang] || {};
        return {
            filterLabel: translation['product.toolbar.filter'] || 'Filter by',
            categoryLabel: translation['product.toolbar.category'] || 'Category',
            sortLabel: translation['product.toolbar.sort'] || 'Sort by',
            filterAll: translation['product.filter.all'] || 'All',
            filterInStock: translation['product.filter.in_stock'] || 'In stock',
            filterOutOfStock: translation['product.filter.out_of_stock'] || 'Out of stock',
            categoryAll: translation['product.filter.category_all'] || 'All categories',
            sortPriceAsc: translation['product.sort.price_asc'] || 'Price ascending',
            sortPriceDesc: translation['product.sort.price_desc'] || 'Price descending',
            sortRatingDesc: translation['product.sort.rating_desc'] || 'Best rating',
            sortStockDesc: translation['product.sort.stock_desc'] || 'Best stock'
        };
    }

    function updateProductToolbarLabels(lang) {
        const labels = getProductToolbarTranslations(lang);
        const filterLabel = document.querySelector('label[for="productFilter"]');
        const categoryLabel = document.querySelector('label[for="productCategoryFilter"]');
        const sortLabel = document.querySelector('label[for="productSort"]');

        if (filterLabel && filterLabel.firstChild) {
            filterLabel.firstChild.textContent = `${labels.filterLabel} `;
        }
        if (categoryLabel && categoryLabel.firstChild) {
            categoryLabel.firstChild.textContent = `${labels.categoryLabel} `;
        }
        if (sortLabel && sortLabel.firstChild) {
            sortLabel.firstChild.textContent = `${labels.sortLabel} `;
        }

        if (productFilterSelect) {
            productFilterSelect.innerHTML = `
                <option value="all">${labels.filterAll}</option>
                <option value="in_stock">${labels.filterInStock}</option>
                <option value="out_of_stock">${labels.filterOutOfStock}</option>
            `;
            productFilterSelect.value = currentProductStockFilter;
        }

        if (productSortSelect) {
            productSortSelect.innerHTML = `
                <option value="price_asc">${labels.sortPriceAsc}</option>
                <option value="price_desc">${labels.sortPriceDesc}</option>
                <option value="rating_desc">${labels.sortRatingDesc}</option>
                <option value="stock_desc">${labels.sortStockDesc}</option>
            `;
            productSortSelect.value = currentProductSort;
        }
    }

    function applyProductFiltersAndSort(products, lang) {
        let list = Array.isArray(products) ? products.slice() : [];

        if (currentProductStockFilter === 'in_stock') {
            list = list.filter(p => Number(p.quantity) > 0);
        } else if (currentProductStockFilter === 'out_of_stock') {
            list = list.filter(p => Number(p.quantity) <= 0);
        }

        if (currentProductCategoryFilter && currentProductCategoryFilter !== 'all') {
            const selected = currentProductCategoryFilter.toLowerCase();
            const allowed = categoryFilterMap[currentProductCategoryFilter] || [currentProductCategoryFilter];
            const allowedLower = allowed.map(name => name.toLowerCase());
            list = list.filter(p => {
                const categoryName = getProductCategoryName(p, lang).toLowerCase();
                return allowedLower.includes(categoryName);
            });
        }

        const sortValue = currentProductSort;
        list.sort((a, b) => {
            const priceA = parseFloat(a.price) || 0;
            const priceB = parseFloat(b.price) || 0;
            const ratingA = Number(a.rating ?? a.rating_avg ?? a.rating_average ?? a.averageRating ?? a.average_rating ?? 0) || 0;
            const ratingB = Number(b.rating ?? b.rating_avg ?? b.rating_average ?? b.averageRating ?? b.average_rating ?? 0) || 0;
            const stockA = Number(a.quantity) || 0;
            const stockB = Number(b.quantity) || 0;

            switch (sortValue) {
                case 'price_desc':
                    return priceB - priceA;
                case 'rating_desc':
                    return ratingB - ratingA;
                case 'stock_desc':
                    return stockB - stockA;
                case 'price_asc':
                default:
                    return priceA - priceB;
            }
        });

        return list;
    }

    function populateCategoryFilterOptions(products, lang) {
        if (!productCategoryFilterSelect) return;

        const categories = new Map();
        (Array.isArray(products) ? products : []).forEach(p => {
            const name = getProductCategoryName(p, lang);
            if (name) categories.set(name, true);
        });

        const currentValue = productCategoryFilterSelect.value || 'all';
        const translationsForLang = translations[lang] || {};
        const allCategoriesLabel = translationsForLang['product.filter.category_all'] || 'All categories';

        productCategoryFilterSelect.innerHTML = `<option value="all">${allCategoriesLabel}</option>`;

        const locale = getLocaleForLanguage(lang);
        [...categories.keys()].sort((a, b) => a.localeCompare(b, locale, { sensitivity: 'base' })).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            productCategoryFilterSelect.appendChild(option);
        });

        if ([...categories.keys()].includes(currentValue)) {
            productCategoryFilterSelect.value = currentValue;
        } else {
            productCategoryFilterSelect.value = 'all';
            currentProductCategoryFilter = 'all';
        }
    }

    function updateProductsView(lang = currentProductsLang) {
        const filteredSorted = applyProductFiltersAndSort(currentProductsOriginal, lang);
        renderProductsPage(filteredSorted, 1, lang, 'No products available.');
    }

    function initializeProductToolbar() {
        if (productFilterSelect) {
            productFilterSelect.addEventListener('change', () => {
                currentProductStockFilter = productFilterSelect.value;
                updateProductsView(currentProductsLang);
            });
        }
        if (productSortSelect) {
            productSortSelect.addEventListener('change', () => {
                currentProductSort = productSortSelect.value;
                updateProductsView(currentProductsLang);
            });
        }
        if (productCategoryFilterSelect) {
            productCategoryFilterSelect.addEventListener('change', () => {
                currentProductCategoryFilter = productCategoryFilterSelect.value;
                updateProductsView(currentProductsLang);
                updateCategorySidebarSelection();
            });
        }

        // Keep URL in sync when user selects category from the dropdown
        if (productCategoryFilterSelect) {
            productCategoryFilterSelect.addEventListener('change', () => {
                try {
                    const value = productCategoryFilterSelect.value;
                    const base = '/produits';
                    let newPath = base;
                    if (value && value !== 'all') {
                        const slug = slugify(value);
                        newPath = `${base}/categorie/${slug}`;
                    }
                    if (window.location.pathname !== newPath) {
                        history.pushState({ productCategory: value }, '', newPath);
                    }
                } catch (e) {
                    console.warn('Failed to update URL for category select', e);
                }
            });
        }

        updateProductToolbarLabels(currentProductsLang);
    }

    function ensureProfileStructure() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;
        headerActions.style.position = 'relative';
        // Fix: define btn as the profile button
        const btn = document.getElementById('profileBtn');
        if (!btn) return;
        let dropdown = document.getElementById('profileDropdown');
        const profileMenuItems = [
            { id: 'profileSettings', icon: '⚙️', labelKey: 'settings.menu_settings', href: '/settings.html' },
            { id: 'profileOrders', icon: '🧾', labelKey: 'settings.menu_order_history', href: '/order-history.html' },
            { id: 'helpSupport', icon: '❓', labelKey: 'settings.menu_help_support', href: '/help-support.html' },
            { id: 'displayAccessibility', icon: '♿', labelKey: 'settings.menu_display_accessibility', href: '/display-accessibility.html' },
            { id: 'feedback', icon: '💬', labelKey: 'settings.menu_feedback', href: '/feedback.html' }
        ];

        function getProfileTranslation(lang, key, fallback) {
            if (translations && translations[lang] && typeof translations[lang][key] === 'string') {
                return translations[lang][key];
            }

            const fallbackMap = {
                'settings.menu_settings': 'settings_privacy',
                'settings.menu_order_history': 'orders_history',
                'settings.menu_help_support': 'help_support',
                'settings.menu_display_accessibility': 'display_accessibility',
                'settings.menu_feedback': 'feedback',
                'settings.menu_logout': 'logout'
            };

            const profileKey = fallbackMap[key] || fallback;
            const profileT = (window.staticTranslations && staticTranslations.profile) ? staticTranslations.profile : {
                settings_privacy: { fr: 'Paramètres & confidentialité', en: 'Settings & privacy', pt: 'Configurações & privacidade' },
                orders_history: { fr: 'Historique des commandes', en: 'Order history', pt: 'Histórico de pedidos' },
                help_support: { fr: 'Aide & support', en: 'Help & support', pt: 'Ajuda & suporte' },
                display_accessibility: { fr: 'Affichage & accessibilité', en: 'Display & accessibility', pt: 'Exibição & acessibilidade' },
                feedback: { fr: 'Retour (CTRL B)', en: 'Feedback (CTRL B)', pt: 'Feedback (CTRL B)' },
                logout: { fr: 'Déconnexion', en: 'Logout', pt: 'Sair' },
                login: { fr: 'Connexion', en: 'Login', pt: 'Entrar' }
            };

            return profileT[profileKey] ? profileT[profileKey][lang] || profileT[profileKey].en : fallback;
        }

        function renderProfileDropdown(lang) {
            const logoutLabel = getProfileTranslation(lang, 'settings.menu_logout', 'logout');
            const loginLabel = getProfileTranslation(lang, 'login', 'login');
            const menuHtml = profileMenuItems.map(item => {
                const label = getProfileTranslation(lang, item.labelKey, item.labelKey);
                return `<a class="profile-menu-item" id="${item.id}" href="${item.href}">${item.icon} ${label}</a>`;
            }).join('');

            return `
                <div class="profile-header">
                    <div class="profile-avatar"></div>
                    <div class="profile-info">
                        <div class="profile-name" id="profileName">Nom d'utilisateur</div>
                        <div class="profile-meta" id="profileMeta">-</div>
                    </div>
                </div>
                <div class="profile-divider"></div>
                <div class="profile-menu">
                    ${menuHtml}
                </div>
                <div class="profile-divider"></div>
                <button class="profile-login" id="profileLogin" style="display:none; background:#3b82f6; color:#fff; margin: 0 10px 10px;">🔐 ${loginLabel}</button>
                <button class="profile-logout" id="profileLogout">🚪 ${logoutLabel}</button>
            `;
        }

        function updateProfileDropdownLang(lang) {
            if (dropdown) {
                dropdown.innerHTML = renderProfileDropdown(lang);
            }
        }

        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'profileDropdown';
            dropdown.className = 'profile-dropdown';
            dropdown.style.display = 'none';
            dropdown.innerHTML = renderProfileDropdown(localStorage.getItem('lang') || 'fr');
            dropdown.setAttribute('aria-hidden', 'true');
            const actionParent = headerActions || document.body;
            actionParent.appendChild(dropdown);
        } else {
            dropdown.className = 'profile-dropdown';
            dropdown.style.display = 'none';
            dropdown.setAttribute('aria-hidden', 'true');
            dropdown.innerHTML = renderProfileDropdown(localStorage.getItem('lang') || 'fr');
        }

        // Listen for language change and update menu live
        window.updateProfileDropdownLang = updateProfileDropdownLang;

        function toggleDropdown(e) {
            console.log('toggleDropdown fired', { currentPath: window.location.pathname });
            e.stopPropagation();
            const currentUser = getCurrentUser();
            const isLoggedIn = currentUser && (currentUser.username || currentUser.name || currentUser.email);
            if (!isLoggedIn) {
                window.location.href = '/user/login.html';
                return;
            }

            const profileName = dropdown.querySelector('#profileName');
            const profileMeta = dropdown.querySelector('#profileMeta');
            const profileAvatar = dropdown.querySelector('.profile-avatar');
            const profileLoginButton = dropdown.querySelector('.profile-login');

            const userName = currentUser?.username || currentUser?.name || 'InvitÃ©';
            const userEmail = currentUser?.email || 'Connectez-vous pour voir votre compte';
            if (profileName) profileName.textContent = userName;
            if (profileMeta) profileMeta.textContent = userEmail;

            if (profileAvatar) {
                const initials = (userName || 'U').split(' ').slice(0,2).map(p => p[0] ? p[0].toUpperCase() : '').join('') || 'U';
                profileAvatar.textContent = initials;
                profileAvatar.style.fontWeight = '700';
                profileAvatar.style.fontSize = '0.9rem';
                profileAvatar.style.background = 'linear-gradient(135deg,#6d28d9,#9333ea)';
            }

            const profileLogoutButton = dropdown.querySelector('#profileLogout');

            if (profileLoginButton) {
                profileLoginButton.style.display = isLoggedIn ? 'none' : 'block';
                profileLoginButton.onclick = () => {
                    window.location.href = '/user/login.html';
                };
            }

            if (profileLogoutButton) {
                profileLogoutButton.style.display = isLoggedIn ? 'block' : 'none';
            }

            const profileOrdersButton = dropdown.querySelector('#profileOrders');
            if (profileOrdersButton) {
                profileOrdersButton.onclick = () => {
                    if (isLoggedIn) {
                        window.location.href = '/order-history.html';
                    } else {
                        window.location.href = '/user/login.html?redirect=/order-history.html';
                    }
                };
            }

            const profileSettingsButton = dropdown.querySelector('#profileSettings');
            if (profileSettingsButton) {
                profileSettingsButton.onclick = () => {
                    if (isLoggedIn) {
                        window.location.href = '/settings.html';
                    } else {
                        window.location.href = '/user/login.html?redirect=/settings.html';
                    }
                };
            }

            const profileAllProfiles = dropdown.querySelector('.profile-all-profiles');
            if (profileAllProfiles) {
                profileAllProfiles.onclick = () => {
                    window.location.href = '/profiles.html';
                };
            }

            const helpSupport = dropdown.querySelector('#helpSupport');
            if (helpSupport) {
                helpSupport.onclick = () => {
                    window.location.href = '/help-support.html';
                };
            }

            const displayAccessibility = dropdown.querySelector('#displayAccessibility');
            if (displayAccessibility) {
                displayAccessibility.onclick = () => {
                    window.location.href = '/display-accessibility.html';
                };
            }

            const feedback = dropdown.querySelector('#feedback');
            if (feedback) {
                feedback.onclick = () => {
                    window.location.href = '/feedback.html';
                };
            }

            if (dropdown.classList.contains('visible')) {
                dropdown.classList.remove('visible');
                dropdown.style.display = 'none';
            } else {
                dropdown.classList.add('visible');
                dropdown.style.display = 'block';
            }
        }

        btn.addEventListener('click', toggleDropdown);

        document.addEventListener('click', (event) => {
            if (dropdown && !dropdown.contains(event.target) && !btn.contains(event.target)) {
                dropdown.classList.remove('visible');
                dropdown.style.display = 'none';
            }

            const target = event.target;
            if (target && target.id === 'profileLogout') {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('userToken');
                localStorage.removeItem('buyerToken');
                location.reload();
            }
            if (target && target.id === 'profileOrders') {
                window.location.href = '/order-history.html';
            }
        });
    }

    ensureProfileStructure();

    // Load translations
    fetch('/translations.json')
        .then(res => res.json())
        .then(data => {
            translations = data;
            window.translations = translations;
            setLanguage(currentLang);
            window.lang = currentLang;
            window.currentLang = currentLang;
            if (window.updateProfileDropdownLang) window.updateProfileDropdownLang(currentLang);
        })
        .catch(err => console.error('Failed to load translations:', err));

    // Language switcher setup
    const langBtn = document.getElementById('langBtn');
    const langOptions = document.querySelectorAll('.lang-option');
    
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            document.querySelector('.lang-dropdown').classList.toggle('active');
            e.stopPropagation();
        });
    }

    langOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.getAttribute('data-lang');
            setLanguage(lang);
            localStorage.setItem('lang', lang);
            document.querySelector('.lang-dropdown').classList.remove('active');
            if (window.updateProfileDropdownLang) window.updateProfileDropdownLang(lang);
        });
    });

    document.addEventListener('click', () => {
        document.querySelector('.lang-dropdown').classList.remove('active');
    });

    function handleUnauthorized() {
        localStorage.removeItem('userToken');
        localStorage.removeItem('buyerToken');
        // If we're already on login page, no need to redirect loop
        if (!window.location.pathname.includes('/user/login')) {
            window.location.href = '/user/login.html';
        }
    }

    function getAuthHeaders() {
        const token = localStorage.getItem('userToken') || localStorage.getItem('buyerToken');
        if (!token) return {};
        return {
            'x-user-token': token,
            'x-buyer-token': token,
            'Authorization': `Bearer ${token}`
        };
    }

    function setLanguage(lang) {
        currentLang = lang;
        lang = currentLang;
        
        // Update language button
        if (langBtn) langBtn.textContent = lang.toUpperCase();
        if (profileBtn && !getCurrentUser()) {
            profileBtn.innerHTML = createProfileButtonHtml(getLoginLabel(lang));
        }
        
        // Update active language option
        langOptions.forEach(opt => opt.classList.remove('active'));
        const activeOpt = document.querySelector(`[data-lang="${lang}"]`);
        if (activeOpt) activeOpt.classList.add('active');

        // Update all translatable elements
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            // Translations are stored with flat keys like "nav.home", not nested
            const value = translations[lang] && translations[lang][key];
            
            if (typeof value === 'string' && value.trim().length > 0) {
                el.textContent = value;
            }
        });

        // Update search placeholder
        const searchInput = document.querySelector('.search input');
        if (searchInput && typeof translations[lang]?.['search.placeholder'] === 'string' && translations[lang]['search.placeholder'].trim().length > 0) {
            searchInput.placeholder = translations[lang]['search.placeholder'];
        }

        // Update placeholder fields with custom i18n placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key && typeof translations[lang]?.[key] === 'string' && translations[lang][key].trim().length > 0) {
                el.placeholder = translations[lang][key];
            }
        });

        // Rebuild submenu with new language and product translations
        const productsNav = document.querySelector('nav ul li .submenu');
        if (productsNav) {
            productsNav.remove();
        }
        // Products submenu is disabled by request.
        buildSpecialtyMenu(lang);

        window.lang = lang;
        window.currentLang = currentLang;

        // Avoid reloading the whole products page shell, but still refresh the product list itself.
        if (document.getElementById('productList')) {
            loadProductsPage(lang);
        } else {
            reloadContent(lang);
        }

        // Refresh product detail view when on product detail page
        if (typeof updateProductDetailLanguage === 'function') {
            updateProductDetailLanguage();
        }

        // Notify page-specific listeners so dynamic content can refresh too
        if (typeof window.onLanguageChange === 'function') {
            window.onLanguageChange(lang);
        }
    }

    // menu toggle for mobile
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.querySelector('nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    }

    // close menu when a link is clicked
    if (nav) {
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
            });
        });
    }

    const categoriesContainer = document.getElementById('categories');
    const categoriesPaginationContainer = document.getElementById('categoriesPagination');
    const mobileCategoriesSection = document.querySelector('.mobile-category-strip');
    const mobileCategoriesStrip = document.getElementById('mobileCategoriesStrip');
    const specialtiesContainer = document.querySelector('.specialty-list');
    const pageSearchInput = document.querySelector('.search input');
    const productDetailModal = document.getElementById('productDetailModal');

    let categoryData = [];
    let categoryPageSize = 5;
    let categoryCurrentPage = 1;

    const productDetailQtyMinus = document.getElementById('productDetailQtyMinus');
    const productDetailQtyPlus = document.getElementById('productDetailQtyPlus');
    const productDetailQtyInput = document.getElementById('productDetailQtyInput');
    const productDetailQtyAvailable = document.getElementById('productDetailQtyAvailable');
    let cartCount = 0;
    let productSearchTimeout = null;
    let productDetailMaxQty = 1;
    let productDetailSelectedQty = 1;

    // cart state stored as { id: {name,qty,price?} }
    let cart = {};

    // Build product submenu in navigation
    const submenuPromise = new Promise(resolve => {
        // Wait a moment for translations to load, then build submenu
        const checkInterval = setInterval(() => {
            if (Object.keys(translations).length > 0) {
                clearInterval(checkInterval);
                buildProductSubmenu(translations, currentLang);
                resolve();
            }
        }, 100);
        // Timeout after 2 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            buildProductSubmenu({}, currentLang);
            resolve();
        }, 2000);
    });

    // Helper: get current user from localStorage
    function getCurrentUser() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (currentUser && typeof currentUser === 'object') return currentUser;
        } catch (err) {
            console.warn('Invalid currentUser in localStorage', err);
        }
        return null;
    }

    function updateProfileUI() {
        const profileBtn = document.getElementById('profileBtn');
        const dropdown = document.getElementById('profileDropdown');
        const currentUser = getCurrentUser();

        if (profileBtn) {
            const displayName = currentUser && (currentUser.username || currentUser.name || currentUser.email)
                ? (currentUser.username || currentUser.name || currentUser.email)
                : getLoginLabel(currentLang);
            profileBtn.innerHTML = createProfileButtonHtml(displayName);
        }

        if (dropdown && currentUser) {
            const profileName = dropdown.querySelector('#profileName');
            const profileMeta = dropdown.querySelector('#profileMeta');
            if (profileName) profileName.textContent = currentUser.username || currentUser.name || currentUser.email || 'Client';
            if (profileMeta) profileMeta.textContent = currentUser.email || 'Membre';
        }
    }

    // setup websocket for real-time cart updates
    const socket = window.io ? io() : null;
    if (socket) {
        socket.on('connect', () => {
            console.log('Socket connected', socket.id);
        });

        socket.on('cart_updated', (payload) => {
            if (!payload || !payload.items) return;
            setCartFromItems(payload.items);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
    }

    function setCartFromItems(items) {
        cart = {};
        cartCount = 0;
        items.forEach(item => {
            const id = String(item.product_id || item.productId || item.id);
            const qty = Number(item.quantity || item.qty || 0);
            cart[id] = {
                name: item.name_en || item.name_fr || item.name_pt || item.title || item.name || id,
                qty: qty,
                price: Number(item.price || 0),
                image: item.image || item.image_url || '/images/placeholder.jpg'
            };
            cartCount += qty;
        });
        updateBadge();
        renderCart();
        updateCartUrl();
    }

    // initialize cart modal and state
    createCartModal();
    loadCart();
    setupGlobalProfileButton();
    trackAnalyticsPageView();

    function setupGlobalProfileButton() {
        const profileBtn = document.getElementById('profileBtn');
        if (!profileBtn) return;

        const user = getCurrentUser();
        profileBtn.classList.add('icon', 'user');
        profileBtn.style.display = 'flex';
        profileBtn.style.alignItems = 'center';
        profileBtn.style.gap = '6px';

        const name = user && (user.username || user.name || user.email)
            ? (user.username || user.name || user.email)
            : 'Connexion';

        profileBtn.innerHTML = createProfileButtonHtml(name);

        updateProfileUI();
    }

    if (document.getElementById('productList') && pageSearchInput) {
        pageSearchInput.addEventListener('input', () => {
            if (productSearchTimeout) {
                clearTimeout(productSearchTimeout);
            }

            productSearchTimeout = setTimeout(() => {
                loadProductsPage(currentLang, pageSearchInput.value);
            }, 250);
        });
    }

    if (productDetailModal) {
        const closeProductDetailModalBtn = document.getElementById('closeProductDetailModal');

        if (closeProductDetailModalBtn) {
            closeProductDetailModalBtn.addEventListener('click', closeProductDetailModal);
        }

        productDetailModal.addEventListener('click', (event) => {
            if (event.target === productDetailModal) {
                closeProductDetailModal();
            }
        });
    }

    function buildProductSubmenu(transData, lang) {
        // Products submenu generation has been disabled.
        return;

        // Find the products nav link and add submenu
        const navLinks = document.querySelectorAll('nav ul li a');
        let productsLink = null;
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href.includes('produits') || href.includes('produtos') || href.includes('products'))) {
                productsLink = link;
            }
        });

        if (!productsLink) return;

        // Load products and create submenu
        fetch('/products.json')
            .then(res => res.json())
            .then(products => {
                if (!products || products.length === 0) return;

                // Create submenu container
                const submenu = document.createElement('div');
                submenu.className = 'submenu';

                // Group products by category
                const categories = {};
                products.forEach(p => {
                    if (p.category) {
                        if (!categories[p.category]) {
                            categories[p.category] = [];
                        }
                        categories[p.category].push(p);
                    }
                });

                // Add category headers and product links to submenu
                Object.keys(categories).forEach(cat => {
                    // Create category header/divider
                    const catHeader = document.createElement('div');
                    catHeader.style.padding = '8px 16px';
                    catHeader.style.fontWeight = '700';
                    catHeader.style.fontSize = '0.75rem';
                    catHeader.style.color = '#999';
                    catHeader.style.textTransform = 'uppercase';
                    catHeader.style.letterSpacing = '0.5px';
                    catHeader.style.borderTop = '1px solid rgba(0,0,0,0.08)';
                    catHeader.style.marginTop = '8px';
                    catHeader.style.paddingTop = '12px';
                    
                    // Get translated category name
                    let displayName = cat;
                    // Categories are not in translations, use the raw category name
                    displayName = cat.charAt(0).toUpperCase() + cat.slice(1);
                    
                    catHeader.textContent = displayName;
                    submenu.appendChild(catHeader);

                    // Add products in this category
                    categories[cat].forEach(product => {
                        const link = document.createElement('a');
                        link.href = productsLink.getAttribute('href');
                        link.setAttribute('data-product-id', product.id);
                        link.setAttribute('data-category', cat);
                        
                        // Get product name in current language
                        const langKey = 'name_' + (lang || 'fr');
                        let productName = product[langKey] || product.name_fr || product.id;
                        
                        link.textContent = productName;
                        link.style.paddingTop = '8px';
                        link.style.paddingBottom = '8px';
                        link.addEventListener('click', e => {
                            // Store selected product in session
                            sessionStorage.setItem('selectedProduct', product.id);
                            sessionStorage.setItem('selectedCategory', cat);
                        });
                        submenu.appendChild(link);
                    });
                });

                // Insert submenu after the products link
                const liParent = productsLink.parentElement;
                liParent.appendChild(submenu);
            })
            .catch(err => console.error('Failed to load products for submenu:', err));
    }

    function closeProductDetailModal() {
        if (!productDetailModal) return;

        productDetailModal.classList.remove('active');
        productDetailModal.setAttribute('aria-hidden', 'true');
    }

    function setProductDetailQuantity(qty) {
        const value = Math.max(1, Math.min(productDetailMaxQty, qty));
        productDetailSelectedQty = value;

        if (productDetailQtyInput) {
            productDetailQtyInput.value = value;
        }

        if (productDetailQtyMinus) {
            productDetailQtyMinus.disabled = value <= 1;
        }

        if (productDetailQtyPlus) {
            productDetailQtyPlus.disabled = value >= productDetailMaxQty;
        }
    }

    // Attach quantity controls
    if (productDetailQtyMinus && productDetailQtyPlus && productDetailQtyInput) {
        productDetailQtyMinus.addEventListener('click', (e) => {
            e.preventDefault();
            setProductDetailQuantity(productDetailSelectedQty - 1);
        });

        productDetailQtyPlus.addEventListener('click', (e) => {
            e.preventDefault();
            setProductDetailQuantity(productDetailSelectedQty + 1);
        });

        productDetailQtyInput.addEventListener('click', (e) => {
            e.preventDefault();
        });
    }

    async function openProductDetailModal(productId, lang) {
        if (!productDetailModal || !productId) return;

        const titleEl = document.getElementById('productDetailTitle');
        const categoryEl = document.getElementById('productDetailCategory');
        const priceEl = document.getElementById('productDetailPrice');
        const descriptionEl = document.getElementById('productDetailDescription');
        const stockEl = document.getElementById('productDetailStock');
        const imageEl = document.getElementById('productDetailImage');
        const similarContainer = document.getElementById('similarProductsContainer');
        const addToCartButton = document.getElementById('productDetailAddToCart');

        titleEl.textContent = translations[lang]?.['product.loading'] || 'Loading...';
        categoryEl.textContent = '';
        priceEl.textContent = '';
        descriptionEl.textContent = '';
        if (stockEl) stockEl.textContent = '';
        imageEl.src = '/images/Saudade_market.png';
        imageEl.onerror = null;
        similarContainer.innerHTML = '';
        if (addToCartButton) {
            addToCartButton.disabled = true;
            addToCartButton.textContent = translations[lang]?.['product.add_to_cart'] || 'Add to cart now';
        }

        productDetailModal.classList.add('active');
        productDetailModal.setAttribute('aria-hidden', 'false');

        try {
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) {
                throw new Error('Failed to load product details');
            }

            const product = await response.json();
            const name = product['name_' + lang] || product.name_en || product.name_fr || product.name_pt || 'Product';
            const categoryName = product['category_name_' + lang] || product.category_name || '';
            const price = parseFloat(product.price) || 0;
            const description = product.description || 'No description available.';
            const quantity = Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : 0;

            titleEl.textContent = name;
            categoryEl.textContent = categoryName ? `${translations[lang]?.['product.category'] || 'Category'}: ${categoryName}` : '';
            priceEl.textContent = `EUR ${price.toFixed(2)}`;
            descriptionEl.textContent = description;
            productDetailMaxQty = Math.max(1, quantity);
            setProductDetailQuantity(1);
            if (productDetailQtyAvailable) {
                productDetailQtyAvailable.textContent = `${translations[lang]?.['product.available'] || 'Available'}: ${quantity}`;
            }
            if (stockEl) stockEl.textContent = `Available quantity: ${quantity}`;
            imageEl.src = product.image || '/images/Saudade_market.png';
            imageEl.alt = name;
            imageEl.onerror = () => {
                imageEl.onerror = null;
                imageEl.src = '/images/Saudade_market.png';
            };

            if (addToCartButton) {
                addToCartButton.disabled = quantity <= 0;
                addToCartButton.style.opacity = quantity <= 0 ? '0.5' : '1';
                addToCartButton.style.cursor = quantity <= 0 ? 'not-allowed' : 'pointer';
                addToCartButton.textContent = quantity <= 0 
                    ? (translations[lang]?.['product.out_of_stock'] || 'Out of stock')
                    : (translations[lang]?.['product.add_to_cart'] || 'Add to cart now');
                if (quantity > 0) {
                    addToCartButton.onclick = () => {
                        addToCart({
                            id: product.id,
                            name,
                            price
                        }, productDetailSelectedQty);
                    };
                } else {
                    addToCartButton.onclick = null;
                }
            }

            const saveDetailButton = document.getElementById('productDetailSaveButton');
            if (saveDetailButton) {
                const saved = isProductSaved(product.id);
                updateSaveButtonState(saveDetailButton, saved);
                saveDetailButton.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSavedProduct({
                        id: product.id,
                        name,
                        price,
                        image: product.image || imageEl.src
                    });
                    updateSaveButtonState(saveDetailButton, isProductSaved(product.id));
                };
            }

            loadSimilarProducts(productId, 'similarProductsContainer');

            try {
                await fetch(`/api/recommendations/track-view/${productId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (trackError) {
                console.warn('Could not track product view:', trackError);
            }
        } catch (error) {
            console.error('Failed to open product detail modal:', error);
            titleEl.textContent = 'Unable to load product';
            descriptionEl.textContent = 'Please try again.';
        }
    }

    function renderProductsPageItems(productList, products, lang, emptyMessage = 'No products available.') {
        if (!Array.isArray(products) || products.length === 0) {
            productList.innerHTML = `<p style="width:100%; text-align:center; color:#666;">${emptyMessage}</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        products.forEach(p => {
            const id = p.id;
            const name = p['name_' + lang] || p.name_fr || p.name_en || p.title || '';
            const price = parseFloat(p.price) || 0;
            const image = p.image || (p.images && p.images[0]?.src) || '/images/placeholder.jpg';
            const quantity = Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0;
            const ratingValue = Number(p.rating ?? p.rating_avg ?? p.rating_average ?? p.averageRating ?? p.average_rating ?? 0);
            const ratingLabel = ratingValue > 0 ? `
                <div class="product-rating">
                    <span class="stars">${renderRatingStars(ratingValue)}</span>
                    <span class="rating-value">${ratingValue.toFixed(1)}</span>
                </div>
            ` : '';

            const promoPrice = p.promo_price ? parseFloat(p.promo_price) : null;
            const promoLabel = (p.promo_label || '').toString();
            const promoExpiresAt = p.promo_expires_at ? new Date(p.promo_expires_at) : null;
            const promoIsActive = promoPrice && promoPrice > 0 && promoPrice < price && (!promoExpiresAt || promoExpiresAt > new Date());
            const priceHtml = promoIsActive
                ? `<div style="display: flex; flex-direction: column; gap: 4px;"><span style="text-decoration: line-through; color: #888; font-size:0.9rem;">EUR ${price.toFixed(2)}</span><span style="font-weight: bold; color: #c41e1e; font-size:1.05rem;">EUR ${promoPrice.toFixed(2)}</span>${promoLabel ? `<span style="font-size:0.8rem; color:#555;">${promoLabel}</span>` : ''}</div>`
                : `<div class="subtitle">EUR ${price.toFixed(2)}</div>`;
            const featuredBadge = p.is_featured ? `<div style="margin-top: 6px; display:inline-block; background:#ffe8e8; color:#b92a2a; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 700;">Featured</div>` : '';

            const saved = isProductSaved(id);
            const card = document.createElement('div');
            card.className = 'category';
            card.setAttribute('data-name', name);
            card.setAttribute('data-product-id', id);
            card.dataset.productName = name;
            card.dataset.productPrice = String(price);
            card.dataset.productImage = image;
            card.innerHTML = `
                    <div class="image-wrapper">
                        <img src="${image}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='/images/Saudade_market.png'" />
                    </div>
                <p>${name}</p>
                ${priceHtml}
                ${ratingLabel}
                ${featuredBadge}
                <div class="product-stock">Qty: ${quantity}</div>
                <button type="button" class="save-product-btn ${saved ? 'saved' : ''}">
                    ${saved ? (translations[lang]?.['product.saved_state'] || 'Saved') : (translations[lang]?.['product.save'] || 'Save')}
                </button>
            `;
            const saveButton = card.querySelector('.save-product-btn');
            if (saveButton) {
                saveButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSavedProduct({ id, name, price, image });
                    setProductCardSavedState(card, isProductSaved(id));
                });
            }
            card.addEventListener('click', () => {
                const routeName = normalizeProductNameRoute(name || `product-${id}`);
                window.location.href = `/produits/${routeName}`;
            });
            fragment.appendChild(card);
        });

        productList.style.visibility = 'hidden';
        productList.innerHTML = '';
        productList.appendChild(fragment);
        productList.style.visibility = 'visible';

        bindAddButtons();
    }

    function renderPaginationControls(totalPages, currentPage, lang, totalItems) {
        let container = document.getElementById('paginationControls');
        const productSection = document.querySelector('.product-list');
        if (!productSection) return;

        if (!container) {
            container = document.createElement('div');
            container.id = 'paginationControls';
            container.className = 'pagination-controls';
            productSection.insertAdjacentElement('afterend', container);
        }

        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = '';

        const createButton = (label, targetPage, disabled = false, active = false) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = label;
            btn.disabled = disabled;
            btn.className = active ? 'pagination-btn active' : 'pagination-btn';
            if (!disabled) {
                btn.addEventListener('click', () => {
                    renderProductsPage(currentProducts, targetPage, lang, `No products available (${totalItems})`);
                });
            }
            return btn;
        };

        container.appendChild(createButton('<<', 1, currentPage === 1));
        container.appendChild(createButton('<', Math.max(1, currentPage - 1), currentPage === 1));

        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i += 1) {
            container.appendChild(createButton(i, i, false, i === currentPage));
        }

        container.appendChild(createButton('>', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
        container.appendChild(createButton('>>', totalPages, currentPage === totalPages));
    }

    function renderProductsPage(products, page = 1, lang = currentProductsLang, emptyMessage = 'No products available.') {
        const productList = document.getElementById('productList');
        if (!productList) return;

        currentProducts = Array.isArray(products) ? products : [];
        currentProductsLang = lang;
        currentProductsPage = Math.max(1, page);

        const totalItems = currentProducts.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / PRODUCTS_PER_PAGE));
        if (currentProductsPage > totalPages) currentProductsPage = totalPages;

        const startIndex = (currentProductsPage - 1) * PRODUCTS_PER_PAGE;
        const pagedItems = currentProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);

        renderProductsPageItems(productList, pagedItems, lang, emptyMessage);
        renderPaginationControls(totalPages, currentProductsPage, lang, totalItems);
    }

    function loadProductsPage(lang, searchQuery = '') {
        const productList = document.getElementById('productList');
        if (!productList) return;

        const trimmedSearch = (searchQuery || '').trim();
        const endpoint = trimmedSearch
            ? `/api/recommendations/search?q=${encodeURIComponent(trimmedSearch)}&limit=24`
            : '/api/products';

        fetch(endpoint)
            .then(r => {
                if (!r.ok) throw new Error('products endpoint failed');
                return r.json();
            })
            .then(result => {
                const products = trimmedSearch ? (result.data || []) : result;
                const emptyMessage = trimmedSearch
                    ? 'No AI recommendations found for that search.'
                    : 'No products available.';

                currentProductsPage = 1;
                currentProductsOriginal = Array.isArray(products) ? products : [];
                loadCategoryFilterFromDb(lang)
                    .then(() => {
                        updateProductToolbarLabels(lang);
                        if (!productToolbarInitialized) {
                            initializeProductToolbar();
                            productToolbarInitialized = true;
                        }
                        updateProductsView(lang);
                    });
            })
            .catch(err => {
                console.error('Failed to load products:', err);
                productList.innerHTML = '<p style="width:100%; text-align:center; color:#c41e1e;">Failed to load products.</p>';
            });
    }

    function loadCategoryPage(lang, categoryId) {
        const productList = document.getElementById('productList');
        if (!productList) return;

        productList.innerHTML = '<p style="width:100%; text-align:center;">Loading category products...</p>';

        fetch(`/api/categories/${categoryId}/with-products`)
            .then(r => {
                if (!r.ok) {
                    if (r.status === 404) {
                        throw new Error('Category not found');
                    }
                    throw new Error('Category products endpoint failed');
                }
                return r.json();
            })
            .then(category => {
                const categoryName = getCategoryDisplayName(category, lang) || category.name || category.name_en || category.name_fr || category.name_pt || `Category ${categoryId}`;
                currentProductsPage = 1;
                currentProductsOriginal = Array.isArray(category.products) ? category.products : [];
                currentProductCategoryFilter = 'all';
                loadCategoryFilterFromDb(lang)
                    .then(() => {
                        updateProductToolbarLabels(lang);
                        if (!productToolbarInitialized) {
                            initializeProductToolbar();
                            productToolbarInitialized = true;
                        }
                        updateProductsView(lang);
                    });
                document.title = `${categoryName} - ${translations[lang]?.['product.title'] || 'Produits'}`;
            })
            .catch(err => {
                console.error('Failed to load category page:', err);
                productList.innerHTML = '<p style="width:100%; text-align:center; color:#c41e1e;">Failed to load category products.</p>';
            });
    }

    function reloadContent(lang) {
        // load dynamic content from JSON file
        fetch('/data.json')
            .then(res => res.json())
            .then(data => {
                const renderCategoriesFromStatic = () => {
                    if (categoriesContainer && data.categories) {
                        categoryData = data.categories;
                        window.__STATIC_CATEGORIES__ = data.categories;
                        categoryCurrentPage = 1;
                        buildCategoryMenu(lang);
                        renderCategoryPage(lang);
                    }
                };

                if (categoriesContainer) {
                    fetch('/api/categories')
                        .then(r => {
                            if (!r.ok) throw new Error('Categories endpoint failed');
                            return r.json();
                        })
                        .then(apiCategories => {
                            if (Array.isArray(apiCategories) && apiCategories.length > 0) {
                                categoryData = apiCategories;
                                window.__STATIC_CATEGORIES__ = apiCategories;
                                categoryCurrentPage = 1;
                                buildCategoryMenu(lang);
                                renderCategoryPage(lang);
                                renderMobileCategoryStrip(lang);
                                return;
                            }
                            renderCategoriesFromStatic();
                        })
                        .catch(err => {
                            console.warn('Failed to load DB categories, falling back to static categories:', err);
                            renderCategoriesFromStatic();
                        });
                } else {
                    renderCategoriesFromStatic();
                }

                // Clear and render specialties
                if (specialtiesContainer && data.specialties) {
                    specialtiesContainer.innerHTML = '';
                    data.specialties.forEach(sp => {
                        const div = document.createElement('div');
                        div.className = 'specialty';
                        div.innerHTML = `
                            <img src="${sp.image}" alt="${sp['name_' + lang]}" />
                            <p>${sp['name_' + lang] || sp.name_fr}</p>
                        `;
                        div.style.cursor = 'pointer';
                        div.addEventListener('click', () => {
                            // Redirect to specialties page with slug query so the specialties page loads that specialty
                            const baseName = sp.name_en || sp['name_' + lang] || sp.name_fr || '';
                            const slug = String(baseName || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
                            window.location.href = `specialites.html?name=${encodeURIComponent(slug)}`;
                        });
                        specialtiesContainer.appendChild(div);
                    });
                    // Try to get latest specialties from API and replace if available
                    loadSpecialtiesData().then(items => {
                        if (!items || items.length === 0) return;
                        specialtiesData = items;
                        // Re-render homepage specialty tiles
                        specialtiesContainer.innerHTML = '';
                        items.forEach(sp => {
                            const div = document.createElement('div');
                            div.className = 'specialty';
                            div.innerHTML = `
                                <img src="${sp.image || '/images/placeholder.jpg'}" alt="${(sp.name_fr||sp.name_en||'').replace(/"/g,'') }" />
                                <p>${sp['name_' + lang] || sp.name_fr || sp.name_en}</p>
                            `;
                            div.style.cursor = 'pointer';
                            div.addEventListener('click', () => {
                                const baseName = sp.name_en || sp['name_' + lang] || sp.name_fr || '';
                                const slug = String(baseName || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
                                window.location.href = `specialites.html?name=${encodeURIComponent(slug)}`;
                            });
                            specialtiesContainer.appendChild(div);
                        });
                        // Rebuild header menu with API specialties
                        buildSpecialtyMenu(typeof currentLang !== 'undefined' ? currentLang : (localStorage.getItem('lang') || 'fr'));
                    }).catch(() => {});
                }
            })
            .catch(err => console.error('Failed to load content:', err));

    }

    function renderCategoryPage(lang) {
        if (!categoriesContainer) return;

        const pageItems = Array.isArray(categoryData) ? categoryData : [];
        categoriesContainer.innerHTML = '';

        pageItems.forEach(cat => {
            const categoryLabel = getCategoryDisplayName(cat, lang);
            const categoryId = cat.id || cat.category_id || '';
            const a = document.createElement('a');
            a.className = 'category';
            a.href = categoryId ? getCategoryRoutePath(categoryId) : (cat.link || '#');
            a.setAttribute('data-category-id', categoryId);
            a.setAttribute('data-category-name', categoryLabel);

            const iconValue = cat.icon || '';
            const imageUrl = cat.image || (isImagePath(iconValue) ? iconValue : '');
            const wrapperStyle = `background: ${cat.color || '#f3f4f7'}; padding: 8px;`;
            const imageContent = imageUrl
                ? `<img src="${imageUrl}" alt="${categoryLabel}" />`
                : `<div class="category-placeholder" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:${cat.color || '#f3f4f7'};border-radius:50%;font-size:2.5rem;">${iconValue || 'ðŸ“¦'}</div>`;

            a.innerHTML = `
                <div class="image-wrapper" style="${wrapperStyle}">
                    ${imageContent}
                </div>
                <p>${categoryLabel}</p>
            `;
            categoriesContainer.appendChild(a);
        });

        if (categoriesPaginationContainer) {
            categoriesPaginationContainer.style.display = 'none';
        }

        buildCategoryMenu(lang);
        renderMobileCategoryStrip(lang);
        bindCategoryClicks();
        bindAddButtons();
    }

    function renderMobileCategoryStrip(lang) {
        if (!mobileCategoriesStrip) return;
        if (mobileCategoriesSection) {
            mobileCategoriesSection.style.display = 'block';
            mobileCategoriesSection.style.visibility = 'visible';
        }
        mobileCategoriesStrip.style.display = 'flex';
        mobileCategoriesStrip.style.visibility = 'visible';
        mobileCategoriesStrip.innerHTML = '';

        const categories = Array.isArray(categoryData) ? categoryData.slice(0, 7) : [];
        const itemsToRender = categories.length > 0 ? categories : [{
            name_fr: 'CatÃ©gories',
            name_pt: 'Categorias',
            name_en: 'Categories',
            link: '/produits.html'
        }];

        itemsToRender.forEach(cat => {
            const categoryLabel = getCategoryDisplayName(cat, lang) || 'CatÃ©gorie';
            const categoryId = cat.id || cat.category_id || '';
            const categoryLink = categoryId ? getCategoryRoutePath(categoryId) : (cat.link || '/produits.html');
            const pill = document.createElement('a');
            pill.className = 'mobile-category-pill';
            pill.href = categoryLink;
            pill.setAttribute('data-category-id', categoryId);
            pill.setAttribute('data-category-name', categoryLabel);
            pill.textContent = categoryLabel;
            mobileCategoriesStrip.appendChild(pill);
        });

        bindMobileCategoryClicks();
    }

    function bindMobileCategoryClicks() {
        if (!mobileCategoriesStrip) return;
        const pills = mobileCategoriesStrip.querySelectorAll('.mobile-category-pill');
        pills.forEach(pill => {
            pill.addEventListener('click', event => {
                event.preventDefault();
                const categoryId = pill.getAttribute('data-category-id');
                const categoryName = pill.getAttribute('data-category-name');
                const href = pill.getAttribute('href');
                if (categoryId && href) {
                    window.location.href = href;
                } else if (categoryId) {
                    showCategoryProducts(categoryId, categoryName);
                } else if (categoryName) {
                    showCategoryProductsByName(categoryName);
                }
            });
        });
    }

    function renderCategoryPagination(totalPages) {
        if (!categoriesPaginationContainer) return;

        categoriesPaginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const prev = document.createElement('button');
        prev.textContent = 'PrÃ©cÃ©dent';
        prev.disabled = categoryCurrentPage <= 1;
        prev.className = 'pagination-btn';
        prev.addEventListener('click', () => {
            if (categoryCurrentPage > 1) {
                categoryCurrentPage -= 1;
                renderCategoryPage(currentLang);
            }
        });

        const next = document.createElement('button');
        next.textContent = 'Suivant';
        next.disabled = categoryCurrentPage >= totalPages;
        next.className = 'pagination-btn';
        next.addEventListener('click', () => {
            if (categoryCurrentPage < totalPages) {
                categoryCurrentPage += 1;
                renderCategoryPage(currentLang);
            }
        });

        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-info';
        pageInfo.textContent = `${categoryCurrentPage} / ${totalPages}`;

        categoriesPaginationContainer.appendChild(prev);
        categoriesPaginationContainer.appendChild(pageInfo);
        categoriesPaginationContainer.appendChild(next);
    }

    function bindCategoryClicks() {
        const cats = document.querySelectorAll('.category');
        cats.forEach(cat => {
            cat.onclick = null;
            cat.addEventListener('click', event => {
                const href = cat.getAttribute('href') || '';
                const categoryId = cat.getAttribute('data-category-id');
                const categoryName = cat.getAttribute('data-category-name');
                const isExternalLink = href && href !== '#' && !href.endsWith('produits.html');

                if (!isExternalLink) {
                    event.preventDefault();
                    if (categoryId) {
                        showCategoryProducts(categoryId, categoryName);
                    } else if (categoryName) {
                        showCategoryProductsByName(categoryName);
                    }
                }
            });
        });
    }

    function showCategoryProductsByName(categoryName) {
        if (!categoryName) {
            alert('Category not found. Please try another category.');
            return;
        }

        const categoryId = getCategoryIdByName(categoryName);
        if (categoryId) {
            showCategoryProducts(categoryId, categoryName);
            return;
        }

        const lowerName = categoryName.toLowerCase().trim();
        fetch('/api/categories')
            .then(r => {
                if (!r.ok) throw new Error('Categories endpoint failed');
                return r.json();
            })
            .then(allCategories => {
                const matched = allCategories.find(cat => {
                    const values = [cat.name_en, cat.name_fr, cat.name_pt, cat.name]
                        .filter(Boolean)
                        .map(v => v.toString().trim().toLowerCase());
                    return values.includes(lowerName);
                });

                if (matched) {
                    showCategoryProducts(matched.id, categoryName);
                } else {
                    console.error('No category found for:', categoryName);
                    alert('Category not found. Please try another category.');
                }
            })
            .catch(err => {
                console.error('Failed to load categories:', err);
                alert('Failed to load category. Please try again.');
            });
    }

    function showCategoryProducts(categoryId, categoryName) {
        fetch('/api/products')
            .then(r => r.json())
            .then(allProducts => {
                // Filter products by category_id
                const categoryProducts = allProducts.filter(p => p.category_id == categoryId);

                // Display in modal
                const modal = document.getElementById('categoryModal');
                const grid = document.getElementById('categoryProductsGrid');
                const title = document.getElementById('categoryModalTitle');

                title.textContent = categoryName;
                grid.innerHTML = '';

                if (!categoryProducts || categoryProducts.length === 0) {
                    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No products in this category</p>';
                } else {
                    categoryProducts.forEach(p => {
                        const id = p.id;
                        const name = p.name_en || p.name_fr || p.name || '';
                        const price = parseFloat(p.price) || 0;
                        const description = p.description || '';
                        const promoPrice = p.promo_price ? parseFloat(p.promo_price) : null;
                        const promoLabel = (p.promo_label || '').toString();
                        const promoExpiresAt = p.promo_expires_at ? new Date(p.promo_expires_at) : null;
                        const promoIsActive = promoPrice && promoPrice > 0 && promoPrice < price && (!promoExpiresAt || promoExpiresAt > new Date());
                        const priceHtml = promoIsActive
                            ? `<div style="display: flex; flex-direction: column; gap: 4px;"><span style="text-decoration: line-through; color: #888;">€${price.toFixed(2)}</span><span style="font-weight: bold; color: #c41e1e;">€${promoPrice.toFixed(2)}</span>${promoLabel ? `<span style="font-size:0.85rem; color:#555;">${promoLabel}</span>` : ''}</div>`
                            : `<div class="price">€${price.toFixed(2)}</div>`;
                        const featuredBadge = p.is_featured ? `<div style="margin-top: 8px; display:inline-block; background:#ffe8e8; color:#b92a2a; padding: 4px 8px; border-radius: 999px; font-size: 0.8rem; font-weight: 700;">Featured</div>` : '';

                        const card = document.createElement('div');
                        card.className = 'product-card';
                        card.innerHTML = `
                            <div class="image-wrapper">
                                <img src="${p.image || '/images/placeholder.jpg'}" alt="${name}" loading="lazy" onerror="this.src='/images/placeholder.jpg'" />
                            </div>
                            <h3>${name}</h3>
                            <p class="description">${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</p>
                            ${priceHtml}
                            ${featuredBadge}
                        `;
                        grid.appendChild(card);
                    });
                }

                // Show modal
                modal.classList.add('active');
                bindAddButtons();
            })
            .catch(err => {
                console.error('Failed to load category products:', err);
                const grid = document.getElementById('categoryProductsGrid');
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: red;">Failed to load products</p>';
                document.getElementById('categoryModal').classList.add('active');
            });
    }

    function bindAddButtons() {
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.onclick = null;
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const name = btn.closest('.category, .product-card')?.querySelector('p, .product-name, h4, h3')?.textContent || id;
                const price = parseFloat(btn.getAttribute('data-price') || '0');
                addToCart({ id, name, price });
            });
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.onclick = null;
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const name = btn.closest('.product-card')?.querySelector('.product-name')?.textContent || id;
                const price = parseFloat(btn.getAttribute('data-price') || '0');
                addToCart({ id, name, price });
            });
        });
    }

    // Close category modal
    function closeCategoryModal() {
        const categoryModal = document.getElementById('categoryModal');
        if (categoryModal) {
            categoryModal.classList.remove('active');
        }
    }

    // Close modal when clicking outside
    const categoryModal = document.getElementById('categoryModal');
    if (categoryModal) {
        categoryModal.addEventListener('click', (e) => {
            if (e.target.id === 'categoryModal') {
                closeCategoryModal();
            }
        });
    }

    // Specialty modal functions
    function showSpecialtyProducts(specialtyName) {
        fetch('/api/products')
            .then(r => r.json())
            .then(allProducts => {
                // Filter products by specialty keyword matching
                const specialtyKeywords = {
                    'Olive Oil': ['olive', 'azeite'],
                    'PastÃ©is de Nata': ['pastel', 'nata', 'pasteis'],
                    'Cod': ['bacallhau', 'bacalhau', 'cod'],
                    'Chorizo & Ham': ['chourico', 'jambon', 'presunto', 'ham'],
                    'Wines & Liqueurs': ['wine', 'vinho', 'liqueur', 'porto'],
                    'Gourmet Gift Boxes': ['coffret', 'cabaz', 'gift']
                };

                const keywords = specialtyKeywords[specialtyName] || [specialtyName.toLowerCase()];
                const specialtyProducts = allProducts.filter(p => {
                    const productName = (p.name_en || p.name_fr || p.name || '').toLowerCase();
                    const productDesc = (p.description || '').toLowerCase();
                    return keywords.some(kw => productName.includes(kw) || productDesc.includes(kw));
                });
                
                // Display in modal
                const modal = document.getElementById('specialtyModal');
                const grid = document.getElementById('specialtyProductsGrid');
                const title = document.getElementById('specialtyModalTitle');
                
                title.textContent = specialtyName;
                grid.innerHTML = '';
                
                if (!specialtyProducts || specialtyProducts.length === 0) {
                    const noProductsText = (translations && translations[currentLang] && translations[currentLang]['specialty.no_products']) || 'No products available for this specialty yet.';
                    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px;">${noProductsText}</p>`;
                } else {
                    specialtyProducts.forEach(p => {
                        const id = p.id;
                        const name = p.name_en || p.name_fr || p.name || '';
                        const price = parseFloat(p.price) || 0;
                        const description = p.description || '';
                        const promoPrice = p.promo_price ? parseFloat(p.promo_price) : null;
                        const promoLabel = (p.promo_label || '').toString();
                        const promoExpiresAt = p.promo_expires_at ? new Date(p.promo_expires_at) : null;
                        const promoIsActive = promoPrice && promoPrice > 0 && promoPrice < price && (!promoExpiresAt || promoExpiresAt > new Date());
                        const priceHtml = promoIsActive
                            ? `<div style="display: flex; flex-direction: column; gap: 4px;"><span style="text-decoration: line-through; color: #888;">€${price.toFixed(2)}</span><span style="font-weight: bold; color: #c41e1e;">€${promoPrice.toFixed(2)}</span>${promoLabel ? `<span style="font-size:0.85rem; color:#555;">${promoLabel}</span>` : ''}</div>`
                            : `<div class="price">€${price.toFixed(2)}</div>`;
                        const featuredBadge = p.is_featured ? `<div style="margin-top: 8px; display:inline-block; background:#ffe8e8; color:#b92a2a; padding: 4px 8px; border-radius: 999px; font-size: 0.8rem; font-weight: 700;">Featured</div>` : '';
                        
                        const card = document.createElement('div');
                        card.className = 'product-card';
                        card.innerHTML = `
                            <div class="image-wrapper">
                                <img src="${p.image || '/images/placeholder.jpg'}" alt="${name}" loading="lazy" onerror="this.src='/images/placeholder.jpg'" />
                            </div>
                            <h3>${name}</h3>
                            <p class="description">${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</p>
                            ${priceHtml}
                            ${featuredBadge}
                        `;
                        grid.appendChild(card);
                    });
                }
                
                // Show modal
                modal.classList.add('active');
                bindAddButtons();
            })
            .catch(err => {
                console.error('Failed to load specialty products:', err);
                const grid = document.getElementById('specialtyProductsGrid');
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: red;">Failed to load products</p>';
                document.getElementById('specialtyModal').classList.add('active');
            });
    }

    function closeSpecialtyModal() {
        document.getElementById('specialtyModal').classList.remove('active');
    }

    // Close specialty modal when clicking outside
    const specialtyModal = document.getElementById('specialtyModal');
    if (specialtyModal) {
        specialtyModal.addEventListener('click', (e) => {
            if (e.target.id === 'specialtyModal') {
                closeSpecialtyModal();
            }
        });
    }

    async function loadSpecialtyProductsHome(lang, limit = 8, title = null) {
        const container = document.getElementById('specialtyProductsContainer');
        if (!container) return;

        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error('Failed to load products');
            }
            const products = await response.json();
            const specialtyProducts = products.filter(p => {
                const categoryId = Number(p.category_id || p.categoryId || p.category_id);
                const category = (p.category || p.category_name || '').toString().toLowerCase();
                const specialtyFlag = (p.specialty || p.is_specialty || '').toString().toLowerCase();
                return categoryId === 2 || category.includes('special') || specialtyFlag.includes('special');
            }).slice(0, limit);

            if (specialtyProducts.length === 0) {
                const noProductsText = (translations && translations[currentLang] && translations[currentLang]['specialty.no_products']) || 'No products available for this specialty yet.';
                container.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">${noProductsText}</p>`;
                return;
            }

            const sectionTitle = (title !== null)
                ? title
                : (translations[currentLang]?.['home.specialty_products'] || 'Specialty Products');
            displayRecommendations(container, specialtyProducts, sectionTitle);
        } catch (err) {
            console.error('Failed to load specialty homepage products:', err);
            container.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Ã‰chec du chargement des produits de spÃ©cialitÃ©.</p>';
        }
    }

    const cartIcon = document.querySelector('.cart');
    if (cartIcon) {
        cartIcon.addEventListener('click', async () => {
            // show/hide cart modal
            toggleCartModal();

            // Refresh cart state from server/local and update view
            await loadCart();
            renderCart();
            updateCartUrl();
        });
    }

    // Load all products from database - INITIAL LOAD
    function loadAllProducts() {
        const productList = document.getElementById('productList');
        if (productList) {
            // Use paginated product rendering for the new produits page layout
            loadProductsPage(currentLang);
            return;
        }

        const allProductsGrid = document.getElementById('productsGrid');
        if (!allProductsGrid) return;

        fetch('/api/products')
            .then(r => r.json())
            .then(products => {
                allProductsGrid.innerHTML = '';
                if (!products || products.length === 0) {
                    allProductsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No products available</p>';
                    return;
                }

                products.forEach(p => {
                    const id = p.id;
                    const name = p.name_en || p.name_fr || p.name || '';
                    const price = parseFloat(p.price) || 0;

                    const a = document.createElement('a');
                    a.className = 'category product-link';
                    const routeName = normalizeProductNameRoute((name || `product-${id}`));
                    a.href = `/produits/${routeName}`;
                    a.setAttribute('data-name', name);
                    a.setAttribute('data-product-id', id);
                    
                    const browseText = translations[lang]?.['browse_product'] || 'Voir le produit';
                    a.innerHTML = `
                        <div class="image-wrapper">
                            <img src="${p.image || '/images/placeholder.jpg'}" alt="${name}" />
                        </div>
                        <p>${name}</p>
                        <div class="subtitle">€${price.toFixed(2)} - ${browseText}</div>
                    `;
                    
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.location.href = a.href;
                    });

                    allProductsGrid.appendChild(a);
                });
                bindAddButtons();
            })
            .catch(err => {
                console.error('Failed to load database products:', err);
                const allProductsGrid = document.getElementById('productsGrid');
                if (allProductsGrid) {
                    allProductsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: red;">Failed to load products</p>';
                }
            });
    }

    function loadSpecialtyProducts(lang) {
        const specialtyGrid = document.getElementById('specialtyProductsGrid');
        if (!specialtyGrid) return;

        const urlParams = new URLSearchParams(window.location.search);
        const specialtyNameParam = urlParams.get('name');

        specialtyGrid.style.opacity = '0.5';
        specialtyGrid.innerHTML = '<p class="loading-text">Chargement des spÃ©cialitÃ©s...</p>';

        if (specialtyNameParam) {
            loadProductsBySpecialty(specialtyNameParam, lang, specialtyGrid);
        } else {
            loadAllSpecialties(lang, specialtyGrid);
        }
    }

    function loadAllSpecialties(lang, specialtyGrid) {
        const pageTitle = document.getElementById('specialtyPageTitle');
        const pageDescription = document.getElementById('specialtyPageDescription');

        if (pageTitle) {
            pageTitle.textContent = categoryParam ? `SpÃ©cialitÃ©s : ${decodeURIComponent(categoryParam)}` : 'SpÃ©cialitÃ©s';
        }
        if (pageDescription) {
            pageDescription.textContent = categoryParam ? `Produits de la catÃ©gorie ${decodeURIComponent(categoryParam)}.` : '';
        }

        document.title = `${decodeURIComponent(categoryParam)} - Portugalsstore.fr`;

        fetch(`/api/specialties/category/${encodeURIComponent(categoryParam)}`)
            .then(r => r.json())
            .then(result => {
                const specialties = Array.isArray(result?.data) ? result.data : [];
                if (!specialties || specialties.length === 0) {
                    specialtyGrid.innerHTML = '<p class="loading-text">Aucune spÃ©cialitÃ© disponible pour cette catÃ©gorie.</p>';
                    specialtyGrid.style.opacity = '1';
                    return;
                }

                const fragment = document.createDocumentFragment();
                specialties.forEach(specialty => {
                    const name = (lang === 'fr' ? specialty.name_fr : lang === 'pt' ? specialty.name_pt : specialty.name_en) || specialty.name_en || specialty.name_fr || specialty.name_pt || 'Specialty';
                    const description = specialty.description || '';
                    const imageSrc = specialty.image || '/images/placeholder.jpg';

                    const slug = (specialty.name_en || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
                    const card = document.createElement('a');
                    card.href = `specialites.html?name=${encodeURIComponent(slug)}`;
                    card.className = 'category';
                    card.style.cursor = 'pointer';
                    card.innerHTML = `
                        <div class="image-wrapper">
                            <img src="${imageSrc}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='/images/placeholder.jpg'" />
                        </div>
                        <p>${name}</p>
                        <div class="subtitle">${description.substring(0, 120)}${description.length > 120 ? '...' : ''}</div>
                    `;
                    fragment.appendChild(card);
                });

                specialtyGrid.innerHTML = '';
                specialtyGrid.appendChild(fragment);
                specialtyGrid.style.opacity = '1';
                bindAddButtons();
            })
            .catch(err => {
                console.error('Failed to load specialty category products:', err);
                specialtyGrid.innerHTML = '<p class="loading-text">Impossible de charger les spÃ©cialitÃ©s pour cette catÃ©gorie.</p>';
                specialtyGrid.style.opacity = '1';
            });
    }

    function loadAllSpecialties(lang, specialtyGrid) {
        // Set default page title and description
        const pageTitle = document.getElementById('specialtyPageTitle');
        const pageDescription = document.getElementById('specialtyPageDescription');
        
        const titleText = {
            'fr': 'Nos SpÃ©cialitÃ©s Portugaises',
            'pt': 'Nossas Especialidades Portuguesas',
            'en': 'Our Portuguese Specialties'
        };
        
        const descText = {
            'fr': 'DÃ©couvrez les spÃ©cialitÃ©s les plus savoureuses et authentiques du Portugal, sÃ©lectionnÃ©es avec soin pour vous.',
            'pt': 'Descubra as especialidades mais saborosas e autÃªnticas de Portugal, selecionadas cuidadosamente para vocÃª.',
            'en': 'Discover the most delicious and authentic Portuguese specialties, carefully selected for you.'
        };
        
        if (pageTitle) {
            pageTitle.textContent = titleText[lang] || titleText['fr'];
        }
        if (pageDescription) {
            pageDescription.textContent = descText[lang] || descText['fr'];
        }
        document.title = 'SpÃ©cialitÃ©s - Portugalsstore.fr';

        fetch('/api/specialties')
            .then(r => r.json())
            .then(result => {
                const specialties = Array.isArray(result?.data) ? result.data : [];
                if (!specialties || specialties.length === 0) {
                    specialtyGrid.innerHTML = '<p class="loading-text">Aucune spÃ©cialitÃ© disponible pour le moment.</p>';
                    specialtyGrid.style.opacity = '1';
                    return;
                }

                const fragment = document.createDocumentFragment();
                specialties.forEach(specialty => {
                    const name = (lang === 'fr' ? specialty.name_fr : lang === 'pt' ? specialty.name_pt : specialty.name_en) || specialty.name_en || specialty.name_fr || specialty.name_pt || 'Specialty';
                    const description = specialty.description || '';
                    const imageSrc = specialty.image || '/images/placeholder.jpg';
                    
                    // Create slug for the link
                    const slug = (specialty.name_en || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

                    const card = document.createElement('a');
                    card.href = `specialites.html?name=${encodeURIComponent(slug)}`;
                    card.className = 'category';
                    card.style.cursor = 'pointer';
                    card.innerHTML = `
                        <div class="image-wrapper">
                            <img src="${imageSrc}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='/images/placeholder.jpg'" />
                        </div>
                        <p>${name}</p>
                        <div class="subtitle">${description.substring(0, 120)}${description.length > 120 ? '...' : ''}</div>
                    `;
                    fragment.appendChild(card);
                });

                specialtyGrid.innerHTML = '';
                specialtyGrid.appendChild(fragment);
                specialtyGrid.style.opacity = '1';
            })
            .catch(err => {
                console.error('Failed to load specialties:', err);
                specialtyGrid.innerHTML = '<p class="loading-text" style="color: red;">Ã‰chec du chargement des spÃ©cialitÃ©s.</p>';
                specialtyGrid.style.opacity = '1';
            });
    }

    function loadProductsBySpecialty(specialtyName, lang, specialtyGrid) {
        // First, fetch all specialties to find the matching one
        fetch('/api/specialties')
            .then(r => r.json())
            .then(result => {
                const specialties = Array.isArray(result?.data) ? result.data : [];
                
                // Find the specialty matching the query parameter (case-insensitive slug match)
                const specialty = specialties.find(s => {
                    const values = [s.name_en, s.name_fr, s.name_pt].filter(Boolean);
                    return values.some(name => {
                        const raw = name.toLowerCase();
                        const slug = raw.replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
                        return slug === specialtyName.toLowerCase() || raw === specialtyName.toLowerCase();
                    });
                });

                if (!specialty) {
                    const noProductsText = (translations && translations[currentLang] && translations[currentLang]['specialty.no_products']) || 'No products available for this specialty yet.';
                    specialtyGrid.innerHTML = `<p class="loading-text" style="color: red;">${noProductsText}</p>`;
                    specialtyGrid.style.opacity = '1';
                    return;
                }

                // Update page title and heading with the specialty name
                const specialtyDisplayName = (lang === 'fr' ? specialty.name_fr : lang === 'pt' ? specialty.name_pt : specialty.name_en) || specialty.name_en;
                const pageTitle = document.getElementById('specialtyPageTitle');
                const pageDescription = document.getElementById('specialtyPageDescription');
                
                if (pageTitle) {
                    pageTitle.textContent = specialtyDisplayName;
                }
                if (pageDescription) {
                    pageDescription.textContent = specialty.description || '';
                }
                document.title = `${specialtyDisplayName} - Portugalsstore.fr`;

                // Try to fetch assigned products first, then fall back to category search
                const specialtyCategory = specialty.category || specialtyDisplayName;
                return fetch(`/api/specialties/${specialty.id}/products`)
                    .then(r => r.json())
                    .then(result => {
                        const assignedProducts = result?.success && Array.isArray(result.data) ? result.data : [];
                        if (assignedProducts.length > 0) {
                            return assignedProducts;
                        }
                        return fetch(`/api/products?search=${encodeURIComponent(specialtyCategory)}`).then(r => r.json());
                    })
                    .catch(() => fetch(`/api/products?search=${encodeURIComponent(specialtyCategory)}`).then(r => r.json()))
                    .then(products => {
                        if (!products || products.length === 0) {
                            const noProductsText = (translations && translations[currentLang] && translations[currentLang]['specialty.no_products']) || 'No products available for this specialty yet.';
                            specialtyGrid.innerHTML = `<p class="loading-text">${noProductsText}</p>`;
                            specialtyGrid.style.opacity = '1';
                            return;
                        }

                        const fragment = document.createDocumentFragment();
                        products.forEach(product => {
                            const id = product.id;
                            const name = product.name_en || product.name_fr || product.name || '';
                            const price = parseFloat(product.price) || 0;
                            const imageSrc = product.image || '/images/placeholder.jpg';

                            const a = document.createElement('a');
                            a.className = 'category product-link';
                            const routeName = normalizeProductNameRoute((name || `product-${id}`));
                            a.href = `/produits/${routeName}`;
                            a.setAttribute('data-name', name);
                            a.setAttribute('data-product-id', id);
                            
                            a.innerHTML = `
                                <div class="image-wrapper">
                                    <img src="${imageSrc}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='/images/placeholder.jpg'" />
                                </div>
                                <p>${name}</p>
                                <div class="subtitle">€${price.toFixed(2)}</div>
                            `;
                            
                            a.addEventListener('click', (e) => {
                                e.preventDefault();
                                window.location.href = a.href;
                            });

                            fragment.appendChild(a);
                        });

                        specialtyGrid.innerHTML = '';
                        specialtyGrid.appendChild(fragment);
                        specialtyGrid.style.opacity = '1';
                    });
            })
            .catch(err => {
                console.error('Failed to load products for specialty:', err);
                specialtyGrid.innerHTML = `<p class="loading-text" style="color: red;">Erreur lors du chargement des produits.</p>`;
                specialtyGrid.style.opacity = '1';
            });
    }

    
    // Load all products on the produits/produtos/products listing pages and category listing pages
    const normalizedListPath = window.location.pathname.toLowerCase().replace(/\/+$|\.html$/g, '');
    const listingRoutes = new Set(['/produits', '/produtos', '/products']);
    const categoryRouteRegex = /^\/produits\/categorie\/[a-z0-9\-]+$|^\/produtos\/categoria\/[a-z0-9\-]+$|^\/products\/category\/[a-z0-9\-]+$/i;

    if (listingRoutes.has(normalizedListPath) || categoryRouteRegex.test(normalizedPath)) {
        submenuPromise.then(() => {
            const categoryId = getCategoryIdFromPath(normalizedPath);
            if (categoryId) {
                loadCategoryPage(currentLang, categoryId);
            } else {
                loadProductsPage(currentLang);
            }
            reloadContent(currentLang);
        });
    }

    // Load specialties products specifically on the /specialites.html page
    if (window.location.pathname.toLowerCase().includes('specialites')) {
        loadSpecialtyProducts(currentLang);
    }

    // Load homepage blocks for index.html
    const currentPathLower = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    if (currentPathLower === '' || currentPathLower === '/' || currentPathLower === '/index.html') {
        submenuPromise.then(() => {
            loadPopularProducts('promotionsProductsContainer', 8, '');
            loadPopularProducts('popularProductsContainer', 8, '');
            reloadContent(currentLang); // categories + specialty tiles
            renderMobileCategoryStrip(currentLang);
            loadSpecialtyProductsHome(currentLang, 8, '');
        });
    }

    const shopBtn = document.getElementById('shopBtn');
    if (shopBtn) {
        shopBtn.addEventListener('click', () => {
            const messages = {
                fr: 'Visitons la boutique!',
                pt: 'Vamos visitar a loja!',
                en: "Let's visit the store!"
            };
            alert(messages[currentLang] || messages.fr);
        });
    }

    /* ---------- CART UTILS ---------- */

    // Load cart from backend
    async function loadCart() {
        const currentToken = localStorage.getItem('userToken');
        if (!currentToken) {
            cart = JSON.parse(localStorage.getItem('cart') || '{}');
            updateBadge();
            renderCart();
            return;
        }

        try {
            const response = await fetch('/api/cart/summary', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    cartCount = result.data.itemCount || 0;
                    updateBadge();

                    if (cartCount > 0) {
                        const cartResponse = await fetch('/api/cart', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                ...getAuthHeaders()
                            },
                            credentials: 'same-origin'
                        });

                        if (cartResponse.ok) {
                            const cartResult = await cartResponse.json();
                            if (cartResult.success && Array.isArray(cartResult.data.items)) {
                                setCartFromItems(cartResult.data.items);
                                return;
                            }
                        }
                    }
                }
            } else if (response.status === 401) {
                // User not logged in, keep local cart
                cart = JSON.parse(localStorage.getItem('cart') || '{}');
                updateBadge();
            }
        } catch (error) {
            console.warn('Backend cart not available, using localStorage:', error);
            // Fallback to localStorage
            cart = JSON.parse(localStorage.getItem('cart') || '{}');
            updateBadge();
        }
        renderCart();
    }

    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    function updateBadge() {
        const total = cartCount || Object.values(cart).reduce((sum, it) => sum + (it.qty || 0), 0);
        let badge = document.querySelector('button.icon.cart .badge');

        if (!badge) {
            // Fallback to generic badge selector if specific is missing
            badge = document.querySelector('.badge');
        }

        if (badge) {
            badge.textContent = total;
            if (total > 0) {
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Add to cart - try backend first, fallback to localStorage
    async function addToCart(item, qty = 1) {
        if (!item.id || qty < 1) return;

        const token = localStorage.getItem('buyerToken') || localStorage.getItem('userToken');
        if (!token) {
            // Force login for unauthenticated buyers
            alert('Veuillez vous connecter pour ajouter des produits au panier.');
            window.location.href = '/user/login.html';
            return;
        }

        try {
            const response = await fetch('/api/cart/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    productId: item.id,
                    quantity: qty
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    cartCount = Number(result.data.summary.itemCount || 0);

                    // Keep local state in sync for immediate UI badge/render updates.
                    const existing = cart[item.id] || { name: item.name || item.id, qty: 0, price: item.price || 0 };
                    existing.qty = Number(existing.qty || 0) + Number(qty || 1);
                    existing.price = Number(item.price || existing.price || 0);
                    cart[item.id] = existing;
                    saveCart();

                    updateBadge();
                    renderCart();
                    updateCartUrl();
                    broadcastCartUpdate();
                    return;
                }
            } else if (response.status === 401) {
                // User not authorized (token invalid/expired) -> require login
                alert('Session expirÃ©e. Veuillez vous reconnecter.');
                window.location.href = '/user/login.html';
                return;
            }
        } catch (error) {
            console.warn('Backend cart not available, using localStorage:', error);
        }

        // Fallback to localStorage
        if (cart[item.id]) {
            cart[item.id].qty += qty;
        } else {
            cart[item.id] = { name: item.name || item.id, qty: qty, price: item.price || 0 };
        }
        saveCart();
        updateBadge();
        renderCart();
        updateCartUrl();
    }

    function updateCartUrl() {
        const currentCart = Object.keys(cart).length ? cart : JSON.parse(localStorage.getItem('cart') || '{}');
        const itemIds = Object.keys(currentCart);

        if (itemIds.length === 0) {
            if (window.location.pathname.startsWith('/cart.html')) {
                window.history.replaceState(null, '', '/cart.html');
            } else {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
            return;
        }

        const totalAmount = itemIds.reduce((acc, id) => {
            const entry = currentCart[id] || {};
            const qty = Number(entry.qty || 0);
            const price = Number(entry.price || 0);
            return acc + (qty * price);
        }, 0);

        const queryItems = itemIds
            .map((id, index) => `item${index + 1}=${encodeURIComponent(id)}`)
            .join('&');

        // Keep cart history URL when on cart pages only.
        // On other pages (produits etc.), do not force URL to cart route
        // so user stays on the current product page as expected.
        if (window.location.pathname.startsWith('/cart.html')) {
            const cartUrl = `/cart.html/${queryItems}&total=$${totalAmount.toFixed(2)}`;
            window.history.replaceState(null, '', cartUrl);
        } else {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    function broadcastCartUpdate() {
        window.localStorage.setItem('cartUpdateEvent', JSON.stringify({
            timestamp: Date.now(),
            cart: cart
        }));
    }

    function installCartUpdatesListener() {
        window.addEventListener('storage', (event) => {
            if (event.key === 'cartUpdateEvent') {
                try {
                    const payload = JSON.parse(event.newValue || '{}');
                    if (payload && payload.cart) {
                        cart = payload.cart;
                        updateBadge();
                        renderCart();
                        updateCartUrl();
                    }
                } catch (err) {
                    console.warn('Failed to parse cart update event', err);
                }
            }
        });
    }

    // ensure listener is installed once
    installCartUpdatesListener();

    async function removeFromCart(id) {
        const hasAuth = Boolean(localStorage.getItem('buyerToken') || localStorage.getItem('userToken'));

        if (hasAuth && id) {
            try {
                const resp = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    credentials: 'same-origin'
                });

                if (!resp.ok) {
                    console.warn('Failed to remove cart item from backend:', resp.status, resp.statusText);
                } else {
                    const result = await resp.json();
                    if (result && result.success && result.data && result.data.summary) {
                        cartCount = Number(result.data.summary.itemCount || 0);
                    }
                }
            } catch (err) {
                console.warn('Error removing item from backend cart, fallback to local remove', err);
            }
        }

        if (cart[id] !== undefined) {
            delete cart[id];
        }

        saveCart();
        updateBadge();
        renderCart();
        updateCartUrl();
        broadcastCartUpdate();
    }

    function toggleCartModal() {
        const modal = document.getElementById('cartModal');
        if (modal) modal.classList.toggle('hidden');
    }

    function renderCart() {
        const modal = document.getElementById('cartModal');
        if (!modal) return;
        const list = modal.querySelector('.cart-items');
        list.innerHTML = '';
        let total = 0;

        // If using backend cart, we need to load full cart data
        if (cartCount > 0 && Object.keys(cart).length === 0) {
            // Try to load full cart from backend
            const token = localStorage.getItem('buyerToken') || localStorage.getItem('userToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            fetch('/api/cart', {
                method: 'GET',
                headers: headers,
                credentials: 'same-origin'
            })
            .then(response => {
                if (response.status === 401) {
                    handleUnauthorized();
                    throw new Error('Unauthorized');
                }
                return response.json();
            })
            .then(result => {
                if (result.success && result.data.items) {
                    const backendCart = {};
                    cartCount = 0;

                    result.data.items.forEach(item => {
                        const qty = Number(item.quantity || 1);
                        const price = Number(item.price || 0);
                        total += qty * price;

                        const id = String(item.product_id || item.productId || item.id);
                        backendCart[id] = {
                            name: item.name_en || item.name_fr || item.name_pt || item.title || item.name || id,
                            qty: qty,
                            price: price,
                            image: item.image || item.image_url || '/images/placeholder.jpg'
                        };

                        cartCount += qty;

                        const row = document.createElement('div');
                        row.className = 'cart-item';
                        row.innerHTML = `
                            <img class="cart-item-thumb" src="${item.image || item.image_url || '/images/placeholder.jpg'}" alt="${item.name_en||item.name_fr||item.name_pt||id}" />
                            <div class="cart-item-info">
                                <div class="cart-item-name">${item.name_en || item.name_fr || item.name_pt || item.title || item.name || id}</div>
                                <div class="cart-item-meta">Qty: ${qty} • Total: €${(qty * price).toFixed(2)}</div>
                            </div>
                            <button data-id="${id}" class="remove-item">X</button>
                        `;
                        list.appendChild(row);
                    });

                    cart = backendCart;
                    updateBadge();
                    updateCartUrl();
                    modal.querySelector('.cart-total').textContent = total.toFixed(2) + ' €';
                }
            })
            .catch(() => {
                // Fallback to localStorage rendering
                Object.entries(cart).forEach(([id, it]) => {
                    const qty = Number(it.qty || 0);
                    const price = Number(it.price || 0).toFixed(2);
                    total += qty * Number(price);
                    const row = document.createElement('div');
                    row.className = 'cart-item';
                    row.innerHTML = `
                        <img class="cart-item-thumb" src="${it.image || '/images/placeholder.jpg'}" alt="${it.name}" />
                        <div class="cart-item-info">
                            <div class="cart-item-name">${it.name}</div>
                            <div class="cart-item-meta">Qty: ${qty} • Total: €${(qty * Number(price)).toFixed(2)}</div>
                        </div>
                        <button data-id="${id}" class="remove-item">X</button>
                    `;
                    list.appendChild(row);
                });
                modal.querySelector('.cart-total').textContent = total.toFixed(2) + ' €';
            });
        } else {
            // Use localStorage cart
            Object.entries(cart).forEach(([id, it]) => {
                const qty = Number(it.qty || 0);
                const price = Number(it.price || 0).toFixed(2);
                total += qty * Number(price);
                const row = document.createElement('div');
                row.className = 'cart-item';
                row.innerHTML = `
                    <img class="cart-item-thumb" src="${it.image || '/images/placeholder.jpg'}" alt="${it.name}" />
                    <div class="cart-item-info">
                        <div class="cart-item-name">${it.name}</div>
                        <div class="cart-item-meta">Qty: ${qty} • Total: €${(qty * Number(price)).toFixed(2)}</div>
                    </div>
                    <button data-id="${id}" class="remove-item">X</button>
                `;
                list.appendChild(row);
            });
            modal.querySelector('.cart-total').textContent = total.toFixed(2) + ' €';
        }

        // attach remove handlers
        modal.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = e.target.getAttribute('data-id');
                removeFromCart(id);
            });
        });
    }

    function initiateCheckout() {
        // Always redirect to checkout page first
        window.location.href = '/checkout.html';
        return;

        // If user is logged in, try backend checkout
        const token = localStorage.getItem('buyerToken') || localStorage.getItem('userToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        fetch('/api/cart', {
            method: 'GET',
            headers: headers,
            credentials: 'same-origin'
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Not logged in');
            }
        })
        .then(result => {
            if (result.success && result.data.items && result.data.items.length > 0) {
                // Use Shopify checkout for logged-in users with backend cart
                const lineItems = result.data.items.map(item => ({
                    variantId: item.product_id.toString(),
                    quantity: item.quantity
                }));

                fetch('/api/shopify/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lineItems })
                })
                .then(r => r.json())
                .then(res => {
                    const url = res?.data?.checkoutCreate?.checkout?.webUrl;
                    if (url) {
                        window.location = url;
                    } else {
                        console.error('Checkout error', res);
                        alert('Unable to create checkout. See console.');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Checkout request failed.');
                });
            } else {
                alert('Your cart is empty or you need to log in.');
            }
        })
        .catch(() => {
            // Fallback to localStorage checkout
            const lineItems = Object.entries(cart).map(([id, it]) => ({
                variantId: id,
                quantity: it.qty
            }));
            if (lineItems.length === 0) return;
            fetch('/api/shopify/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineItems })
            })
            .then(r => r.json())
            .then(res => {
                const url = res?.data?.checkoutCreate?.checkout?.webUrl;
                if (url) {
                    window.location = url;
                } else {
                    console.error('Checkout error', res);
                    alert('Unable to create checkout. See console.');
                }
            })
            .catch(err => {
                console.error(err);
                alert('Checkout request failed.');
            });
        });
    }

    function createCartModal() {
        if (document.getElementById('cartModal')) return;
        const modal = document.createElement('div');
        modal.id = 'cartModal';
        modal.className = 'cart-modal hidden';
        modal.innerHTML = `
            <div class="cart-content">
                <button class="close-cart" aria-label="Close">&times;</button>
                <h2 data-i18n="header.cart">Panier</h2>
                <div class="cart-items"></div>
                <div id="cartError" class="cart-error" style="color:#c00; margin: 8px 0; display:none;"></div>
                <div class="cart-footer">Total: <span class="cart-total">0.00</span></div>
                <button id="checkoutBtn" class="checkout-btn">Passer commande</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-cart').addEventListener('click', toggleCartModal);
        modal.addEventListener('click', e => {
            if (e.target === modal) toggleCartModal();
        });
        // checkout button: if authenticated go to checkout, otherwise go login
        modal.querySelector('#checkoutBtn').addEventListener('click', async () => {
            const token = localStorage.getItem('buyerToken') || localStorage.getItem('userToken');
            if (!token) {
                window.location.href = '/user/login.html';
                return;
            }

            try {
                const cartRes = await fetch('/api/cart', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    credentials: 'same-origin'
                });

                if (cartRes.status === 401) {
                    handleUnauthorized();
                    return;
                }

                if (!cartRes.ok) {
                    window.location.href = '/checkout.html';
                    return;
                }

                const cartResult = await cartRes.json();
                const hasItems = (cartResult && cartResult.data && Array.isArray(cartResult.data.items) && cartResult.data.items.length > 0);
                if (!hasItems) {
                    // no items, send to cart first
                    window.location.href = '/cart.html';
                } else {
                    window.location.href = '/checkout.html';
                }
            } catch (error) {
                console.warn('Unable to validate cart session before checkout', error);
                window.location.href = '/checkout.html';
            }
        });
    }

    // ===== RECOMMENDATION FUNCTIONS =====

    // Load and display personalized recommendations
    async function loadRecommendations(containerId, limit = 6) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.classList.add('recommendations-loading');

        const currentToken = localStorage.getItem('userToken');
        if (!currentToken) {
            await loadPopularProducts(containerId, limit);
            container.classList.remove('recommendations-loading');
            return;
        }

        try {
            const response = await fetch(`/api/recommendations?limit=${limit}`, {
                headers: {
                    ...getAuthHeaders()
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.length > 0) {
                    displayRecommendations(container, result.data, 'Recommended for You');
                } else {
                    // Fallback to popular products
                    await loadPopularProducts(containerId, limit);
                }
            } else {
                // Fallback to popular products
                await loadPopularProducts(containerId, limit);
            }
        } catch (error) {
            console.error('Failed to load recommendations:', error);
            // Fallback to popular products
            await loadPopularProducts(containerId, limit);
        } finally {
            container.classList.remove('recommendations-loading');
        }
    }

    // Load popular products
    async function loadPopularProducts(containerId, limit = 6, title = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.classList.add('recommendations-loading');

        try {
            // Use featured endpoint for promotions container, popular for others
            const endpoint = containerId === 'promotionsProductsContainer' 
                ? `/api/recommendations/featured?limit=${limit}`
                : `/api/recommendations/popular?limit=${limit}&excludeCart=true`;
            
            const response = await fetch(endpoint);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.length > 0) {
                    const productsToDisplay = result.data;
                    
                    if (productsToDisplay.length > 0) {
                        const sectionTitle = (title !== null)
                            ? title
                            : (containerId === 'promotionsProductsContainer' 
                                ? (translations[currentLang]?.['home.promotions'] || 'Promotions')
                                : (translations[currentLang]?.['home.popular'] || 'Popular Products'));
                        displayRecommendations(container, productsToDisplay, sectionTitle);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            container.classList.remove('recommendations-loading');
        }
    }

    // Load similar products for a specific product
    async function loadSimilarProducts(productId, containerId, limit = 4) {
        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            const response = await fetch(`/api/recommendations/similar/${productId}?limit=${limit}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.length > 0) {
                    displayRecommendations(container, result.data, 'Similar Products', false);
                }
            }
        } catch (error) {
            console.error('Failed to load similar products:', error);
        }
    }

    // Display recommendations in a container
    function displayRecommendations(container, products, title, horizontal = false) {
        // prevent flicker while injecting recommendation cards
        container.classList.add('recommendations-loading');

        const listClass = horizontal ? 'recommendations-slider' : 'recommendations-grid';
        const listStyle = horizontal
            ? 'display:flex; overflow-x:auto; gap:14px; padding: 4px 0 12px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scroll-behavior:smooth;'
            : 'display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:14px; width:100%;';

        if (title && title.trim()) {
            container.innerHTML = `
                <h3 style="font-size: 1.4rem; margin-bottom: 15px; color: #333;">${title}</h3>
                <div class="${listClass}" style="${listStyle}">
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="${listClass}" style="${listStyle}">
                </div>
            `;
        }

        const grid = container.querySelector(`.${listClass}`);

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card recommendation-card';
            card.style.border = '1px solid #eee';
            card.style.borderRadius = '8px';
            card.style.padding = '12px';
            card.style.transition = 'transform 0.2s, box-shadow 0.2s';
            if (horizontal) {
                card.style.minWidth = '240px';
                card.style.maxWidth = '240px';
                card.style.scrollSnapAlign = 'start';
                card.style.flexShrink = '0';
            } else {
                card.style.width = '100%';
            }

            const name = product[`name_${currentLang}`] || product.name_en || product.name_fr || product.name_pt || 'Product';
            const price = parseFloat(product.price) || 0;
            const promoPrice = product.promo_price ? parseFloat(product.promo_price) : null;
            const promoLabel = (product.promo_label || '').toString().trim();
            const promoExpiresAt = product.promo_expires_at ? new Date(product.promo_expires_at) : null;
            const promoIsActive = promoPrice && promoPrice > 0 && promoPrice < price && (!promoExpiresAt || promoExpiresAt > new Date());
            const discountPercent = promoIsActive ? Math.max(1, Math.round((1 - promoPrice / price) * 100)) : null;
            const labelPercentMatch = promoLabel.match(/(\d+)%/);
            const labelDiscountPercent = labelPercentMatch ? parseInt(labelPercentMatch[1], 10) : null;
            const finalDiscountPercent = discountPercent || labelDiscountPercent;
            const priceHtml = promoIsActive
                ? `<div class="price"><span style="text-decoration: line-through; color: #8f9bb3; font-size:0.95rem;">€${price.toFixed(2)}</span><span style="display:block; font-weight: 900; color: var(--primary);">€${promoPrice.toFixed(2)}</span></div>`
                : `<div class="price">€${price.toFixed(2)}</div>`;
            const promoBadgeHtml = finalDiscountPercent
                ? `<div class="promo-badge"><span class="promo-value">${finalDiscountPercent}%</span><span class="promo-text">OFF</span></div>`
                : '';
            const activeLang = currentLang || 'fr';

            card.innerHTML = `
                <div class="image-wrapper">
                    <img src="${product.image || '/images/placeholder.jpg'}"
                         alt="${name}"
                         loading="lazy"
                         onerror="this.src='/images/placeholder.jpg'" />
                    ${promoBadgeHtml}
                </div>
                <h4>${name}</h4>
                ${priceHtml}
            `;

            // Add hover effects
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });

            card.addEventListener('click', () => {
                const routeName = normalizeProductNameRoute(product.name_en || product.name_fr || product.name_pt || `product-${product.id}`);
                window.location.href = `/produits/${routeName}`;
            });

            grid.appendChild(card);
        });

        // show recommendations after insert with class state to avoid flicker
        container.classList.remove('recommendations-loading');
        container.classList.add('recommendations-ready');

        // Re-bind add to cart buttons
        bindAddButtons();
    }

    // Initialize recommendations on page load
    function initRecommendations() {
        // Load recommendations on product pages
        if (document.getElementById('recommendationsContainer')) {
            loadRecommendations('recommendationsContainer');
        }

        // Load similar products if we're on a product detail page
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('productId');
        if (productId && document.getElementById('similarProductsContainer')) {
            loadSimilarProducts(productId, 'similarProductsContainer');
        }
    }

    // Call initRecommendations when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRecommendations);
    } else {
        initRecommendations();
    }

    // Cookie Consent Logic
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    function setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    function showCookieConsent() {
        const consent = getCookie('cookieConsent');
        if (!consent) {
            document.getElementById('cookieConsent').style.display = 'block';
        }
    }

    function hideCookieConsent() {
        document.getElementById('cookieConsent').style.display = 'none';
    }

    document.getElementById('acceptCookies')?.addEventListener('click', () => {
        setCookie('cookieConsent', 'accepted', 365);
        hideCookieConsent();
    });

    document.getElementById('declineCookies')?.addEventListener('click', () => {
        setCookie('cookieConsent', 'declined', 365);
        hideCookieConsent();
    });

    // Show cookie consent on page load
    showCookieConsent();

});


