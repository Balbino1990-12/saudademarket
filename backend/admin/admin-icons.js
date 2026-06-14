(function() {
  const sidebarIconMap = {
    dashboard: '🏠',
    products: '📦',
    categories: '📂',
    users: '👥',
    comments: '💬',
    roles: '🛡️',
    specialties: '✨',
    coupons: '🏷️',
    returns: '↩️',
    orders: '🧾',
    customers: '👥',
    analytics: '📊',
    settings: '⚙️',
    languages: '🌐'
  };

  const dashboardCardIconMap = {
    total_sales: '💰',
    products: '📦',
    orders: '🧾',
    customers: '👥'
  };

  const activityTypeIconMap = {
    sale: '💸',
    order: '🧾',
    product: '📦',
    comment: '💬',
    return: '↩️',
    user: '👤',
    login: '🔐',
    alert: '⚠️',
    shipment: '🚚',
    payment: '💳',
    error: '❌',
    success: '✅'
  };

  function getSidebarIcon(section) {
    return sidebarIconMap[section] || '⭐';
  }

  function getCardIcon(title) {
    const key = title.trim().toLowerCase().replace(/\s+/g, '_');
    if (dashboardCardIconMap[key]) return dashboardCardIconMap[key];
    return Object.keys(dashboardCardIconMap).reduce((icon, mapKey) => {
      return title.toLowerCase().includes(mapKey) ? dashboardCardIconMap[mapKey] : icon;
    }, '⭐');
  }

  function getActivityIcon(type) {
    if (!type) return '📌';
    const normalized = type.toString().trim().toLowerCase();
    return activityTypeIconMap[normalized] || '📌';
  }

  function applySidebarIcons() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const section = item.getAttribute('data-section') || item.dataset.section;
      if (!section) return;
      const iconEl = item.querySelector('.sidebar-icon');
      if (!iconEl) return;
      const icon = getSidebarIcon(section);
      if (iconEl.textContent.trim() === '??' || iconEl.textContent.trim() === '') {
        iconEl.textContent = icon;
      }
    });
  }

  function getDataIcon(field) {
    const normalized = (field || '').toString().trim().toLowerCase();
    const dataIconMap = {
      productname: '📝',
      productnameen: '📝',
      productnamefr: '📝',
      productnamept: '📝',
      productcategory: '📁',
      productprice: '💲',
      productquantity: '🔢',
      productdescription: '📝',
      categoryicon: '🔣',
      categoryname: '📂',
      couponcode: '🏷️',
      couponamount: '💰',
      useremail: '✉️',
      userid: '🆔',
      username: '👤',
      userrole: '🛡️',
      orderstatus: '📦',
      orderdate: '📅',
      returndate: '↩️',
      returndetails: '📝'
    };

    if (dataIconMap[normalized]) return dataIconMap[normalized];
    if (normalized.includes('name')) return '📝';
    if (normalized.includes('price')) return '💲';
    if (normalized.includes('quantity') || normalized.includes('count')) return '🔢';
    if (normalized.includes('category') || normalized.includes('type')) return '📁';
    if (normalized.includes('description') || normalized.includes('details')) return '📝';
    if (normalized.includes('email')) return '✉️';
    if (normalized.includes('code') || normalized.includes('coupon')) return '🏷️';
    return null;
  }

  function applyDataIconAttributes() {
    document.querySelectorAll('[data-icon]').forEach(el => {
      const iconAttr = el.getAttribute('data-icon') || '';
      const text = el.textContent || '';
      const isPlaceholder = iconAttr.trim().startsWith('??') || text.trim().startsWith('??');
      if (!isPlaceholder) return;

      const target = el.getAttribute('for') || el.id || text;
      const icon = getDataIcon(target);
      if (!icon) return;

      el.setAttribute('data-icon', icon);
      const cleanText = text.replace(/^[?\s]+/, '').trim();
      el.textContent = cleanText.length ? `${icon} ${cleanText}` : icon;
    });
  }

  function applyDashboardCardIcons() {
    document.querySelectorAll('.card-icon').forEach(iconEl => {
      if (!iconEl) return;
      const card = iconEl.closest('.card');
      if (!card) return;
      const titleEl = card.querySelector('.card-title');
      if (!titleEl) return;
      const icon = getCardIcon(titleEl.textContent || '');
      if (iconEl.textContent.trim() === '??' || iconEl.textContent.trim() === '') {
        iconEl.textContent = icon;
      }
    });
  }

  function applyActivityIcons() {
    document.querySelectorAll('.activity-icon').forEach(iconEl => {
      if (!iconEl) return;
      const type = iconEl.getAttribute('data-activity-type') || iconEl.closest('.activity-item')?.getAttribute('data-activity-type');
      const icon = getActivityIcon(type || iconEl.textContent);
      if (iconEl.textContent.trim() === '??' || iconEl.textContent.trim() === '') {
        iconEl.textContent = icon;
      }
    });
  }

  function applyAdminIcons() {
    applySidebarIcons();
    applyDashboardCardIcons();
    applyActivityIcons();
    applyDataIconAttributes();
  }

  document.addEventListener('DOMContentLoaded', applyAdminIcons);
  window.addEventListener('adminLanguageChanged', applyAdminIcons);

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    applyAdminIcons();
  }
})();
