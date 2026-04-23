const mongoose = require('mongoose');

const subPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    duration: {
      type: Number,
      required: [true, 'Duration in days is required'],
      default: 30,
    },
    features: {
      type: [String],
      default: [],
    },
    vendorType: {
      type: String,
      required: [true, 'Vendor type is required'],
      enum: ['album', 'photographer', 'proposal', 'services', 'product'],
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    _seedData: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// Index to quickly find plans by vendor type
subPlanSchema.index({ vendorType: 1, status: 1 });

const SubPlan = mongoose.model('SubPlan', subPlanSchema);

module.exports = SubPlan;
