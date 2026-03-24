// Check if user is authenticated
let token = localStorage.getItem('adminToken');
if (!token) {
  window.location.href = '/login';
}

// State for edit operations
let currentEditingProductId = null;
let categoryChart = null;
let priceChart = null;

// DOM elements - safely get them with null checks
const refreshBtn = document.getElementById('refreshBtn');
const createBtn = document.getElementById('createBtn');
const productsList = document.getElementById('productsList');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const productModal = document.getElementById('productModal') || { style: {} };
const productForm = document.getElementById('productForm') || { reset: () => {} };
const modalTitle = document.getElementById('modalTitle');
const deleteModal = document.getElementById('deleteModal') || { style: {} };

console.log('Products page loaded, token:', token ? token.substring(0, 10) + '...' : 'none');

// Modal functions
function openProductModal(productId = null) {
  currentEditingProductId = productId;
  
  if (modalTitle && productId) {
    modalTitle.textContent = translate ? translate('admin.editProduct') : 'Edit Product';
    // Load product data into form (we'll fetch it from the DOM)
  } else if (modalTitle) {
    modalTitle.textContent = translate ? translate('admin.createProduct') : 'Create Product';
    if (productForm.reset) productForm.reset();
    const idField = document.getElementById('productId');
    if (idField) idField.value = '';
  }
  
  if (productModal && productModal.style) {
    productModal.style.display = 'flex';
  }
}

function closeProductModal() {
  if (productModal && productModal.style) {
    productModal.style.display = 'none';
  }
  currentEditingProductId = null;
  if (productForm && productForm.reset) {
    productForm.reset();
  }
}

function openDeleteModal(productId, productName) {
  currentEditingProductId = productId;
  const msg = document.getElementById('deleteMessage');
  const template = translate ? translate('admin.deleteMessage') : 'Are you sure you want to delete this product?';
  if (msg) msg.textContent = template;
  if (deleteModal && deleteModal.style) {
    deleteModal.style.display = 'flex';
  }
}

function closeDeleteModal() {
  if (deleteModal && deleteModal.style) {
    deleteModal.style.display = 'none';
  }
  currentEditingProductId = null;
}

// Add Product Modal Functions
window.openAddProductModal = function() {
  const addProductModal = document.getElementById('addProductModal');
  if (addProductModal) {
    document.getElementById('addProductForm').reset();
    addProductModal.style.display = 'flex';
    console.log('✓ Add Product Modal opened');
  }
};

window.closeAddProductModal = function() {
  const addProductModal = document.getElementById('addProductModal');
  if (addProductModal) {
    addProductModal.style.display = 'none';
    document.getElementById('addProductForm').reset();
    console.log('✓ Add Product Modal closed');
  }
};

window.submitAddProduct = async function() {
  try {
    const nameEn = document.getElementById('productNameEn').value.trim();
    const nameFr = document.getElementById('productNameFr').value.trim();
    const namePt = document.getElementById('productNamePt').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const image = document.getElementById('productImage').value.trim();
    const description = document.getElementById('productDescription').value.trim();

    // Validation
    if (!nameEn || !nameFr || !namePt || !category || !price) {
      showError('Please fill in all required fields');
      return;
    }

    if (price < 0) {
      showError('Price must be a positive number');
      return;
    }

    // Create product object
    const product = {
      id: nameEn.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name_en: nameEn,
      name_fr: nameFr,
      name_pt: namePt,
      category: category,
      price: price,
      image: image || null,
      description: description || null
    };

    console.log('📤 Submitting product:', product);

    // Submit to API
    const resp = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify(product)
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || `Failed to add product: ${resp.statusText}`);
    }

    console.log('✓ Product added successfully:', data);
    
    // Show success message
    const successMessage = window.translate ? translate('admin.messages.productCreated') : 'Product created successfully';
    showSuccess(successMessage);

    // Close modal
    window.closeAddProductModal();

    // Reload products
    setTimeout(() => {
      loadProducts();
    }, 500);

  } catch (error) {
    console.error('❌ Error adding product:', error);
    showError('Error: ' + error.message);
  }
};


function showError(message) {
  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    errorMsg.classList.add('fade-in');
  }
  if (successMsg) {
    successMsg.style.display = 'none';
  }
  if (errorMsg) {
    setTimeout(() => {
      errorMsg.style.display = 'none';
      errorMsg.classList.remove('fade-in');
    }, 5000);
  }
}

function showSuccess(message) {
  if (successMsg) {
    successMsg.textContent = message;
    successMsg.style.display = 'block';
    successMsg.classList.add('fade-in');
  }
  if (errorMsg) {
    errorMsg.style.display = 'none';
  }
  if (successMsg) {
    setTimeout(() => {
      successMsg.style.display = 'none';
      successMsg.classList.remove('fade-in');
    }, 5000);
  }
}

// Toast notification function
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Update metrics cards
function updateMetrics(products) {
  // Ensure products is an array
  if (!Array.isArray(products)) {
    console.warn('updateMetrics received non-array:', products);
    return;
  }
  
  // Total Products
  const totalEl = document.getElementById('totalProductsCard');
  if (totalEl) totalEl.textContent = products.length;
  
  // Categories
  const uniqueCategories = new Set(products.map(p => p.category_id).filter(c => c));
  const categoriesEl = document.getElementById('totalCategoriesCard');
  if (categoriesEl) categoriesEl.textContent = uniqueCategories.size;
  
  // Average Price
  const avgPrice = products.length > 0 
    ? (products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) / products.length).toFixed(2)
    : '0.00';
  const avgEl = document.getElementById('avgPriceCard');
  if (avgEl) avgEl.textContent = '€' + avgPrice;
  
  // Total Value
  const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
  const valueEl = document.getElementById('totalValueCard');
  if (valueEl) valueEl.textContent = '€' + parseFloat(totalValue).toFixed(2);
}

// Update Charts
function updateCharts(products) {
  // Ensure products is an array
  if (!Array.isArray(products)) {
    console.warn('updateCharts received non-array:', products);
    return;
  }
  
  try {
    // Category Distribution Chart
    const categoryCount = {};
    products.forEach(p => {
      const cat = p.category_name || 'Uncategorized';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    const categoryCanvas = document.getElementById('categoryChart');
    if (categoryCanvas) {
      const categoryCtx = categoryCanvas.getContext('2d');
      if (categoryChart) categoryChart.destroy();
      categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(categoryCount),
          datasets: [{
            data: Object.values(categoryCount),
            backgroundColor: [
              'rgba(196, 30, 30, 0.8)',
              'rgba(243, 156, 18, 0.8)',
              'rgba(39, 174, 96, 0.8)',
              'rgba(52, 152, 219, 0.8)',
              'rgba(155, 89, 182, 0.8)',
              'rgba(26, 188, 156, 0.8)',
              'rgba(230, 126, 34, 0.8)',
              'rgba(231, 76, 60, 0.8)',
            ],
            borderColor: '#fff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 15, font: { size: 12 } }
            }
          }
        }
      });
      console.log('✓ Category chart created with', Object.keys(categoryCount).length, 'categories');
    } else {
      console.warn('⚠ Category chart canvas not found');
    }
  } catch (e) {
    console.error('Error creating category chart:', e);
  }
  
  try {
    // Price Range Distribution Chart
    const priceRanges = {
      '€0-50': 0,
      '€50-100': 0,
      '€100-200': 0,
      '€200+': 0
    };
    
    products.forEach(p => {
      const price = p.price || 0;
      if (price < 50) priceRanges['€0-50']++;
      else if (price < 100) priceRanges['€50-100']++;
      else if (price < 200) priceRanges['€100-200']++;
      else priceRanges['€200+']++;
    });
    
    const priceCanvas = document.getElementById('priceChart');
    if (priceCanvas) {
      const priceCtx = priceCanvas.getContext('2d');
      if (priceChart) priceChart.destroy();
      priceChart = new Chart(priceCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(priceRanges),
          datasets: [{
            label: 'Products',
            data: Object.values(priceRanges),
            backgroundColor: 'rgba(196, 30, 30, 0.8)',
            borderColor: 'rgba(196, 30, 30, 1)',
            borderWidth: 1,
            borderRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        }
      });
      console.log('✓ Price chart created');
    } else {
      console.warn('⚠ Price chart canvas not found');
    }
  } catch (e) {
    console.error('Error creating price chart:', e);
  }
}

// Initialize Analytics Charts
let analyticsChart = null;
let deviceChart = null;

function initAnalyticsCharts() {
  try {
    // Sessions & Page Views Line Chart
    const analyticsCanvas = document.getElementById('analyticsChart');
    if (analyticsCanvas) {
      const analyticsCtx = analyticsCanvas.getContext('2d');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      if (analyticsChart) {
        analyticsChart.destroy();
      }
      
      analyticsChart = new Chart(analyticsCtx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Sessions',
              data: [87, 76, 65, 89, 85, 76, 77, 67, 78, 73, 69, 85],
              borderColor: '#5B7FFF',
              backgroundColor: 'rgba(91, 127, 255, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#5B7FFF',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            },
            {
              label: 'Page Views',
              data: [95, 89, 76, 92, 85, 85, 89, 67, 85, 78, 69, 92],
              borderColor: '#26C6DA',
              backgroundColor: 'rgba(38, 198, 218, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#26C6DA',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: { size: 12 }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: {
                drawBorder: false,
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              grid: {
                display: false,
                drawBorder: false
              }
            }
          }
        }
      });
      console.log('✓ Analytics chart created');
    } else {
      console.warn('⚠ Analytics chart canvas not found');
    }
  } catch (e) {
    console.error('Error creating analytics chart:', e);
  }
  
  try {
    // Device Distribution Pie Chart
    const deviceCanvas = document.getElementById('deviceChart');
    if (deviceCanvas) {
      const deviceCtx = deviceCanvas.getContext('2d');
      if (deviceChart) {
        deviceChart.destroy();
      }
      
      deviceChart = new Chart(deviceCtx, {
        type: 'doughnut',
        data: {
          labels: ['Desktop', 'Mobile', 'Tablet'],
          datasets: [{
            data: [45.8, 38.7, 15.5],
            backgroundColor: [
              '#5B7FFF',
              '#26C6DA',
              '#A78BFA'
            ],
            borderColor: '#fff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
      console.log('✓ Device chart created');
    } else {
      console.warn('⚠ Device chart canvas not found');
    }
  } catch (e) {
    console.error('Error creating device chart:', e);
  }
}

// Load products function
async function loadProducts() {
  console.log('Loading products...');
  if (productsList) {
    productsList.innerHTML = '<div class="loading">Loading products...</div>';
  }
  
  try {
    const resp = await fetch('/api/admin/products', {
      headers: { 'x-admin-token': token }
    });
    
    if (!resp.ok) {
      if (resp.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('adminToken');
        window.location.href = '/login';
        return;
      }
      throw new Error('Failed to fetch products');
    }
    
    const products = await resp.json();
    console.log('Products loaded:', products.length);
    
    // Update metrics and charts
    updateMetrics(products);
    updateCharts(products);
    
    // Update product count
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = products.length + ' products in total';
    
    if (!Array.isArray(products) || products.length === 0) {
      if (productsList) {
        productsList.innerHTML = '<p style="text-align: center; color: #999; padding: 40px 20px;">No products found</p>';
      }
      return;
    }
    
    // Create table view
    if (!productsList) return;
    
    productsList.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: var(--bg-light); border-bottom: 2px solid var(--border);">
              <th style="padding: 15px; text-align: left; font-weight: 600; color: var(--text-dark);">Product Name</th>
              <th style="padding: 15px; text-align: left; font-weight: 600; color: var(--text-dark);">Category</th>
              <th style="padding: 15px; text-align: right; font-weight: 600; color: var(--text-dark);">Price</th>
              <th style="padding: 15px; text-align: center; font-weight: 600; color: var(--text-dark);">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.map((p, idx) => `
              <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-light)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 15px; color: var(--text-dark);"><strong>${p.name_en || p.name_fr || p.name_pt || 'Unnamed'}</strong></td>
                <td style="padding: 15px; color: var(--text-light);">${p.category_name || 'N/A'}</td>
                <td style="padding: 15px; color: var(--text-dark); text-align: right; font-weight: 600;">€${parseFloat(p.price || 0).toFixed(2)}</td>
                <td style="padding: 15px; text-align: center;">
                  <button class="btn-small btn-edit" onclick="editProduct('${p.id}')">✎ Edit</button>
                  <button class="btn-small btn-delete" onclick="openDeleteModal('${p.id}', '${(p.name_en || p.name_pt || 'Product').replace(/'/g, "\\'")}')" style="margin-left: 5px;">✗ Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    console.error('Products error:', e);
    showError('Failed to load products: ' + e.message);
    if (productsList) productsList.innerHTML = '';
  }
}

// Edit product - fetch and populate form
async function editProduct(productId) {
  try {
    const resp = await fetch('/api/products/' + productId, {
      headers: { 'x-admin-token': token }
    });
    
    if (!resp.ok) {
      showError('Product not found');
      return;
    }
    
    const product = await resp.json();
    
    // Populate form
    document.getElementById('productId').value = product.id;
    document.getElementById('productNameEn').value = product.name_en || '';
    document.getElementById('productNameFr').value = product.name_fr || '';
    document.getElementById('productNamePt').value = product.name_pt || '';
    document.getElementById('productCategory').value = product.category_id || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productImage').value = product.image || '';
    document.getElementById('productDescription').value = product.description || '';
    
    openProductModal(productId);
  } catch (e) {
    showError('Failed to load product: ' + e.message);
  }
}

// Create or update product
async function handleProductSubmit(event) {
  event.preventDefault();
  
  const id = document.getElementById('productId').value.trim();
  const name_en = document.getElementById('productNameEn').value.trim();
  const name_fr = document.getElementById('productNameFr').value.trim();
  const name_pt = document.getElementById('productNamePt').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const image = document.getElementById('productImage').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  
  // Validation
  if (!name_en || !name_fr || !name_pt || !category || isNaN(price) || price < 0) {
    showError('Please fill in all required fields with valid values');
    return;
  }
  
  try {
    let method = 'POST';
    let url = '/api/products';
    let body = {
      id: id || undefined,
      name_en,
      name_fr,
      name_pt,
      category_id: category,
      price,
      image: image || undefined,
      description: description || undefined
    };
    
    // If editing, use PUT
    if (currentEditingProductId) {
      method = 'PUT';
      url = '/api/products/' + currentEditingProductId;
    }
    
    const resp = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify(body)
    });
    
    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(error.error || 'Failed to save product');
    }
    
    const result = await resp.json();
    
    const message = currentEditingProductId ? 'Product updated successfully' : 'Product created successfully';
    showSuccess(message);
    closeProductModal();
    loadProducts();
  } catch (e) {
    showError('Error saving product: ' + e.message);
  }
}

// Confirm delete
async function confirmDelete() {
  if (!currentEditingProductId) return;
  
  try {
    const resp = await fetch('/api/products/' + currentEditingProductId, {
      method: 'DELETE',
      headers: { 'x-admin-token': token }
    });
    
    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(error.error || 'Failed to delete product');
    }
    
    showSuccess('Product deleted successfully');
    closeDeleteModal();
    loadProducts();
  } catch (e) {
    showError('Error deleting product: ' + e.message);
  }
}

// Attach event listeners
if (refreshBtn) {
  refreshBtn.addEventListener('click', loadProducts);
  console.log('✓ Refresh button listener attached');
}

if (createBtn) {
  createBtn.addEventListener('click', () => openProductModal());
  console.log('✓ Create button listener attached');
}

// header interaction: notifications and profile
const notificationBtn = document.getElementById('notificationBtn');
if (notificationBtn) {
  notificationBtn.addEventListener('click', () => {
    alert(translate ? translate('admin.notifications') : 'Notifications');
  });
}

const profileBtnEl = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');
const logoutBtnHeader = document.getElementById('logoutBtnHeader');
if (profileBtnEl && profileMenu) {
  profileBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();
    profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
  });
  // close when clicking outside
  document.addEventListener('click', (e) => {
    if (!profileMenu.contains(e.target) && e.target !== profileBtnEl) {
      profileMenu.style.display = 'none';
    }
  });
}

if (logoutBtnHeader) {
  logoutBtnHeader.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    location = '/login';
  });
}

// sidebar collapse toggler (AdminLTE style)
const sidebarToggle = document.getElementById('sidebarToggle');
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('collapsed');
  });
}

// header search toggle
const searchToggle = document.getElementById('searchToggle');
const searchBox = document.getElementById('searchBox');
const headerSearch = document.getElementById('headerSearch');
function updateSearchPlaceholder() {
  if (headerSearch && translate) {
    headerSearch.placeholder = translate('admin.searchPlaceholder');
  }
}
// initial
updateSearchPlaceholder();
window.addEventListener('languageChanged', updateSearchPlaceholder);
if (searchToggle && searchBox) {
  searchToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    searchBox.style.display = searchBox.style.display === 'block' ? 'none' : 'block';
    if (searchBox.style.display === 'block') {
      headerSearch.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!searchBox.contains(e.target) && e.target !== searchToggle) {
      searchBox.style.display = 'none';
    }
  });
}

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProductModal();
    closeDeleteModal();
    window.closeAddProductModal();
  }
});

// Close add product modal when clicking outside
const addProductModal = document.getElementById('addProductModal');
if (addProductModal) {
  addProductModal.addEventListener('click', (e) => {
    if (e.target === addProductModal) {
      window.closeAddProductModal();
    }
  });
}

// Load products and initialize analytics on page load
loadProducts();
// Only initialize analytics charts if they exist on the page
if (document.getElementById('analyticsChart') || document.getElementById('deviceChart')) {
  initAnalyticsCharts();
}

// Search functionality: filter table rows
const navbarSearchForm = document.getElementById('navbarSearchForm');
if (navbarSearchForm) {
  navbarSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('headerSearch').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#productsList tbody tr');
    rows.forEach(row => {
      const name = row.querySelector('td').textContent.toLowerCase();
      row.style.display = name.includes(query) ? '' : 'none';
    });
  });
}

