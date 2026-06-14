// Sidebar menu configuration and initialization
const SIDEBAR_CONFIG = {
    menu: [
        { href: '/admin/index.html', section: 'dashboard', label: 'Dashboard', icon: '📊', labels: { fr: 'Tableau de bord', en: 'Dashboard', pt: 'Painel' } },
        { href: '/admin/products.html', section: 'products', label: 'Products', icon: '🛍️', labels: { fr: 'Produits', en: 'Products', pt: 'Produtos' } },
        { href: '/admin/categories.html', section: 'categories', label: 'Categories', icon: '📁', labels: { fr: 'Catgories', en: 'Categories', pt: 'Categorias' } },
        { href: '/admin/users.html', section: 'users', label: 'Users', icon: '👥', labels: { fr: 'Utilisateurs', en: 'Users', pt: 'Utilizadores' } },
        { href: '/admin/comments.html', section: 'comments', label: 'Comments', icon: '💬', labels: { fr: 'Commentaires', en: 'Comments', pt: 'Comentários' } },
        { href: '/admin/roles.html', section: 'roles', label: 'Roles', icon: '🔐', labels: { fr: 'Rles', en: 'Roles', pt: 'Funes' } },
        { href: '/admin/specialties.html', section: 'specialties', label: 'Specialties', icon: '⭐', labels: { fr: 'Nos Spcialits Portugaises', en: 'Specialties', pt: 'Especialidades' } },
        { href: '/admin/coupons.html', section: 'coupons', label: 'Coupons', icon: '🎟️', labels: { fr: 'Coupons', en: 'Coupons', pt: 'Cupões' } },
        { href: '/admin/returns.html', section: 'returns', label: 'Returns', icon: '🔄', labels: { fr: 'Retours', en: 'Returns', pt: 'Devoluções' } },
        { href: '/admin/orders.html', section: 'orders', label: 'Orders', icon: '📦', labels: { fr: 'Commandes', en: 'Orders', pt: 'Encomendas' } },
        { href: '/admin/reports.html', section: 'reports', label: 'Reports', icon: '📈', labels: { fr: 'Rapports', en: 'Reports', pt: 'Relatórios' } },
        { href: '/admin/consumers.html', section: 'customers', label: 'Customers', icon: '👤', labels: { fr: 'Clients', en: 'Customers', pt: 'Clientes' } }
    ],
    settings: [
        { href: '/admin/analytics.html', section: 'analytics', label: 'Analytics', icon: '📊', labels: { fr: 'Analyse', en: 'Analytics', pt: 'Análise' } },
        { href: '#', section: 'languages', label: 'Languages', icon: '🌐', labels: { fr: 'Langues', en: 'Languages', pt: 'Línguas' } }
    ]
};

/**
 * Get the current page section based on the page filename
 */
function getCurrentPageSection() {
    const rawPathname = window.location.pathname;
    const pathname = rawPathname.split('#')[0].split('?')[0].replace(/\/$/, '');
    const filename = pathname.split('/').pop() || 'index';

    const sectionMap = {
        'index': 'dashboard',
        'index.html': 'dashboard',
        'products': 'products',
        'products.html': 'products',
        'categories': 'categories',
        'categories.html': 'categories',
        'users': 'users',
        'users.html': 'users',
        'consumers': 'customers',
        'consumers.html': 'customers',
        'cusumers': 'customers',
        'cusumers.html': 'customers',
        'reports': 'reports',
        'reports.html': 'reports',
        'orders': 'orders',
        'orders.html': 'orders',
        'specialties': 'specialties',
        'specialties.html': 'specialties',
        'comments': 'comments',
        'comments.html': 'comments',
        'roles': 'roles',
        'roles.html': 'roles',
        'coupons': 'coupons',
        'coupons.html': 'coupons',
        'returns': 'returns',
        'returns.html': 'returns',
        'settings': 'settings',
        'settings.html': 'settings',
        'analytics': 'analytics',
        'analytics.html': 'analytics'
    };

    let section = sectionMap[filename] || sectionMap[pathname];
    if (!section) {
        section = localStorage.getItem('adminActiveSidebarSection');
    }

    console.log('🔍 Sidebar detection - Pathname:', pathname, 'Filename:', filename, 'Section:', section);

    return section || null;
}

/**
 * Create a sidebar item element
 */
function normalizeSidebarHref(href) {
    if (!href) return '#';
    if (href.startsWith('http') || href.startsWith('/')) return href;
    return `${window.location.origin}/admin/${href}`;
}

function injectSharedSidebarStyles() {
    if (document.getElementById('shared-sidebar-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'shared-sidebar-styles';
    style.textContent = `
        #sidebar {
            width: 260px;
            min-width: 260px;
            max-width: 260px;
            background: #1b1f28;
            color: #f5f7fb;
            border-right: 1px solid rgba(255, 255, 255, 0.05);
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            z-index: 1000;
            padding-top: 20px;
        }

        .sidebar-brand {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 12px;
            padding: 16px 20px;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sidebar-brand .brand-link {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: #f5f7fb;
            width: 100%;
        }

        .brand-image {
            width: 36px;
            height: 36px;
            object-fit: contain;
            border-radius: 8px;
        }

        .brand-text {
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.02em;
            white-space: nowrap;
        }

        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 18px;
            color: #d8dce9;
            border-radius: 12px;
            text-decoration: none;
            transition: background 0.2s ease, color 0.2s ease;
            margin: 0 12px 6px;
        }

        .sidebar-item:hover,
        .sidebar-item.active {
            background: rgba(255, 255, 255, 0.08);
            color: #ffffff;
        }

        .sidebar-item.active {
            box-shadow: inset 4px 0 0 #5b7ff6;
        }

        .sidebar-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            font-size: 16px;
        }

        .sidebar-badge {
            margin-left: auto;
            background: #5b7ff6;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            min-width: 24px;
            padding: 4px 8px;
            border-radius: 999px;
            text-align: center;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .sidebar-label {
            flex: 1;
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
        }

        .nav-header {
            padding: 0 18px 10px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.55);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-top: 18px;
        }

        .content {
            margin-left: 260px !important;
            padding: 20px;
        }

        .content-header {
            margin-left: 260px !important;
            padding: 20px 20px 0;
        }

        @media (max-width: 1200px) {
            #sidebar {
                position: fixed;
            }
        }

        @media (max-width: 768px) {
            #sidebar {
                width: 100%;
                min-width: 100%;
                max-width: 100%;
                height: auto;
                position: relative;
            }

            .content,
            .content-header {
                margin-left: 0 !important;
            }
        }
    `;

    document.head.appendChild(style);
}

function shouldShowSidebarBadge(section) {
    return ['comments', 'returns', 'orders'].includes(section);
}

function createSidebarItem(item, isActive = false) {
    const li = document.createElement('li');
    li.className = 'nav-item';
    
    const a = document.createElement('a');
    a.href = isActive ? 'javascript:void(0)' : normalizeSidebarHref(item.href);
    a.target = '_self';
    a.className = `nav-link sidebar-item${isActive ? ' active' : ''}`;
    a.dataset.section = item.section;
    a.dataset.labelFr = item.labels.fr;
    a.dataset.labelEn = item.labels.en;
    a.dataset.labelPt = item.labels.pt;
    if (isActive) {
        a.setAttribute('aria-current', 'page');
        a.setAttribute('role', 'link');
    }

    a.innerHTML = `
        <span class="sidebar-icon">${item.icon}</span>
        <span class="sidebar-label">${item.label}</span>
        ${shouldShowSidebarBadge(item.section) ? `<span class="sidebar-badge" data-sidebar-section="${item.section}" style="display: none;">0</span>` : ''}
    `;
    
    li.appendChild(a);

    if (isActive) {
        a.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
        a.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
            }
        });
    } else {
        a.addEventListener('click', () => {
            if (item.section) {
                localStorage.setItem('adminActiveSidebarSection', item.section);
            }
        });
    }

    if (item.href && item.href.toLowerCase().endsWith('consumers.html')) {
        a.addEventListener('click', (event) => {
            if (isActive) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            event.preventDefault();
            localStorage.setItem('adminActiveSidebarSection', item.section);
            window.location.href = '/admin/consumers.html';
        });
    }

    return li;
}

function getAdminAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    if (!token) return null;
    return {
        'Authorization': `Bearer ${token}`,
        'x-admin-token': token
    };
}

function setSidebarBadge(section, value) {
    const badge = document.querySelector(`.sidebar-badge[data-sidebar-section="${section}"]`);
    if (!badge) return;
    const count = Number(value) || 0;
    badge.textContent = count > 999 ? '999+' : count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

async function fetchPendingCommentsCount(headers) {
    try {
        const response = await fetch('/api/comments?status=pending&page=1&per_page=1', {
            headers,
            credentials: 'same-origin'
        });
        if (!response.ok) return 0;
        const data = await response.json();
        return data.total || 0;
    } catch (err) {
        console.error('[Sidebar] Could not fetch pending comments count', err);
        return 0;
    }
}

async function fetchPendingReturnsCount(headers) {
    try {
        const response = await fetch('/api/returns/admin', {
            headers,
            credentials: 'same-origin'
        });
        if (!response.ok) return 0;
        const body = await response.json();
        const items = Array.isArray(body.data) ? body.data : [];
        return items.filter((item) => item.status === 'pending').length;
    } catch (err) {
        console.error('[Sidebar] Could not fetch pending returns count', err);
        return 0;
    }
}

async function fetchSidebarNotificationCounts() {
    const headers = getAdminAuthHeaders();
    if (!headers) return;

    const [dashboardStats, pendingComments, pendingReturns] = await Promise.all([
        fetch('/api/admin/dashboard/stats', {
            headers,
            credentials: 'same-origin'
        }).then(async (response) => {
            if (!response.ok) return null;
            const body = await response.json();
            return body.success ? body.data : null;
        }).catch((err) => {
            console.error('[Sidebar] dashboard stats error', err);
            return null;
        }),
        fetchPendingCommentsCount(headers),
        fetchPendingReturnsCount(headers)
    ]);

    if (dashboardStats) {
        setSidebarBadge('orders', dashboardStats.totalOrders);
    }

    setSidebarBadge('comments', pendingComments);
    setSidebarBadge('returns', pendingReturns);
}

function initializeSidebarNotificationPolling() {
    fetchSidebarNotificationCounts();
    window.setInterval(fetchSidebarNotificationCounts, 30000);
}
function initializeSidebar() {
    const sidebarElement = document.getElementById('sidebar');
    if (!sidebarElement) {
        console.warn('❌ Sidebar element not found with id="sidebar"');
        return;
    }
    
    injectSharedSidebarStyles();

    const currentSection = getCurrentPageSection();
    console.log('✅ Initializing sidebar - Current section:', currentSection);
    
    // Clear existing sidebar content
    sidebarElement.innerHTML = '';

    const brandContainer = document.createElement('div');
    brandContainer.className = 'sidebar-brand';
    brandContainer.innerHTML = `
        <a href="/admin/index.html" class="brand-link">
            <img src="/images/Saudade_market.png" alt="Saudade Market" class="brand-image">
            <span class="brand-text">Saudade Market</span>
        </a>
    `;
    sidebarElement.appendChild(brandContainer);
    
    // Create main nav wrapper
    const navWrapper = document.createElement('nav');
    navWrapper.className = 'mt-2';
    
    const menuList = document.createElement('ul');
    menuList.className = 'nav nav-pills nav-sidebar flex-column';
    menuList.setAttribute('role', 'menu');
    menuList.setAttribute('data-accordion', 'false');

    const menuHeader = document.createElement('li');
    menuHeader.className = 'nav-header';
    menuHeader.textContent = 'MENU';
    menuList.appendChild(menuHeader);

    SIDEBAR_CONFIG.menu.forEach(item => {
        const isActive = item.section === currentSection;
        if (isActive) {
            console.log('⭐ Active item detected:', item.section, item.label);
        }
        menuList.appendChild(createSidebarItem(item, isActive));
    });

    const settingsList = document.createElement('ul');
    settingsList.className = 'nav nav-pills nav-sidebar flex-column';
    settingsList.setAttribute('role', 'menu');
    settingsList.setAttribute('data-accordion', 'false');

    const settingsHeader = document.createElement('li');
    settingsHeader.className = 'nav-header';
    settingsHeader.textContent = 'PARAMÈTRES';
    settingsList.appendChild(settingsHeader);

    SIDEBAR_CONFIG.settings.forEach(item => {
        const isActive = item.section === currentSection;
        if (isActive) {
            console.log('⭐ Active settings item detected:', item.section, item.label);
        }
        settingsList.appendChild(createSidebarItem(item, isActive));
    });

    navWrapper.appendChild(menuList);
    navWrapper.appendChild(settingsList);
    sidebarElement.appendChild(navWrapper);
    console.log('✅ Sidebar initialization complete');
    initializeSidebarNotificationPolling();
}

/**
 * Initialize the menu toggle functionality
 */
function initializeMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (!(menuToggle && sidebar)) {
        return false;
    }

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        console.log('🔄 Menu toggle clicked - sidebar active:', sidebar.classList.contains('active'));
    });
    console.log('✅ Menu toggle initialized');
    return true;
}

function ensureMenuToggleInitialized() {
    if (!initializeMenuToggle()) {
        window.addEventListener('adminHeaderReady', initializeMenuToggle, { once: true });
    }
}

function injectAdminHeaderScript() {
    if (document.getElementById('admin-header-script')) {
        return;
    }

    if (document.body && document.body.dataset.noAdminHeader === 'true') {
        return;
    }

    const script = document.createElement('script');
    script.id = 'admin-header-script';
    script.src = '/admin/admin-header.js';
    script.defer = true;
    document.head.appendChild(script);
}

// Initialize sidebar and menu toggle when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        injectAdminHeaderScript();
        initializeSidebar();
        ensureMenuToggleInitialized();
    });
} else {
    injectAdminHeaderScript();
    initializeSidebar();
    ensureMenuToggleInitialized();
}
