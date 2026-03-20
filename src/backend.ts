import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

config();

const port = process.env.PORT || 10000;
const app = express();
const API_PREFIX = "/api";

app.set("trust proxy", 1);
app.disable("x-powered-by");

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `admin-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//.test(file.mimetype);
    cb(null, !!ok);
  },
});

const corsOriginsFromEnv = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
}, express.static(UPLOAD_DIR));
app.use("/admin", express.static("admin"));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");

/* ---------------- SEED DATA ---------------- */

async function seedData() {
  const count = await Product.countDocuments();
  if (count > 0) return; // Đã có dữ liệu, không seed nữa

  console.log("Seeding mock data for battery components...");

  const categories = [
    { id: 1, name: "Pin & Cell Pin", image: "https://images.unsplash.com/photo-1611278484859-f1c2f6e34c9d?auto=format&fit=crop&w=200&h=200" },
    { id: 2, name: "Mạch Bảo Vệ (BMS)", image: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=200&h=200" },
    { id: 3, name: "Sạc & Adapter", image: "https://images.unsplash.com/photo-1588196749107-4521c6b3739d?auto=format&fit=crop&w=200&h=200" },
    { id: 4, name: "Phụ Kiện & Vỏ Pin", image: "https://images.unsplash.com/photo-1624562149452-9560d6e8422a?auto=format&fit=crop&w=200&h=200" },
  ];
  await Category.insertMany(categories);

  const banners = [
    { id: 1, image: "https://images.unsplash.com/photo-1581092916346-539270a425ed?auto=format&fit=crop&w=800&h=400" },
    { id: 2, image: "https://images.unsplash.com/photo-1620799140408-edc6d5f93528?auto=format&fit=crop&w=800&h=400" },
  ];
  await Banner.insertMany(banners);

  const products = [
    { id: 1, categoryId: 1, name: "Cell pin Lishen 2000mAh - xả 10C", price: 35000, originalPrice: 45000, image: "https://images.unsplash.com/photo-1611278484859-f1c2f6e34c9d?auto=format&fit=crop&w=400&h=400", detail: "Cell pin Lishen chính hãng, dung lượng thật 2000mAh, dòng xả cao 10C (20A), chuyên dùng cho máy khoan, xe điện." },
    { id: 2, categoryId: 1, name: "Pin 18650 Samsung 25R", price: 75000, originalPrice: 90000, image: "https://images.unsplash.com/photo-1624562149452-9560d6e8422a?auto=format&fit=crop&w=400&h=400", detail: "Cell pin Samsung 25R dung lượng 2500mAh, xả 20A, hiệu suất cao và bền bỉ." },
    { id: 3, categoryId: 2, name: "Mạch bảo vệ BMS 3S 40A", price: 80000, originalPrice: 100000, image: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=400&h=400", detail: "Mạch bảo vệ pin 3S (12.6V) dòng xả 40A, có chức năng cân bằng cell, bảo vệ quá sạc, quá xả, quá dòng." },
    { id: 4, categoryId: 2, name: "Mạch cân bằng pin 4S", price: 45000, originalPrice: 50000, image: "https://images.unsplash.com/photo-1620799140408-edc6d5f93528?auto=format&fit=crop&w=400&h=400", detail: "Mạch cân bằng chủ động cho khối pin 4S, giúp đều áp các cell, tăng tuổi thọ pin." },
    { id: 5, categoryId: 3, name: "Sạc Adapter 12.6V 2A", price: 95000, originalPrice: 120000, image: "https://images.unsplash.com/photo-1588196749107-4521c6b3739d?auto=format&fit=crop&w=400&h=400", detail: "Sạc cho khối pin 3S, có đèn báo đầy, tự ngắt khi pin đầy." },
    { id: 6, categoryId: 4, name: "Vỏ pin 3S (21 cell) cho máy khoan", price: 55000, originalPrice: 70000, image: "https://images.unsplash.com/photo-1581092916346-539270a425ed?auto=format&fit=crop&w=400&h=400", detail: "Vỏ nhựa ABS chắc chắn, dùng để đóng khối pin 3S 21 cell 18650 cho máy khoan, bắt vít." },
  ];
  await Product.insertMany(products);

  const stations = [
    { id: 1, name: "Kho Hóc Môn", address: "301/5Đ Phạm Thị Giây, Hóc Môn, TP.HCM", location: { lat: 10.864, lng: 106.591 }, image: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=400&h=400" },
    { id: 2, name: "Điểm giao hàng Gò Vấp", address: "123 Nguyễn Oanh, Gò Vấp, TP.HCM", location: { lat: 10.833, lng: 106.665 }, image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&h=400" },
  ];
  await Station.insertMany(stations);

  console.log("Mock data for battery components seeded successfully.");
}

/* ---------------- MONGODB CONNECT ---------------- */

if (!process.env.MONGO_URL) {
  console.warn("Missing MONGO_URL. Using local fallback (mock in-memory data mode)...");
}

mongoose
  .connect(process.env.MONGO_URL || "mongodb://localhost:27017/pinhoanglong")
  .then(() => {
    console.log("MongoDB connected");
    seedData().catch(err => console.error("Seed error:", err));
  })
  .catch((err) => {
    console.error("MongoDB connection failed. App will continue but DB features might fail.", err);
  });

/* ---------------- SCHEMAS ---------------- */

const productSchema = new mongoose.Schema({
  id: { type: Number, index: true, unique: true, sparse: true },
  categoryId: Number,
  name: String,
  price: Number,
  originalPrice: Number,
  image: String,
  detail: String,
});

const categorySchema = new mongoose.Schema({
  id: { type: Number, index: true, unique: true, sparse: true },
  name: String,
  image: String,
});

const bannerSchema = new mongoose.Schema({
  id: { type: Number, index: true, unique: true, sparse: true },
  image: String,
});

const stationSchema = new mongoose.Schema({
  id: { type: Number, index: true, unique: true, sparse: true },
  name: String,
  image: String,
  address: String,
  location: {
    lat: Number,
    lng: Number,
  },
});

const orderSchema = new mongoose.Schema({
  id: { type: Number, index: true, unique: true, sparse: true },
  zaloUserId: String,
  status: { type: String, enum: ["pending", "shipping", "completed"] },
  paymentStatus: { type: String, enum: ["pending", "success", "failed"] },
  createdAt: Date,
  receivedAt: Date,
  items: [
    {
      product: Object,
      quantity: Number,
    },
  ],
  delivery: Object,
  total: Number,
  note: String,
});

const Product = mongoose.model("Product", productSchema);
const Category = mongoose.model("Category", categorySchema);
const Banner = mongoose.model("Banner", bannerSchema);
const Station = mongoose.model("Station", stationSchema);
const Order = mongoose.model("Order", orderSchema);

/* ---------------- BASIC ---------------- */

app.get("/", (req, res) => {
  res.json({
    message: "Backend Pin Hoàng Long running",
  });
});

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const configuredToken = process.env.ADMIN_TOKEN;
  if (!configuredToken) {
    if (process.env.NODE_ENV === "production") {
      return res.status(500).json({ error: "ADMIN_TOKEN is not configured" });
    }
    return next();
  }

  const token = String(req.header("x-admin-token") ?? "");
  if (token !== configuredToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

async function ensureProductNumericIds() {
  const missing = await Product.find({
    $or: [{ id: { $exists: false } }, { id: null }],
  }).sort({ _id: 1 });
  if (missing.length === 0) return;

  const maxExisting = await Product.findOne({ id: { $exists: true, $ne: null } })
    .sort({ id: -1 })
    .select({ id: 1 });
  let nextId = (maxExisting as any)?.id ?? 0;

  for (const doc of missing) {
    nextId += 1;
    doc.set("id", nextId);
    await doc.save();
  }
}

async function ensureNumericIds(Model: mongoose.Model<any>) {
  const missing = await Model.find({
    $or: [{ id: { $exists: false } }, { id: null }],
  }).sort({ _id: 1 });
  if (missing.length === 0) return;

  const maxExisting = await Model.findOne({ id: { $exists: true, $ne: null } })
    .sort({ id: -1 })
    .select({ id: 1 });
  let nextId = (maxExisting as any)?.id ?? 0;

  for (const doc of missing) {
    nextId += 1;
    doc.set("id", nextId);
    await doc.save();
  }
}

async function nextNumericId(Model: mongoose.Model<any>) {
  const maxExisting = await Model.findOne({ id: { $exists: true, $ne: null } })
    .sort({ id: -1 })
    .select({ id: 1 });
  return ((maxExisting as any)?.id ?? 0) + 1;
}

/* ---------------- API ROUTER ---------------- */

const api = express.Router();

api.get("/health", async (req, res) => {
  res.json({
    ok: true,
    mongoReadyState: mongoose.connection.readyState, // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
  });
});

function requireMongoReady(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      error: "MongoDB is not connected",
      mongoReadyState: mongoose.connection.readyState,
    });
    return;
  }
  next();
}

/* ---------------- PRODUCTS (PUBLIC) ---------------- */

// GET products
api.get("/products", async (req, res) => {
  await ensureProductNumericIds();
  const products = await Product.find().sort({ _id: -1 });
  res.json(products);
});

/* ---------------- TEMPLATE DATA (FROM DB) ---------------- */

api.get("/categories", async (req, res) => {
  await ensureNumericIds(Category);
  const categories = await Category.find().sort({ _id: -1 });
  res.json(categories);
});

api.get("/banners", async (req, res) => {
  await ensureNumericIds(Banner);
  const banners = await Banner.find().sort({ _id: -1 });
  res.json(banners.map((b: any) => b.image).filter(Boolean));
});

api.get("/stations", async (req, res) => {
  await ensureNumericIds(Station);
  const stations = await Station.find().sort({ _id: -1 });
  res.json(stations);
});

/* ---------------- ORDERS ---------------- */

api.get("/orders", async (req, res) => {
  await ensureNumericIds(Order);
  const zaloUserId = String(req.query.zaloUserId ?? "").trim();

  // Không trả toàn bộ đơn hàng công khai để tránh lộ dữ liệu người dùng khác.
  if (!zaloUserId) {
    res.json([]);
    return;
  }

  const orders = await Order.find({ zaloUserId }).sort({ _id: -1 });
  res.json(orders);
});

async function getZaloUserIdFromAccessToken(accessToken: string) {
  const appSecret = process.env.ZALO_APP_SECRET;
  if (!appSecret) {
    throw new Error("ZALO_APP_SECRET is not configured");
  }
  const appsecret_proof = crypto
    .createHmac("sha256", appSecret)
    .update(accessToken)
    .digest("hex");

  const r = await fetch("https://graph.zalo.me/v2.0/me", {
    method: "GET",
    headers: {
      access_token: accessToken,
      appsecret_proof,
    } as any,
  });
  const text = await r.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!r.ok || !data || data.error) {
    const msg =
      data && typeof data === "object" && data.message
        ? String(data.message)
        : "Unauthorized";
    throw new Error(msg);
  }
  const id = String(data.id ?? "").trim();
  if (!id) throw new Error("Missing user id");
  return id;
}

async function requireZaloUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const accessToken = String(req.header("access_token") ?? "").trim();
  if (!accessToken) {
    res.status(401).json({ error: "Missing access_token" });
    return;
  }
  try {
    (req as any).zaloUserId = await getZaloUserIdFromAccessToken(accessToken);
    next();
  } catch (e: any) {
    res.status(401).json({ error: e?.message || "Unauthorized" });
  }
}

api.get("/orders/my", requireZaloUser, async (req, res) => {
  await ensureNumericIds(Order);
  const zaloUserId = String((req as any).zaloUserId ?? "");
  const orders = await Order.find({ zaloUserId }).sort({ _id: -1 });
  res.json(orders);
});

api.post("/orders", requireZaloUser, async (req, res) => {
  await ensureNumericIds(Order);
  const zaloUserId = String((req as any).zaloUserId ?? "");
  const body = req.body ?? {};
  const id = typeof body.id === "number" ? body.id : await nextNumericId(Order);

  const doc = new Order({
    ...body,
    id,
    zaloUserId,
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
  });
  await doc.save();
  res.status(201).json(doc);
});

/* ---------------- ADMIN API ---------------- */

const adminApi = express.Router();
adminApi.use(requireAdmin);
adminApi.use(requireMongoReady);

adminApi.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

adminApi.get("/products", async (req, res) => {
  await ensureProductNumericIds();
  const products = await Product.find().sort({ _id: -1 });
  res.json(products);
});

adminApi.post("/products", async (req, res) => {
  await ensureProductNumericIds();
  const body = req.body ?? {};

  let id = body.id as number | undefined;
  if (typeof id !== "number") {
    const maxExisting = await Product.findOne({ id: { $exists: true, $ne: null } })
      .sort({ id: -1 })
      .select({ id: 1 });
    id = ((maxExisting as any)?.id ?? 0) + 1;
  }

  const product = new Product({ ...body, id });
  await product.save();
  res.status(201).json(product);
});

adminApi.put("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const product = await Product.findOneAndUpdate({ id }, req.body, { new: true });
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(product);
});

adminApi.delete("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await Product.findOneAndDelete({ id });
  res.json({ success: true });
});

adminApi.get("/orders", async (req, res) => {
  await ensureNumericIds(Order);
  const orders = await Order.find().sort({ _id: -1 });
  res.json(orders);
});

/* ---------------- ADMIN CRUD (CATEGORIES) ---------------- */

adminApi.get("/categories", async (req, res) => {
  await ensureNumericIds(Category);
  res.json(await Category.find().sort({ _id: -1 }));
});

adminApi.post("/categories", async (req, res) => {
  await ensureNumericIds(Category);
  const body = req.body ?? {};
  const id = typeof body.id === "number" ? body.id : await nextNumericId(Category);
  const doc = new Category({ ...body, id });
  await doc.save();
  res.status(201).json(doc);
});

adminApi.put("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const doc = await Category.findOneAndUpdate({ id }, req.body, { new: true });
  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(doc);
});

adminApi.delete("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await Category.findOneAndDelete({ id });
  res.json({ success: true });
});

/* ---------------- ADMIN CRUD (BANNERS) ---------------- */

adminApi.get("/banners", async (req, res) => {
  await ensureNumericIds(Banner);
  res.json(await Banner.find().sort({ _id: -1 }));
});

adminApi.post("/banners", async (req, res) => {
  await ensureNumericIds(Banner);
  const body = req.body ?? {};
  const id = typeof body.id === "number" ? body.id : await nextNumericId(Banner);
  const doc = new Banner({ ...body, id });
  await doc.save();
  res.status(201).json(doc);
});

adminApi.put("/banners/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const doc = await Banner.findOneAndUpdate({ id }, req.body, { new: true });
  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(doc);
});

adminApi.delete("/banners/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await Banner.findOneAndDelete({ id });
  res.json({ success: true });
});

/* ---------------- ADMIN CRUD (STATIONS) ---------------- */

adminApi.get("/stations", async (req, res) => {
  await ensureNumericIds(Station);
  res.json(await Station.find().sort({ _id: -1 }));
});

adminApi.post("/stations", async (req, res) => {
  await ensureNumericIds(Station);
  const body = req.body ?? {};
  const id = typeof body.id === "number" ? body.id : await nextNumericId(Station);
  const doc = new Station({ ...body, id });
  await doc.save();
  res.status(201).json(doc);
});

adminApi.put("/stations/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const doc = await Station.findOneAndUpdate({ id }, req.body, { new: true });
  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(doc);
});

adminApi.delete("/stations/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await Station.findOneAndDelete({ id });
  res.json({ success: true });
});

/* ---------------- ADMIN CRUD (ORDERS) ---------------- */

adminApi.post("/orders", async (req, res) => {
  await ensureNumericIds(Order);
  const body = req.body ?? {};
  const id = typeof body.id === "number" ? body.id : await nextNumericId(Order);
  const doc = new Order({ ...body, id });
  await doc.save();
  res.status(201).json(doc);
});

adminApi.put("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const doc = await Order.findOneAndUpdate({ id }, req.body, { new: true });
  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(doc);
});

adminApi.delete("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await Order.findOneAndDelete({ id });
  res.json({ success: true });
});

/* ---------------- RESET DATABASE ---------------- */
adminApi.post("/reset-database", async (req, res) => {
  try {
    console.log("FORCE RESETTING database (dropping collections)...");
    
    // Xóa toàn bộ dữ liệu cũ và drop index
    try { await Product.collection.drop(); } catch(e) {}
    try { await Category.collection.drop(); } catch(e) {}
    try { await Banner.collection.drop(); } catch(e) {}
    try { await Station.collection.drop(); } catch(e) {}
    try { await Order.collection.drop(); } catch(e) {}

    // Gọi lại hàm seedData để điền dữ liệu mới
    await seedData();

    res.json({ success: true, message: "Database has been reset and seeded with new data." });
  } catch (error: any) {
    console.error("Error resetting database:", error);
    res.status(500).json({ error: error.message || "Failed to reset database" });
  }
});

api.use("/admin", adminApi);
app.use(API_PREFIX, api);

/* ---------------- START SERVER ---------------- */

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;

/* ---------------- ERROR HANDLER ---------------- */

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err?.message ? String(err.message) : "Internal Server Error";
  res.status(500).json({ error: message });
});