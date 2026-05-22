const mongoose = require("mongoose");

const sharedWithSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permission: {
      type: String,
      enum: ["viewer", "editor"],
      default: "editor",
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      default: "Untitled Document",
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedWith: [sharedWithSchema],
    isPublic: {
      type: Boolean,
      default: false,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// Index for fast owner + shared lookups
documentSchema.index({ owner: 1, updatedAt: -1 });
documentSchema.index({ "sharedWith.user": 1 });

// ── FIX: owner may be a populated User object OR a raw ObjectId ──────────────
// Using `._id ?? .` handles both cases correctly.

documentSchema.methods.hasAccess = function (userId) {
  const ownerId = this.owner._id ?? this.owner;
  if (ownerId.toString() === userId.toString()) return true;
  return this.sharedWith.some((s) => {
    const sharedId = s.user._id ?? s.user;
    return sharedId.toString() === userId.toString();
  });
};

documentSchema.methods.canEdit = function (userId) {
  const ownerId = this.owner._id ?? this.owner;
  if (ownerId.toString() === userId.toString()) return true;
  const share = this.sharedWith.find((s) => {
    const sharedId = s.user._id ?? s.user;
    return sharedId.toString() === userId.toString();
  });
  return share && share.permission === "editor";
};

module.exports = mongoose.model("Document", documentSchema);
