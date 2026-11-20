// State
let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('francos_cart') || '[]');
let activeCategoryId = null;
let searchQuery = '';
let currentUser = JSON.parse(localStorage.getItem('francos_user') || 'null');
let businessSettings = null;

const API_BASE = '/api';

// Format Currency
function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

// Init App
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadCategories();
  await loadProducts();
  updateAuthUI();
  renderCart();
  lucide.createIcons();
});

// Load Settings
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/admin/settings`);
    if (res.ok) {
      businessSettings = await res.json();
    }
  } catch (err) {
    console.error("Error loading settings:", err);
  }
}

// Load Categories
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/products/categories`);
    if (res.ok) {
      categories = await res.json();
      renderCategories();
    }
  } catch (err) {
    console.error("Error loading categories:", err);
  }
}

function renderCategories() {
  const container = document.getElementById('categoriesList');
  if (!container) return;

  const currentActive = activeCategoryId;
  let html = `
    <button onclick="filterCategory(null)" id="cat-btn-all" class="cat-pill flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${currentActive === null ? 'bg-brand-navy text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
      <i data-lucide="check-circle" class="w-4 h-4"></i> Todos
    </button>
  `;

  categories.forEach(cat => {
    const isActive = currentActive === cat.id;
    html += `
      <button onclick="filterCategory(${cat.id})" class="cat-pill flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isActive ? 'bg-brand-navy text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
        <i data-lucide="${cat.icon || 'drumstick'}" class="w-4 h-4 text-brand-gold"></i> ${cat.name}
      </button>
    `;
  });

  container.innerHTML = html;
  lucide.createIcons();
}

function filterCategory(catId) {
  activeCategoryId = catId;
  renderCategories();
  applyFilters();
}

function handleSearch(val) {
  searchQuery = val.toLowerCase().trim();
  applyFilters();
}

// Load Products
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products?active_only=true`);
    if (res.ok) {
      products = await res.json();
      applyFilters();
    }
  } catch (err) {
    console.error("Error loading products:", err);
  }
}

function applyFilters() {
  let filtered = products;

  if (activeCategoryId !== null) {
    filtered = filtered.filter(p => p.category_id === activeCategoryId);
  }

  if (searchQuery) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchQuery) || 
      (p.description && p.description.toLowerCase().includes(searchQuery))
    );
  }

  renderProductsGrid(filtered);
}

function renderProductsGrid(items) {
  const grid = document.getElementById('productsGrid');
  const emptyState = document.getElementById('emptyProducts');
  const countLabel = document.getElementById('productCount');

  if (!grid) return;

  if (countLabel) {
    countLabel.textContent = `${items.length} productos disponibles`;
  }

  if (items.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  grid.innerHTML = items.map(p => {
    const inStock = p.stock > 0;
    const isLow = p.stock <= p.min_stock_alert && inStock;

    return `
      <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
        <!-- Image Container -->
        <div class="relative h-48 bg-slate-100 overflow-hidden">
          <img src="${p.image_url || 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80'}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          
          <!-- Badges -->
          <div class="absolute top-3 left-3 flex flex-col gap-1">
            ${p.is_featured ? `<span class="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-2 py-1 rounded-lg tracking-wider shadow">Destacado</span>` : ''}
            ${isLow ? `<span class="bg-orange-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-lg shadow">Últimas ${p.stock} ${p.unit}</span>` : ''}
          </div>

          <div class="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-xl font-bold">
            Por ${p.unit}
          </div>
        </div>

        <!-- Info -->
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <span class="text-xs font-semibold text-brand-natural uppercase tracking-wider">${p.category ? p.category.name : 'Avícola'}</span>
            <h3 class="font-extrabold text-slate-900 text-base leading-snug mt-1 group-hover:text-brand-dark transition-colors">${p.name}</h3>
            <p class="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">${p.description || 'Producto fresco de granja con altos estándares de salubridad.'}</p>
          </div>

          <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div class="text-[11px] text-slate-400 font-medium">Precio por ${p.unit}</div>
              <div class="text-xl font-black text-brand-dark">${formatCOP(p.price)}</div>
            </div>

            ${inStock ? `
              <button onclick="addToCart(${p.id})" class="bg-brand-navy hover:bg-brand-navyDark text-white p-3 rounded-2xl shadow hover:shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-1.5" title="Agregar al carrito">
                <i data-lucide="plus" class="w-4 h-4 text-brand-gold"></i>
                <span class="text-xs font-bold sm:hidden lg:inline">Agregar</span>
              </button>
            ` : `
              <span class="bg-red-50 text-red-600 text-xs font-bold px-3 py-2 rounded-xl">Agotado</span>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// CART MANAGEMENT
function saveCart() {
  localStorage.setItem('francos_cart', JSON.stringify(cart));
  renderCart();
}

function addToCart(productId, qty = 1) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const existing = cart.find(item => item.product_id === productId);
  if (existing) {
    if (existing.quantity + qty > prod.stock) {
      alert(`Lo sentimos, solo quedan ${prod.stock} ${prod.unit} disponibles.`);
      return;
    }
    existing.quantity += qty;
  } else {
    if (qty > prod.stock) {
      alert(`Lo sentimos, solo quedan ${prod.stock} ${prod.unit} disponibles.`);
      return;
    }
    cart.push({
      product_id: prod.id,
      name: prod.name,
      price: prod.price,
      unit: prod.unit,
      image_url: prod.image_url,
      quantity: qty,
      stock: prod.stock
    });
  }

  saveCart();
  toggleCartDrawer(true);
}

function addPromoCombo() {
  // Add 1 Pollo Entero + 1 Pechuga + 1 Alitas combo representation
  const featured = products.find(p => p.is_featured) || products[0];
  if (featured) {
    addToCart(featured.id, 2);
  }
}

function updateCartQuantity(productId, newQty) {
  const item = cart.find(it => it.product_id === productId);
  if (!item) return;

  if (newQty <= 0) {
    cart = cart.filter(it => it.product_id !== productId);
  } else {
    if (newQty > item.stock) {
      alert(`Existencias máximas para este producto: ${item.stock} ${item.unit}`);
      return;
    }
    item.quantity = newQty;
  }
  saveCart();
}

function removeCartItem(productId) {
  cart = cart.filter(it => it.product_id !== productId);
  saveCart();
}

function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  const badge = document.getElementById('cartBadge');
  const totalHeader = document.getElementById('cartTotalHeader');
  const subtotalEl = document.getElementById('cartSubtotal');
  const deliveryEl = document.getElementById('cartDeliveryFee');
  const totalEl = document.getElementById('cartTotal');
  const noticeEl = document.getElementById('freeShippingNotice');
  const checkoutBtn = document.getElementById('checkoutBtn');

  const totalCount = cart.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);

  const deliveryThreshold = businessSettings ? businessSettings.free_delivery_threshold : 60000;
  const defaultDelivery = businessSettings ? businessSettings.delivery_fee_default : 5000;
  const deliveryFee = (subtotal >= deliveryThreshold || subtotal === 0) ? 0 : defaultDelivery;
  const total = subtotal + deliveryFee;

  if (badge) badge.textContent = totalCount;
  if (totalHeader) totalHeader.textContent = formatCOP(subtotal);
  if (subtotalEl) subtotalEl.textContent = formatCOP(subtotal);
  if (deliveryEl) deliveryEl.textContent = deliveryFee === 0 ? "GRATIS" : formatCOP(deliveryFee);
  if (totalEl) totalEl.textContent = formatCOP(total);

  if (noticeEl) {
    if (subtotal === 0) {
      noticeEl.textContent = '';
    } else if (subtotal >= deliveryThreshold) {
      noticeEl.textContent = '🎉 ¡Felicitaciones! Tienes ENVÍO GRATIS en esta compra.';
    } else {
      const diff = deliveryThreshold - subtotal;
      noticeEl.textContent = `Agrega ${formatCOP(diff)} más para obtener ENVÍO GRATIS.`;
    }
  }

  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
    checkoutBtn.classList.toggle('opacity-50', cart.length === 0);
    checkoutBtn.classList.toggle('cursor-not-allowed', cart.length === 0);
  }

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <i data-lucide="shopping-bag" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
        <p class="font-bold text-slate-700">Tu carrito está vacío</p>
        <p class="text-xs text-slate-400 mt-1">Descubre nuestros productos avícolas frescos y agrega tus cortes preferidos.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
      <img src="${item.image_url || 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=150&q=80'}" class="w-16 h-16 rounded-xl object-cover bg-white">
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-slate-800 text-sm truncate">${item.name}</h4>
        <div class="text-xs text-brand-dark font-black">${formatCOP(item.price)} <span class="text-slate-400 font-normal">/ ${item.unit}</span></div>
        <div class="flex items-center gap-2 mt-2">
          <div class="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
            <button onclick="updateCartQuantity(${item.product_id}, ${item.quantity - 1})" class="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold text-sm">-</button>
            <span class="px-3 py-0.5 text-xs font-bold text-slate-800">${item.quantity}</span>
            <button onclick="updateCartQuantity(${item.product_id}, ${item.quantity + 1})" class="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold text-sm">+</button>
          </div>
          <span class="text-xs text-slate-500">${item.unit}</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm font-black text-slate-900">${formatCOP(item.price * item.quantity)}</div>
        <button onclick="removeCartItem(${item.product_id})" class="text-xs text-red-500 hover:text-red-700 mt-2" title="Eliminar">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

function toggleCartDrawer(open) {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartDrawerBackdrop');
  if (!drawer || !backdrop) return;

  if (open) {
    backdrop.classList.remove('hidden');
    drawer.classList.remove('translate-x-full');
  } else {
    backdrop.classList.add('hidden');
    drawer.classList.add('translate-x-full');
  }
}

// CHECKOUT LOGIC
function openCheckoutModal() {
  if (cart.length === 0) return;
  toggleCartDrawer(false);

  // Pre-fill if user is logged in
  if (currentUser) {
    document.getElementById('custName').value = currentUser.full_name || '';
    document.getElementById('custPhone').value = currentUser.phone || '';
    document.getElementById('custAddress').value = currentUser.address || '';
    document.getElementById('custNeighborhood').value = currentUser.neighborhood || '';
  }

  const subtotal = cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const deliveryThreshold = businessSettings ? businessSettings.free_delivery_threshold : 60000;
  const defaultDelivery = businessSettings ? businessSettings.delivery_fee_default : 5000;
  const deliveryFee = subtotal >= deliveryThreshold ? 0 : defaultDelivery;
  const total = subtotal + deliveryFee;

  document.getElementById('checkoutSummaryTotal').textContent = formatCOP(total);
  document.getElementById('checkoutModal').classList.remove('hidden');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

async function submitCheckout(e) {
  e.preventDefault();
  const btn = document.getElementById('confirmOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  const orderData = {
    customer_name: document.getElementById('custName').value.trim(),
    customer_phone: document.getElementById('custPhone').value.trim(),
    shipping_address: document.getElementById('custAddress').value.trim(),
    shipping_neighborhood: document.getElementById('custNeighborhood').value.trim(),
    shipping_city: document.getElementById('custCity').value.trim() || 'Bogotá',
    notes: document.getElementById('custNotes').value.trim(),
    payment_method: document.querySelector('input[name="paymentMethod"]:checked').value,
    items: cart.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity
    }))
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('francos_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/orders/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData)
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Error al procesar el pedido');
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-amber-400"></i> Confirmar Pedido`;
      lucide.createIcons();
      return;
    }

    // Success!
    closeCheckoutModal();
    cart = [];
    saveCart();
    await loadProducts(); // Refresh stock

    showConfirmationModal(data);
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Ocurrió un error al conectar con el servidor.");
  } finally {
    btn.disabled = false;
  }
}

function showConfirmationModal(order) {
  document.getElementById('confOrderCode').textContent = order.order_code;
  document.getElementById('confCustomerName').textContent = order.customer_name;
  document.getElementById('confTotal').textContent = formatCOP(order.total);
  document.getElementById('confPayment').textContent = order.payment_method;

  const targetWhatsApp = (businessSettings && businessSettings.whatsapp) ? businessSettings.whatsapp.replace(/\D/g, '') : '573206565410';

  // Plantilla profesional de confirmación del pedido para WhatsApp
  let itemsDetail = '';
  if (order.items && order.items.length > 0) {
    itemsDetail = order.items.map(it => `• ${it.product_name} x ${it.quantity} ${it.unit} ($${Math.round(it.subtotal || (it.price * it.quantity)).toLocaleString('es-CO')})`).join('\n');
  } else {
    itemsDetail = '• Consulta con el asesor los detalles de tus productos';
  }

  const rawMessage = 
    `🍗 *¡NUEVO PEDIDO REGISTRADO EN FRANCO'S POLLO!*\n\n` +
    `*Código de Pedido:* #${order.order_code}\n` +
    `*Cliente:* ${order.customer_name}\n` +
    `*Teléfono:* ${order.customer_phone}\n` +
    `*Dirección:* ${order.shipping_address}\n` +
    `*Barrio:* ${order.shipping_neighborhood}\n` +
    `*Ciudad:* ${order.shipping_city || 'Barranquilla'}\n` +
    (order.notes ? `*Observaciones:* ${order.notes}\n` : '') +
    `\n📦 *PRODUCTOS:*\n${itemsDetail}\n\n` +
    `*Subtotal:* ${formatCOP(order.subtotal)}\n` +
    `*Costo Domicilio:* ${order.delivery_fee === 0 ? 'GRATIS' : formatCOP(order.delivery_fee)}\n` +
    `💰 *TOTAL A PAGAR:* ${formatCOP(order.total)}\n` +
    `*Método de Pago:* ${order.payment_method}\n\n` +
    `_Por favor confirmar recepción y tiempo estimado de entrega._`;

  const encodedUrl = `https://wa.me/${targetWhatsApp}?text=${encodeURIComponent(rawMessage)}`;

  document.getElementById('confWhatsAppBtn').onclick = () => {
    window.open(encodedUrl, '_blank');
  };

  document.getElementById('confirmationModal').classList.remove('hidden');
}

function closeConfirmationModal() {
  document.getElementById('confirmationModal').classList.add('hidden');
}

// AUTH (CUSTOMER)
function toggleUserDropdown() {
  const dd = document.getElementById('userDropdown');
  dd.classList.toggle('hidden');
}

function updateAuthUI() {
  const guestMenu = document.getElementById('authGuestMenu');
  const loggedMenu = document.getElementById('authLoggedInMenu');
  const userLabel = document.getElementById('userNameLabel');
  const emailDisplay = document.getElementById('userEmailDisplay');

  if (currentUser) {
    if (guestMenu) guestMenu.classList.add('hidden');
    if (loggedMenu) loggedMenu.classList.remove('hidden');
    if (userLabel) userLabel.textContent = currentUser.full_name.split(' ')[0];
    if (emailDisplay) emailDisplay.textContent = currentUser.email;
  } else {
    if (guestMenu) guestMenu.classList.remove('hidden');
    if (loggedMenu) loggedMenu.classList.add('hidden');
    if (userLabel) userLabel.textContent = 'Mi Cuenta';
  }
}

function openAuthModal(tab = 'login') {
  document.getElementById('userDropdown').classList.add('hidden');
  // Limpiar todos los campos del formulario antes de abrir
  ['loginEmail', 'loginPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['regName', 'regEmail', 'regPhone', 'regAddress', 'regNeighborhood', 'regPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  switchAuthTab(tab);
  document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  // Limpiar campos al cerrar
  ['loginEmail', 'loginPassword', 'regName', 'regEmail', 'regPhone', 'regAddress', 'regNeighborhood', 'regPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
  document.getElementById('registerForm').classList.toggle('hidden', isLogin);
  document.getElementById('authModalTitle').textContent = isLogin ? 'Iniciar Sesión' : 'Crear Cuenta';

  document.getElementById('authTabLogin').className = isLogin 
    ? 'flex-1 pb-3 border-b-2 border-brand-navy text-brand-navy font-black' 
    : 'flex-1 pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-600 font-bold';
  document.getElementById('authTabRegister').className = !isLogin 
    ? 'flex-1 pb-3 border-b-2 border-brand-navy text-brand-navy font-black' 
    : 'flex-1 pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-600 font-bold';
}

async function handleCustomerLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      showAuthError(data.detail || 'Correo o contraseña incorrectos');
      return;
    }

    localStorage.setItem('francos_token', data.access_token);
    currentUser = {
      id: data.user_id,
      email: data.email,
      full_name: data.full_name,
      role: data.role
    };
    localStorage.setItem('francos_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeAuthModal();

    // Redirección inmediata y segura al Panel Administrativo si el rol es admin
    if (data.role === 'admin') {
      sessionStorage.setItem('francos_admin_token', data.access_token);
      sessionStorage.setItem('francos_admin_user', JSON.stringify(currentUser));
      window.location.href = '/admin';
      return;
    }
  } catch (err) {
    showAuthError('Error al conectar con el servidor. Verifica tu conexión.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

function showAuthError(msg) {
  let errDiv = document.getElementById('authErrorMsg');
  if (!errDiv) {
    errDiv = document.createElement('div');
    errDiv.id = 'authErrorMsg';
    errDiv.className = 'bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-semibold';
    const modal = document.querySelector('#authModal .space-y-4, #authModal form:not(.hidden)');
    if (modal) modal.prepend(errDiv);
  }
  errDiv.textContent = msg;
  errDiv.classList.remove('hidden');
  setTimeout(() => errDiv.classList.add('hidden'), 5000);
}

async function handleCustomerRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('regSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Registrando...'; }

  const full_name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const address = (document.getElementById('regAddress') || {}).value?.trim() || '';
  const neighborhood = (document.getElementById('regNeighborhood') || {}).value?.trim() || '';
  const city = (document.getElementById('regCity') || {}).value || 'Barranquilla';
  const password = document.getElementById('regPassword').value;

  if (password.length < 6) {
    showAuthError('La contraseña debe tener al menos 6 caracteres.');
    if (btn) { btn.disabled = false; btn.textContent = 'Registrarme'; }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, phone, address, neighborhood, city, password })
    });

    const data = await res.json();
    if (!res.ok) {
      showAuthError(data.detail || 'Error en el registro. Verifica los datos ingresados.');
      return;
    }

    // Éxito: limpiar campos y cambiar a login
    ['regName', 'regEmail', 'regPhone', 'regAddress', 'regNeighborhood', 'regPassword'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    switchAuthTab('login');
    document.getElementById('loginEmail').value = email;

    // Mostrar mensaje de éxito
    let okDiv = document.getElementById('authSuccessMsg');
    if (!okDiv) {
      okDiv = document.createElement('div');
      okDiv.id = 'authSuccessMsg';
      okDiv.className = 'bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl font-semibold flex items-center gap-2';
    }
    okDiv.innerHTML = '✅ ¡Cuenta creada! Ingresa tu contraseña para continuar.';
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.prepend(okDiv);
    setTimeout(() => okDiv.remove(), 6000);

  } catch (err) {
    showAuthError('Error de conexión. Verifica el servidor.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Registrarme'; }
  }
}

function logoutCustomer() {
  localStorage.removeItem('francos_token');
  localStorage.removeItem('francos_user');
  currentUser = null;
  updateAuthUI();
  document.getElementById('userDropdown').classList.add('hidden');
}

// TRACK ORDER
function openTrackOrderModal() {
  document.getElementById('trackModal').classList.remove('hidden');
}

function closeTrackOrderModal() {
  document.getElementById('trackModal').classList.add('hidden');
}

async function fetchTrackOrder() {
  const code = document.getElementById('trackCodeInput').value.trim();
  const container = document.getElementById('trackResultContainer');
  if (!code) return;

  try {
    const res = await fetch(`${API_BASE}/orders/track/${code}`);
    const data = await res.json();
    if (!res.ok) {
      container.classList.remove('hidden');
      container.innerHTML = `<span class="text-red-500 font-bold">No se encontró ningún pedido con el código ${code}.</span>`;
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="flex justify-between font-bold text-slate-800">
        <span>Pedido ${data.order_code}</span>
        <span class="text-brand-dark px-2.5 py-0.5 rounded-full bg-green-100 text-xs">${data.status}</span>
      </div>
      <div class="text-xs text-slate-500">Destino: ${data.shipping_address}, ${data.shipping_neighborhood}</div>
      <div class="text-xs text-slate-500">Total: <b>${formatCOP(data.total)}</b> (${data.payment_method})</div>
      <div class="text-xs text-slate-400 mt-2">Productos:</div>
      <ul class="text-xs text-slate-700 list-disc pl-4">
        ${data.items.map(it => `<li>${it.product_name} x ${it.quantity} ${it.unit}</li>`).join('')}
      </ul>
    `;
  } catch (err) {
    alert('Error al consultar el pedido');
  }
}

// MIS PEDIDOS (CLIENTE REGISTRADO)
async function openMyOrdersModal() {
  const modal = document.getElementById('myOrdersModal');
  const container = document.getElementById('myOrdersListContainer');
  if (!modal || !container) return;

  // Si no ha iniciado sesión, invitar a iniciar sesión
  const token = localStorage.getItem('francos_token');
  if (!token || !currentUser) {
    openAuthModal('login');
    return;
  }

  // Ocultar dropdown de usuario si está abierto
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdown) userDropdown.classList.add('hidden');

  modal.classList.remove('hidden');
  container.innerHTML = `
    <div class="text-center py-12 text-slate-400">
      <div class="w-8 h-8 border-3 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-sm font-semibold text-slate-600">Consultando tus pedidos...</p>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/orders/my-orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        logoutCustomer();
        openAuthModal('login');
        closeMyOrdersModal();
        return;
      }
      throw new Error('Error al obtener pedidos');
    }

    const orders = await res.json();

    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <i data-lucide="shopping-bag" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
          <h4 class="font-bold text-slate-700 text-base">Aún no tienes pedidos registrados</h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">¡Explora nuestro catálogo de pollo fresco de granja y haz tu primer pedido hoy mismo!</p>
          <button onclick="closeMyOrdersModal(); location.href='#catalogo';" class="px-5 py-2.5 bg-brand-gold text-brand-navyDark font-black text-xs rounded-xl shadow hover:bg-brand-goldHover transition">
            Ver Catálogo de Pollo
          </button>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    const statusBadgeClass = {
      'Pendiente': 'bg-amber-100 text-amber-800 border-amber-200',
      'Confirmado': 'bg-blue-100 text-blue-800 border-blue-200',
      'En preparación': 'bg-purple-100 text-purple-800 border-purple-200',
      'En camino': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Entregado': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Cancelado': 'bg-rose-100 text-rose-800 border-rose-200'
    };

    container.innerHTML = orders.map(ord => {
      const dateStr = ord.created_at ? new Date(ord.created_at).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Reciente';

      const itemsList = (ord.items || []).map(it => 
        `<span class="inline-block bg-white text-slate-700 text-[11px] px-2 py-0.5 rounded-md border border-slate-200 mr-1.5 mb-1 font-medium">
          ${it.product_name} x ${it.quantity} ${it.unit}
        </span>`
      ).join('');

      const badgeStyle = statusBadgeClass[ord.status] || 'bg-slate-100 text-slate-700 border-slate-200';

      return `
        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:border-brand-gold/40 transition shadow-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div class="flex items-center space-x-2">
              <span class="font-black text-sm text-brand-navy tracking-tight">#${ord.order_code}</span>
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle}">${ord.status}</span>
            </div>
            <div class="text-xs font-semibold text-slate-500">${dateStr}</div>
          </div>

          <div class="py-2.5">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Productos adquiridos:</div>
            <div class="flex flex-wrap">${itemsList || '<span class="text-xs text-slate-400">Sin detalles</span>'}</div>
            <div class="text-xs text-slate-600 mt-2 flex items-center gap-1">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-brand-gold"></i>
              <span>${ord.shipping_address}, ${ord.shipping_neighborhood} (${ord.shipping_city || 'Barranquilla'})</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-200">
            <div>
              <span class="text-[10px] text-slate-400 uppercase font-bold block">Total Pagado / A Pagar</span>
              <span class="text-sm font-black text-slate-900">${formatCOP(ord.total)}</span>
              <span class="text-[11px] text-slate-500 font-medium">(${ord.payment_method})</span>
            </div>
            <div class="flex items-center space-x-2">
              <button onclick="quickTrackFromModal('${ord.order_code}')" class="px-3 py-1.5 bg-brand-navy hover:bg-brand-navyDark text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-xs">
                <i data-lucide="radar" class="w-3.5 h-3.5 text-brand-gold"></i> Monitorear
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    console.error("Error al consultar pedidos:", err);
    container.innerHTML = `
      <div class="text-center py-8 text-rose-500 text-sm">
        <p class="font-bold">No se pudieron cargar tus pedidos.</p>
        <p class="text-xs text-slate-500 mt-1">Por favor verifica tu conexión o vuelve a intentar.</p>
      </div>
    `;
  }
}

function closeMyOrdersModal() {
  const modal = document.getElementById('myOrdersModal');
  if (modal) modal.classList.add('hidden');
}

function quickTrackFromModal(orderCode) {
  closeMyOrdersModal();
  openTrackOrderModal();
  const input = document.getElementById('trackCodeInput');
  if (input) {
    input.value = orderCode;
    fetchTrackOrder();
  }
}
