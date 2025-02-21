import { Schema, model } from "mongoose";

const ApplicationSchema = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
  },
  enrollment: {
    type: Number,
  },
  email: {
    type: String,
    required: true,
  },
  college: {
    type: String,
    required: true,
  },
  applicationOne: {
    type: String,
    validate: {
      validator: function (this:any, value: string) {
        // Make application_1 required if milestone is 1
        if (this.milestone === 1 && !value) {
          return false
        }
        return true
      }
    }
  },
  application: {
    type: String,
    required: true,
  },
  budget: {
    type: Number,
    required: true,
  },
  currencyType: {
    type: String,
    required: true,
  },
  milestone: {
    type: Number,
    required: true,
  },
  assigned: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reviewer_1: {
    user: {
      type: Schema.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  reviewer_2: {
    user: {
      type: Schema.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  col_dean: {
    type: String,
    enum: ["pending", "approved", "rejected", "reviewed"],
    default: "pending",
  },
  grant_dep: {
    type: String,
    enum: ["pending", "approved", "rejected", "reviewed"],
    default: "pending",
  },
  grant_dir: {
    type: String,
    enum: ["pending", "approved", "rejected", "reviewed"],
    default: "pending",
  },
  finance: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  comment: {
    type: Schema.ObjectId,
    ref: "Comment",
  },
  announcement: {
    type: Schema.ObjectId,
    ref: "Announcement",
  },
  rejected: {
    type: {
      reviewer: String,
    },
  },
  askMoreInfo: {
    type: Boolean,
    default: false
  },
  additionalDoc: {
    type: [String],
    default: []
  },
  invoice: {
    type: String
  },
  reviewed: {
    type: String,
    enum: ["pending", "approved", "reviewed"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update the reviewed field
ApplicationSchema.pre('save', function (next) {
  if (this.grant_dir === 'approved' && this.reviewed === 'pending') {
    this.reviewed = 'approved';
  }
  next();
});

export const Application = model("Application", ApplicationSchema);
