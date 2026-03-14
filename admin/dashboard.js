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
  if (options.body && !(options.body instanceof FormData) && !headers.get("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(typeof data === "object" && data && data.error ? data.error : `HTTP ${res.status}`);
  return data;
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await api("/api/admin/upload", { method: "POST", body: fd });
  return r.url;
}

function formatMoney(v) {
  try {
    return new Intl.NumberFormat("vi-VN").format(Number(v || 0));
  } catch {
    return String(v ?? "");
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// --- Routing ---
function getPage() {
  const hash = (location.hash || "#dashboard").slice(1);
  return hash || "dashboard";
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
  else if (pageId === "banners") loadBanners();
  else if (pageId === "stations") loadStations();
  else if (pageId === "orders") loadOrders();
}

function initRouter() {
  window.addEventListener("hashchange", () => showPage(getPage()));
  showPage(getPage());
}

// --- Dashboard stats ---
async function loadDashboardStats() {
  const els = { products: $("statProducts"), categories: $("statCategories"), orders: $("statOrders"), banners: $("statBanners") };
  ["products", "categories", "orders", "banners"].forEach((k) => (els[k].textContent = "-"));
  try {
    const [products, categories, orders, banners] = await Promise.all([
      api("/api/admin/products"),
      api("/api/admin/categories"),
      api("/api/admin/orders"),
      api("/api/admin/banners"),
    ]);
    els.products.textContent = products.length;
    els.categories.textContent = categories.length;
    els.orders.textContent = orders.length;
    els.banners.textContent = banners.length;
  } catch (e) {
    ["products", "categories", "orders", "banners"].forEach((k) => (els[k].textContent = "Lỗi"));
  }
}

// --- Products ---
async function loadProducts() {
  const tbody = $("productsTbody");
  const empty = $("productsEmpty");
  tbody.innerHTML = "";
  empty.classList.add("hidden");
  try {
    const list = await api("/api/admin/products");
    if (!list.length) {
      empty.classList.remove("hidden");
      return;
    }
    list.forEach((p) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-slate-100";
      tr.innerHTML = `
        <td class="px-4 py-3"><img src="${escapeHtml(p.image || "")}" alt="" class="w-12 h-12 object-cover rounded-lg" onerror="this.style.display='none'"/></td>
        <td class="px-4 py-3 font-medium">${escapeHtml(p.name || "")}</td>
        <td class="px-4 py-3">${formatMoney(p.price)}</td>
        <td class="px-4 py-3">${p.categoryId ?? ""}</td>
        <td class="px-4 py-3">
          <button type="button" class="edit-btn text-amber-600 hover:underline mr-2">Sửa</button>
          <button type="button" class="del-btn text-red-600 hover:underline">Xoá</button>
        </td>
      `;
      tr.querySelector(".edit-btn").addEventListener("click", () => openProductForm(p));
      tr.querySelector(".del-btn").addEventListener("click", () => deleteProduct(p));
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-red-600">${escapeHtml(e.message)}</td></tr>`;
  }
}

function openProductForm(item = null) {
  $("formEntity").value = "products";
  $("formMode").value = item ? "edit" : "create";
  $("formId").value = item ? item.id : "";
  $("modalTitle").textContent = item ? "Sửa sản phẩm" : "Thêm sản phẩm";
  $("formBody").innerHTML = `
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Tên *</label><input type="text" name="name" value="${escapeHtml(item?.name || "")}" required class="w-full rounded-lg border border-slate-200 px-3 py-2"/></div>
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Danh mục (ID)</label><input type="number" name="categoryId" value="${item?.categoryId ?? ""}" class="w-full rounded-lg border border-slate-200 px-3 py-2"/></div>
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Giá *</label><input type="number" name="price" value="${item?.price ?? ""}" required class="w-full rounded-lg border border-slate-200 px-3 py-2"/></div>
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Giá gốc</label><input type="number" name="originalPrice" value="${item?.originalPrice ?? ""}" class="w-full rounded-lg border border-slate-200 px-3 py-2"/></div>
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Ảnh</label>
      <div class="flex gap-2">
        <input type="text" name="image" value="${escapeHtml(item?.image || "")}" placeholder="URL hoặc upload" class="flex-1 rounded-lg border border-slate-200 px-3 py-2"/>
        <label class="btn-upload cursor-pointer rounded-lg bg-amber-500 text-slate-900 px-3 py-2 text-sm font-medium flex items-center">Chọn ảnh<input type="file" accept="image/*" class="hidden" data-for="image"/></label>
      </div>
    </div>
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Mô tả</label><textarea name="detail" rows="3" class="w-full rounded-lg border border-slate-200 px-3 py-2">${escapeHtml(item?.detail || "")}</textarea></div>
  `;
  bindUploadInForm();
  $("modalOverlay").classList.remove("hidden");
  $("modalOverlay").classList.add("flex");
}

async function deleteProduct(p) {
  if (!confirm(`Xoá sản phẩm "${p.name}"?`)) return;
  try {
    await api(`/api/admin/products/${p.id}`, { method: "DELETE" });
    loadProducts();
  } catch (e) {
    alert(e.message);
  }
}

// --- Categories ---
async function loadCategories() {
  const tbody = $("categoriesTbody");
  const empty = $("categoriesEmpty");
  tbody.innerHTML = "";
  empty.classList.add("hidden");
  try {
    const list = await api("/api/admin/categories");
    if (!list.length) {
      empty.classList.remove("hidden");
      return;
    }
    list.forEach((c) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-slate-100";
      tr.innerHTML = `
        <td class="px-4 py-3"><img src="${escapeHtml(c.image || "")}" alt="" class="w-12 h-12 object-cover rounded-lg" onerror="this.style.display='none'"/></td>
        <td class="px-4 py-3 font-medium">${escapeHtml(c.name || "")}</td>
        <td class="px-4 py-3">
          <button type="button" class="edit-btn text-amber-600 hover:underline mr-2">Sửa</button>
          <button type="button" class="del-btn text-red-600 hover:underline">Xoá</button>
        </td>
      `;
      tr.querySelector(".edit-btn").addEventListener("click", () => openCategoryForm(c));
      tr.querySelector(".del-btn").addEventListener("click", () => deleteCategory(c));
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-6 text-red-600">${escapeHtml(e.message)}</td></tr>`;
  }
}

function openCategoryForm(item = null) {
  $("formEntity").value = "categories";
  $("formMode").value = item ? "edit" : "create";
  $("formId").value = item ? item.id : "";
  $("modalTitle").textContent = item ? "Sửa danh mục" : "Thêm danh mục";
  $("formBody").innerHTML = `
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Tên *</label><input type="text" name="name" value="${escapeHtml(item?.name || "")}" required class="w-full rounded-lg border border-slate-200 px-3 py-2"/></div>
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Ảnh</label>
      <div class="flex gap-2">
        <input type="text" name="image" value="${escapeHtml(item?.image || "")}" class="flex-1 rounded-lg border border-slate-200 px-3 py-2"/>
        <label class="btn-upload cursor-pointer rounded-lg bg-amber-500 text-slate-900 px-3 py-2 text-sm font-medium flex items-center">Chọn ảnh<input type="file" accept="image/*" class="hidden" data-for="image"/></label>
      </div>
    </div>
  `;
  bindUploadInForm();
  $("modalOverlay").classList.remove("hidden");
  $("modalOverlay").classList.add("flex");
}

async function deleteCategory(c) {
  if (!confirm(`Xoá danh mục "${c.name}"?`)) return;
  try {
    await api(`/api/admin/categories/${c.id}`, { method: "DELETE" });
    loadCategories();
  } catch (e) {
    alert(e.message);
  }
}

// --- Banners ---
async function loadBanners() {
  const tbody = $("bannersTbody");
  const empty = $("bannersEmpty");
  tbody.innerHTML = "";
  empty.classList.add("hidden");
  try {
    const list = await api("/api/admin/banners");
    if (!list.length) {
      empty.classList.remove("hidden");
      return;
    }
    list.forEach((b) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-slate-100";
      tr.innerHTML = `
        <td class="px-4 py-3"><img src="${escapeHtml(b.image || "")}" alt="" class="w-32 h-14 object-cover rounded-lg" onerror="this.style.display='none'"/></td>
        <td class="px-4 py-3">
          <button type="button" class="edit-btn text-amber-600 hover:underline mr-2">Sửa</button>
          <button type="button" class="del-btn text-red-600 hover:underline">Xoá</button>
        </td>
      `;
      tr.querySelector(".edit-btn").addEventListener("click", () => openBannerForm(b));
      tr.querySelector(".del-btn").addEventListener("click", () => deleteBanner(b));
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="2" class="px-4 py-6 text-red-600">${escapeHtml(e.message)}</td></tr>`;
  }
}

function openBannerForm(item = null) {
  $("formEntity").value = "banners";
  $("formMode").value = item ? "edit" : "create";
  $("formId").value = item ? item.id : "";
  $("modalTitle").textContent = item ? "Sửa banner" : "Thêm banner";
  $("formBody").innerHTML = `
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Ảnh *</label>
      <div class="flex gap-2">
        <input type="text" name="image" value="${escapeHtml(item?.image || "")}" required class="flex-1 rounded-lg border border-slate-200 px-3 py-2"/>
        <label class="btn-upload cursor-pointer rounded-lg bg-amber-500 text-slate-900 px-3 py-2 text-sm font-medium flex items-center">Chọn ảnh<input type="file" accept="image/*" class="hidden" data-for="image"/></label>
      </div>
    </div>
  `;
  bindUploadInForm();
  $("modalOverlay").classList.remove("hidden");
  $("modalOverlay").classList.add("flex");
}

async function deleteBanner(b) {
  if (!confirm("Xoá banner này?")) return;
  try {
    await api(`/api/admin/banners/${b.id}`, { method: "DELETE" });
    loadBanners();
  } catch (e) {
    alert(e.message);
  }
}

// --- Stations ---
async function loadStations() {
  const tbody = $("stationsTbody");
  const empty = $("stationsEmpty");
  tbody.innerHTML = "";
  empty.classList.add("hidden");
  try {
    const list = await api("/api/admin/stations");
    if (!list.length) {
      empty.classList.remove("hidden");
      return;
    }
    list.forEach((s) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-slate-100";
      const loc = s.location || {};
      tr.innerHTML = `
        <td class="px-4 py-3 font-medium">${escapeHtml(s.name || "")}</td>
        <td class="px-4 py-3">${escapeHtml(s.address || "")} ${loc.lat != null ? `(${loc.lat}, ${loc.lng})` : ""}</td>
        <td class="px-4 py-3">
          <button type="button" class="edit-btn text-amber-600 hover:underline mr-2">Sửa</button>
          <button type="button" class="del-btn text-red-600 hover:underline">Xoá</button>
        </td>
      `;
      tr.querySelector(".edit-btn").addEventListener("click", () => openStationForm(s));
      tr.querySelector(".del-btn").addEventListener("click", () => deleteStation(s));
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-6 text-red-600">${escapeHtml(e.message)}</td></tr>`;
  }
}

function openStationForm(item = null) {
  const loc = item?.location || {};
  $("formEntity").value = "stations";
  $("formMode").value = item ? "edit" : "create";
  $("formId").value = item ? item.id : "";
  $("modalTitle").textContent = item ? "Sửa điểm giao hàng" : "Thêm điểm giao hàng";
  $("formBody").innerHTML = `
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Tên *</label><input type="text" name="name" value="${escapeHtml(item?.name || "")}" required class="w-full rounded-lg border border-slate-200 px-3 py-2"/></div>
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label><input type="text" name="address" value="${escapeHtml(item?.address || "")}" class="w-full rounded-lg border border-slate-200 px-3 py-2"/></div>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="block text-sm font-medium text-slate-700 mb-1">Lat</label><input type="number" step="any" name="location.lat" value="${loc.lat ?? ""}" class="w-full rounded-lg border border-slate-200 px-3 py-2"/></div>
      <div><label class="block text-sm font-medium text-slate-700 mb-1">Lng</label><input type="number" step="any" name="location.lng" value="${loc.lng ?? ""}" class="w-full rounded-lg border border-slate-200 px-3 py-2"/></div>
    </div>
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Ảnh</label>
      <div class="flex gap-2">
        <input type="text" name="image" value="${escapeHtml(item?.image || "")}" class="flex-1 rounded-lg border border-slate-200 px-3 py-2"/>
        <label class="btn-upload cursor-pointer rounded-lg bg-amber-500 text-slate-900 px-3 py-2 text-sm font-medium flex items-center">Chọn ảnh<input type="file" accept="image/*" class="hidden" data-for="image"/></label>
      </div>
    </div>
  `;
  bindUploadInForm();
  $("modalOverlay").classList.remove("hidden");
  $("modalOverlay").classList.add("flex");
}

async function deleteStation(s) {
  if (!confirm(`Xoá điểm "${s.name}"?`)) return;
  try {
    await api(`/api/admin/stations/${s.id}`, { method: "DELETE" });
    loadStations();
  } catch (e) {
    alert(e.message);
  }
}

// --- Orders ---
async function loadOrders() {
  const tbody = $("ordersTbody");
  const empty = $("ordersEmpty");
  tbody.innerHTML = "";
  empty.classList.add("hidden");
  try {
    const list = await api("/api/admin/orders");
    if (!list.length) {
      empty.classList.remove("hidden");
      return;
    }
    list.forEach((o) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-slate-100";
      tr.innerHTML = `
        <td class="px-4 py-3">${o.id ?? ""}</td>
        <td class="px-4 py-3">${escapeHtml(o.status || "")}</td>
        <td class="px-4 py-3">${escapeHtml(o.paymentStatus || "")}</td>
        <td class="px-4 py-3">${formatMoney(o.total)}</td>
        <td class="px-4 py-3"><button type="button" class="edit-order-btn text-amber-600 hover:underline">Sửa</button></td>
      `;
      tr.querySelector(".edit-order-btn").addEventListener("click", () => openOrderForm(o));
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-red-600">${escapeHtml(e.message)}</td></tr>`;
  }
}

function openOrderForm(item) {
  $("formEntity").value = "orders";
  $("formMode").value = "edit";
  $("formId").value = item.id;
  $("modalTitle").textContent = "Cập nhật đơn hàng";
  $("formBody").innerHTML = `
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label><select name="status" class="w-full rounded-lg border border-slate-200 px-3 py-2"><option value="pending" ${item.status === "pending" ? "selected" : ""}>pending</option><option value="shipping" ${item.status === "shipping" ? "selected" : ""}>shipping</option><option value="completed" ${item.status === "completed" ? "selected" : ""}>completed</option></select></div>
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Thanh toán</label><select name="paymentStatus" class="w-full rounded-lg border border-slate-200 px-3 py-2"><option value="pending" ${item.paymentStatus === "pending" ? "selected" : ""}>pending</option><option value="success" ${item.paymentStatus === "success" ? "selected" : ""}>success</option><option value="failed" ${item.paymentStatus === "failed" ? "selected" : ""}>failed</option></select></div>
    <div><label class="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label><textarea name="note" rows="2" class="w-full rounded-lg border border-slate-200 px-3 py-2">${escapeHtml(item.note || "")}</textarea></div>
  `;
  $("modalOverlay").classList.remove("hidden");
  $("modalOverlay").classList.add("flex");
}

// --- Upload in form: file input -> upload -> set text input ---
function bindUploadInForm() {
  $("formBody").querySelectorAll('input[type="file"][data-for]').forEach((fileInput) => {
    const forName = fileInput.getAttribute("data-for");
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const textInput = $("entityForm").querySelector(`input[name="${forName}"]`);
      if (!textInput) return;
      textInput.disabled = true;
      textInput.placeholder = "Đang tải lên...";
      try {
        const url = await uploadFile(file);
        textInput.value = url;
        textInput.placeholder = "URL hoặc upload";
      } catch (e) {
        textInput.placeholder = "Lỗi: " + e.message;
      }
      textInput.disabled = false;
      fileInput.value = "";
    });
  });
}

// --- Form submit ---
function getFormData() {
  const form = $("entityForm");
  const entity = $("formEntity").value;
  const data = {};
  form.querySelectorAll("input, select, textarea").forEach((el) => {
    if (!el.name || el.type === "file" || el.id && el.id.startsWith("form")) return;
    const val = el.value.trim();
    if (el.name.startsWith("location.")) {
      const key = el.name.split(".")[1];
      data.location = data.location || {};
      if (val !== "") data.location[key] = Number(val);
    } else if (el.name && val !== "") {
      if (el.type === "number") data[el.name] = Number(val);
      else data[el.name] = val;
    }
  });
  return data;
}

$("entityForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const entity = $("formEntity").value;
  const mode = $("formMode").value;
  const id = $("formId").value;
  const body = getFormData();

  try {
    if (mode === "edit") {
      await api(`/api/admin/${entity}/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await api(`/api/admin/${entity}`, { method: "POST", body: JSON.stringify(body) });
    }
    closeModal();
    if (entity === "products") loadProducts();
    else if (entity === "categories") loadCategories();
    else if (entity === "banners") loadBanners();
    else if (entity === "stations") loadStations();
    else if (entity === "orders") loadOrders();
  } catch (err) {
    alert(err.message);
  }
});

function closeModal() {
  $("modalOverlay").classList.add("hidden");
  $("modalOverlay").classList.remove("flex");
}

$("modalClose").addEventListener("click", closeModal);
$("formCancel").addEventListener("click", closeModal);
$("modalOverlay").addEventListener("click", (e) => { if (e.target === $("modalOverlay")) closeModal(); });

// --- Buttons ---
$("saveTokenBtn").addEventListener("click", () => {
  setToken($("adminToken").value.trim());
  alert("Đã lưu token.");
  loadDashboardStats();
});

$("btnAddProduct").addEventListener("click", () => openProductForm(null));
$("btnAddCategory").addEventListener("click", () => openCategoryForm(null));
$("btnAddBanner").addEventListener("click", () => openBannerForm(null));
$("btnAddStation").addEventListener("click", () => openStationForm(null));

// --- Init ---
$("adminToken").value = getToken();
initRouter();
