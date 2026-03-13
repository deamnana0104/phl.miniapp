import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import { Order as OrderInfo } from "./types";

config();

const port = process.env.PORT || 10000;
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: [
      "https://h5.zdn.vn",
      "http://localhost:3000",
      "https://pinhoanglong-miniapp.onrender.com",
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
  name: String,
  price: Number,
  image: String,
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

/* ---------------- PRODUCTS ---------------- */

// GET products
app.get("/products", async (req, res) => {
  const products = await Product.find().sort({ _id: -1 });
  res.json(products);
});

// CREATE product
app.post("/products", async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.json(product);
});

// UPDATE product
app.put("/products/:id", async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!product) return res.status(404).json({ error: "Not found" });

  res.json(product);
});

// DELETE product
app.delete("/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ---------------- TEMPLATE DATA ---------------- */

app.get("/categories", async (req, res) => {
  res.json((await import("./mock/categories.json")).default);
});

app.get("/banners", async (req, res) => {
  res.json((await import("./mock/banners.json")).default);
});

app.get("/stations", async (req, res) => {
  res.json((await import("./mock/stations.json")).default);
});

/* ---------------- ORDERS ---------------- */

app.get("/orders", async (req, res) => {
  const orders = await Order.find().sort({ _id: -1 });
  const orderInfos = orders.map((order: any) => order.info);
  res.json(orderInfos);
});

/* ---------------- START SERVER ---------------- */

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});