(function() {
  let placeholder = document.getElementById('adminHeader');

  function createHeaderPlaceholder() {
    const headerElement = document.createElement('div');
    headerElement.id = 'adminHeader';
    headerElement.className = 'admin-header-placeholder';
    if (document.body.firstChild) {
      document.body.insertBefore(headerElement, document.body.firstChild);
    } else {
      document.body.appendChild(headerElement);
    }
    return headerElement;
  }

  if (!placeholder) {
    placeholder = createHeaderPlaceholder();
  }

  function injectAsset(tagName, attributes) {
    const head = document.head;
    if (!head) return;

    if (tagName === 'link' && head.querySelector(`link[href="${attributes.href}"]`)) {
      return;
    }
    if (tagName === 'script' && head.querySelector(`script[src="${attributes.src}"]`)) {
      return;
    }

    const element = document.createElement(tagName);
    Object.keys(attributes).forEach((key) => {
      if (key === 'text') {
        element.textContent = attributes[key];
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });
    head.appendChild(element);
  }

  function injectHeaderAssets() {
    injectAsset('link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css' });
  }

  function injectHeaderLayoutStyles() {
    if (document.getElementById('admin-header-layout-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-header-layout-styles';
    style.textContent = `
      #adminHeader,
      .admin-header-placeholder {
        margin-left: 260px !important;
        width: calc(100% - 260px) !important;
      }

      #adminHeader > header {
        width: 100%;
      }

      @media (max-width: 768px) {
        #adminHeader,
        .admin-header-placeholder {
          margin-left: 0 !important;
          width: 100% !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function injectLanguageSelectorStyles() {
    if (document.getElementById('admin-lang-selector-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-lang-selector-styles';
    style.textContent = `
      .lang-selector {
        position: relative;
      }
      .lang-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 1rem;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
        display: none;
        flex-direction: column;
        min-width: 11rem;
        overflow: hidden;
        z-index: 1000;
      }
      .lang-dropdown.active {
        display: flex;
      }
      .lang-option {
        width: 100%;
        border: none;
        background: transparent;
        padding: 0.85rem 1rem;
        text-align: left;
        cursor: pointer;
        color: #0f172a;
        font-size: 0.95rem;
      }
      .lang-option:hover {
        background: #f8fafc;
      }
      .lang-option.active {
        background: #0284c7;
        color: white;
      }
    `;
    document.head.appendChild(style);
  }

  injectHeaderAssets();
  injectHeaderLayoutStyles();
  injectLanguageSelectorStyles();

  function setupAdminLteLayout() {
    return;
  }

  function wrapContentHeader(header) {
    if (!header.querySelector(':scope > .container-fluid')) {
      const fluid = document.createElement('div');
      fluid.className = 'container-fluid';
      while (header.firstChild) {
        fluid.appendChild(header.firstChild);
      }
      header.appendChild(fluid);
    }
  }

  function wrapCardBody(card) {
    const header = card.querySelector(':scope > .card-header');
    const hasBody = card.querySelector(':scope > .card-body');
    if (hasBody) {
      return;
    }

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    const children = Array.from(card.children);
    children.forEach(child => {
      if (child !== header) {
        cardBody.appendChild(child);
      }
    });

    if (header) {
      card.appendChild(cardBody);
    } else {
      while (card.firstChild) {
        cardBody.appendChild(card.firstChild);
      }
      card.appendChild(cardBody);
    }
  }

  function transformAdminContent() {
    const headers = document.querySelectorAll('.content-header');
    headers.forEach(header => {
      header.classList.add('content-header');
      wrapContentHeader(header);
    });

    const bodies = document.querySelectorAll('.content-body');
    bodies.forEach(body => {
      body.classList.add('content');
    });

    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      card.classList.add('card', 'card-outline', 'card-primary');
      wrapCardBody(card);
    });

    const summaryGrid = document.querySelector('.dashboard-cards.summary-grid');
    if (summaryGrid) {
      summaryGrid.classList.add('row', 'g-3');
      summaryGrid.querySelectorAll(':scope > .card').forEach(card => {
        card.classList.add('col-lg-4', 'col-md-6', 'col-12');
      });
    }

    const gridSections = document.querySelectorAll('.dashboard-main-grid');
    gridSections.forEach((grid, idx) => {
      grid.classList.add('row', 'g-3');
      const children = Array.from(grid.children);
      children.forEach((child, index) => {
        child.classList.add('col-12');
        if (idx === 0) {
          if (index === 0) {
            child.classList.add('col-lg-8');
          } else {
            child.classList.add('col-lg-4');
          }
        } else {
          child.classList.add('col-lg-4');
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', setupAdminLteLayout);

  function getHeaderHtml() {
    try {
      const request = new XMLHttpRequest();
      request.open('GET', '/admin/admin-header.html', false);
      request.send(null);
      if (request.status >= 200 && request.status < 300) {
        return request.responseText;
      }
      console.error('[admin-header] Failed to load header include:', request.status);
      return null;
    } catch (err) {
      console.error('[admin-header] Header load error:', err);
      return null;
    }
  }

  const html = getHeaderHtml();
  if (!html) return;
  placeholder.innerHTML = html;
  window.dispatchEvent(new CustomEvent('adminHeaderReady'));

  const titleKey = placeholder.dataset.headerTitleKey;
  const titleText = placeholder.dataset.headerTitle;
  const subtitleText = placeholder.dataset.headerSubtitle;
  const titleEl = placeholder.querySelector('#pageTitle');
  const subtitleEl = placeholder.querySelector('.logo-text p');

  function setHeaderTitle() {
    if (!titleEl) return;
    if (titleKey) {
      titleEl.setAttribute('data-i18n', titleKey);
      titleEl.textContent = window.translate ? window.translate(titleKey) : titleText || titleKey;
    } else if (titleText) {
      titleEl.textContent = titleText;
    } else {
      const pageHeader = document.querySelector('.content-header h1, .content-header h2, .content-header h3');
      if (pageHeader && pageHeader.textContent.trim()) {
        titleEl.textContent = pageHeader.textContent.trim();
      } else {
        titleEl.textContent = document.title || 'Admin Dashboard';
      }
    }
  }

  function setHeaderDate() {
    const dateEl = placeholder.querySelector('#headerDate');
    if (!dateEl) return;
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    dateEl.textContent = formatted;
  }

  setHeaderTitle();
  setHeaderDate();

  if (subtitleEl && subtitleText) {
    subtitleEl.textContent = subtitleText;
  }

  const username = localStorage.getItem('adminUsername') || 'Admin';
  const userNameEl = placeholder.querySelector('#userName');
  const userAvatarEl = placeholder.querySelector('#userAvatar');

  if (userNameEl) {
    userNameEl.textContent = username;
  }
  if (userAvatarEl) {
    userAvatarEl.textContent = username.charAt(0).toUpperCase();
  }

  function updateNotificationCount(count) {
    const badge = placeholder.querySelector('#notificationBadge');
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  function renderNotifications(items = []) {
    const list = placeholder.querySelector('#notificationList');
    const placeholderItem = placeholder.querySelector('#notificationPlaceholder');
    if (!list || !placeholderItem) return;

    if (!items.length) {
      placeholderItem.textContent = window.translate ? window.translate('admin.notifications.empty') : 'No new notifications';
      return;
    }

    list.innerHTML = items
      .map(item => `<li class="px-4 py-3 text-sm text-slate-700">${item}</li>`)
      .join('');
  }

  function togglePopover() {
    const popover = placeholder.querySelector('#notificationPopover');
    if (!popover) return;
    popover.classList.toggle('hidden');
  }

  function closePopover() {
    const popover = placeholder.querySelector('#notificationPopover');
    if (!popover) return;
    popover.classList.add('hidden');
  }

  function toggleProfileMenu() {
    const profileMenu = placeholder.querySelector('#profileMenu');
    if (!profileMenu) return;
    profileMenu.classList.toggle('hidden');
  }

  function closeProfileMenu() {
    const profileMenu = placeholder.querySelector('#profileMenu');
    if (!profileMenu) return;
    profileMenu.classList.add('hidden');
  }

  function applyHeaderTranslations() {
    if (!window.translate) return;
    placeholder.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = window.translate(key);
      }
    });
  }

  const notificationBtn = placeholder.querySelector('#notificationBtn');
  const profileBtn = placeholder.querySelector('#profileBtn');
  const logoutBtn = placeholder.querySelector('#logoutBtn');

  if (notificationBtn) {
    notificationBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      togglePopover();
      closeProfileMenu();
    });
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleProfileMenu();
      closePopover();
      const expanded = profileBtn.getAttribute('aria-expanded') === 'true';
      profileBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  }

  document.addEventListener('click', function(event) {
    const popover = placeholder.querySelector('#notificationPopover');
    const profileMenu = placeholder.querySelector('#profileMenu');
    if (popover && !popover.contains(event.target) && event.target !== notificationBtn) {
      closePopover();
    }
    if (profileMenu && !profileMenu.contains(event.target) && event.target !== profileBtn) {
      closeProfileMenu();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('adminToken');
      window.location = '/admin/login.html';
    });
  }

  const profileSettingsBtn = placeholder.querySelector('#profileSettings');
  if (profileSettingsBtn) {
    profileSettingsBtn.addEventListener('click', function() {
      window.location.href = '/admin/settings.html';
    });
  }

  if (window.addEventListener) {
    window.addEventListener('DOMContentLoaded', applyHeaderTranslations);
    window.addEventListener('i18nLanguageChanged', applyHeaderTranslations);
    window.addEventListener('languageChanged', applyHeaderTranslations);
  }

  if (window.translate) {
    applyHeaderTranslations();
  }

  function initLanguageSelector() {
    const langBtn = placeholder.querySelector('#langBtn');
    const langDropdown = placeholder.querySelector('#langDropdown');
    const langOptions = placeholder.querySelectorAll('.lang-option');

    if (!langBtn || !langDropdown) return;

    // Toggle dropdown
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.lang-selector')) {
        langDropdown.classList.remove('active');
      }
    });

    // Handle language selection
    langOptions.forEach(option => {
      option.addEventListener('click', () => {
        const lang = option.getAttribute('data-lang');
        if (lang) {
          localStorage.setItem('adminLanguage', lang);
          localStorage.setItem('selectedLanguage', lang);
          updateLanguageSelectorUI(lang);
          if (window.i18n && typeof window.i18n.setLanguage === 'function') {
            window.i18n.setLanguage(lang);
          }
          langDropdown.classList.remove('active');
        }
      });
    });
  }

  function updateLanguageSelectorUI(lang) {
    const langBtn = placeholder.querySelector('#langBtn');
    const langMap = { en: 'EN', fr: 'FR', pt: 'PT' };
    if (langBtn) {
      langBtn.textContent = langMap[lang] || 'EN';
    }
    placeholder.querySelectorAll('.lang-option').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
    });
    
    // Update sidebar labels if they exist
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.querySelectorAll('.sidebar-label').forEach(label => {
        label.remove();
      });
      
      const labelText = item.getAttribute(`data-label-${lang}`) || 
                       item.getAttribute('data-label-en') || '';
      
      const newLabel = document.createElement('span');
      newLabel.className = 'sidebar-label';
      newLabel.textContent = labelText;
      
      const icon = item.querySelector('.sidebar-icon');
      if (icon) {
        icon.insertAdjacentElement('afterend', newLabel);
      } else {
        item.appendChild(newLabel);
      }
    });

    window.dispatchEvent(new CustomEvent('adminLanguageChanged', { detail: { lang } }));
  }

  // Initialize language selector
  initLanguageSelector();

  updateNotificationCount(0);
  renderNotifications([]);
})();
