const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
    },
    whatsappNo: {
      type: String,
      required: [true, 'WhatsApp number is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    birthdate: {
      type: Date,
      required: [true, 'Birthdate is required'],
    },
    sex: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    vendorTypes: {
      type: [String],
      enum: ['album', 'photographer', 'proposal', 'services', 'product'],
      default: [],
    },
    vendorSubscriptions: {
      type: [
        {
          vendorType: {
            type: String,
            enum: ['album', 'proposal', 'services', 'product'],
          },
          subPlan: { type: String, trim: true },
          paymentMethod: { type: String, enum: ['payment-slip', 'payhere', null], default: null },
          paymentSlip: { type: String, trim: true },
          paymentStatus: { type: String, enum: ['pending', 'paid', 'active', 'rejected', null], default: null },
          paymentAmount: { type: Number, default: 0, min: 0 },
          paymentId: { type: String, trim: true },
          transactionId: { type: String, trim: true },
          paidAt: { type: Date, default: null },
          subscriptionStartDate: { type: Date, default: null },
          subscriptionEndDate: { type: Date, default: null },
        },
      ],
      default: [],
    },
    subPlan: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['payment-slip', 'payhere', null],
      default: null,
    },
    paymentSlip: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'active', 'rejected', null],
      default: null,
    },
    paymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentId: {
      type: String,
      trim: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'active'],
      default: 'pending',
    },
    profileImage: {
      type: String,
    },
    profilePic: {
      type: String,
    },
    description: {
      type: String,
    },
    views: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'proposals',
  }
);

// Prevent duplicate email for proposals
proposalSchema.index({ email: 1 });

module.exports = mongoose.model('Proposal', proposalSchema);
