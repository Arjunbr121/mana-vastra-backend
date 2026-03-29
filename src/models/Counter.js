import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    required: true,
  },
  value: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model("Counter", counterSchema);
