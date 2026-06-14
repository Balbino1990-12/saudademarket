async function getAdminToken() {
  return localStorage.getItem('adminToken');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function buildFilterParams() {
  const params = new URLSearchParams();
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const status = document.getElementById('status').value;
  const paymentStatus = document.getElementById('paymentStatus').value;
  const categoryId = document.getElementById('categoryId').value;
  const sellerId = document.getElementById('sellerId').value;

  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (status) params.set('status', status);
  if (paymentStatus) params.set('paymentStatus', paymentStatus);
  if (categoryId) params.set('categoryId', categoryId);
  if (sellerId) params.set('sellerId', sellerId);

  params.set('limit', '100');
  return params;
}

async function fetchReports() {
  try {
    const token = await getAdminToken();
    if (!token) {
      console.error('[Reports] Admin token missing');
      // Redirect to login to re-authenticate
      window.location.href = '/admin/login.html';
      return;
    }

    const params = buildFilterParams();
    console.debug('[Reports] Request params:', params.toString());

    const response = await fetch(`/api/admin/reports?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      console.warn('[Reports] Unauthorized (401) - clearing token and redirecting to login');
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login.html';
      return;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => null);
      console.error('[Reports] Failed to load reports', response.status, body);
      return;
    }

    const result = await response.json();
    if (!result.success) {
      console.error('[Reports] Invalid response', result);
      return;
    }
    const data = result.data;
    updateSummary(data);
    renderOrders(data.orders);
    renderCustomers(data.customerLifetime);
    renderRevenueTrend(data.revenueTrend);
    renderRevenueByCategory(data.revenueByCategory);
    return;
  } catch (err) {
    console.error('[Reports] Network or unexpected error when fetching reports', err);
    return;
  }
}

function updateSummary(data) {
  document.getElementById('summaryRevenue').textContent = formatCurrency(data.revenueTrend.reduce((sum, row) => sum + parseFloat(row.revenue || 0), 0));
  document.getElementById('summaryOrders').textContent = data.orders.length;
  document.getElementById('summaryCustomers').textContent = data.customerLifetime.length;
  document.getElementById('summaryRepeatCustomers').textContent = data.repeatSummary.repeatCustomers || 0;
}

function renderOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '';
  orders.forEach(order => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.order_serial}</td>
      <td>${order.username || order.email || 'Buyer #' + order.buyer_id}</td>
      <td>${order.status}</td>
      <td>${order.payment_status || 'N/A'}</td>
      <td>${formatCurrency(order.total)}</td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderCustomers(customers) {
  const tbody = document.getElementById('customerTableBody');
  tbody.innerHTML = '';
  customers.slice(0, 8).forEach(customer => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${customer.username || 'Buyer #' + customer.buyer_id}</td>
      <td>${customer.email || ''}</td>
      <td>${customer.order_count}</td>
      <td>${formatCurrency(customer.lifetime_value)}</td>
    `;
    tbody.appendChild(row);
  });
}

let revenueTrendChart = null;
let revenueByCategoryChart = null;

function renderRevenueTrend(trendData) {
  const canvas = document.getElementById('revenueTrendChart');
  if (!canvas) return;

  const labels = trendData.map(row => row.period);
  const values = trendData.map(row => parseFloat(row.revenue || 0));

  if (revenueTrendChart) revenueTrendChart.destroy();

  revenueTrendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: values,
        borderColor: '#c41e1e',
        backgroundColor: 'rgba(196,30,30,0.15)',
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: { color: '#334155' }
        },
        y: {
          ticks: { color: '#334155' }
        }
      }
    }
  });
}

function renderRevenueByCategory(categoryData) {
  const canvas = document.getElementById('revenueByCategoryChart');
  if (!canvas) return;

  const labels = categoryData.map(row => row.category_name || `Category ${row.category_id}`);
  const values = categoryData.map(row => parseFloat(row.revenue || 0));

  if (revenueByCategoryChart) revenueByCategoryChart.destroy();

  revenueByCategoryChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: values,
        backgroundColor: '#0f172a',
        borderColor: '#c41e1e',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { color: '#334155' } },
        y: { ticks: { color: '#334155' } }
      }
    }
  });
}

async function downloadReport(format) {
  const params = buildFilterParams();
  params.set('format', format);
  const token = localStorage.getItem('adminToken');
  if (!token) return;

  const response = await fetch(`/api/admin/reports/export?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    console.error('[Reports] Report export failed', response.status);
    return;
  }

  const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
  const blob = await response.blob();
  const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || `report.${format}`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function scheduleReport() {
  const name = prompt('Enter a schedule name (e.g. Weekly revenue report)');
  if (!name) return;
  const frequency = prompt('Enter frequency: daily, weekly or monthly');
  if (!frequency) return;

  const token = localStorage.getItem('adminToken');
  const params = buildFilterParams();
  const filters = Object.fromEntries(params.entries());

  const response = await fetch('/api/admin/reports/schedule', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, frequency, format: 'csv', filters })
  });

  const result = await response.json();
  if (result.success) {
    alert('Report scheduled successfully');
  } else {
    alert('Failed to schedule report');
  }
}

function initReportsPage() {
  document.getElementById('applyFiltersBtn').addEventListener('click', fetchReports);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('status').value = '';
    document.getElementById('paymentStatus').value = '';
    document.getElementById('categoryId').value = '';
    document.getElementById('sellerId').value = '';
    fetchReports();
  });
  document.getElementById('exportCsvBtn').addEventListener('click', () => downloadReport('csv'));
  document.getElementById('exportExcelBtn').addEventListener('click', () => downloadReport('excel'));
  document.getElementById('exportPdfBtn').addEventListener('click', () => downloadReport('pdf'));
  document.getElementById('scheduleReportBtn').addEventListener('click', scheduleReport);
  fetchReports();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReportsPage);
} else {
  initReportsPage();
}
