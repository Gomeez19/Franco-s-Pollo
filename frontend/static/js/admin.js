// Admin Suite Logic & Security Layer
const API_BASE = '/api';

let currentAdminTab = 'poultry-control';
let currentPoultrySubtab = 'control';
let adminToken = localStorage.getItem('francos_admin_token');
let adminUser = JSON.parse(localStorage.getItem('francos_admin_user') || 'null');
let adminProducts = [];
let adminCategories = [];
let salesChartInstance = null;

// ==============================================================================
// GESTIÓN DE SEGURIDAD & EXPIRACIÓN INACTIVIDAD (5 MINUTOS)
// ==============================================================================
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
let inactivityTimer = null;

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (adminToken) {
    inactivityTimer = setTimeout(() => {
      alert("⚠️ Tu sesión ha expirado por inactividad (5 minutos). Por seguridad comercial, debes ingresar tus credenciales nuevamente.");
      logoutAdmin();
    }, INACTIVITY_TIMEOUT_MS);
  }
}

['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
  document.addEventListener(event, resetInactivityTimer, { passive: true });
});

function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', async () => {
  if (!adminToken) {
    document.getElementById('adminLoginOverlay').classList.remove('hidden');
    clearLoginForm();
  } else {
    document.getElementById('adminLoginOverlay').classList.add('hidden');
    if (adminUser) {
      document.getElementById('adminUserName').textContent = adminUser.full_name || 'Franco Morales';
    }
    resetInactivityTimer();
    await initAdminSuite();
  }
  lucide.createIcons();
});

function clearLoginForm() {
  const emailInput = document.getElementById('adminEmail');
  const passInput = document.getElementById('adminPassword');
  if (emailInput) emailInput.value = '';
  if (passInput) passInput.value = '';
}

// Inicio de sesión
async function handleAdminLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('adminEmail');
  const passInput = document.getElementById('adminPassword');
  const btn = document.getElementById('adminLoginBtn');

  const email = emailInput.value.trim();
  const password = passInput.value;

  btn.disabled = true;
  btn.textContent = 'Verificando credenciales...';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Credenciales no autorizadas');
      clearLoginForm();
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="lock" class="w-4 h-4 text-brand-gold"></i> Iniciar Sesión Protegida`;
      lucide.createIcons();
      return;
    }

    if (data.role !== 'admin') {
      alert('Esta cuenta no posee privilegios de administrador.');
      clearLoginForm();
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="lock" class="w-4 h-4 text-brand-gold"></i> Iniciar Sesión Protegida`;
      lucide.createIcons();
      return;
    }

    adminToken = data.access_token;
    adminUser = {
      id: data.user_id,
      email: data.email,
      full_name: data.full_name,
      role: data.role
    };

    sessionStorage.setItem('francos_admin_token', adminToken);
    sessionStorage.setItem('francos_admin_user', JSON.stringify(adminUser));
    // También guardar en localStorage para persistir al recargar/navegar
    localStorage.setItem('francos_admin_token', adminToken);
    localStorage.setItem('francos_admin_user', JSON.stringify(adminUser));
    clearLoginForm();

    document.getElementById('adminLoginOverlay').classList.add('hidden');
    document.getElementById('adminUserName').textContent = adminUser.full_name;

    resetInactivityTimer();
    await initAdminSuite();
  } catch (err) {
    alert('Error al conectar con la base de datos Neon.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="lock" class="w-4 h-4 text-brand-gold"></i> Iniciar Sesión Protegida`;
    lucide.createIcons();
  }
}

function logoutAdmin() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  sessionStorage.removeItem('francos_admin_token');
  sessionStorage.removeItem('francos_admin_user');
  localStorage.removeItem('francos_admin_token');
  localStorage.removeItem('francos_admin_user');
  adminToken = null;
  adminUser = null;
  clearLoginForm();
  document.getElementById('adminLoginOverlay').classList.remove('hidden');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };
}

async function initAdminSuite() {
  await loadCategories();
  await loadPoultryControl();
  runBreedingCalcLive();
  runCommercialCalcLive();
  loadSavedCalculations();
}

function switchAdminTab(tabName) {
  resetInactivityTimer();
  currentAdminTab = tabName;

  document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
  const target = document.getElementById(`section-${tabName}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-brand-gold', 'text-brand-navyDark', 'shadow');
    btn.classList.add('text-slate-300', 'hover:bg-brand-navy', 'hover:text-white');
  });

  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-gold', 'text-brand-navyDark', 'shadow');
    activeBtn.classList.remove('text-slate-300', 'hover:bg-brand-navy');
  }

  const titles = {
    'poultry-control': 'Control de Pollos y Galpón (Pesajes, Gastos e Ingresos)',
    dashboard: 'Dashboard General de Operaciones',
    products: 'Gestión de Productos, Precios y Fotos',
    inventory: 'Control de Inventario & Kardex',
    orders: 'Administración de Pedidos y Despachos',
    calculator: 'Calculadora Inteligente de Precios y Costos Avícolas',
    customers: 'Directorio de Clientes CRM',
    finances: 'Finanzas, Ingresos y Costos Contables',
    suppliers: 'Gestión de Proveedores Avícolas',
    reports: 'Reportes y Exportación Contable',
    settings: 'Configuración Comercial de la Empresa'
  };
  document.getElementById('currentSectionTitle').textContent = titles[tabName] || 'Admin';

  if (tabName === 'poultry-control') loadPoultryControl();
  if (tabName === 'dashboard') loadDashboardStats();
  if (tabName === 'products') loadAdminProducts();
  if (tabName === 'inventory') loadInventoryKardex();
  if (tabName === 'orders') loadAdminOrders();
  if (tabName === 'customers') loadAdminCustomers();
  if (tabName === 'finances') loadAdminFinances();
  if (tabName === 'suppliers') loadAdminSuppliers();
  if (tabName === 'settings') loadAdminSettings();

  lucide.createIcons();
}

function refreshCurrentSection() {
  switchAdminTab(currentAdminTab);
}

// ==============================================================================
// MÓDULO EXCLUSIVO: CONTROL DE POLLOS Y GALPÓN (FOTOS DEL USUARIO)
// ==============================================================================
function switchPoultrySubtab(subtab) {
  currentPoultrySubtab = subtab;

  ['control', 'ventas', 'gastos', 'ingresos'].forEach(st => {
    const el = document.getElementById(`poultryView${st.charAt(0).toUpperCase() + st.slice(1)}`);
    const btn = document.getElementById(`subtab-btn-${st}`);
    if (el) el.classList.toggle('hidden', st !== subtab);
    if (btn) {
      if (st === subtab) {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-black bg-brand-gold text-brand-navyDark shadow';
      } else {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white';
      }
    }
  });

  loadPoultryControl();
  lucide.createIcons();
}

async function loadPoultryControl() {
  try {
    const res = await fetch(`${API_BASE}/admin/poultry-control`, { headers: authHeaders() });
    if (res.status === 401) { logoutAdmin(); return; }
    if (!res.ok) return;
    const data = await res.json();

    // 1. Control / Pesajes
    document.getElementById('pcGalponCount').textContent = data.batch.en_galpon;
    document.getElementById('pcBajasCount').textContent = data.batch.bajas;
    document.getElementById('pcSacrificadosCount').textContent = data.batch.sacrificados;
    document.getElementById('pcIniciadosCount').textContent = data.batch.iniciados;

    const weightsList = document.getElementById('poultryWeightHistoryList');
    if (weightsList) {
      weightsList.innerHTML = data.weights.map(w => {
        const isOk = w.status_label.includes('Bien') || w.status_label.includes('Excelente');
        return `
          <div class="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-brand-gold transition">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-brand-cream border border-brand-gold/30 flex flex-col items-center justify-center text-brand-navy">
                <span class="text-xs font-bold leading-none">${w.date.split(' ')[0]}</span>
                <span class="text-[9px] font-black uppercase tracking-wider text-brand-gold">${w.date.split(' ')[1] || 'NOV'}</span>
              </div>
              <div>
                <h5 class="font-extrabold text-sm text-brand-navy">Día ${w.day_number} del lote</h5>
                <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${isOk ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                  ${isOk ? '✓' : '⚠️'} ${w.status_label}
                </span>
                ${w.notes ? `<p class="text-[11px] text-slate-400 mt-0.5">${w.notes}</p>` : ''}
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-black text-brand-navy">${w.avg_weight_grams} g</div>
              <div class="text-[10px] text-slate-400">promedio</div>
              <button onclick="deleteWeightRecord(${w.id})" class="text-[10px] text-red-500 hover:underline mt-1 font-bold">Eliminar</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Ventas
    document.getElementById('pvTotalVendido').textContent = formatCOP(data.sales_summary.total_vendido);
    document.getElementById('pvCobrado').textContent = formatCOP(data.sales_summary.cobrado);
    document.getElementById('pvPendiente').textContent = formatCOP(data.sales_summary.pendiente);
    document.getElementById('pvPollosVendidos').textContent = Math.round(data.sales_summary.pollos_vendidos);
    document.getElementById('pvEntregados').textContent = data.sales_summary.entregados;
    document.getElementById('pvDisponibles').textContent = data.batch.disponibles;

    // 3. Gastos Lote
    document.getElementById('pgTotalGastado').textContent = formatCOP(data.expenses.total_spent);
    document.getElementById('pgRegistrosCount').textContent = data.expenses.items.length;
    document.getElementById('pgCostoPorPollo').textContent = formatCOP(data.expenses.cost_per_chicken);

    const expensesContainer = document.getElementById('pgExpensesList');
    if (expensesContainer) {
      expensesContainer.innerHTML = data.expenses.items.map(e => `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs border border-red-100">
              <i data-lucide="package" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="font-extrabold text-sm text-slate-900">${e.category}</div>
              <div class="text-xs text-slate-500">${e.description || '-'}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-black text-slate-900 text-sm">${formatCOP(e.amount)}</div>
            <div class="text-[10px] text-slate-400">${e.date}</div>
          </div>
        </div>
      `).join('');
    }

    // 4. Ingresos Lote
    document.getElementById('piTotalIngresos').textContent = formatCOP(data.incomes.total_income);
    document.getElementById('piDeVentas').textContent = formatCOP(data.incomes.sales_income);
    document.getElementById('piOtros').textContent = formatCOP(data.incomes.other_income);
    const balanceEl = document.getElementById('piBalanceLote');
    balanceEl.textContent = formatCOP(data.incomes.balance_lote);
    balanceEl.className = data.incomes.balance_lote >= 0 ? 'text-lg font-black text-green-600' : 'text-lg font-black text-red-500';

    const incomesContainer = document.getElementById('piIncomesList');
    if (incomesContainer) {
      if (data.incomes.items.length === 0) {
        incomesContainer.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">No hay ingresos registrados aún. Las ventas pagadas se sumarán aquí automáticamente.</div>';
      } else {
        incomesContainer.innerHTML = data.incomes.items.map(i => `
          <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold text-xs border border-green-100">
                <i data-lucide="arrow-down-left" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="font-extrabold text-sm text-slate-900">${i.category}</div>
                <div class="text-xs text-slate-500">${i.description || 'Ingreso registrado'}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-black text-brand-navy text-sm">${formatCOP(i.amount)}</div>
              <div class="text-[10px] text-slate-400">${i.date}</div>
            </div>
          </div>
        `).join('');
      }
    }

    lucide.createIcons();
  } catch (err) {
    console.error("Error loading poultry control:", err);
  }
}

function openAddWeightModal() {
  document.getElementById('addWeightModal').classList.remove('hidden');
}

function closeAddWeightModal() {
  document.getElementById('addWeightModal').classList.add('hidden');
}

async function submitWeightRecord(e) {
  e.preventDefault();
  const payload = {
    day_number: parseInt(document.getElementById('wDayNumber').value),
    avg_weight_grams: parseFloat(document.getElementById('wAvgWeight').value),
    status_label: document.getElementById('wStatusLabel').value,
    notes: document.getElementById('wNotes').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/admin/poultry-control/weight`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeAddWeightModal();
      document.getElementById('addWeightForm').reset();
      loadPoultryControl();
    } else {
      alert('Error al registrar pesaje en Neon');
    }
  } catch (err) {
    alert('Error al conectar');
  }
}

async function deleteWeightRecord(id) {
  if (!confirm('¿Desea eliminar este registro de pesaje?')) return;
  try {
    await fetch(`${API_BASE}/admin/poultry-control/weight/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    loadPoultryControl();
  } catch (err) {
    alert('Error al eliminar');
  }
}

function openFinanceModalWithType(type) {
  document.getElementById('finType').value = type;
  document.getElementById('financeModalTitle').textContent = type === 'Gasto' ? 'Registrar Gasto de Lote' : 'Registrar Ingreso';
  openFinanceModal();
}

// -------------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------------
async function loadDashboardStats() {
  try {
    const res = await fetch(`${API_BASE}/admin/dashboard-stats`, { headers: authHeaders() });
    if (res.status === 401) { logoutAdmin(); return; }
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('kpiTodaySales').textContent = formatCOP(data.today_sales);
    document.getElementById('kpiMonthSales').textContent = formatCOP(data.month_sales);
    document.getElementById('kpiPendingOrders').textContent = data.pending_orders;
    document.getElementById('kpiEstimatedProfit').textContent = formatCOP(data.estimated_profit);

    document.getElementById('statAvailableProds').textContent = data.available_products;
    document.getElementById('statLowStockProds').textContent = data.low_stock_count;
    document.getElementById('statDeliveredOrders').textContent = data.delivered_orders;

    renderSalesChart(data.sales_chart);
  } catch (err) {
    console.error("Dashboard stats error:", err);
  }
}

function renderSalesChart(chartData) {
  const ctx = document.getElementById('salesTrendChart');
  if (!ctx) return;

  const labels = chartData.map(d => d.date);
  const values = chartData.map(d => d.total);

  if (salesChartInstance) salesChartInstance.destroy();

  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ventas Diarias ($ COP)',
        data: values,
        borderColor: '#c59b4c',
        backgroundColor: 'rgba(197, 155, 76, 0.15)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#0f2a4a',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '$' + v.toLocaleString('es-CO') }
        }
      }
    }
  });
}

function toggleNotifications() {
  document.getElementById('notifDropdown').classList.toggle('hidden');
}

// -------------------------------------------------------------
// GESTIÓN DE PRODUCTOS Y SUBIDA REAL DE FOTOS
// -------------------------------------------------------------
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/products/categories`);
    if (res.ok) {
      adminCategories = await res.json();
      const select = document.getElementById('prodCategory');
      if (select) {
        select.innerHTML = adminCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadAdminProducts() {
  try {
    const res = await fetch(`${API_BASE}/products?active_only=false`);
    if (!res.ok) return;
    adminProducts = await res.json();
    renderAdminProductsTable();
  } catch (err) {
    console.error(err);
  }
}

function renderAdminProductsTable() {
  const tbody = document.getElementById('adminProductsTableBody');
  if (!tbody) return;

  if (adminProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">No hay productos registrados en el catálogo. Usa el botón "Nuevo Producto".</td></tr>`;
    return;
  }

  tbody.innerHTML = adminProducts.map(p => `
    <tr class="hover:bg-slate-50 transition">
      <td class="p-4">
        <div class="flex items-center gap-3">
          <img src="${p.image_url || 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=100&q=80'}" class="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200">
          <div>
            <div class="font-bold text-brand-navy">${p.name}</div>
            <div class="text-[11px] text-slate-400">Unidad: ${p.unit}</div>
          </div>
        </div>
      </td>
      <td class="p-4 text-xs font-semibold text-slate-600">${p.category ? p.category.name : 'N/A'}</td>
      <td class="p-4 font-black text-brand-navy">${formatCOP(p.price)}</td>
      <td class="p-4">
        <span class="font-extrabold ${p.stock <= p.min_stock_alert ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg' : 'text-slate-800'}">
          ${p.stock} ${p.unit}
        </span>
      </td>
      <td class="p-4">
        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${p.is_active ? 'bg-brand-cream text-brand-navy border border-brand-gold/40' : 'bg-slate-200 text-slate-600'}">
          ${p.is_active ? 'Activo en Tienda' : 'Oculto'}
        </span>
      </td>
      <td class="p-4 text-right space-x-2">
        <button onclick="editProduct(${p.id})" class="text-brand-navy hover:text-brand-gold p-1.5 rounded-lg hover:bg-brand-cream transition" title="Editar Producto y Foto">
          <i data-lucide="edit-3" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteProduct(${p.id})" class="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition" title="Eliminar / Retirar">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `).join('');

  lucide.createIcons();
}

async function handleImageFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusLabel = document.getElementById('uploadStatusText');
  statusLabel.textContent = 'Subiendo fotografía al servidor...';
  statusLabel.className = 'text-[11px] text-brand-gold font-bold block mt-1';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE}/products/upload-image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Error al subir fotografía');
      statusLabel.textContent = 'Error al subir la imagen.';
      statusLabel.className = 'text-[11px] text-red-500 font-bold block mt-1';
      return;
    }

    document.getElementById('prodImageUrl').value = data.image_url;
    const preview = document.getElementById('prodImagePreview');
    const placeholder = document.getElementById('prodImagePlaceholder');
    preview.src = data.image_url;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');

    statusLabel.textContent = '✓ Imagen cargada exitosamente.';
    statusLabel.className = 'text-[11px] text-brand-navy font-bold block mt-1';
  } catch (err) {
    alert('Error al conectar.');
  }
}

function openProductModal(prod = null) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productForm');

  form.reset();
  document.getElementById('prodEditId').value = '';
  document.getElementById('prodImageFile').value = '';
  document.getElementById('uploadStatusText').textContent = 'Sube una foto real desde tu PC, teléfono o tablet (JPG, PNG, WEBP).';
  document.getElementById('uploadStatusText').className = 'text-[11px] text-slate-400 block mt-1';

  const preview = document.getElementById('prodImagePreview');
  const placeholder = document.getElementById('prodImagePlaceholder');

  if (prod) {
    title.textContent = 'Editar Producto y Fotografía';
    document.getElementById('prodEditId').value = prod.id;
    document.getElementById('prodName').value = prod.name;
    document.getElementById('prodCategory').value = prod.category_id || '';
    document.getElementById('prodUnit').value = prod.unit;
    document.getElementById('prodPrice').value = prod.price;
    document.getElementById('prodStock').value = prod.stock;
    document.getElementById('prodImageUrl').value = prod.image_url || '';
    document.getElementById('prodDescription').value = prod.description || '';
    document.getElementById('prodIsActive').checked = prod.is_active;
    document.getElementById('prodIsFeatured').checked = prod.is_featured;

    if (prod.image_url) {
      preview.src = prod.image_url;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    } else {
      preview.classList.add('hidden');
      placeholder.classList.remove('hidden');
    }
  } else {
    title.textContent = 'Nuevo Producto';
    document.getElementById('prodImageUrl').value = '';
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }

  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

function editProduct(id) {
  const prod = adminProducts.find(p => p.id === id);
  if (prod) openProductModal(prod);
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('prodEditId').value;
  const payload = {
    name: document.getElementById('prodName').value.trim(),
    category_id: parseInt(document.getElementById('prodCategory').value) || null,
    unit: document.getElementById('prodUnit').value,
    price: parseFloat(document.getElementById('prodPrice').value),
    stock: parseFloat(document.getElementById('prodStock').value),
    image_url: document.getElementById('prodImageUrl').value.trim() || null,
    description: document.getElementById('prodDescription').value.trim(),
    is_active: document.getElementById('prodIsActive').checked,
    is_featured: document.getElementById('prodIsFeatured').checked
  };

  const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || 'Error al guardar');
      return;
    }

    closeProductModal();
    loadAdminProducts();
  } catch (err) {
    alert('Error al conectar con la base de datos');
  }
}

async function deleteProduct(id) {
  if (!confirm('¿Desea retirar este producto del catálogo comercial?')) return;
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    alert(data.detail);
    loadAdminProducts();
  } catch (err) {
    alert('Error al procesar la acción');
  }
}

// -------------------------------------------------------------
// INVENTARIO & KARDEX
// -------------------------------------------------------------
async function loadInventoryKardex() {
  try {
    const resStatus = await fetch(`${API_BASE}/inventory/status`, { headers: authHeaders() });
    if (resStatus.ok) {
      const statusData = await resStatus.json();
      document.getElementById('invValuation').textContent = formatCOP(statusData.total_valuation);
      document.getElementById('invLowCount').textContent = statusData.low_stock_count;
    }

    const resMov = await fetch(`${API_BASE}/inventory/movements?limit=100`, { headers: authHeaders() });
    if (resMov.ok) {
      const movs = await resMov.json();
      const tbody = document.getElementById('inventoryMovementsBody');
      if (movs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No hay movimientos registrados en el Kardex.</td></tr>`;
        return;
      }

      tbody.innerHTML = movs.map(m => `
        <tr class="hover:bg-slate-50 transition text-xs">
          <td class="p-4 text-slate-500">${new Date(m.created_at).toLocaleString('es-CO')}</td>
          <td class="p-4 font-bold text-brand-navy">${m.product_name || 'Producto #' + m.product_id}</td>
          <td class="p-4">
            <span class="px-2 py-0.5 rounded-full font-bold ${
              m.movement_type === 'Entrada' ? 'bg-green-100 text-green-800' :
              m.movement_type.includes('Venta') ? 'bg-blue-100 text-blue-800' :
              m.movement_type.includes('Pérdida') ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
            }">
              ${m.movement_type}
            </span>
          </td>
          <td class="p-4 font-bold">${m.quantity}</td>
          <td class="p-4 text-slate-500">${m.previous_stock}</td>
          <td class="p-4 font-black text-brand-navy">${m.new_stock}</td>
          <td class="p-4 text-slate-500">${m.notes || '-'}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

function openInventoryMovementModal() {
  const select = document.getElementById('movProductId');
  select.innerHTML = adminProducts.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock} ${p.unit})</option>`).join('');
  document.getElementById('invMovementModal').classList.remove('hidden');
}

function closeInventoryMovementModal() {
  document.getElementById('invMovementModal').classList.add('hidden');
}

async function saveInventoryMovement(e) {
  e.preventDefault();
  const payload = {
    product_id: parseInt(document.getElementById('movProductId').value),
    movement_type: document.getElementById('movType').value,
    quantity: parseFloat(document.getElementById('movQuantity').value),
    notes: document.getElementById('movNotes').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/inventory/movements`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || 'Error al registrar movimiento');
      return;
    }

    closeInventoryMovementModal();
    loadInventoryKardex();
    loadAdminProducts();
  } catch (err) {
    alert('Error de conexión');
  }
}

// -------------------------------------------------------------
// PEDIDOS
// -------------------------------------------------------------
let adminOrdersList = [];

async function loadAdminOrders() {
  const filter = document.getElementById('orderStatusFilter').value;
  const url = filter ? `${API_BASE}/orders?status_filter=${encodeURIComponent(filter)}` : `${API_BASE}/orders`;

  try {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return;
    adminOrdersList = await res.json();
    renderAdminOrdersTable();
  } catch (err) {
    console.error(err);
  }
}

function renderAdminOrdersTable() {
  const tbody = document.getElementById('adminOrdersTableBody');
  if (!tbody) return;

  if (adminOrdersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No hay pedidos registrados en este estado.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminOrdersList.map(o => `
    <tr class="hover:bg-slate-50 transition">
      <td class="p-4 font-black text-brand-navy text-xs">${o.order_code}</td>
      <td class="p-4">
        <div class="font-bold text-slate-900">${o.customer_name}</div>
        <div class="text-[11px] text-slate-400">${o.customer_phone}</div>
      </td>
      <td class="p-4 text-xs text-slate-600">
        <div>${o.shipping_address}</div>
        <div class="text-[10px] text-slate-400">${o.shipping_neighborhood}, ${o.shipping_city}</div>
      </td>
      <td class="p-4 font-black text-slate-900">${formatCOP(o.total)}</td>
      <td class="p-4">
        <div class="text-xs font-semibold">${o.payment_method}</div>
        <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${o.is_paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
          ${o.is_paid ? 'Pagado' : 'Pendiente Pago'}
        </span>
      </td>
      <td class="p-4">
        <select onchange="updateOrderStatus(${o.id}, this.value)" class="text-xs font-bold rounded-lg border border-slate-200 p-1.5 bg-white">
          ${['Pendiente', 'Confirmado', 'En preparación', 'Listo', 'En camino', 'Entregado', 'Cancelado'].map(st => `
            <option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>
          `).join('')}
        </select>
      </td>
      <td class="p-4 text-right">
        <button onclick="viewOrderDetail(${o.id})" class="text-brand-navy hover:text-brand-gold font-bold text-xs p-1">
          Ver Detalle
        </button>
      </td>
    </tr>
  `).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const isPaid = (newStatus === 'Entregado') ? true : undefined;
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus, is_paid: isPaid })
    });
    if (!res.ok) {
      alert('Error al actualizar estado del pedido');
      return;
    }
    loadAdminOrders();
  } catch (err) {
    alert('Error de conexión');
  }
}

function viewOrderDetail(orderId) {
  const o = adminOrdersList.find(ord => ord.id === orderId);
  if (!o) return;

  document.getElementById('adminDetailOrderCode').textContent = `Pedido #${o.order_code}`;
  const container = document.getElementById('adminDetailOrderContent');

  container.innerHTML = `
    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
      <div><b>Cliente:</b> ${o.customer_name} (${o.customer_phone})</div>
      <div><b>Dirección:</b> ${o.shipping_address}, ${o.shipping_neighborhood}, ${o.shipping_city}</div>
      <div><b>Método de Pago:</b> ${o.payment_method} - ${o.is_paid ? 'PAGADO' : 'PENDIENTE'}</div>
      <div><b>Observaciones:</b> ${o.notes || 'Ninguna'}</div>
    </div>

    <div>
      <h5 class="font-extrabold text-slate-800 mb-2">Productos Solicitados:</h5>
      <ul class="divide-y divide-slate-100 text-xs">
        ${o.items.map(it => `
          <li class="py-2 flex justify-between">
            <span>${it.product_name} x ${it.quantity} ${it.unit}</span>
            <span class="font-bold">${formatCOP(it.subtotal)}</span>
          </li>
        `).join('')}
      </ul>
    </div>

    <div class="pt-3 border-t border-slate-200 text-xs space-y-1">
      <div class="flex justify-between"><span>Subtotal:</span><span>${formatCOP(o.subtotal)}</span></div>
      <div class="flex justify-between"><span>Domicilio:</span><span>${formatCOP(o.delivery_fee)}</span></div>
      <div class="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
        <span>Total:</span><span class="text-brand-navy">${formatCOP(o.total)}</span>
      </div>
    </div>
  `;

  document.getElementById('adminOrderDetailModal').classList.remove('hidden');
}

function closeAdminOrderDetailModal() {
  document.getElementById('adminOrderDetailModal').classList.add('hidden');
}

// -------------------------------------------------------------
// CALCULADORA INTELIGENTE
// -------------------------------------------------------------
let currentCalcMode = 'crianza';
let lastBreedingResult = null;
let lastCommercialResult = null;

function switchCalcMode(mode) {
  currentCalcMode = mode;
  const isCrianza = mode === 'crianza';

  document.getElementById('calcViewCrianza').classList.toggle('hidden', !isCrianza);
  document.getElementById('calcViewComercial').classList.toggle('hidden', isCrianza);

  document.getElementById('calcModeBtnCrianza').className = isCrianza
    ? 'px-5 py-2.5 rounded-xl font-bold text-xs transition bg-brand-gold text-brand-navyDark shadow'
    : 'px-5 py-2.5 rounded-xl font-bold text-xs transition text-slate-300 hover:text-white';
  document.getElementById('calcModeBtnComercial').className = !isCrianza
    ? 'px-5 py-2.5 rounded-xl font-bold text-xs transition bg-brand-gold text-brand-navyDark shadow'
    : 'px-5 py-2.5 rounded-xl font-bold text-xs transition text-slate-300 hover:text-white';
}

async function runBreedingCalcLive() {
  const payload = {
    chickens_count: parseInt(document.getElementById('brChickens').value) || 1,
    initial_price_per_chicken: parseFloat(document.getElementById('brPricePerBird').value) || 0,
    initial_weight_kg: 0.04,
    feed_consumed_kg: parseFloat(document.getElementById('brFeedKg').value) || 0,
    feed_price_per_kg: parseFloat(document.getElementById('brFeedPriceKg').value) || 0,
    medications_cost: parseFloat(document.getElementById('brMeds').value) || 0,
    vitamins_cost: parseFloat(document.getElementById('brVitamins').value) || 0,
    vaccines_cost: parseFloat(document.getElementById('brVaccines').value) || 0,
    labor_cost: parseFloat(document.getElementById('brLabor').value) || 0,
    utilities_cost: 0,
    transport_cost: 0,
    mortality_rate_percent: parseFloat(document.getElementById('brMortality').value) || 0,
    other_expenses: 0,
    target_margin_percent: parseFloat(document.getElementById('brTargetMargin').value) || 25,
    final_avg_weight_kg: parseFloat(document.getElementById('brFinalWeight').value) || 2.4
  };

  try {
    const res = await fetch(`${API_BASE}/calculator/breeding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const r = await res.json();
      lastBreedingResult = r;

      document.getElementById('resBrTotalInvest').textContent = formatCOP(r.total_investment);
      document.getElementById('resBrSurviving').textContent = `${r.chickens_surviving} aves (-${r.mortality_count} mortalidad)`;
      document.getElementById('resBrCostPerChicken').textContent = formatCOP(r.cost_per_surviving_chicken);
      document.getElementById('resBrCostKg').textContent = formatCOP(r.cost_per_kg) + ' / Kg';
      document.getElementById('resBrCostLb').textContent = formatCOP(r.cost_per_lb) + ' / Lb';

      document.getElementById('resBrRecChicken').textContent = formatCOP(r.recommended_price_per_chicken);
      document.getElementById('resBrRecKg').textContent = formatCOP(r.recommended_price_per_kg) + ' / Kg';
      document.getElementById('resBrRecLb').textContent = formatCOP(r.recommended_price_per_lb) + ' / Lb';
      document.getElementById('resBrProfit').textContent = `${formatCOP(r.estimated_profit)} (${r.profit_margin_percent}%)`;
    }
  } catch (err) {
    console.error(err);
  }
}

async function runCommercialCalcLive() {
  const marginRadio = document.querySelector('input[name="comMarginType"]:checked');
  const payload = {
    chickens_bought: parseInt(document.getElementById('comChickens').value) || 1,
    purchase_price_per_unit: parseFloat(document.getElementById('comPricePerUnit').value) || 0,
    avg_weight_kg: parseFloat(document.getElementById('comAvgWeight').value) || 2.3,
    transport_cost: parseFloat(document.getElementById('comTransport').value) || 0,
    processing_cost: parseFloat(document.getElementById('comProcessing').value) || 0,
    packaging_cost: parseFloat(document.getElementById('comPackaging').value) || 0,
    labor_cost: 0,
    other_expenses: 0,
    margin_type: marginRadio ? marginRadio.value : 'margin_on_sale',
    desired_margin_percent: parseFloat(document.getElementById('comDesiredMargin').value) || 25
  };

  try {
    const res = await fetch(`${API_BASE}/calculator/commercial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const r = await res.json();
      lastCommercialResult = r;

      document.getElementById('resComTotalCost').textContent = formatCOP(r.total_cost);
      document.getElementById('resComCostUnit').textContent = formatCOP(r.cost_per_chicken);
      document.getElementById('resComCostKg').textContent = formatCOP(r.cost_per_kg) + ' / Kg';
      document.getElementById('resComRecChicken').textContent = formatCOP(r.recommended_price_per_chicken);
      document.getElementById('resComRecKg').textContent = formatCOP(r.recommended_price_per_kg) + ' / Kg';
      document.getElementById('resComTotalProfit').textContent = `${formatCOP(r.total_profit)} (${r.profit_margin_percent}%)`;
    }
  } catch (err) {
    console.error(err);
  }
}

function resetBreedingForm() {
  document.getElementById('brChickens').value = '1000';
  document.getElementById('brPricePerBird').value = '3200';
  document.getElementById('brMortality').value = '4.0';
  document.getElementById('brFeedKg').value = '4800';
  document.getElementById('brFeedPriceKg').value = '2300';
  document.getElementById('brFinalWeight').value = '2.4';
  runBreedingCalcLive();
}

function resetCommercialForm() {
  document.getElementById('comChickens').value = '500';
  document.getElementById('comPricePerUnit').value = '16500';
  document.getElementById('comAvgWeight').value = '2.3';
  runCommercialCalcLive();
}

async function saveCalculationPrompt(mode) {
  const title = prompt('Ingresa un título para guardar este análisis de costos:', `Cálculo ${mode === 'crianza' ? 'Granja Lote' : 'Comercial'} - ${new Date().toLocaleDateString('es-CO')}`);
  if (!title) return;

  const results = mode === 'crianza' ? lastBreedingResult : lastCommercialResult;
  const payload = { title, mode, inputs: {}, results };

  try {
    const res = await fetch(`${API_BASE}/calculator/save`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('¡Cálculo guardado con éxito!');
      loadSavedCalculations();
    }
  } catch (err) {
    alert('Error al guardar cálculo');
  }
}

async function loadSavedCalculations() {
  try {
    const res = await fetch(`${API_BASE}/calculator/saved`, { headers: authHeaders() });
    if (!res.ok) return;
    const list = await res.json();
    const container = document.getElementById('savedCalculationsList');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = '<div class="text-xs text-slate-400 py-3">No hay cálculos guardados aún.</div>';
      return;
    }

    container.innerHTML = list.map(c => {
      const results = JSON.parse(c.results_json || '{}');
      return `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <div class="font-extrabold text-sm text-brand-navy">${c.title}</div>
            <div class="text-xs text-slate-400">Modalidad: <span class="capitalize font-bold text-brand-gold">${c.mode}</span> | Fecha: ${new Date(c.created_at).toLocaleDateString('es-CO')}</div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-black text-brand-navy">Rec. Kg: ${formatCOP(results.recommended_price_per_kg)}</span>
            <button onclick="deleteSavedCalc(${c.id})" class="text-red-500 hover:text-red-700 p-1" title="Eliminar">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  } catch (err) {
    console.error(err);
  }
}

async function deleteSavedCalc(id) {
  if (!confirm('¿Desea eliminar este cálculo archivado?')) return;
  try {
    await fetch(`${API_BASE}/calculator/saved/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadSavedCalculations();
  } catch (err) {
    alert('Error al eliminar');
  }
}

// -------------------------------------------------------------
// CLIENTES CRM
// -------------------------------------------------------------
async function loadAdminCustomers() {
  try {
    const res = await fetch(`${API_BASE}/admin/customers`, { headers: authHeaders() });
    if (!res.ok) return;
    const customers = await res.json();
    const tbody = document.getElementById('adminCustomersTableBody');
    if (!tbody) return;

    if (customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">No hay clientes registrados aún.</td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(c => `
      <tr class="hover:bg-slate-50 transition text-xs">
        <td class="p-4 font-bold text-brand-navy">${c.full_name}</td>
        <td class="p-4 text-slate-600">${c.email}</td>
        <td class="p-4 text-slate-600">${c.phone || 'N/A'}</td>
        <td class="p-4 text-slate-600">${c.address || 'N/A'}</td>
        <td class="p-4 text-slate-600">${c.neighborhood || ''} ${c.city || ''}</td>
        <td class="p-4 text-slate-400">${new Date(c.created_at).toLocaleDateString('es-CO')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// -------------------------------------------------------------
// FINANZAS
// -------------------------------------------------------------
async function loadAdminFinances() {
  try {
    const res = await fetch(`${API_BASE}/admin/finances`, { headers: authHeaders() });
    if (!res.ok) return;
    const finances = await res.json();
    const tbody = document.getElementById('adminFinancesTableBody');
    if (!tbody) return;

    if (finances.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No hay registros financieros.</td></tr>`;
      return;
    }

    tbody.innerHTML = finances.map(f => `
      <tr class="hover:bg-slate-50 transition text-xs">
        <td class="p-4 text-slate-400">${new Date(f.created_at).toLocaleDateString('es-CO')}</td>
        <td class="p-4">
          <span class="px-2 py-0.5 rounded-full font-bold ${f.type === 'Ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${f.type}
          </span>
        </td>
        <td class="p-4 font-semibold text-slate-700">${f.category}</td>
        <td class="p-4 text-slate-600">${f.description || '-'}</td>
        <td class="p-4 text-right font-black ${f.type === 'Ingreso' ? 'text-green-700' : 'text-slate-900'}">
          ${formatCOP(f.amount)}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function openFinanceModal() {
  document.getElementById('financeModal').classList.remove('hidden');
}

function closeFinanceModal() {
  document.getElementById('financeModal').classList.add('hidden');
}

async function saveFinanceRecord(e) {
  e.preventDefault();
  const payload = {
    type: document.getElementById('finType').value,
    category: document.getElementById('finCategory').value.trim(),
    amount: parseFloat(document.getElementById('finAmount').value),
    description: document.getElementById('finDesc').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/admin/finances`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeFinanceModal();
      document.getElementById('financeForm').reset();
      loadAdminFinances();
      loadPoultryControl();
      loadDashboardStats();
    }
  } catch (err) {
    alert('Error al registrar');
  }
}

// -------------------------------------------------------------
// PROVEEDORES
// -------------------------------------------------------------
async function loadAdminSuppliers() {
  try {
    const res = await fetch(`${API_BASE}/admin/suppliers`, { headers: authHeaders() });
    if (!res.ok) return;
    const suppliers = await res.json();
    const container = document.getElementById('suppliersCardsContainer');
    if (!container) return;

    if (suppliers.length === 0) {
      container.innerHTML = '<div class="text-sm text-slate-400 p-6 col-span-3 text-center">No hay proveedores registrados aún. Usa el botón "+ Nuevo Proveedor".</div>';
      return;
    }

    container.innerHTML = suppliers.map(s => `
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-cream text-brand-navy flex items-center justify-center font-bold border border-brand-gold/30">
            <i data-lucide="truck" class="w-5 h-5 text-brand-gold"></i>
          </div>
          <div>
            <h4 class="font-extrabold text-brand-navy text-sm">${s.name}</h4>
            <div class="text-[11px] text-slate-400">${s.contact_name || 'Contacto comercial'}</div>
          </div>
        </div>

        <div class="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
          <div><b>Teléfono:</b> ${s.phone || 'N/A'}</div>
          <div><b>Correo:</b> ${s.email || 'N/A'}</div>
          <div><b>Insumos:</b> ${s.products_supplied || 'Insumos / Pollos'}</div>
          <div><b>Ubicación:</b> ${s.address || 'N/A'}</div>
          <div><b>Total Comprado:</b> <span class="font-black text-brand-navy">${formatCOP(s.total_purchased)}</span></div>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  } catch (err) {
    console.error(err);
  }
}

function openSupplierModal() {
  document.getElementById('supplierModal').classList.remove('hidden');
}

function closeSupplierModal() {
  document.getElementById('supplierModal').classList.add('hidden');
}

async function saveSupplier(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('supName').value.trim(),
    contact_name: document.getElementById('supContact').value.trim() || null,
    phone: document.getElementById('supPhone').value.trim() || null,
    email: document.getElementById('supEmail').value.trim() || null,
    products_supplied: document.getElementById('supProducts').value.trim() || null,
    address: document.getElementById('supAddress').value.trim() || null,
    total_purchased: 0.0
  };

  try {
    const res = await fetch(`${API_BASE}/admin/suppliers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeSupplierModal();
      document.getElementById('supplierForm').reset();
      loadAdminSuppliers();
    } else {
      alert('Error al registrar el proveedor');
    }
  } catch (err) {
    alert('Error al conectar con la base de datos Neon');
  }
}

// -------------------------------------------------------------
// SETTINGS
// -------------------------------------------------------------
async function loadAdminSettings() {
  try {
    const res = await fetch(`${API_BASE}/admin/settings`);
    if (!res.ok) return;
    const s = await res.json();

    document.getElementById('setBusinessName').value = s.business_name || '';
    document.getElementById('setTagline').value = s.tagline || '';
    document.getElementById('setPhone').value = s.phone || '';
    document.getElementById('setWhatsapp').value = s.whatsapp || '';
    document.getElementById('setEmail').value = s.email || '';
    document.getElementById('setAddress').value = s.address || '';
    document.getElementById('setCity').value = s.city || '';
  } catch (err) {
    console.error(err);
  }
}

async function saveBusinessSettings(e) {
  e.preventDefault();
  const payload = {
    business_name: document.getElementById('setBusinessName').value.trim(),
    tagline: document.getElementById('setTagline').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    whatsapp: document.getElementById('setWhatsapp').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    address: document.getElementById('setAddress').value.trim(),
    city: document.getElementById('setCity').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('¡Configuración de FRANCO\'S POLLO actualizada exitosamente!');
    }
  } catch (err) {
    alert('Error al guardar configuración');
  }
}

// -------------------------------------------------------------
// REPORTES & EXPORTACIÓN
// -------------------------------------------------------------
function exportReports(type) {
  let csvContent = "data:text/csv;charset=utf-8,";

  if (type === 'ventas') {
    csvContent += "Codigo,Cliente,Telefono,Direccion,Total_COP,Estado,Pago\n";
    adminOrdersList.forEach(o => {
      csvContent += `"${o.order_code}","${o.customer_name}","${o.customer_phone}","${o.shipping_address}",${o.total},"${o.status}","${o.payment_method}"\n`;
    });
  } else if (type === 'inventario') {
    csvContent += "ID,Producto,Unidad,Precio_COP,Stock,Alerta_Stock,Estado\n";
    adminProducts.forEach(p => {
      csvContent += `${p.id},"${p.name}","${p.unit}",${p.price},${p.stock},${p.min_stock_alert},"${p.is_active ? 'Activo' : 'Inactivo'}"\n`;
    });
  } else {
    csvContent += "ID,Tipo,Categoria,Monto_COP,Descripcion\n";
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `francos_pollo_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
