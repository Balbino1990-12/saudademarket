// Global state
let token = localStorage.getItem('adminToken') || null;

// Only redirect if on login page AND user has a valid token
if (token && (window.location.pathname.includes('login.html') || window.location.pathname.endsWith('/admin/'))) {
  console.log('Token found in localStorage, redirecting to dashboard...');
  window.location.href = '/admin/products.html';
}

// DOM elements
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginMsg = document.getElementById('loginMsg');
const rememberCheckbox = document.getElementById('remember');

// Event listeners
if (loginBtn) {
  loginBtn.addEventListener('click', login);
}

if (loginForm) {
  loginForm.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      login();
    }
  });
}

// Functions
async function login() {
  const username = usernameInput?.value?.trim() || '';
  const password = passwordInput?.value || '';

  if (!username || !password) {
    showError('Please enter username and password');
    return;
  }

  // Show loading state
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    const resp = await fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Login failed' }));
      showError(err.error || 'Login failed');
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign In';
      return;
    }

    const data = await resp.json();
    token = data.token;

    if (!token) {
      showError('Login failed: no token returned');
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign In';
      return;
    }

    // Save credentials if remember me is checked
    if (rememberCheckbox?.checked) {
      localStorage.setItem('adminUsername', username);
    }

    localStorage.setItem('adminToken', token);
    console.log('Login successful, redirecting...');
    loginMsg.style.display = 'none';
    window.location.replace('/admin/products.html');
  } catch (e) {
    showError('Network error: ' + e.message);
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Sign In';
  }
}

function showError(msg) {
  if (loginMsg) {
    loginMsg.textContent = msg;
    loginMsg.style.display = 'block';
    loginMsg.className = 'alert alert-danger mt-3';
  }
}

// Load saved username if available
function loadSavedUsername() {
  const saved = localStorage.getItem('adminUsername');
  if (saved && usernameInput) {
    usernameInput.value = saved;
    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSavedUsername();
  if (usernameInput) {
    usernameInput.focus();
  }
});
    console.error('Logout error:', e);
  
  
  token = null;
  localStorage.removeItem('adminToken');
  showLogin(false);


async function loadProducts() {
  console.log('Loading products...');
  if (!productsList) return;
  
  productsList.textContent = 'Loading...';
  
  try {
    const resp = await fetch('/api/admin/products', {
      headers: { 'x-admin-token': token }
    });
    
    if (!resp.ok) {
      productsList.textContent = 'Unauthorized or server error';
      return;
    }
    
    const products = await resp.json();
    console.log('Products loaded:', products.length);
    
    if (!Array.isArray(products) || products.length === 0) {
      productsList.textContent = 'No products found';
      return;
    }
    
    productsList.innerHTML = products.map(p => {
      return `<div class="product"><h3>${p.name_en || p.name_fr || p.id}</h3><div>Category: ${p.category_name || ''} — Price: ${p.price || ''}</div></div>`;
    }).join('');
  } catch (e) {
    console.error('Products error:', e);
    productsList.textContent = 'Failed to fetch products: ' + e.message;
  }
}

// Attach event listeners
if (loginBtn) {
  loginBtn.addEventListener('click', login);
  console.log('✓ Login button listener attached');
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
  console.log('✓ Logout button listener attached');
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', loadProducts);
  console.log('✓ Refresh button listener attached');
}

// Initialize UI
if (token) {
  console.log('Token found, showing admin panel');
  showLogin(true);
  loadProducts();
} else {
  console.log('No token, showing login panel');
  showLogin(false);
}

