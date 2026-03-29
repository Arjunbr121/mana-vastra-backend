import mongoose from "mongoose";
import Counter from "./Counter.js";

const orderItemSchema = new mongoose.Schema(
  {
    saree: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Saree",
      required: true,
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      default: 1,
    },
    image: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

orderSchema.pre("save", async function assignOrderNumber(next) {
  if (this.orderNumber) {
    next();
    return;
  }

  const counter = await Counter.findOneAndUpdate(
    { key: "orderNumber" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  this.orderNumber = `MV${String(counter.value).padStart(5, "0")}`;
  next();
});

export default mongoose.model("Order", orderSchema);
