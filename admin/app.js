const STORAGE_KEY = "adminToken";

function $(id) {
  return document.getElementById(id);
}

function formatMoney(v) {
  try {
    return new Intl.NumberFormat("vi-VN").format(Number(v || 0));
  } catch {
    return String(v ?? "");
  }
}

function getToken() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

function setToken(token) {
  localStorage.setItem(STORAGE_KEY, token);
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (token) headers.set("x-admin-token", token);
  if (options.body && !headers.get("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "object" && data && data.error ? data.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function setStatus(msg) {
  $("status").textContent = msg || "";
}

function resetForm() {
  $("mode").value = "create";
  $("id").value = "";
  $("categoryId").value = "";
  $("name").value = "";
  $("price").value = "";
  $("originalPrice").value = "";
  $("image").value = "";
  $("detail").value = "";
  $("submitBtn").textContent = "Tạo mới";
  $("cancelEditBtn").classList.add("hidden");
}

function toNumberOrUndefined(v) {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function readFormPayload() {
  const payload = {
    id: toNumberOrUndefined($("id").value),
    categoryId: toNumberOrUndefined($("categoryId").value),
    name: $("name").value.trim(),
    price: toNumberOrUndefined($("price").value),
    originalPrice: toNumberOrUndefined($("originalPrice").value),
    image: $("image").value.trim(),
    detail: $("detail").value.trim(),
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  return payload;
}

function renderProducts(products) {
  const tbody = $("productsTbody");
  tbody.innerHTML = "";

  if (!products || products.length === 0) {
    $("productsEmpty").classList.remove("hidden");
    return;
  }
  $("productsEmpty").classList.add("hidden");

  for (const p of products) {
    const tr = document.createElement("tr");
    tr.className = "border-t border-slate-100";

    const img = p.image
      ? `<a class="text-slate-700 hover:underline" href="${p.image}" target="_blank" rel="noreferrer">Xem</a>`
      : `<span class="text-slate-400">-</span>`;

    tr.innerHTML = `
      <td class="py-2 pr-3 font-mono text-xs">${p.id ?? ""}</td>
      <td class="py-2 pr-3 min-w-[240px]">${escapeHtml(p.name ?? "")}</td>
      <td class="py-2 pr-3">${formatMoney(p.price)}</td>
      <td class="py-2 pr-3">${p.categoryId ?? ""}</td>
      <td class="py-2 pr-3">${img}</td>
      <td class="py-2 pr-3">
        <div class="flex gap-2 justify-end">
          <button data-action="edit" class="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">Sửa</button>
          <button data-action="delete" class="px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50">Xoá</button>
        </div>
      </td>
    `;

    tr.querySelector('[data-action="edit"]').addEventListener("click", () => startEdit(p));
    tr.querySelector('[data-action="delete"]').addEventListener("click", () => deleteProduct(p));
    tbody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadProducts() {
  setStatus("Đang tải products...");
  try {
    const products = await api("/api/admin/products");
    window.__products = products;
    renderProducts(products);
    setStatus(`OK: ${products.length} sản phẩm`);
  } catch (e) {
    setStatus(`Lỗi: ${e.message}`);
  }
}

function startEdit(p) {
  $("mode").value = "edit";
  $("id").value = p.id ?? "";
  $("categoryId").value = p.categoryId ?? "";
  $("name").value = p.name ?? "";
  $("price").value = p.price ?? "";
  $("originalPrice").value = p.originalPrice ?? "";
  $("image").value = p.image ?? "";
  $("detail").value = p.detail ?? "";
  $("submitBtn").textContent = `Lưu (ID ${p.id})`;
  $("cancelEditBtn").classList.remove("hidden");
  setStatus(`Đang sửa ID ${p.id}`);
}

async function deleteProduct(p) {
  const ok = confirm(`Xoá sản phẩm ID ${p.id}?`);
  if (!ok) return;

  setStatus(`Đang xoá ID ${p.id}...`);
  try {
    await api(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: "DELETE" });
    await loadProducts();
  } catch (e) {
    setStatus(`Lỗi: ${e.message}`);
  }
}

async function submitForm(ev) {
  ev.preventDefault();
  const payload = readFormPayload();
  const mode = $("mode").value;

  setStatus("Đang gửi...");
  try {
    if (mode === "edit") {
      const id = payload.id;
      if (!id) throw new Error("Thiếu ID để update");
      const { id: _, ...body } = payload;
      await api(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } else {
      await api("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    resetForm();
    await loadProducts();
  } catch (e) {
    setStatus(`Lỗi: ${e.message}`);
  }
}

async function loadOrders() {
  $("ordersPre").textContent = "Đang tải orders...";
  try {
    const orders = await api("/api/admin/orders");
    $("ordersPre").textContent = JSON.stringify(orders, null, 2);
  } catch (e) {
    $("ordersPre").textContent = `Lỗi: ${e.message}`;
  }
}

function boot() {
  $("adminToken").value = getToken();

  $("saveTokenBtn").addEventListener("click", async () => {
    setToken($("adminToken").value.trim());
    setStatus("Đã lưu token");
    await loadProducts();
  });

  $("refreshBtn").addEventListener("click", loadProducts);
  $("refreshOrdersBtn").addEventListener("click", loadOrders);
  $("cancelEditBtn").addEventListener("click", () => {
    resetForm();
    setStatus("Đã huỷ sửa");
  });
  $("productForm").addEventListener("submit", submitForm);

  resetForm();
  loadProducts();
}

boot();

