/**
 * Dashboard Statistics Loader
 * Fetches real data from the admin API and updates the dashboard cards
 */

async function loadDashboardStats() {
  try {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      console.error('[Dashboard] No admin token found');
      return;
    }

    console.log('[Dashboard] Loading dashboard statistics...');
    
    const headers = getAdminAuthHeaders();
    if (!headers) {
      console.error('[Dashboard] No admin token found');
      return;
    }

    const response = await fetch('/api/admin/dashboard/stats', {
      method: 'GET',
      credentials: 'same-origin',
      headers
    });

    if (!response.ok) {
      console.error('[Dashboard] Failed to fetch statistics:', response.status);
      return;
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      console.log('[Dashboard] Statistics received:', result.data);
      updateDashboardCards(result.data);
    } else {
      console.error('[Dashboard] Invalid response format:', result);
    }
  } catch (err) {
    console.error('[Dashboard] Error loading dashboard statistics:', err);
  }
}

/**
 * Updates the dashboard card values with real data
 * @param {Object} stats - Dashboard statistics object
 */
function updateDashboardCards(stats) {
  try {
    const updateValue = (id, value, formatter) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.textContent = formatter ? formatter(value) : value;
    };

    const percentText = (value) => {
      if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return 'N/A';
      }
      return formatPercent(value);
    };

    updateValue('newOrdersValue', stats.newOrders ?? stats.totalOrders ?? 0);
    updateValue('bounceRateValue', stats.bounceRate !== undefined ? percentText(stats.bounceRate) : 'N/A');
    updateValue('userRegistrationsValue', stats.userRegistrations ?? stats.totalUsers ?? stats.totalCustomers ?? 0);
    updateValue('uniqueVisitorsValue', stats.uniqueVisitors ?? stats.uniqueCustomers ?? stats.totalCustomers ?? 0);
    updateValue('totalExpensesValue', stats.totalExpenses !== undefined ? `€${stats.totalExpenses.toFixed(2)}` : '€0.00');
    updateValue('profitValue', stats.profit !== undefined ? `€${stats.profit.toFixed(2)}` : '€0.00');

    console.log('[Dashboard] Updated summary dashboard cards:', {
      newOrders: stats.newOrders,
      bounceRate: stats.bounceRate,
      userRegistrations: stats.userRegistrations,
      uniqueVisitors: stats.uniqueVisitors,
      totalExpenses: stats.totalExpenses,
      profit: stats.profit
    });
  } catch (err) {
    console.error('[Dashboard] Error updating dashboard cards:', err);
  }
}

function formatPercent(value) {
  const number = parseFloat(value);
  if (Number.isNaN(number)) {
    return 'N/A';
  }
  return `${number.toFixed(1)}%`;
}

function formatAverageTime(value) {
  const minutes = parseFloat(value) || 0;
  return `${minutes.toFixed(2)} min`;
}

function getAdminAuthHeaders() {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return null;
  }

  return {
    'Authorization': `Bearer ${token}`,
    'x-admin-token': token
  };
}

/**
 * Formats a number as currency (EUR format)
 * @param {number} value - The value to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (err) {
    console.error('[Dashboard] Error formatting currency:', err);
    return value.toFixed(2);
  }
}

// Chart instances (global)
let ordersByStatusChart = null;
let paymentStatusChart = null;
let ordersTrendChart = null;

/**
 * Load orders statistics and render charts
 */
async function loadOrdersStatistics() {
  try {
    const headers = getAdminAuthHeaders();
    if (!headers) {
      console.error('[Dashboard Charts] No admin token found');
      return;
    }

    console.log('[Dashboard Charts] Loading orders statistics...');
    
    const response = await fetch('/api/admin/orders/statistics', {
      method: 'GET',
      credentials: 'same-origin',
      headers
    });

    if (!response.ok) {
      console.error('[Dashboard Charts] Failed to fetch statistics:', response.status);
      return;
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      console.log('[Dashboard Charts] Statistics received:', result.data);
      renderOrdersCharts(result.data);
    } else {
      console.error('[Dashboard Charts] Invalid response format:', result);
    }
  } catch (err) {
    console.error('[Dashboard Charts] Error loading orders statistics:', err);
  }
}

/**
 * Render all orders charts
 * @param {Object} data - Orders statistics data
 */
function renderOrdersCharts(data) {
  try {
    console.log('[Dashboard Charts] Rendering charts...');
    
    // Render Orders by Status Chart
    renderOrdersByStatusChart(data.ordersByStatus);
    
    // Render Payment Status Chart
    renderPaymentStatusChart(data.ordersByPayment);
    
    // Render Orders Trend Chart
    renderOrdersTrendChart(data.ordersTrend);
    
    console.log('[Dashboard Charts] All charts rendered successfully');
  } catch (err) {
    console.error('[Dashboard Charts] Error rendering charts:', err);
  }
}

/**
 * Render orders by status pie/doughnut chart
 */
function renderOrdersByStatusChart(statusData) {
  try {
    const canvas = document.getElementById('ordersByStatusChart');
    if (!canvas) {
      console.warn('[Dashboard Charts] Canvas for orders by status not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (ordersByStatusChart) {
      ordersByStatusChart.destroy();
    }

    const labels = statusData.map(item => capitalizeFirst(item.shipping_status || 'Unknown'));
    const data = statusData.map(item => item.count);
    
    const colors = ['#c41e1e', '#28a745', '#ffc107', '#17a2b8', '#6c757d'];

    ordersByStatusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              font: { size: 12 }
            }
          }
        }
      }
    });
    
    console.log('[Dashboard Charts] Orders by status chart rendered');
  } catch (err) {
    console.error('[Dashboard Charts] Error rendering orders by status chart:', err);
  }
}

/**
 * Render payment status chart
 */
function renderPaymentStatusChart(paymentData) {
  try {
    const canvas = document.getElementById('paymentStatusChart');
    if (!canvas) {
      console.warn('[Dashboard Charts] Canvas for payment status not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (paymentStatusChart) {
      paymentStatusChart.destroy();
    }

    const labels = paymentData.map(item => capitalizeFirst(item.payment_status || 'Unknown'));
    const data = paymentData.map(item => item.count);
    
    const colors = ['#28a745', '#c41e1e', '#ffc107', '#17a2b8'];

    paymentStatusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              font: { size: 12 }
            }
          }
        }
      }
    });
    
    console.log('[Dashboard Charts] Payment status chart rendered');
  } catch (err) {
    console.error('[Dashboard Charts] Error rendering payment status chart:', err);
  }
}

/**
 * Render orders trend line chart
 */
function renderOrdersTrendChart(trendData) {
  try {
    const canvas = document.getElementById('ordersTrendChart');
    if (!canvas) {
      console.warn('[Dashboard Charts] Canvas for orders trend not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (ordersTrendChart) {
      ordersTrendChart.destroy();
    }

    const labels = trendData.map(item => formatDateShort(item.date));
    const data = trendData.map(item => item.count);

    ordersTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Orders',
          data: data,
          borderColor: '#c41e1e',
          backgroundColor: 'rgba(196, 30, 30, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#c41e1e',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              padding: 15,
              usePointStyle: true,
              font: { size: 12 }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
    
    console.log('[Dashboard Charts] Orders trend chart rendered');
  } catch (err) {
    console.error('[Dashboard Charts] Error rendering orders trend chart:', err);
  }
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str) {
  if (!str) return 'Unknown';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format date to short format (MMM DD)
 */
function formatDateShort(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (err) {
    return dateString;
  }
}

function formatActivityTime(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (err) {
    return dateString;
  }
}

let revenueOverviewChart = null;

function getDateRangeForPeriod(period) {
  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (period) {
    case '7D':
      startDate.setDate(endDate.getDate() - 6);
      break;
    case '30D':
      startDate.setDate(endDate.getDate() - 29);
      break;
    case '90D':
      startDate.setDate(endDate.getDate() - 89);
      break;
    case '1Y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      startDate.setDate(startDate.getDate() + 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 29);
      break;
  }

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  };
}

function setActiveRevenueRange(period) {
  const buttons = document.querySelectorAll('.chart-actions button[data-range]');
  buttons.forEach((button) => {
    button.classList.toggle('active', button.dataset.range === period);
  });
}

async function loadRevenueOverviewData(period = '7D') {
  const headers = getAdminAuthHeaders();
  if (!headers) {
    console.error('[Dashboard] No admin token found for revenue data');
    return;
  }

  setActiveRevenueRange(period);
  const { startDate, endDate } = getDateRangeForPeriod(period);
  const requestUrl = `/api/admin/reports?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

  try {
    console.log('[Dashboard] Loading revenue overview data for', period, startDate, endDate);
    console.log('[Dashboard] admin token:', headers['x-admin-token']);
    const response = await fetch(requestUrl, {
      method: 'GET',
      credentials: 'include',
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      throw new Error(`Failed to fetch revenue data: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.data || !Array.isArray(result.data.revenueTrend)) {
      throw new Error('Invalid revenue overview response');
    }

    renderRevenueOverviewChart(result.data.revenueTrend, period);
  } catch (err) {
    console.error('[Dashboard] Error loading revenue overview data:', err);
  }
}

function handleUnauthorized() {
  console.warn('[Dashboard] Admin token invalid or expired. Redirecting to login.');
  localStorage.removeItem('adminToken');
  window.location.href = '/admin/login.html';
}

function renderRevenueOverviewChart(trendData = [], period = '') {
  const canvas = document.getElementById('revenueOverviewChart');
  if (!canvas || typeof Chart === 'undefined') {
    console.warn('[Dashboard] Revenue chart canvas or Chart.js is unavailable');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const labels = trendData.map(item => formatDateShort(item.period));
  const revenueData = trendData.map(item => Number(item.revenue || 0));
  const ordersData = trendData.map(item => Number(item.orders || 0));

  if (revenueOverviewChart) {
    revenueOverviewChart.destroy();
  }

  revenueOverviewChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: revenueData,
          borderColor: '#4338ca',
          backgroundColor: 'rgba(67, 56, 202, 0.16)',
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#4338ca',
          tension: 0.35,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Orders',
          data: ordersData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.14)',
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          tension: 0.35,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#6b7280'
          }
        },
        y: {
          position: 'left',
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.18)',
            drawBorder: false
          },
          ticks: {
            color: '#6b7280',
            callback: value => `€${value / 1000}k`
          }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: '#10b981'
          }
        }
      }
    }
  });
}

function initializeRevenueRangeButtons() {
  const buttons = document.querySelectorAll('.chart-actions button[data-range]');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      loadRevenueOverviewData(button.dataset.range || '30D');
    });
  });
}

let franceMapInstance = null;

function getCustomPingIcon() {
  return L.icon({
    iconUrl: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40"%3E%3Cpath d="M16 0C9.372 0 4 5.372 4 12c0 9.6 12 24 12 24s12-14.4 12-24c0-6.628-5.372-12-12-12z" fill="%23d22f2f"/%3E%3Ccircle cx="16" cy="12" r="6" fill="%23ffffff"/%3E%3C/svg%3E',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -34]
  });
}

function waitForLeafletAndInit() {
  if (typeof L !== 'undefined') {
    initFranceMap();
    return;
  }

  const interval = setInterval(() => {
    if (typeof L !== 'undefined') {
      clearInterval(interval);
      initFranceMap();
    }
  }, 100);

  setTimeout(() => {
    clearInterval(interval);
    if (typeof L === 'undefined') {
      console.error('[Dashboard] Leaflet did not become available in time');
    }
  }, 5000);
}

function initFranceMap() {
  const mapContainer = document.getElementById('franceMap');
  if (!mapContainer || typeof L === 'undefined') {
    console.warn('[Dashboard] Leaflet map container or Leaflet library unavailable');
    return;
  }

  mapContainer.style.minHeight = '280px';
  mapContainer.style.width = '100%';

  if (franceMapInstance) {
    franceMapInstance.invalidateSize(true);
    return;
  }

  franceMapInstance = L.map(mapContainer, {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: false
  }).setView([46.5, 2.5], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
    minZoom: 4
  }).addTo(franceMapInstance);

  const franceBounds = [[51.1, -5.2], [41.3, 9.7]];
  franceMapInstance.fitBounds(franceBounds, { padding: [20, 20] });

  L.circle([48.8566, 2.3522], {
    color: '#ffffff',
    fillColor: 'rgba(255,255,255,0.25)',
    fillOpacity: 0.4,
    radius: 22000,
    weight: 2
  }).addTo(franceMapInstance);

  L.marker([48.8566, 2.3522], {
    title: 'France Sales Hub',
    icon: getCustomPingIcon()
  }).bindPopup('France Sales Hub').addTo(franceMapInstance);

  setTimeout(() => {
    franceMapInstance.invalidateSize(true);
  }, 300);

  window.addEventListener('resize', () => {
    if (franceMapInstance) {
      franceMapInstance.invalidateSize(true);
    }
  });

  // Load buyer markers once the map is ready
  loadBuyerMarkers();
}

const cityLocationCache = new Map();

async function geocodeCity(city) {
  if (!city || typeof city !== 'string') return null;

  const query = city.trim();
  if (!query) return null;
  if (cityLocationCache.has(query)) return cityLocationCache.get(query);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + ', France')}`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en'
        }
      }
    );

    if (!response.ok) {
      console.warn('[Dashboard] Geocoding lookup failed for', query, response.status);
      cityLocationCache.set(query, null);
      return null;
    }

    const result = await response.json();
    if (!Array.isArray(result) || result.length === 0) {
      cityLocationCache.set(query, null);
      return null;
    }

    const coords = {
      lat: parseFloat(result[0].lat),
      lng: parseFloat(result[0].lon)
    };

    cityLocationCache.set(query, coords);
    return coords;
  } catch (err) {
    console.error('[Dashboard] Geocoding error for', query, err);
    cityLocationCache.set(query, null);
    return null;
  }
}

async function loadBuyerMarkers() {
  if (!franceMapInstance || typeof fetch === 'undefined') return;

  try {
    const headers = getAdminAuthHeaders();
    if (!headers) {
      console.warn('[Dashboard] No admin auth headers available for buyer markers');
      return;
    }

    const response = await fetch('/api/admin/consumers', {
      method: 'GET',
      credentials: 'same-origin',
      headers
    });

    if (!response.ok) {
      console.warn('[Dashboard] Failed to load consumers for buyer markers:', response.status);
      return;
    }

    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) {
      console.warn('[Dashboard] Invalid consumers response', result);
      return;
    }

    const buyers = result.data;
    const markerPromises = buyers.map(async (buyer) => {
      const city = buyer.city || buyer.location || buyer.address || '';
      if (!city) return null;
      const location = await geocodeCity(city);
      if (!location) return null;

      const name = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || buyer.username || buyer.email || 'Buyer';
      const popupText = `<strong>${name}</strong><br>${city}`;
      return L.marker([location.lat, location.lng], {
        icon: getCustomPingIcon(),
        title: name
      })
        .bindPopup(popupText)
        .addTo(franceMapInstance);
    });

    const markers = (await Promise.all(markerPromises)).filter(Boolean);
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      franceMapInstance.fitBounds(group.getBounds(), { padding: [30, 30] });
    }
  } catch (err) {
    console.error('[Dashboard] Error loading buyer markers:', err);
  }
}

function initRevenueChartControls() {
  initializeRevenueRangeButtons();
  waitForLeafletAndInit();
}

if (document.readyState !== 'loading') {
  initRevenueChartControls();
} else {
  document.addEventListener('DOMContentLoaded', initRevenueChartControls);
}

function parseActivityDetails(details) {
  if (!details) return null;
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch (err) {
      return null;
    }
  }
  return details;
}

function renderActivityTimeline(activities) {
  const container = document.getElementById('activityTimeline');
  if (!container) {
    console.warn('[Dashboard] Activity timeline container not found');
    return;
  }

  if (!Array.isArray(activities) || activities.length === 0) {
    container.innerHTML = `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <p class="timeline-time">—</p>
          <p class="timeline-text">No recent activity found.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = activities.map(activity => {
    const details = parseActivityDetails(activity.details);
    const detailText = details?.note || details?.description || details?.message || '';
    const messageText = activity.message || `Activity: ${activity.type}`;

    return `
      <div class="timeline-item${activity === activities[activities.length - 1] ? '' : ''}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <p class="timeline-time">${formatActivityTime(activity.created_at)}</p>
          <p class="timeline-text">${messageText}</p>
          ${detailText ? `<p class="timeline-detail">${detailText}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function loadActivityTimeline(limit = 5, lang = 'en') {
  const container = document.getElementById('activityTimeline');
  if (container) {
    container.innerHTML = `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <p class="timeline-time">Loading...</p>
          <p class="timeline-text">Fetching latest activities from the server.</p>
        </div>
      </div>
    `;
  }

  try {
    const response = await fetch(`/api/activities?limit=${encodeURIComponent(limit)}&lang=${encodeURIComponent(lang)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch activities: ${response.status}`);
    }

    const activities = await response.json();
    renderActivityTimeline(activities);
  } catch (err) {
    console.error('[Dashboard] Error loading activity timeline:', err);
    const containerFallback = document.getElementById('activityTimeline');
    if (containerFallback) {
      containerFallback.innerHTML = `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <p class="timeline-time">Error</p>
            <p class="timeline-text">Unable to load recent activities.</p>
          </div>
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats().catch(err => console.error('[Dashboard] Failed to load stats on startup:', err));
});

console.log('[Dashboard] Dashboard.js loaded successfully');
