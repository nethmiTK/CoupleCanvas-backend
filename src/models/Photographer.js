const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const photographerSchema = new mongoose.Schema(
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
      minlength: 3,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't return password by default
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
    businessName: {
      type: String,
      trim: true,
    },
    whatsappNo: {
      type: String,
      trim: true,
    },
    contactNo: {
      type: String,
      trim: true,
    },
    vendorTypes: {
      type: [String],
      enum: ['album', 'photographer', 'proposal', 'services', 'product'],
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
    bio: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    profileImage: {
      type: String,
    },
    portfolio: {
      type: String,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'photographers',
  }
);

// Hash password before saving
photographerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
photographerSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON response
photographerSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Photographer', photographerSchema);
