// ── auth.js  (shared across all pages) ───────────────
// Stores tokens in localStorage under 'cabgo_token' and 'cabgo_admin_token'

const Auth = {
  // ── Customer ─────────────────────────────────────────
  saveCustomer(data) {
    localStorage.setItem('cabgo_token',    data.token);
    localStorage.setItem('cabgo_customer', JSON.stringify({ id: data.customer_id, name: data.name, email: data.email }));
  },
  getCustomer() {
    try { return JSON.parse(localStorage.getItem('cabgo_customer')); } catch { return null; }
  },
  getToken() { return localStorage.getItem('cabgo_token') || ''; },
  logoutCustomer() {
    localStorage.removeItem('cabgo_token');
    localStorage.removeItem('cabgo_customer');
  },
  isLoggedIn() { return !!localStorage.getItem('cabgo_token'); },

  // ── Admin ─────────────────────────────────────────────
  saveAdmin(data) {
    localStorage.setItem('cabgo_admin_token', data.token);
    localStorage.setItem('cabgo_admin',       JSON.stringify({ id: data.admin_id, username: data.username }));
  },
  getAdmin() {
    try { return JSON.parse(localStorage.getItem('cabgo_admin')); } catch { return null; }
  },
  getAdminToken() { return localStorage.getItem('cabgo_admin_token') || ''; },
  logoutAdmin() {
    localStorage.removeItem('cabgo_admin_token');
    localStorage.removeItem('cabgo_admin');
  },
  isAdminLoggedIn() { return !!localStorage.getItem('cabgo_admin_token'); },

  // ── Fetch helpers with auto auth header ──────────────
  async apiFetch(url, opts = {}) {
    const token = this.getToken();
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers||{}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    return fetch(url, opts);
  },
  async adminFetch(url, opts = {}) {
    const token = this.getAdminToken();
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers||{}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    return fetch(url, opts);
  },
};

// ── Navbar renderer ─────────────────────────────────────
function renderNavbar(activePage) {
  const customer = Auth.getCustomer();
  const userHtml = customer
    ? `<span style="color:var(--muted);font-size:.85rem">👤 ${customer.name}</span>
       <button class="btn btn-outline btn-sm" onclick="logoutCustomer()">Logout</button>`
    : `<a href="login.html" class="btn btn-outline btn-sm">Login</a>
       <a href="register.html" class="btn btn-primary btn-sm">Register</a>`;

  const pages = [
    { href:'index.html',   label:'Book'    },
    { href:'status.html',  label:'Status'  },
    { href:'payment.html', label:'Payment' },
    { href:'history.html', label:'History' },
  ];

  const links = pages.map(p =>
    `<li><a href="${p.href}" ${activePage===p.href?'class="active"':''}>${p.label}</a></li>`
  ).join('');

  document.querySelector('.navbar').innerHTML = `
    <a href="index.html" class="logo" style="text-decoration:none">🚕 <span>Cab</span>Go</a>
    <ul class="nav-links">${links}</ul>
    <div style="display:flex;align-items:center;gap:.6rem;flex-shrink:0;">${userHtml}</div>
  `;
}

function logoutCustomer() {
  Auth.logoutCustomer();
  window.location.href = 'login.html';
}

// Guard: redirect to login if not authenticated (call on protected pages)
function requireLogin() {
  if (!Auth.isLoggedIn()) window.location.href = 'login.html';
}

// Guard: redirect to admin-login if not admin
function requireAdmin() {
  if (!Auth.isAdminLoggedIn()) window.location.href = 'admin-login.html';
}
