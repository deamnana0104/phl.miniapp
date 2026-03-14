import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";

config();

const port = process.env.PORT || 10000;
const app = express();
const API_PREFIX = "/api";

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

app.use(express.json());

const corsOriginsFromEnv = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: [
      "https://h5.zdn.vn",
      "http://localhost:3000",
      "http://localhost:5173",
      "https://pinhoanglong-miniapp.onrender.com",
      "https://pinhoanglong-miniapp-zu7q.onrender.com",
      ...corsOriginsFromEnv,
    ],
  })
);

/* ---------------- MONGODB CONNECT ---------------- */

if (!process.env.MONGO_URL) {
  console.error("Missing MONGO_URL. Please set it in environment variables.");
}

mongoose
  .connect(process.env.MONGO_URL as string)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
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

/* ---------------- STATIC: UPLOADS & ADMIN ---------------- */

app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/admin", express.static("admin"));

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
  const orders = await Order.find().sort({ _id: -1 });
  res.json(orders);
});

/* ---------------- ADMIN API ---------------- */

const adminApi = express.Router();
adminApi.use(requireAdmin);

adminApi.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const base = `${req.protocol}://${req.get("host") || ""}`;
  res.json({ url: `${base}/uploads/${req.file.filename}` });
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

api.use("/admin", adminApi);
app.use(API_PREFIX, api);

/* ---------------- START SERVER ---------------- */

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});