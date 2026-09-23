import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    position: {
      type: String,
      default: "",
      trim: true,
    },

    embedding: {
      status: {
        type: String,
        enum: ["PENDING", "PROCESSING", "READY", "FAILED"],
        default: "PENDING",
      },
      vector: {
        type: [Number],
      },
      dims: {
        type: Number,
      },
      attempts: {
        type: Number,
        default: 0,
      },
      lastAttemptAt: {
        type: Date,
      },
      updatedAt: {
        type: Date,
      },
      lastError: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);
export default User;