import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";

config();

const port = process.env.PORT || 10000;
const app = express();
const API_PREFIX = "/api";

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

mongoose
  .connect(process.env.MONGO_URL as string)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

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

const orderSchema = new mongoose.Schema({
  zaloUserId: String,
  checkoutSdkOrderId: Number,
  info: Object,
});

const Product = mongoose.model("Product", productSchema);
const Order = mongoose.model("Order", orderSchema);

/* ---------------- ADMIN PAGE ---------------- */

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

/* ---------------- API ROUTER ---------------- */

const api = express.Router();

/* ---------------- PRODUCTS (PUBLIC) ---------------- */

// GET products
api.get("/products", async (req, res) => {
  await ensureProductNumericIds();
  const products = await Product.find().sort({ _id: -1 });
  res.json(products);
});

/* ---------------- TEMPLATE DATA ---------------- */

api.get("/categories", async (req, res) => {
  res.json((await import("./mock/categories.json")).default);
});

api.get("/banners", async (req, res) => {
  res.json((await import("./mock/banners.json")).default);
});

api.get("/stations", async (req, res) => {
  res.json((await import("./mock/stations.json")).default);
});

/* ---------------- ORDERS ---------------- */

// Public orders used by the Mini App UI (keeps the demo format from src/mock/orders.json)
api.get("/orders", async (req, res) => {
  res.json((await import("./mock/orders.json")).default);
});

/* ---------------- ADMIN API ---------------- */

const adminApi = express.Router();
adminApi.use(requireAdmin);

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
  const orders = await Order.find().sort({ _id: -1 });
  res.json(orders);
});

api.use("/admin", adminApi);
app.use(API_PREFIX, api);

/* ---------------- START SERVER ---------------- */

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});