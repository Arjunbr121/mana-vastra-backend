import mongoose from "mongoose";

const sareeImageSchema = new mongoose.Schema(
  {
    publicId: String,
    url: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const sareeSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    fabric: {
      type: String,
      default: "",
      trim: true,
    },
    color: {
      type: String,
      default: "",
      trim: true,
    },
    occasion: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    stock: {
      type: Number,
      default: 1,
      min: 0,
    },
    available: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    images: {
      type: [sareeImageSchema],
      validate: {
        validator(images) {
          return images.length <= 5;
        },
        message: "A saree can have at most 5 images",
      },
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Saree", sareeSchema);
