document.addEventListener('DOMContentLoaded', () => {
    let translations = {};
    let currentLang = localStorage.getItem('lang') || 'fr';

    // Load translations
    fetch('/translations.json')
        .then(res => res.json())
        .then(data => {
            translations = data;
            setLanguage(currentLang);
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
        });
    });

    document.addEventListener('click', () => {
        document.querySelector('.lang-dropdown').classList.remove('active');
    });

    function setLanguage(lang) {
        currentLang = lang;
        
        // Update language button
        if (langBtn) langBtn.textContent = lang.toUpperCase();
        
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
            
            if (value && typeof value === 'string') {
                el.textContent = value;
            }
        });

        // Update search placeholder
        const searchInput = document.querySelector('.search input');
        if (searchInput && translations[lang] && translations[lang]['search.placeholder']) {
            searchInput.placeholder = translations[lang]['search.placeholder'];
        }

        // Rebuild submenu with new language and product translations
        const productsNav = document.querySelector('nav ul li .submenu');
        if (productsNav) {
            productsNav.remove();
        }
        buildProductSubmenu(translations, lang);

        // Avoid reloading the whole products page shell, but still refresh the product list itself.
        if (document.getElementById('productList')) {
            loadProductsPage(lang);
        } else {
            reloadContent(lang);
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
    const specialtiesContainer = document.querySelector('.specialty-list');
    const pageSearchInput = document.querySelector('.search input');
    const productDetailModal = document.getElementById('productDetailModal');
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

    // initialize cart modal and state
    createCartModal();
    loadCart();

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
        imageEl.src = '/images/logo.jpg';
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
            imageEl.src = product.image || '/images/logo.jpg';
            imageEl.alt = name;
            imageEl.onerror = () => {
                imageEl.onerror = null;
                imageEl.src = '/images/logo.jpg';
            };

            if (addToCartButton) {
                addToCartButton.disabled = false;
                addToCartButton.textContent = translations[lang]?.['product.add_to_cart'] || 'Add to cart now';
                addToCartButton.onclick = () => {
                    addToCart({
                        id: product.id,
                        name,
                        price
                    }, productDetailSelectedQty);
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

            const card = document.createElement('div');
            card.className = 'category';
            card.setAttribute('data-name', name);
            card.setAttribute('data-product-id', id);
            card.innerHTML = `
                    <div class="image-wrapper">
                        <img src="${image}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='/images/logo.jpg'" />
                    </div>
                <p>${name}</p>
                <div class="subtitle">EUR ${price.toFixed(2)}</div>
                <div class="product-stock">Qty: ${quantity}</div>
            `;
            card.addEventListener('click', () => {
                openProductDetailModal(id, lang);
            });
            fragment.appendChild(card);
        });

        productList.style.visibility = 'hidden';
        productList.innerHTML = '';
        productList.appendChild(fragment);
        productList.style.visibility = 'visible';

        bindAddButtons();
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

                renderProductsPageItems(productList, products, lang, emptyMessage);
            })
            .catch(err => {
                console.error('Failed to load products:', err);
                productList.innerHTML = '<p style="width:100%; text-align:center; color:#c41e1e;">Failed to load products.</p>';
            });
    }

    function reloadContent(lang) {
        // load dynamic content from JSON file
        fetch('/data.json')
            .then(res => res.json())
            .then(data => {
                // Clear and render categories
                if (categoriesContainer && data.categories) {
                    // Preserve the heading and clear only the category cards
                    const heading = categoriesContainer.querySelector('.section-title');
                    categoriesContainer.innerHTML = '';
                    if (heading) {
                        categoriesContainer.appendChild(heading);
                    }
                    
                    data.categories.forEach((cat, index) => {
                        const a = document.createElement('a');
                        a.className = 'category';
                        a.href = cat.link || '#';
                        a.setAttribute('data-name', cat['name_' + lang] || cat.name_fr);
                        a.setAttribute('data-category-name', cat['name_' + lang] || cat.name_fr);
                        
                        const discoverText = translations[lang]?.['cta_button'] || '>> Découvrir';
                        a.innerHTML = `
                            <div class="image-wrapper">
                                <img src="${cat.image}" alt="${cat['name_' + lang]}" />
                            </div>
                            <p>${cat['name_' + lang] || cat.name_fr}</p>
                            <span class="subtitle">${discoverText}</span>
                        `;
                        categoriesContainer.appendChild(a);
                    });
                    bindCategoryClicks();
                    bindAddButtons();
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
                            // Show specialty products modal
                            const specialtyName = sp['name_' + lang] || sp.name_fr;
                            showSpecialtyProducts(specialtyName);
                        });
                        specialtiesContainer.appendChild(div);
                    });
                }
            })
            .catch(err => console.error('Failed to load content:', err));

    }

    function bindCategoryClicks() {
        const cats = document.querySelectorAll('.category');
        cats.forEach(cat => {
            cat.addEventListener('click', event => {
                event.preventDefault();
                const categoryName = cat.getAttribute('data-category-name');
                if (categoryName) {
                    showCategoryProductsByName(categoryName);
                }
            });
        });
    }

    // Category mapping between display names and database IDs
    const categoryMapping = {
        'charcuterie': 2,          // Specialties
        'cheeses': 2,              // Specialties
        'fromages': 2,             // Specialties (French)
        'queijos': 2,              // Specialties (Portuguese)
        'wines & port': 1,         // Wines
        'wines': 1,
        'vins & porto': 1,         // French
        'vins': 1,
        'vinhos & porto': 1,       // Portuguese
        'vinhos': 1,
        'canned goods': 3,         // Groceries
        'conserves': 3,            // French
        'conservas': 3,            // Portuguese
        'sweets': 3,               // Groceries
        'douceurs': 3,             // French
        'doces': 3,                // Portuguese
        'grocery': 3,              // Groceries
        'épicerie': 3,             // French
        'mercearia': 3             // Portuguese
    };

    function showCategoryProductsByName(categoryName) {
        // Convert to lowercase for matching
        const lowerName = categoryName.toLowerCase().trim();
        const categoryId = categoryMapping[lowerName];
        
        if (categoryId) {
            showCategoryProducts(categoryId, categoryName);
        } else {
            console.warn('Category mapping not found for:', categoryName);
            // Try to match by fetching all categories and finding closest match
            fetch('/api/categories')
                .then(r => r.json())
                .then(allCategories => {
                    const matched = allCategories.find(cat => {
                        return cat.name_en?.toLowerCase().includes(lowerName) ||
                               cat.name_fr?.toLowerCase().includes(lowerName) ||
                               cat.name_pt?.toLowerCase().includes(lowerName);
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
                        
                        const card = document.createElement('div');
                        card.className = 'product-card';
                        card.innerHTML = `
                            <div class="image-wrapper">
                                <img src="${p.image || '/images/placeholder.jpg'}" alt="${name}" loading="lazy" onerror="this.src='/images/placeholder.jpg'" />
                            </div>
                            <h3>${name}</h3>
                            <p class="description">${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</p>
                            <div class="price">€${price.toFixed(2)}</div>
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

    // Close modal when clicking close button
    const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
    if (closeCategoryModalBtn) {
        closeCategoryModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeCategoryModal();
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
                    'Pastéis de Nata': ['pastel', 'nata', 'pasteis'],
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
                    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No products in this specialty</p>';
                } else {
                    specialtyProducts.forEach(p => {
                        const id = p.id;
                        const name = p.name_en || p.name_fr || p.name || '';
                        const price = parseFloat(p.price) || 0;
                        const description = p.description || '';
                        
                        const card = document.createElement('div');
                        card.className = 'product-card';
                        card.innerHTML = `
                            <div class="image-wrapper">
                                <img src="${p.image || '/images/placeholder.jpg'}" alt="${name}" loading="lazy" onerror="this.src='/images/placeholder.jpg'" />
                            </div>
                            <h3>${name}</h3>
                            <p class="description">${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</p>
                            <div class="price">€${price.toFixed(2)}</div>
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

    // Close specialty modal when clicking close button
    const closeSpecialtyModalBtn = document.getElementById('closeSpecialtyModalBtn');
    if (closeSpecialtyModalBtn) {
        closeSpecialtyModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeSpecialtyModal();
        });
    }

    const cartIcon = document.querySelector('.cart');
    if (cartIcon) {
        cartIcon.addEventListener('click', () => {
            // show/hide cart modal
            toggleCartModal();
        });
    }

    // Load all products from database - INITIAL LOAD
    function loadAllProducts() {
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
                    a.href = '#';
                    a.setAttribute('data-name', name);
                    a.setAttribute('data-product-id', id);
                    
                    const browseText = translations[lang]?.['browse_product'] || 'Voir le produit';
                    a.innerHTML = `
                        <div class="image-wrapper">
                            <img src="${p.image || '/images/placeholder.jpg'}" alt="${name}" />
                        </div>
                        <p>${name}</p>
                        <span class="subtitle">€${price.toFixed(2)} - ${browseText}</span>
                    `;
                    
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log('Product clicked:', id);
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

    // Call this after translations are loaded
    submenuPromise.then(() => loadAllProducts());

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
        try {
            const response = await fetch('/api/cart/summary', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    cartCount = result.data.itemCount || 0;
                    updateBadge();
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
        const total = cartCount || Object.values(cart).reduce((sum, it) => sum + it.qty, 0);
        const badge = document.querySelector('.badge');
        if (badge) badge.textContent = total;
    }

    // Add to cart - try backend first, fallback to localStorage
    async function addToCart(item, qty = 1) {
        if (!item.id || qty < 1) return;

        try {
            const response = await fetch('/api/cart/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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
                    cartCount = result.data.summary.itemCount;
                    updateBadge();
                    renderCart();
                    return;
                }
            } else if (response.status === 401) {
                // User not logged in, use localStorage
                if (cart[item.id]) {
                    cart[item.id].qty += qty;
                } else {
                    cart[item.id] = { name: item.name || item.id, qty: qty, price: item.price || 0 };
                }
                saveCart();
                updateBadge();
                renderCart();
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
    }

    function removeFromCart(id) {
        delete cart[id];
        saveCart();
        updateBadge();
        renderCart();
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
            fetch('/api/cart', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success && result.data.items) {
                    result.data.items.forEach(item => {
                        total += item.quantity * (item.price || 0);
                        const row = document.createElement('div');
                        row.className = 'cart-item';
                        row.innerHTML = `
                            <span>${item.name_en || item.name_fr || item.name_pt || item.product_id}</span>
                            <span>${item.quantity}</span>
                            <button data-id="${item.product_id}" class="remove-item">×</button>
                        `;
                        list.appendChild(row);
                    });
                    modal.querySelector('.cart-total').textContent = total.toFixed(2) + ' €';
                }
            })
            .catch(() => {
                // Fallback to localStorage rendering
                Object.entries(cart).forEach(([id, it]) => {
                    total += it.qty * (it.price || 0);
                    const row = document.createElement('div');
                    row.className = 'cart-item';
                    row.innerHTML = `
                        <span>${it.name}</span>
                        <span>${it.qty}</span>
                        <button data-id="${id}" class="remove-item">×</button>
                    `;
                    list.appendChild(row);
                });
                modal.querySelector('.cart-total').textContent = total.toFixed(2) + ' €';
            });
        } else {
            // Use localStorage cart
            Object.entries(cart).forEach(([id, it]) => {
                total += it.qty * (it.price || 0);
                const row = document.createElement('div');
                row.className = 'cart-item';
                row.innerHTML = `
                    <span>${it.name}</span>
                    <span>${it.qty}</span>
                    <button data-id="${id}" class="remove-item">×</button>
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
        // If user is logged in, try backend checkout
        fetch('/api/cart', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
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
                <div class="cart-footer">Total: <span class="cart-total">0.00</span></div>
                <button id="checkoutBtn" class="checkout-btn">Passer commande</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-cart').addEventListener('click', toggleCartModal);
        modal.addEventListener('click', e => {
            if (e.target === modal) toggleCartModal();
        });
        // checkout button
        modal.querySelector('#checkoutBtn').addEventListener('click', () => {
            initiateCheckout();
        });
    }

    // ===== RECOMMENDATION FUNCTIONS =====

    // Load and display personalized recommendations
    async function loadRecommendations(containerId, limit = 6) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.classList.add('recommendations-loading');

        try {
            const response = await fetch(`/api/recommendations?limit=${limit}`, {
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
    async function loadPopularProducts(containerId, limit = 6) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.classList.add('recommendations-loading');

        try {
            const response = await fetch(`/api/recommendations/popular?limit=${limit}&excludeCart=true`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.length > 0) {
                    displayRecommendations(container, result.data, 'Popular Products');
                }
            }
        } catch (error) {
            console.error('Failed to load popular products:', error);
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
                    displayRecommendations(container, result.data, 'Similar Products');
                }
            }
        } catch (error) {
            console.error('Failed to load similar products:', error);
        }
    }

    // Display recommendations in a container
    function displayRecommendations(container, products, title) {
        // prevent flicker while injecting recommendation cards
        container.classList.add('recommendations-loading');
        container.innerHTML = `
            <h3 style="font-size: 1.4rem; margin-bottom: 15px; color: #333;">${title}</h3>
            <div class="recommendations-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
            </div>
        `;

        const grid = container.querySelector('.recommendations-grid');

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card recommendation-card';
            card.style.border = '1px solid #eee';
            card.style.borderRadius = '8px';
            card.style.padding = '12px';
            card.style.transition = 'transform 0.2s, box-shadow 0.2s';

            const name = product.name_en || product.name_fr || product.name_pt || 'Product';
            const price = parseFloat(product.price) || 0;
            const activeLang = currentLang || 'fr';

            card.innerHTML = `
                <div class="image-wrapper" style="position: relative; margin-bottom: 8px;">
                    <img src="${product.image || '/images/placeholder.jpg'}"
                         alt="${name}"
                         style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;"
                         loading="lazy"
                         onerror="this.src='/images/placeholder.jpg'" />
                </div>
                <h4 style="font-size: 0.9rem; margin: 0 0 4px 0; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</h4>
                <div class="price" style="font-weight: bold; color: #c41e1e;">€${price.toFixed(2)}</div>
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
                openProductDetailModal(product.id, activeLang);
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

});
