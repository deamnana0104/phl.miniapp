const STORAGE_KEY = "adminToken";

function $(id) {
  return typeof id === "string" ? document.getElementById(id) : id;
}

function getToken() {
  return localStorage.getItem(STORAGE_KEY) || "";
}
function setToken(v) {
  localStorage.setItem(STORAGE_KEY, v);
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (token) headers.set("x-admin-token", token);
  
  if (options.body && !(options.body instanceof FormData) && !headers.get("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  
  if (!res.ok) {
    if (res.status === 401) {
      logout();
      throw new Error("Phiên làm việc hết hạn hoặc không có quyền truy cập.");
    }
    throw new Error(typeof data === "object" && data && data.error ? data.error : `Lỗi hệ thống (${res.status})`);
  }
  return data;
}

function formatMoney(v) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(v || 0));
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// --- AUTH ---
function login() {
  const token = $("adminTokenInput").value.trim();
  if (!token) return alert("Vui lòng nhập token!");
  setToken(token);
  checkAuth();
}

function logout() {
  setToken("");
  location.reload();
}

async function checkAuth() {
  const token = getToken();
  if (!token) {
    $("authModal").classList.remove("hidden");
    $("adminLayout").classList.add("hidden");
    return;
  }

  try {
    // Gọi thử 1 API admin để check token
    await api("/api/admin/products");
    $("authModal").classList.add("hidden");
    $("adminLayout").classList.remove("hidden");
    initRouter();
  } catch (e) {
    setToken("");
    $("authModal").classList.remove("hidden");
    $("adminLayout").classList.add("hidden");
    alert("Token không chính xác hoặc đã hết hạn!");
  }
}

// --- ROUTING ---
function getPage() {
  return (location.hash || "#dashboard").slice(1);
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((el) => el.classList.add("hidden"));
  const el = $(`page${pageId.charAt(0).toUpperCase() + pageId.slice(1)}`);
  if (el) el.classList.remove("hidden");
  
  document.querySelectorAll(".sidebar-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === pageId);
  });

  if (pageId === "dashboard") loadDashboardStats();
  else if (pageId === "products") loadProducts();
  else if (pageId === "categories") loadCategories();
  else if (pageId === "orders") loadOrders();
  else if (pageId === "banners") loadBanners();
  else if (pageId === "stations") loadStations();
}

function initRouter() {
  window.addEventListener("hashchange", () => showPage(getPage()));
  showPage(getPage());
}

// --- DASHBOARD ---
async function loadDashboardStats() {
  const stats = ["Products", "Orders", "Categories", "Banners"];
  stats.forEach(s => $(`stat${s}`).textContent = "...");
  
  try {
    const [p, o, c, b] = await Promise.all([
      api("/api/admin/products"),
      api("/api/admin/orders"),
      api("/api/admin/categories"),
      api("/api/admin/banners"),
    ]);
    $("statProducts").textContent = p.length;
    $("statOrders").textContent = o.length;
    $("statCategories").textContent = c.length;
    $("statBanners").textContent = b.length;
  } catch (e) {
    console.error(e);
  }
}

// --- PRODUCTS ---
let categoriesCache = [];
async function loadProducts() {
  const list = $("productList");
  list.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500">Đang tải...</td></tr>';
  
  try {
    const [products, categories] = await Promise.all([
      api("/api/admin/products"),
      api("/api/admin/categories")
    ]);
    categoriesCache = categories;
    list.innerHTML = "";
    
    products.forEach(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50 transition";
      tr.innerHTML = `
        <td class="p-4 text-sm text-gray-500">#${p.id}</td>
        <td class="p-4"><img src="${p.image}" class="w-12 h-12 object-cover rounded shadow-sm"></td>
        <td class="p-4 font-medium">${escapeHtml(p.name)}</td>
        <td class="p-4 text-blue-600 font-bold">${formatMoney(p.price)}</td>
        <td class="p-4"><span class="bg-gray-100 px-2 py-1 rounded text-xs">${cat ? escapeHtml(cat.name) : 'N/A'}</span></td>
        <td class="p-4">
          <button onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="text-blue-600 hover:text-blue-800 mr-3"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteProduct(${p.id})" class="text-red-600 hover:text-red-800"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      list.appendChild(tr);
    });
  } catch (e) {
    list.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500">${e.message}</td></tr>`;
  }
}

function openProductModal(p = null) {
  const title = p ? "Chỉnh sửa Sản phẩm" : "Thêm Sản phẩm Mới";
  $("productModalTitle").textContent = title;
  $("p_id").value = p ? p.id : "";
  $("p_name").value = p ? p.name : "";
  $("p_price").value = p ? p.price : "";
  $("p_originalPrice").value = p ? (p.originalPrice || "") : "";
  $("p_image").value = p ? p.image : "";
  $("p_detail").value = p ? (p.detail || "") : "";
  
  const catSelect = $("p_categoryId");
  catSelect.innerHTML = categoriesCache.map(c => `<option value="${c.id}" ${p && p.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join("");
  
  updateImagePreview("p_image", "p_image_preview");
  $("productModal").classList.remove("hidden");
}

function closeProductModal() {
  $("productModal").classList.add("hidden");
  $("productForm").reset();
}

$("productForm").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("p_id").value;
  const data = {
    name: $("p_name").value,
    price: Number($("p_price").value),
    originalPrice: Number($("p_originalPrice").value) || undefined,
    categoryId: Number($("p_categoryId").value),
    image: $("p_image").value,
    detail: $("p_detail").value,
  };

  try {
    if (id) {
      await api(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await api("/api/admin/products", { method: "POST", body: JSON.stringify(data) });
    }
    closeProductModal();
    loadProducts();
  } catch (e) {
    alert(e.message);
  }
};

async function deleteProduct(id) {
  if (!confirm("Bạn có chắc muốn xoá sản phẩm này?")) return;
  try {
    await api(`/api/admin/products/${id}`, { method: "DELETE" });
    loadProducts();
  } catch (e) {
    alert(e.message);
  }
}

// --- CATEGORIES ---
async function loadCategories() {
  const list = $("categoryList");
  list.innerHTML = "";
  try {
    const categories = await api("/api/admin/categories");
    categoriesCache = categories;
    categories.forEach(c => {
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50 transition";
      tr.innerHTML = `
        <td class="p-4 text-sm text-gray-500">#${c.id}</td>
        <td class="p-4"><img src="${c.image}" class="w-10 h-10 object-cover rounded-full border"></td>
        <td class="p-4 font-medium">${escapeHtml(c.name)}</td>
        <td class="p-4">
          <button onclick='openCategoryModal(${JSON.stringify(c).replace(/'/g, "&apos;")})' class="text-blue-600 hover:text-blue-800 mr-3"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteCategory(${c.id})" class="text-red-600 hover:text-red-800"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      list.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

function openCategoryModal(c = null) {
  $("categoryModalTitle").textContent = c ? "Chỉnh sửa Danh mục" : "Thêm Danh mục";
  $("c_id").value = c ? c.id : "";
  $("c_name").value = c ? c.name : "";
  $("c_image").value = c ? c.image : "";
  $("categoryModal").classList.remove("hidden");
}

function closeCategoryModal() {
  $("categoryModal").classList.add("hidden");
  $("categoryForm").reset();
}

$("categoryForm").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("c_id").value;
  const data = {
    name: $("c_name").value,
    image: $("c_image").value,
  };
  try {
    if (id) {
      await api(`/api/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await api("/api/admin/categories", { method: "POST", body: JSON.stringify(data) });
    }
    closeCategoryModal();
    loadCategories();
  } catch (e) {
    alert(e.message);
  }
};

async function deleteCategory(id) {
  if (!confirm("Xoá danh mục sẽ ảnh hưởng đến hiển thị sản phẩm. Tiếp tục?")) return;
  try {
    await api(`/api/admin/categories/${id}`, { method: "DELETE" });
    loadCategories();
  } catch (e) {
    alert(e.message);
  }
}

// --- ORDERS ---
let ordersCache = [];

async function loadOrders() {
  const list = $("orderList");
  list.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500">Đang tải...</td></tr>';
  try {
    const orders = await api("/api/admin/orders");
    ordersCache = orders;
    list.innerHTML = "";
    orders.forEach(o => {
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50 transition text-sm";
      const statusColor = o.status === 'completed' ? 'text-green-600' : (o.status === 'shipping' ? 'text-blue-600' : 'text-orange-600');
      
      // Dropdown để đổi trạng thái nhanh
      const statusSelect = `
        <select onchange="updateOrderStatus(${o.id}, this.value)" class="border rounded px-2 py-1 text-xs font-medium ${statusColor} outline-none focus:ring-1 focus:ring-blue-500">
          <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
          <option value="shipping" ${o.status === 'shipping' ? 'selected' : ''}>Đang giao</option>
          <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Hoàn thành</option>
        </select>
      `;

      tr.innerHTML = `
        <td class="p-4">#${o.id}</td>
        <td class="p-4 font-mono text-xs">${o.zaloUserId}</td>
        <td class="p-4 text-gray-500">${new Date(o.createdAt).toLocaleString('vi-VN')}</td>
        <td class="p-4 font-bold text-blue-600">${formatMoney(o.total)}</td>
        <td class="p-4">${statusSelect}</td>
        <td class="p-4">
           <span class="px-2 py-1 rounded text-xs ${o.paymentStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
            ${o.paymentStatus}
           </span>
        </td>
        <td class="p-4">
          <button onclick="viewOrder(${o.id})" class="text-blue-600 hover:underline flex items-center gap-1"><i class="fa-solid fa-eye"></i> Chi tiết</button>
        </td>
      `;
      list.appendChild(tr);
    });
  } catch (e) {
    list.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-500">${e.message}</td></tr>`;
  }
}

async function updateOrderStatus(id, newStatus) {
  try {
    await api(`/api/admin/orders/${id}`, { 
      method: "PUT", 
      body: JSON.stringify({ status: newStatus }) 
    });
    // Không cần reload toàn bộ list, chỉ cần cập nhật màu sắc (đã xử lý qua reload cho chắc chắn)
    loadOrders();
  } catch (e) {
    alert("Lỗi cập nhật trạng thái: " + e.message);
    loadOrders(); // Revert UI
  }
}

function viewOrder(id) {
  const order = ordersCache.find(o => o.id === id);
  if (!order) return;

  $("o_id").textContent = `#${order.id}`;
  
  const itemsHtml = (order.items || []).map(item => `
    <div class="flex items-center gap-4 border-b pb-4">
      <img src="${item.product?.image || ''}" class="w-16 h-16 object-cover rounded border">
      <div class="flex-1">
        <p class="font-medium">${escapeHtml(item.product?.name || 'Sản phẩm không xác định')}</p>
        <p class="text-sm text-gray-500">Đơn giá: ${formatMoney(item.product?.price)}</p>
      </div>
      <div class="text-right">
        <p class="text-sm text-gray-500">x${item.quantity}</p>
        <p class="font-bold text-blue-600">${formatMoney((item.product?.price || 0) * item.quantity)}</p>
      </div>
    </div>
  `).join('');

  const delivery = order.delivery || {};
  const addressHtml = `
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="font-bold mb-2 border-b pb-2">Thông tin giao hàng</h3>
      <p class="text-sm mb-1"><span class="text-gray-500">Người nhận:</span> ${escapeHtml(delivery.name || 'N/A')}</p>
      <p class="text-sm mb-1"><span class="text-gray-500">SĐT:</span> ${escapeHtml(delivery.phone || 'N/A')}</p>
      <p class="text-sm mb-1"><span class="text-gray-500">Địa chỉ:</span> ${escapeHtml(delivery.address || 'N/A')}</p>
      <p class="text-sm"><span class="text-gray-500">Ghi chú:</span> ${escapeHtml(order.note || 'Không có')}</p>
    </div>
  `;

  const summaryHtml = `
    <div class="bg-blue-50 p-4 rounded-lg mt-4">
      <div class="flex justify-between mb-2 text-sm">
        <span class="text-gray-600">Trạng thái thanh toán:</span>
        <span class="font-medium uppercase ${order.paymentStatus === 'success' ? 'text-green-600' : 'text-gray-600'}">${order.paymentStatus}</span>
      </div>
      <div class="flex justify-between mb-2 text-sm">
        <span class="text-gray-600">Trạng thái đơn hàng:</span>
        <span class="font-medium uppercase">${order.status}</span>
      </div>
      <div class="flex justify-between font-bold text-lg border-t pt-2 mt-2">
        <span>Tổng cộng:</span>
        <span class="text-blue-600">${formatMoney(order.total)}</span>
      </div>
    </div>
  `;

  $("orderModalContent").innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 class="font-bold mb-4">Sản phẩm đã đặt</h3>
        <div class="space-y-4 max-h-64 overflow-y-auto pr-2">
          ${itemsHtml || '<p class="text-gray-500 text-sm">Không có sản phẩm</p>'}
        </div>
      </div>
      <div>
        ${addressHtml}
        ${summaryHtml}
      </div>
    </div>
  `;

  $("orderModal").classList.remove("hidden");
}

function closeOrderModal() {
  $("orderModal").classList.add("hidden");
}

// --- BANNERS ---
async function loadBanners() {
  const grid = $("bannerGrid");
  grid.innerHTML = "";
  try {
    const banners = await api("/api/admin/banners");
    banners.forEach(b => {
      const div = document.createElement("div");
      div.className = "bg-white rounded-xl shadow-sm border overflow-hidden group relative";
      div.innerHTML = `
        <img src="${b.image}" class="w-full h-40 object-cover">
        <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
          <button onclick='openBannerModal(${JSON.stringify(b).replace(/'/g, "&apos;")})' class="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 shadow-lg"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteBanner(${b.id})" class="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 shadow-lg"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      grid.appendChild(div);
    });
  } catch (e) {
    console.error(e);
  }
}

function openBannerModal(b = null) {
  $("bannerModalTitle").textContent = b ? "Chỉnh sửa Banner" : "Thêm Banner Mới";
  $("b_id").value = b ? b.id : "";
  $("b_image").value = b ? b.image : "";
  $("bannerModal").classList.remove("hidden");
}

function closeBannerModal() {
  $("bannerModal").classList.add("hidden");
  $("bannerForm").reset();
}

$("bannerForm").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("b_id").value;
  const data = { image: $("b_image").value };
  try {
    if (id) {
      await api(`/api/admin/banners/${id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await api("/api/admin/banners", { method: "POST", body: JSON.stringify(data) });
    }
    closeBannerModal();
    loadBanners();
  } catch (e) {
    alert(e.message);
  }
};

async function deleteBanner(id) {
  if (!confirm("Xoá banner này?")) return;
  try {
    await api(`/api/admin/banners/${id}`, { method: "DELETE" });
    loadBanners();
  } catch (e) {
    alert(e.message);
  }
}

// --- STATIONS ---
async function loadStations() {
  const list = $("stationList");
  list.innerHTML = "";
  try {
    const stations = await api("/api/admin/stations");
    stations.forEach(s => {
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50 transition";
      tr.innerHTML = `
        <td class="p-4 text-sm text-gray-500">#${s.id}</td>
        <td class="p-4"><img src="${s.image || ''}" class="w-12 h-12 object-cover rounded shadow-sm"></td>
        <td class="p-4 font-medium">${escapeHtml(s.name)}</td>
        <td class="p-4 text-sm text-gray-500">${escapeHtml(s.address)}</td>
        <td class="p-4">
          <button onclick='openStationModal(${JSON.stringify(s).replace(/'/g, "&apos;")})' class="text-blue-600 hover:text-blue-800 mr-3"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteStation(${s.id})" class="text-red-600 hover:text-red-800"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      list.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

function openStationModal(s = null) {
  $("stationModalTitle").textContent = s ? "Chỉnh sửa Điểm nhận" : "Thêm Điểm nhận Mới";
  $("s_id").value = s ? s.id : "";
  $("s_name").value = s ? s.name : "";
  $("s_address").value = s ? s.address : "";
  $("s_image").value = s ? s.image : "";
  $("stationModal").classList.remove("hidden");
}

function closeStationModal() {
  $("stationModal").classList.add("hidden");
  $("stationForm").reset();
}

$("stationForm").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("s_id").value;
  const data = {
    name: $("s_name").value,
    address: $("s_address").value,
    image: $("s_image").value,
  };
  try {
    if (id) {
      await api(`/api/admin/stations/${id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await api("/api/admin/stations", { method: "POST", body: JSON.stringify(data) });
    }
    closeStationModal();
    loadStations();
  } catch (e) {
    alert(e.message);
  }
};

async function deleteStation(id) {
  if (!confirm("Xoá điểm nhận hàng này?")) return;
  try {
    await api(`/api/admin/stations/${id}`, { method: "DELETE" });
    loadStations();
  } catch (e) {
    alert(e.message);
  }
}

// --- UTILS ---
async function handleFileUpload(input, targetInputId) {
  const file = input.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append("file", file);
  
  try {
    const res = await api("/api/admin/upload", {
      method: "POST",
      body: formData
    });
    $(targetInputId).value = res.url;
    updateImagePreview(targetInputId, targetInputId + "_preview");
  } catch (e) {
    alert("Tải ảnh thất bại: " + e.message);
  }
}

function updateImagePreview(inputId, previewId) {
  const url = $(inputId).value;
  const preview = $(previewId);
  if (url && preview) {
    preview.innerHTML = `<img src="${url}" class="w-full h-full object-cover">`;
  }
}

// Init
checkAuth();
