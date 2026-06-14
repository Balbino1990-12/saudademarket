async function getAdminToken() {
  return localStorage.getItem('adminToken');
}

function formatPercent(value) {
  const number = parseFloat(value);
  if (Number.isNaN(number)) {
    return 'N/A';
  }
  return `${number.toFixed(1)}%`;
}

function buildFilterParams() {
  const params = new URLSearchParams();
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const eventType = document.getElementById('eventType').value;

  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (eventType) params.set('eventType', eventType);

  params.set('limit', '50');
  params.set('offset', currentOffset);
  return params;
}

let currentOffset = 0;
let hasMoreData = true;

async function fetchAnalyticsSummary() {
  const token = await getAdminToken();
  if (!token) {
    console.error('[Analytics] Admin token missing');
    return;
  }

  const params = buildFilterParams();
  const response = await fetch(`/api/admin/analytics/summary?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('[Analytics] Failed to load analytics summary', response.status);
    return;
  }

  const result = await response.json();
  if (!result.success) {
    console.error('[Analytics] Invalid response', result);
    return;
  }

  updateSummaryCards(result.data);
}

async function fetchAnalyticsEvents() {
  const token = await getAdminToken();
  if (!token) {
    console.error('[Analytics] Admin token missing');
    return;
  }

  const params = buildFilterParams();
  const response = await fetch(`/api/admin/analytics/events?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('[Analytics] Failed to load analytics events', response.status);
    return;
  }

  const result = await response.json();
  if (!result.success) {
    console.error('[Analytics] Invalid response', result);
    return;
  }

  renderEvents(result.data);
  updatePagination(result.pagination);
}

function updateSummaryCards(data) {
  document.getElementById('totalPageViews').textContent = data.totalPageViews || 0;
  document.getElementById('uniqueVisitors').textContent = data.uniqueVisitors || 0;
  document.getElementById('totalSessions').textContent = data.totalSessions || 0;
  document.getElementById('bounceRate').textContent = formatPercent(data.bounceRate);
}

function renderEvents(events) {
  const tbody = document.getElementById('analyticsTableBody');

  if (!events || events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-5 py-10 text-center text-slate-500">No analytics events found</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  events.forEach(event => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-slate-50';
    const typeBadge = {
      page_view: 'bg-sky-500',
      session_start: 'bg-emerald-500',
      session_end: 'bg-amber-500'
    }[event.event_type] || 'bg-slate-500';
    const timestamp = new Date(event.created_at).toLocaleString();

    row.innerHTML = `
      <td class="px-5 py-4"><span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${typeBadge}">${event.event_type.replace('_', ' ')}</span></td>
      <td class="px-5 py-4 text-slate-700">${event.visitor_id || 'N/A'}</td>
      <td class="px-5 py-4 text-slate-700">${event.session_id || 'N/A'}</td>
      <td class="px-5 py-4 text-slate-700">${event.url || 'N/A'}</td>
      <td class="px-5 py-4 text-slate-700">${event.referrer || 'Direct'}</td>
      <td class="px-5 py-4 text-slate-700">${event.user_agent ? event.user_agent.substring(0, 50) + '...' : 'N/A'}</td>
      <td class="px-5 py-4 text-slate-700">${timestamp}</td>
    `;
    tbody.appendChild(row);
  });
}

function updatePagination(pagination) {
  const paginationEl = document.getElementById('pagination');
  hasMoreData = pagination.hasMore;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentOffset === 0;
  prevBtn.onclick = () => {
    currentOffset = Math.max(0, currentOffset - pagination.limit);
    fetchAnalyticsEvents();
  };

  const nextBtn = document.createElement('button');
  nextBtn.className = 'inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = !hasMoreData;
  nextBtn.onclick = () => {
    currentOffset += pagination.limit;
    fetchAnalyticsEvents();
  };

  const info = document.createElement('span');
  info.className = 'text-sm text-slate-600';
  info.textContent = `Showing ${currentOffset + 1}-${Math.min(currentOffset + pagination.limit, pagination.total)} of ${pagination.total} events`;

  paginationEl.innerHTML = '';
  paginationEl.appendChild(prevBtn);
  paginationEl.appendChild(info);
  paginationEl.appendChild(nextBtn);
}

async function loadAnalyticsData() {
  await Promise.all([
    fetchAnalyticsSummary(),
    fetchAnalyticsEvents()
  ]);
}

function setupEventListeners() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      currentOffset = 0;
      loadAnalyticsData();
    });
  }

  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      currentOffset = 0;
      loadAnalyticsData();
    });
  }

  // Set default date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  if (startDateInput) {
    startDateInput.value = startDate.toISOString().split('T')[0];
  }
  if (endDateInput) {
    endDateInput.value = endDate.toISOString().split('T')[0];
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadAnalyticsData();
});