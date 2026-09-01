import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    reviewId: { type: String, required: true, unique: true },
    stationId: { type: String, required: true },
    counterId: { type: String, required: true },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    categories: {
      cleanliness: { type: Number, default: 5 },
      speed: { type: Number, default: 5 },
      staff: { type: Number, default: 5 },
      facilities: { type: Number, default: 5 },
    },
    ownerReply: String,
  },
  { timestamps: true }
);

export const Review = mongoose.model("Review", reviewSchema);
