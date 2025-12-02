// Global State
const state = {
    currentPage: 'login',
    loading: false,
    categories: JSON.parse(localStorage.getItem('categories') || '[]'),
    inventory: JSON.parse(localStorage.getItem('inventory') || '[]'),
    sales: JSON.parse(localStorage.getItem('sales') || '[]'),
    salesHistory: JSON.parse(localStorage.getItem('salesHistory') || '[]'),
    cart: [],
    currentTime: new Date(),
    editingItem: null,
    showForm: false
};

// Update time every second
setInterval(() => {
    state.currentTime = new Date();
    updateTimeDisplay();
}, 1000);

// Utility Functions
function saveToStorage(key) {
    localStorage.setItem(key, JSON.stringify(state[key]));
}

function formatTime(date) {
    return date.toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

function formatDate(date) {
    return date.toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function updateTimeDisplay() {
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    if (timeEl) timeEl.textContent = formatTime(state.currentTime);
    if (dateEl) dateEl.textContent = formatDate(state.currentTime);
}

// Navigation
function changePage(page) {
    state.currentPage = page;
    state.showForm = false;
    state.editingItem = null;
    render();
}

function handleLogin(e) {
    e.preventDefault();
    state.loading = true;
    render();
    setTimeout(() => {
        state.loading = false;
        state.currentPage = 'dashboard';
        render();
    }, 1500);
}

function handleLogout() {
    state.currentPage = 'login';
    render();
}

// Category Management
function handleAddCategory(e) {
    e.preventDefault();
    const name = document.getElementById('categoryName').value;
    if (name.trim()) {
        state.categories.push({
            id: Date.now(),
            name,
            createdAt: new Date().toISOString()
        });
        saveToStorage('categories');
        render();
    }
}

function handleDeleteCategory(id) {
    if (confirm('Delete this category?')) {
        state.categories = state.categories.filter(cat => cat.id !== id);
        saveToStorage('categories');
        render();
    }
}

// Inventory Management
function toggleInventoryForm() {
    state.showForm = !state.showForm;
    state.editingItem = null;
    render();
}

function editInventoryItem(id) {
    state.editingItem = state.inventory.find(item => item.id === id);
    state.showForm = true;
    render();
}

function handleInventorySubmit(e) {
    e.preventDefault();
    const item = {
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        quantity: parseInt(document.getElementById('itemQuantity').value),
        unit: document.getElementById('itemUnit').value,
        price: parseFloat(document.getElementById('itemPrice').value),
        expirationDate: document.getElementById('itemExpiration').value,
        image: document.getElementById('itemImage').value
    };

    if (state.editingItem) {
        const index = state.inventory.findIndex(i => i.id === state.editingItem.id);
        state.inventory[index] = { ...state.inventory[index], ...item };
    } else {
        item.id = Date.now();
        item.createdAt = new Date().toISOString();
        state.inventory.push(item);
    }

    saveToStorage('inventory');
    state.showForm = false;
    state.editingItem = null;
    render();
}

function handleDeleteInventoryItem(id) {
    if (confirm('Delete this item?')) {
        state.inventory = state.inventory.filter(item => item.id !== id);
        saveToStorage('inventory');
        render();
    }
}

// POS Functions
function addToCart(id) {
    const item = state.inventory.find(i => i.id === id);
    if (!item || item.quantity <= 0) {
        alert('Item out of stock!');
        return;
    }

    const cartItem = state.cart.find(c => c.id === id);
    if (cartItem) {
        if (cartItem.quantity < item.quantity) {
            cartItem.quantity++;
        } else {
            alert('Not enough stock!');
        }
    } else {
        state.cart.push({ ...item, quantity: 1 });
    }
    render();
}

function updateCartQty(id, change) {
    const cartItem = state.cart.find(c => c.id === id);
    const invItem = state.inventory.find(i => i.id === id);
    
    if (cartItem) {
        const newQty = cartItem.quantity + change;
        if (newQty <= 0) {
            state.cart = state.cart.filter(c => c.id !== id);
        } else if (newQty <= invItem.quantity) {
            cartItem.quantity = newQty;
        } else {
            alert('Not enough stock!');
        }
    }
    render();
}

function clearCart() {
    if (confirm('Clear cart?')) {
        state.cart = [];
        render();
    }
}

function checkout() {
    if (state.cart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const sale = {
        id: Date.now(),
        items: [...state.cart],
        total,
        date: new Date().toISOString()
    };

    // Update inventory
    state.cart.forEach(cartItem => {
        const invItem = state.inventory.find(i => i.id === cartItem.id);
        if (invItem) {
            invItem.quantity -= cartItem.quantity;
        }
    });

    state.salesHistory.push(sale);
    saveToStorage('inventory');
    saveToStorage('salesHistory');

    // Update daily sales
    const today = new Date().toDateString();
    const todaySales = state.sales.find(s => new Date(s.date).toDateString() === today);
    if (todaySales) {
        todaySales.total += total;
        todaySales.count++;
    } else {
        state.sales.push({ date: new Date().toISOString(), total, count: 1 });
    }
    saveToStorage('sales');

    state.cart = [];
    alert('Checkout successful! Total: ₱' + total.toFixed(2));
    render();
}

// Analytics Functions
function getTodaySales() {
    const today = new Date().toDateString();
    const todaySales = state.sales.find(s => new Date(s.date).toDateString() === today);
    return todaySales ? todaySales.total : 0;
}

function getTotalInventoryValue() {
    return state.inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartTotal() {
    return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Render Functions
function renderLogin() {
    return `
        <div class="login-container">
            <div class="login-box">
                <div class="login-header">
                    <div class="login-icon">
                        <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                    <img src ="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ840qr-pl3JZixs9P6TGRZrp0dmVp265uGBGAMYNGVyOGXabDY1EQ3&amp;usqp=CAE&amp;s">
                    <h1 class="login-title">Audit Ni mama</h1>
                    <p class="login-subtitle">Sales & Analytics Platform</p>
                </div>
                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-input" placeholder="Enter username" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-input" placeholder="Enter password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Sign In</button>
                </form>
            </div>
        </div>
    `;
}

function renderLoading() {
    return `
        <div class="loading-container">
            <div class="spinner"></div>
            <p class="loading-text">Loading...</p>
        </div>
    `;
}

function renderNavbar(showBack = true) {
    return `
        <nav class="navbar">
            <div class="navbar-container">
                <div class="navbar-brand">
                    ${showBack ? 
                        `<button class="back-button" onclick="changePage('dashboard')">← Back to Dashboard</button>` :
                        `<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                        <span>Inventory System</span>`
                    }
                </div>
                ${!showBack ? `
                <div class="navbar-right">
                    <div class="time-display">
                        <div id="current-date">${formatDate(state.currentTime)}</div>
                        <div id="current-time">${formatTime(state.currentTime)}</div>
                    </div>
                    <button class="btn btn-danger" onclick="handleLogout()">
                        <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        Logout
                    </button>
                </div>` : ''}
            </div>
        </nav>
    `;
}

function renderDashboard() {
    return `
        ${renderNavbar(false)}
        <div class="container">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Total Items</span>
                        <svg class="stat-icon" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                    <div class="stat-value">${state.inventory.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Inventory Value</span>
                        <svg class="stat-icon" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div class="stat-value">₱${getTotalInventoryValue().toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Today's Sales</span>
                        <svg class="stat-icon" fill="none" stroke="#a855f7" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                    </div>
                    <div class="stat-value">₱${getTodaySales().toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Total Transactions</span>
                        <svg class="stat-icon" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                    <div class="stat-value">${state.salesHistory.length}</div>
                </div>
            </div>
            <div class="dashboard-grid">
                <button class="dashboard-card" onclick="changePage('inventory')">
                    <svg class="dashboard-icon" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                    <h2 class="dashboard-title">Inventory Management</h2>
                    <p class="dashboard-desc">Add, edit, and manage your inventory items</p>
                </button>
                <button class="dashboard-card" onclick="changePage('pos')">
                    <svg class="dashboard-icon" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <h2 class="dashboard-title">Point of Sale</h2>
                    <p class="dashboard-desc">Process sales and checkout items</p>
                </button>
                <button class="dashboard-card" onclick="changePage('sales')">
                    <svg class="dashboard-icon" fill="none" stroke="#a855f7" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    <h2 class="dashboard-title">Sales Analytics</h2>
                    <p class="dashboard-desc">View sales reports and analytics</p>
                </button>
                <button class="dashboard-card" onclick="changePage('history')">
                    <svg class="dashboard-icon" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h2 class="dashboard-title">Sales History</h2>
                    <p class="dashboard-desc">View complete sales transaction history</p>
                </button>
                <button class="dashboard-card" onclick="changePage('categories')">
                    <svg class="dashboard-icon" fill="none" stroke="#6366f1" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <h2 class="dashboard-title">Categories</h2>
                    <p class="dashboard-desc">Manage product categories</p>
                </button>
            </div>
        </div>
    `;
}

function renderCategories() {
    return `
        ${renderNavbar()}
        <div class="container">
            <div class="card">
                <h2 class="card-header">Add New Category</h2>
                <form onsubmit="handleAddCategory(event)" style="display: flex; gap: 12px;">
                    <input type="text" id="categoryName" class="form-input" placeholder="Category Name" required style="flex: 1;">
                    <button type="submit" class="btn btn-primary">
                        <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                            <path d="M12 4v16m8-8H4"/>
                        </svg>
                        Add
                    </button>
                </form>
            </div>
            <div class="card">
                <h2 class="card-header">Categories List</h2>
                <div class="category-list">
                    ${state.categories.length > 0 ? state.categories.map(cat => `
                        <div class="category-item">
                            <span class="category-name">${cat.name}</span>
                            <button class="btn btn-danger" onclick="handleDeleteCategory(${cat.id})" style="padding: 8px 12px;">
                                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    `).join('') : '<p class="empty-message">No categories yet. Add one above!</p>'}
                </div>
            </div>
        </div>
    `;
}

function renderInventory() {
    return `
        ${renderNavbar()}
        <div class="container">
            <button class="btn btn-primary" onclick="toggleInventoryForm()" style="margin-bottom: 24px;">
                <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4"/>
                </svg>
                Add New Item
            </button>
            ${state.showForm ? renderInventoryForm() : ''}
            <div class="card">
                <h2 class="card-header">Inventory Items</h2>
                <div class="inventory-grid">
                    ${state.inventory.length > 0 ? state.inventory.map(item => `
                        <div class="inventory-item">
                            ${item.image ? `<img src="${item.image}" class="inventory-image" onerror="this.style.display='none'">` : '<div class="inventory-image"></div>'}
                            <div class="inventory-name">${item.name}</div>
                            <div class="inventory-category">${item.category}</div>
                            <div class="inventory-price">₱${item.price.toFixed(2)}</div>
                            <div class="inventory-stock">Stock: ${item.quantity} ${item.unit}</div>
                            ${item.expirationDate ? `<div class="inventory-expiry">Expires: ${new Date(item.expirationDate).toLocaleDateString()}</div>` : ''}
                            <div class="inventory-actions">
                                <button class="btn btn-primary" onclick="editInventoryItem(${item.id})">
                                    <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Edit
                                </button>
                                <button class="btn btn-danger" onclick="handleDeleteInventoryItem(${item.id})">
                                    <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    `).join('') : '<p class="empty-message">No items in inventory. Add items to get started!</p>'}
                </div>
            </div>
        </div>
    `;
}

function renderInventoryForm() {
    const item = state.editingItem;
    return `
        <div class="card">
            <h2 class="card-header">${item ? 'Edit Item' : 'Add New Item'}</h2>
            <form onsubmit="handleInventorySubmit(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Item Name</label>
                        <input type="text" id="itemName" class="form-input" value="${item ? item.name : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select id="itemCategory" class="form-input" required>
                            <option value="">Select Category</option>
                            ${state.categories.map(cat => `
                                <option value="${cat.name}" ${item && item.category === cat.name ? 'selected' : ''}>${cat.name}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Quantity</label>
                        <input type="number" id="itemQuantity" class="form-input" value="${item ? item.quantity : 0}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Unit</label>
                        <select id="itemUnit" class="form-input">
                            <option value="pcs" ${item && item.unit === 'pcs' ? 'selected' : ''}>Pieces</option>
                            <option value="oz" ${item && item.unit === 'oz' ? 'selected' : ''}>Ounces (oz)</option>
                            <option value="g" ${item && item.unit === 'g' ? 'selected' : ''}>Grams (g)</option>
                            <option value="kg" ${item && item.unit === 'kg' ? 'selected' : ''}>Kilograms (kg)</option>
                            <option value="l" ${item && item.unit === 'l' ? 'selected' : ''}>Liters (l)</option>
                            <option value="ml" ${item && item.unit === 'ml' ? 'selected' : ''}>Milliliters (ml)</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Price (₱)</label>
                        <input type="number" step="0.01" id="itemPrice" class="form-input" value="${item ? item.price : 0}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Expiration Date</label>
                        <input type="date" id="itemExpiration" class="form-input" value="${item && item.expirationDate ? item.expirationDate : ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Image URL</label>
                    <input type="text" id="itemImage" class="form-input" placeholder="https://example.com/image.jpg" value="${item && item.image ? item.image : ''}">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-success">
                        <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7"/>
                        </svg>
                        ${item ? 'Update' : 'Save'}
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="toggleInventoryForm()">Cancel</button>
                </div>
            </form>
        </div>
    `;
}

function renderPOS() {
    const cartTotal = getCartTotal();
    return `
        ${renderNavbar()}
        <div class="container">
            <div class="pos-container">
                <div>
                    <div class="card">
                        <h2 class="card-header">Select Items</h2>
                        <div class="pos-items">
                            ${state.inventory.filter(item => item.quantity > 0).map(item => `
                                <div class="pos-item" onclick="addToCart(${item.id})">
                                    ${item.image ? `<img src="${item.image}" class="pos-item-image" onerror="this.style.display='none'">` : '<div class="pos-item-image"></div>'}
                                    <div class="pos-item-name">${item.name}</div>
                                    <div class="pos-item-price">₱${item.price.toFixed(2)}</div>
                                    <div style="font-size: 12px; color: #6b7280;">Stock: ${item.quantity}</div>
                                </div>
                            `).join('') || '<p class="empty-message">No items available</p>'}
                        </div>
                    </div>
                </div>
                <div class="cart-container">
                    <div class="cart-header">Shopping Cart</div>
                    <div class="cart-items">
                        ${state.cart.length > 0 ? state.cart.map(item => `
                            <div class="cart-item">
                                <div class="cart-item-info">
                                    <div class="cart-item-name">${item.name}</div>
                                    <div class="cart-item-price">₱${item.price.toFixed(2)} × ${item.quantity}</div>
                                </div>
                                <div class="cart-quantity">
                                    <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
                                    <span class="qty-display">${item.quantity}</span>
                                    <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
                                </div>
                            </div>
                        `).join('') : '<p class="empty-message">Cart is empty</p>'}
                    </div>
                    ${state.cart.length > 0 ? `
                        <div class="cart-total">
                            <div class="cart-total-label">
                                <span>Total:</span>
                                <span class="cart-total-amount">₱${cartTotal.toFixed(2)}</span>
                            </div>
                        </div>
                        <button class="btn btn-success" style="width: 100%; margin-bottom: 8px;" onclick="checkout()">
                            <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                                <path d="M5 13l4 4L19 7"/>
                            </svg>
                            Checkout
                        </button>
                        <button class="btn btn-secondary" style="width: 100%;" onclick="clearCart()">Clear Cart</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderSales() {
    const totalSales = state.salesHistory.reduce((sum, sale) => sum + sale.total, 0);
    const avgSale = state.salesHistory.length > 0 ? totalSales / state.salesHistory.length : 0;
    
    return `
        ${renderNavbar()}
        <div class="container">
            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                <div class="stat-card">
                    <div class="stat-title">Total Sales</div>
                    <div class="stat-value" style="font-size: 24px;">₱${totalSales.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Total Transactions</div>
                    <div class="stat-value" style="font-size: 24px;">${state.salesHistory.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Average Sale</div>
                    <div class="stat-value" style="font-size: 24px;">₱${avgSale.toFixed(2)}</div>
                </div>
            </div>
            <div class="card">
                <h2 class="card-header">Daily Sales Summary</h2>
                ${state.sales.length > 0 ? `
                    <table class="sales-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Transactions</th>
                                <th>Total Sales</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.sales.map(sale => `
                                <tr>
                                    <td>${new Date(sale.date).toLocaleDateString('en-PH')}</td>
                                    <td>${sale.count}</td>
                                    <td>₱${sale.total.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p class="empty-message">No sales data available</p>'}
            </div>
        </div>
    `;
}

function renderHistory() {
    return `
        ${renderNavbar()}
        <div class="container">
            <div class="card">
                <h2 class="card-header">Sales Transaction History</h2>
                ${state.salesHistory.length > 0 ? `
                    <div style="max-height: 600px; overflow-y: auto;">
                        ${state.salesHistory.slice().reverse().map(sale => `
                            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                    <div>
                                        <div style="font-weight: bold;">Transaction #${sale.id}</div>
                                        <div style="color: #6b7280; font-size: 13px;">${new Date(sale.date).toLocaleString('en-PH')}</div>
                                    </div>
                                    <div style="font-size: 20px; font-weight: bold; color: #10b981;">₱${sale.total.toFixed(2)}</div>
                                </div>
                                <div style="font-weight: 500; margin-bottom: 8px; color: #374151;">Items:</div>
                                <div style="display: flex; flex-direction: column; gap: 4px;">
                                    ${sale.items.map(item => `
                                        <div style="display: flex; justify-content: space-between; font-size: 14px;">
                                            <span>${item.name} × ${item.quantity}</span>
                                            <span>₱${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="empty-message">No transaction history available</p>'}
            </div>
        </div>
    `;
}

// Main Render Function
function render() {
    const app = document.getElementById('app');
    
    if (state.loading) {
        app.innerHTML = renderLoading();
        return;
    }
    
    switch (state.currentPage) {
        case 'login':
            app.innerHTML = renderLogin();
            break;
        case 'dashboard':
            app.innerHTML = renderDashboard();
            break;
        case 'categories':
            app.innerHTML = renderCategories();
            break;
        case 'inventory':
            app.innerHTML = renderInventory();
            break;
        case 'pos':
            app.innerHTML = renderPOS();
            break;
        case 'sales':
            app.innerHTML = renderSales();
            break;
        case 'history':
            app.innerHTML = renderHistory();
            break;
        default:
            app.innerHTML = renderDashboard();
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    render();
});