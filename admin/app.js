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

const ENTITY_CONFIG = {
  products: {
    title: "Products",
    listPath: "/api/admin/products",
    fields: [
      { key: "categoryId", label: "categoryId", type: "number" },
      { key: "name", label: "Tên", type: "text", required: true },
      { key: "price", label: "Giá", type: "number", required: true },
      { key: "originalPrice", label: "Giá gốc", type: "number" },
      { key: "image", label: "Ảnh (URL)", type: "text" },
      { key: "detail", label: "Mô tả", type: "textarea" },
    ],
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Tên" },
      { key: "price", label: "Giá", render: (v) => formatMoney(v) },
      { key: "categoryId", label: "Danh mục" },
      { key: "image", label: "Ảnh", render: (v) => (v ? link("Xem", v) : muted("-")) },
    ],
  },
  categories: {
    title: "Categories",
    listPath: "/api/admin/categories",
    fields: [
      { key: "name", label: "Tên", type: "text", required: true },
      { key: "image", label: "Ảnh (URL)", type: "text" },
    ],
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Tên" },
      { key: "image", label: "Ảnh", render: (v) => (v ? link("Xem", v) : muted("-")) },
    ],
  },
  banners: {
    title: "Banners",
    listPath: "/api/admin/banners",
    fields: [{ key: "image", label: "Ảnh (URL)", type: "text", required: true }],
    columns: [
      { key: "id", label: "ID" },
      { key: "image", label: "Ảnh", render: (v) => (v ? link("Xem", v) : muted("-")) },
    ],
  },
  stations: {
    title: "Stations",
    listPath: "/api/admin/stations",
    fields: [
      { key: "name", label: "Tên", type: "text", required: true },
      { key: "image", label: "Ảnh (URL)", type: "text" },
      { key: "address", label: "Địa chỉ", type: "text" },
      { key: "location.lat", label: "Lat", type: "number" },
      { key: "location.lng", label: "Lng", type: "number" },
    ],
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Tên" },
      { key: "address", label: "Địa chỉ" },
      {
        key: "location",
        label: "Location",
        render: (v) =>
          v && (v.lat !== undefined || v.lng !== undefined)
            ? `${v.lat ?? ""}, ${v.lng ?? ""}`
            : muted("-"),
      },
    ],
  },
  orders: {
    title: "Orders",
    listPath: "/api/admin/orders",
    fields: [
      { key: "status", label: "status (pending/shipping/completed)", type: "text" },
      { key: "paymentStatus", label: "paymentStatus (pending/success/failed)", type: "text" },
      { key: "total", label: "total", type: "number" },
      { key: "note", label: "note", type: "textarea" },
      { key: "zaloUserId", label: "zaloUserId", type: "text" },
    ],
    columns: [
      { key: "id", label: "ID" },
      { key: "status", label: "Status" },
      { key: "paymentStatus", label: "Payment" },
      { key: "total", label: "Total", render: (v) => formatMoney(v) },
      { key: "zaloUserId", label: "User" },
    ],
    disableCreate: true,
  },
};

function resetForm() {
  $("mode").value = "create";
  $("id").value = "";
  $("submitBtn").textContent = "Tạo mới";
  $("cancelEditBtn").classList.add("hidden");
}

function toNumberOrUndefined(v) {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function setDeep(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    cur[k] = cur[k] ?? {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function getDeep(obj, path) {
  return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function readEntityPayload(entityKey) {
  const cfg = ENTITY_CONFIG[entityKey];
  const payload = { id: toNumberOrUndefined($("id").value) };

  for (const f of cfg.fields) {
    const el = $(`field__${f.key}`);
    if (!el) continue;

    let v;
    if (f.type === "number") v = toNumberOrUndefined(el.value);
    else v = String(el.value ?? "").trim();

    if (v === "" || v === undefined) continue;
    setDeep(payload, f.key, v);
  }

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  return payload;
}

function link(text, href) {
  return `<a class="text-slate-700 hover:underline" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(text)}</a>`;
}

function muted(text) {
  return `<span class="text-slate-400">${escapeHtml(text)}</span>`;
}

function renderTable(entityKey, rows) {
  const cfg = ENTITY_CONFIG[entityKey];
  const thead = $("tableThead");
  const tbody = $("tableTbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  const headTr = document.createElement("tr");
  headTr.className = "text-left text-slate-600";
  for (const c of cfg.columns) {
    const th = document.createElement("th");
    th.className = "py-2 pr-3";
    th.textContent = c.label;
    headTr.appendChild(th);
  }
  const thActions = document.createElement("th");
  thActions.className = "py-2 pr-3";
  headTr.appendChild(thActions);
  thead.appendChild(headTr);

  if (!rows || rows.length === 0) {
    $("tableEmpty").classList.remove("hidden");
    return;
  }
  $("tableEmpty").classList.add("hidden");

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.className = "border-t border-slate-100";

    for (const c of cfg.columns) {
      const td = document.createElement("td");
      td.className = "py-2 pr-3";
      const raw = getDeep(row, c.key);
      const value = c.render ? c.render(raw, row) : raw ?? "";
      if (typeof value === "string") td.innerHTML = value;
      else td.textContent = String(value ?? "");
      tr.appendChild(td);
    }

    const actions = document.createElement("td");
    actions.className = "py-2 pr-3";
    actions.innerHTML = `
      <div class="flex gap-2 justify-end">
        <button data-action="edit" class="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">Sửa</button>
        <button data-action="delete" class="px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50">Xoá</button>
      </div>
    `;
    actions.querySelector('[data-action="edit"]').addEventListener("click", () => startEdit(entityKey, row));
    actions.querySelector('[data-action="delete"]').addEventListener("click", () => deleteEntity(entityKey, row));
    tr.appendChild(actions);

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

function renderFormFields(entityKey) {
  const cfg = ENTITY_CONFIG[entityKey];
  const wrap = $("formFields");
  wrap.innerHTML = "";

  for (const f of cfg.fields) {
    const id = `field__${f.key}`;
    const label = document.createElement("label");
    label.className = "block text-xs font-medium text-slate-700";
    label.textContent = f.label;

    let input;
    if (f.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 4;
    } else {
      input = document.createElement("input");
      input.type = f.type || "text";
    }
    input.id = id;
    if (f.required) input.required = true;
    input.className = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

    const div = document.createElement("div");
    div.appendChild(label);
    div.appendChild(input);
    wrap.appendChild(div);
  }
}

function setEntity(entityKey) {
  $("entity").value = entityKey;
  $("entitySelect").value = entityKey;
  renderFormFields(entityKey);
  resetForm();
  setStatus("");
}

async function loadEntity(entityKey) {
  const cfg = ENTITY_CONFIG[entityKey];
  setStatus(`Đang tải ${cfg.title}...`);
  try {
    const rows = await api(cfg.listPath);
    window.__rows = rows;
    renderTable(entityKey, rows);
    setStatus(`OK: ${rows.length} bản ghi`);
  } catch (e) {
    setStatus(`Lỗi: ${e.message}`);
  }
}

function startEdit(entityKey, row) {
  const cfg = ENTITY_CONFIG[entityKey];
  $("mode").value = "edit";
  $("id").value = row.id ?? "";
  for (const f of cfg.fields) {
    const el = $(`field__${f.key}`);
    if (!el) continue;
    const v = getDeep(row, f.key);
    el.value = v ?? "";
  }

  $("submitBtn").textContent = `Lưu (ID ${row.id})`;
  $("cancelEditBtn").classList.remove("hidden");
  setStatus(`Đang sửa ID ${row.id}`);
}

async function deleteEntity(entityKey, row) {
  const cfg = ENTITY_CONFIG[entityKey];
  const ok = confirm(`Xoá ${cfg.title} ID ${row.id}?`);
  if (!ok) return;

  setStatus(`Đang xoá ID ${row.id}...`);
  try {
    await api(`${cfg.listPath}/${encodeURIComponent(row.id)}`, { method: "DELETE" });
    await loadEntity(entityKey);
  } catch (e) {
    setStatus(`Lỗi: ${e.message}`);
  }
}

async function submitForm(ev) {
  ev.preventDefault();
  const entityKey = $("entity").value;
  const cfg = ENTITY_CONFIG[entityKey];
  const payload = readEntityPayload(entityKey);
  const mode = $("mode").value;

  setStatus("Đang gửi...");
  try {
    if (mode === "edit") {
      const id = payload.id;
      if (!id) throw new Error("Thiếu ID để update");
      const { id: _, ...body } = payload;
      await api(`${cfg.listPath}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } else {
      if (cfg.disableCreate) throw new Error("Bảng này đang khoá create trong UI");
      await api(cfg.listPath, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    resetForm();
    await loadEntity(entityKey);
  } catch (e) {
    setStatus(`Lỗi: ${e.message}`);
  }
}

async function loadJsonPreview() {
  const entityKey = $("entity").value;
  const cfg = ENTITY_CONFIG[entityKey];
  $("jsonPre").textContent = "Đang tải...";
  try {
    const rows = await api(cfg.listPath);
    $("jsonPre").textContent = JSON.stringify(rows, null, 2);
  } catch (e) {
    $("jsonPre").textContent = `Lỗi: ${e.message}`;
  }
}

function boot() {
  $("adminToken").value = getToken();

  $("saveTokenBtn").addEventListener("click", async () => {
    setToken($("adminToken").value.trim());
    setStatus("Đã lưu token");
    await loadEntity($("entity").value);
  });

  $("entitySelect").addEventListener("change", async () => {
    const entityKey = $("entitySelect").value;
    setEntity(entityKey);
    await loadEntity(entityKey);
  });

  $("refreshBtn").addEventListener("click", () => loadEntity($("entity").value));
  $("refreshJsonBtn").addEventListener("click", loadJsonPreview);
  $("cancelEditBtn").addEventListener("click", () => {
    resetForm();
    setStatus("Đã huỷ sửa");
  });
  $("entityForm").addEventListener("submit", submitForm);

  setEntity("products");
  resetForm();
  loadEntity("products");
}

boot();

