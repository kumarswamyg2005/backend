const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const nodemailer = require("nodemailer");
const fs = require("fs");
const fsPromises = require("fs").promises;
const swaggerUi = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");
const Redis = require("ioredis");

// =============================================================================
// REDIS CACHE SETUP
// =============================================================================
let redisClient = null;
let redisAvailable = false;

(async () => {
  try {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && !redisHost) {
      console.log("[Redis] No REDIS_URL or REDIS_HOST set — skipping");
      return;
    }

    if (redisUrl) {
      // Upstash / cloud Redis — URL includes credentials and TLS
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 8000,
        tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
      });
    } else {
      redisClient = new Redis({
        host: redisHost,
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });
    }

    redisClient.on("error", (err) => {
      redisAvailable = false;
      console.log("[Redis] Error:", err.message);
    });

    await redisClient.ping();
    redisAvailable = true;
    console.log("[Redis] Connected — caching enabled");
  } catch (err) {
    redisAvailable = false;
    console.log("[Redis] Connection failed:", err.message);
  }
})();

async function cacheGet(key) {
  if (!redisAvailable) return null;
  try {
    const v = await redisClient.get(key);
    return v ? JSON.parse(v) : null;
  } catch (_) { return null; }
}

async function cacheSet(key, value, ttlSeconds = 60) {
  if (!redisAvailable) return;
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (_) {}
}

async function cacheDel(pattern) {
  if (!redisAvailable) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(...keys);
  } catch (_) {}
}

// =============================================================================
// MIDDLEWARE IMPORTS - Individual Contributions (Role-Based)
// =============================================================================

// Chetan - Admin & Delivery Admin Dashboard Security
// Responsible for: Admin Dashboard, Delivery Dashboard, User Management
const helmet = require("helmet"); // Security headers for admin panels (XSS, clickjacking protection)
const rateLimit = require("express-rate-limit"); // Prevent brute-force attacks on admin/auth routes

// Harsha - Manager Dashboard Middleware
// Responsible for: Manager Dashboard, Production Milestones, Assign Delivery
const bodyParser = require("body-parser"); // Parse production/milestone form data
const morgan = require("morgan"); // HTTP logging for tracking production activities

// Kumar - 3D Design Studio Performance
// Responsible for: 3D Design Studio, Three.js Preview, Designer Selection, Customization
const compression = require("compression"); // Compress 3D models, images, and design assets

// Responsible for: Designer Dashboard, Design Upload, Send to Customer/Manager
const multer = require("multer"); // Handle design file uploads
// fsPromises already imported above for file system operations

// Hari - Customer Checkout & Session Security
// Responsible for: Home, Shop, Cart, Checkout, Order Tracking, OTP Verification
const cookieParser = require("cookie-parser"); // Manage cart sessions and cookies
// Custom CSRF protection for secure checkout process

const net = require("net");

const app = express();
const PREFERRED_PORT = parseInt(process.env.PORT, 10) || 5174;

function findFreePort(startPort) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(startPort, "0.0.0.0", () => {
      srv.close(() => resolve(startPort));
    });
    srv.on("error", () => resolve(findFreePort(startPort + 1)));
  });
}

// Email transporter setup using Gmail
// Set environment variables: EMAIL_USER and EMAIL_PASS
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "kumaritsme1510@gmail.com",
    pass: process.env.EMAIL_PASS || "pgyeutxrkqmbvybq",
  },
});

// Verify email transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.log("⚠️  Email service not configured:", error.message);
    console.log(
      "   To enable email 2FA, set up Gmail App Password in server.cjs",
    );
  } else {
    console.log("✅ Email service ready to send messages");
  }
});

// OTP helpers — backed by MongoDB so codes survive server restarts
const verificationCodes = {
  set: async (email, data) => {
    await OtpCode.findOneAndUpdate(
      { email },
      { email, code: data.code, purpose: data.purpose, expiresAt: new Date(data.expiresAt) },
      { upsert: true, new: true }
    );
  },
  get: async (email) => {
    const doc = await OtpCode.findOne({ email });
    if (!doc) return null;
    return { code: doc.code, purpose: doc.purpose, expiresAt: doc.expiresAt.getTime() };
  },
  delete: async (email) => {
    await OtpCode.deleteOne({ email });
  },
};

// Generate 6-digit code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to send email
const sendVerificationEmail = async (to, code, purpose) => {
  const subject =
    purpose === "2fa_login"
      ? "Login Verification Code - DesignDen"
      : "Enable Two-Factor Authentication - DesignDen";

  const title =
    purpose === "2fa_login"
      ? "Login Verification"
      : "Enable Two-Factor Authentication";

  const mailOptions = {
    from: '"DesignDen Security" <kumaritsme1510@gmail.com>',
    to: to,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">👕 DesignDen</h1>
          <p style="color: #6b7280; margin-top: 5px;">Custom Clothing Platform</p>
        </div>
        
        <div style="background: #f9fafb; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
          <p style="color: #4b5563;">Your verification code is:</p>
          
          <div style="background: #4F46E5; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; border-radius: 8px; display: inline-block; margin: 20px 0;">
            ${code}
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This code will expire in <strong>5 minutes</strong>.
          </p>
          <p style="color: #9ca3af; font-size: 12px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2026 DesignDen. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  // Always log the code to console for development
  console.log(`\n📧 2FA Code for ${to}: ${code}`);
  console.log(`Purpose: ${purpose}`);
  console.log(`Code expires in 5 minutes\n`);

  // Try to send email, but don't fail if it doesn't work
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.log(`⚠️  Email service unavailable - Code shown in console above`);
    // Don't throw error - we'll still return the code for development
  }

  // Return success - code is available in console
  return Promise.resolve();
};

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/designden";
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  name: String, // Full name for display
  email: String,
  password: String,
  contactNumber: String,
  role: String,
  approved: { type: Boolean, default: true },
  // 2FA fields (email-based)
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorMethod: { type: String, default: "email" }, // email
  addresses: [
    {
      street: String,
      city: String,
      state: String,
      pincode: String,
      isDefault: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  // Designer Profile Fields
  designerProfile: {
    bio: { type: String, default: "" },
    specializations: [{ type: String }], // e.g., ["T-Shirts", "Ethnic Wear", "Casual", "Formal"]
    experience: { type: Number, default: 0 }, // Years of experience
    portfolio: [
      {
        title: String,
        description: String,
        image: String, // URL to portfolio image
        category: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    availabilityStatus: {
      type: String,
      enum: ["available", "busy", "not_accepting"],
      default: "available",
    },
    priceRange: {
      min: { type: Number, default: 500 },
      max: { type: Number, default: 5000 },
    },
    turnaroundDays: { type: Number, default: 7 }, // Average days to complete
    designFee: { type: Number, default: 500 }, // Fixed design fee charged to customers
    featuredWork: String, // URL to featured design image
    badges: [{ type: String }], // e.g., ["Top Rated", "Fast Delivery", "Premium Designer"]
  },
});

const User = mongoose.model("User", userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  gender: String,
  price: Number,
  sizes: [String],
  colors: [String],
  patterns: [String],
  fabrics: [String],
  images: [String],
  inStock: Boolean,
  stockQuantity: Number,
  featured: Boolean,
  customizable: Boolean,
  modelPath: String,
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.model("Product", productSchema);

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      designId: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
      customizationId: { type: mongoose.Schema.Types.ObjectId },
      quantity: Number,
      size: String,
      color: String,
      addedAt: { type: Date, default: Date.now },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

const Cart = mongoose.model("Cart", cartSchema);

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

// ============================================
// DELIVERY PARTNER SCHEMA (Like Ekart/Delhivery)
// ============================================
const deliveryPartnerSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "DesignDen Express", "Swift Delivery"
  code: { type: String, required: true, unique: true }, // e.g., "DDE", "SWD"
  logo: String,
  contactNumber: String,
  email: String,
  trackingUrlTemplate: String, // e.g., "https://track.dde.com/{trackingNumber}"
  avgDeliveryDays: { type: Number, default: 3 },
  rating: { type: Number, default: 4.5 },
  isActive: { type: Boolean, default: true },
  serviceablePincodes: [String],
  createdAt: { type: Date, default: Date.now },
});

const DeliveryPartner = mongoose.model(
  "DeliveryPartner",
  deliveryPartnerSchema,
);

// ============================================
// CHAT/MESSAGE SCHEMA (Customer-Designer Communication)
// ============================================
const messageSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderRole: {
    type: String,
    enum: ["customer", "designer", "manager"],
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverRole: {
    type: String,
    enum: ["customer", "designer", "manager"],
    required: true,
  },
  message: { type: String, required: true },
  attachments: [
    {
      type: { type: String, enum: ["image", "file"] },
      url: String,
      name: String,
    },
  ],
  read: { type: Boolean, default: false },
  readAt: Date,
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ orderId: 1, createdAt: -1 });
const Message = mongoose.model("Message", messageSchema);

// ============================================
// PRODUCTION MILESTONE SCHEMA (Designer Progress Tracking)
// ============================================
const productionMilestoneSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  designerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  milestone: {
    type: String,
    enum: [
      "design_review", // Reviewing customer's design requirements
      "fabric_selection", // Selecting and preparing fabric
      "cutting", // Cutting fabric pieces
      "stitching", // Main stitching work
      "embroidery", // Adding embroidery/prints if any
      "finishing", // Final touches and finishing
      "quality_check", // Quality inspection
      "packaging", // Packing the finished product
      "ready_for_pickup", // Ready to hand over to delivery
    ],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed"],
    default: "pending",
  },
  notes: String,
  images: [String], // Progress images
  estimatedCompletion: Date,
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

const ProductionMilestone = mongoose.model(
  "ProductionMilestone",
  productionMilestoneSchema,
);

// ============================================
// ENHANCED ORDER SCHEMA (Real-world Tracking)
// ============================================
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderNumber: { type: String, unique: true }, // Human-readable order number like "DD-20231201-001"
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      designId: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
      quantity: { type: Number, required: true },
      size: String,
      color: String,
      price: Number,
    },
  ],
  totalAmount: { type: Number, required: true },

  // Order Type Detection
  orderType: { type: String, enum: ["shop", "custom"], default: "shop" },

  // Status with detailed workflow
  status: {
    type: String,
    enum: [
      // ===== COMMON STATUSES =====
      "pending", // Order placed, payment pending/completed
      "assigned_to_manager", // Auto-assigned to manager
      "confirmed", // Order confirmed, assigned to manager
      "processing", // Manager processing the order

      // ===== CUSTOM ORDER - DESIGN PHASE =====
      "assigned_to_designer", // Manager assigned to designer
      "designer_accepted", // Designer accepted the order
      "design_in_progress", // Designer creating the design
      "design_pending_customer_approval", // Designer submitted, awaiting customer approval
      "design_approved_by_customer", // Customer approved the design
      "design_rejected_by_customer", // Customer rejected, needs revision
      "design_ready", // Designer submitted to manager after customer approval
      "design_approved", // Manager approved design
      "design_rejected", // Manager rejected design, needs revision

      // ===== CUSTOM ORDER - PRODUCTION PHASE =====
      "in_production", // Manager is handling production
      "production_milestone", // Manager sharing production progress
      "production_completed", // Production finished, QC passed

      // ===== DELIVERY FLOW =====
      "ready_for_pickup", // Ready for delivery partner pickup
      "picked_up", // Delivery partner picked up
      "in_transit", // In transit to delivery hub
      "out_for_delivery", // Out for final delivery
      "delivered", // Successfully delivered

      // ===== OTHER STATUSES =====
      "cancelled", // Order cancelled
      "return_requested", // Customer requested return
      "returned", // Order returned
    ],
    default: "pending",
  },

  // Payment Details
  paymentMethod: {
    type: String,
    enum: ["card", "upi", "netbanking", "cod", "wallet"],
    default: "card",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  paymentDetails: {
    transactionId: String,
    paidAt: Date,
    amount: Number,
  },

  // Shipping Address
  shippingAddress: {
    name: String,
    email: String,
    phone: String,
    alternativePhone: String,
    street: String,
    landmark: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: "India" },
    addressType: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },
  },

  // ===== DELIVERY PARTNER INTEGRATION (Like Ekart) =====
  deliveryPartner: {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner" },
    partnerName: String,
    trackingNumber: String,
    trackingUrl: String,
    awbNumber: String, // Air Waybill Number
  },

  // Delivery Scheduling
  deliverySlot: {
    date: Date,
    timeSlot: String, // e.g., "9AM-12PM", "12PM-3PM", "3PM-6PM", "6PM-9PM"
  },
  estimatedDelivery: {
    from: Date,
    to: Date,
  },
  actualDelivery: Date,

  // Delivery OTP (Like Flipkart)
  deliveryOTP: {
    code: String, // 4-digit OTP
    generatedAt: Date,
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
  },

  // Proof of Delivery
  proofOfDelivery: {
    signature: String, // Base64 signature image
    photo: String, // Delivery photo
    receivedBy: String, // Name of person who received
    relationship: String, // e.g., "Self", "Family", "Security"
    notes: String,
  },

  // Real-time Tracking (Simulated GPS)
  liveTracking: {
    isActive: { type: Boolean, default: false },
    currentLocation: {
      lat: Number,
      lng: Number,
      address: String,
      updatedAt: Date,
    },
    deliveryPersonLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
  },

  // Personnel Assignment
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  designerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deliveryPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // Assignment Timestamps
  managerAssignedAt: Date,
  designerAssignedAt: Date,
  designerAcceptedAt: Date,
  designSubmittedAt: Date,
  designApprovedAt: Date,
  designRejectedAt: Date,
  deliveryAssignedAt: Date,
  productionStartedAt: Date,
  productionCompletedAt: Date,
  pickedUpAt: Date,
  deliveredAt: Date,

  // Design Files (uploaded by designer for customer approval)
  designFiles: [
    {
      url: String, // File URL or path (base64 encoded)
      name: String, // Original filename
      type: String, // image, pdf, etc.
      uploadedAt: Date,
      uploadedBy: String, // User ID as string
    },
  ],

  // Design Approval System
  designApproval: {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: Date,
    rejectionReason: String,
    revisionCount: { type: Number, default: 0 },
  },

  // Customer approval tracking
  customerApprovedAt: Date,
  customerRejectedAt: Date,
  designRejection: {
    reason: String,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: Date,
    revisionCount: { type: Number, default: 0 },
  },

  // Custom Order Progress (Design Phase - Designer handles)
  designProgress: { type: Number, default: 0, min: 0, max: 100 },
  designMilestones: [
    {
      name: String,
      status: { type: String, enum: ["pending", "in_progress", "completed"] },
      completedAt: Date,
      notes: String,
    },
  ],

  // Production Progress (Production Phase - Manager handles)
  progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
  currentMilestone: String,
  milestones: [
    {
      name: String,
      status: { type: String, enum: ["pending", "in_progress", "completed"] },
      completedAt: Date,
      notes: String,
    },
  ],

  // Communication
  chatEnabled: { type: Boolean, default: false },
  unreadMessages: { type: Number, default: 0 },

  // Feedback & Rating
  hasFeedback: { type: Boolean, default: false },
  rating: {
    overall: Number,
    delivery: Number,
    product: Number,
    service: Number,
    review: String,
    ratedAt: Date,
  },

  // Timeline (Comprehensive Event Log)
  timeline: [
    {
      status: String,
      note: String,
      location: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      byRole: String,
      at: { type: Date, default: Date.now },
    },
  ],

  // Metadata
  source: { type: String, enum: ["web", "mobile", "admin"], default: "web" },
  ipAddress: String,
  userAgent: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Helper method to determine order type
orderSchema.methods.isCustomOrder = function () {
  return (
    this.orderType === "custom" ||
    this.items.some((item) => item.designId && !item.productId)
  );
};

orderSchema.methods.isShopOrder = function () {
  return (
    this.orderType === "shop" || this.items.every((item) => item.productId)
  );
};

// Generate order number
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await Order.countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      },
    });
    this.orderNumber = `DD-${dateStr}-${String(count + 1).padStart(4, "0")}`;
  }

  // Set order type based on items
  if (!this.orderType) {
    this.orderType = this.items.some((item) => item.designId && !item.productId)
      ? "custom"
      : "shop";
  }

  // Enable chat for custom orders
  if (this.orderType === "custom") {
    this.chatEnabled = true;
  }

  this.updatedAt = new Date();
  next();
});

const Order = mongoose.model("Order", orderSchema);

// Design Schema (Custom Designs)
const designSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  designerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  category: String,
  fabric: String,
  color: String,
  pattern: String,
  size: String,
  graphic: String,
  customText: String,
  estimatedPrice: Number,
  basePrice: { type: Number, default: 500 },
  sustainabilityScore: Number,
  inStock: { type: Boolean, default: true },
  previewImage: String, // Base64 encoded 3D preview image
  createdAt: { type: Date, default: Date.now },
});

const Design = mongoose.model("Design", designSchema);

// OTP / Verification Code Schema — persistent across server restarts
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  purpose: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});
const OtpCode = mongoose.model("OtpCode", otpSchema);

// Wishlist Schema
const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  designId: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
  addedAt: { type: Date, default: Date.now },
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  message: { type: String, required: true },
  type: { type: String, default: "info" }, // info, success, warning, error
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", notificationSchema);

// =============================================================================
// DB INDEXES — Query optimization (compound + single field)
// =============================================================================
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, approved: 1 });
userSchema.index({ "designerProfile.isAvailable": 1, "designerProfile.rating": -1 });

productSchema.index({ category: 1, gender: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ inStock: 1, price: 1 });
productSchema.index({ name: "text", description: "text" });

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ designerId: 1, status: 1 });
orderSchema.index({ deliveryPersonId: 1, status: 1 });
orderSchema.index({ managerId: 1, status: 1 });
orderSchema.index({ orderNumber: 1 }, { unique: true, sparse: true });

cartSchema.index({ userId: 1 }, { unique: true, sparse: true });
wishlistSchema.index({ userId: 1, designId: 1 });
designSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Review Schema
const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true },
  comment: { type: String, required: true },
  verified: { type: Boolean, default: false }, // Verified purchase
  helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users who found it helpful
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for efficient queries
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1 });

const Review = mongoose.model("Review", reviewSchema);

// Designer Portfolio Schema - For designers to showcase their work
const designerPortfolioSchema = new mongoose.Schema({
  designerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  description: String,
  category: { type: String, default: "T-Shirt" },
  style: { type: String, default: "Casual" },
  basePrice: { type: Number, default: 500 },
  images: [String], // Array of image URLs
  graphic: String, // Main graphic image path
  tags: [String],
  isActive: { type: Boolean, default: true },
  inStock: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

designerPortfolioSchema.index({ designerId: 1, isActive: 1 });
designerPortfolioSchema.index({ category: 1 });
designerPortfolioSchema.index({ tags: 1 });

const DesignerPortfolio = mongoose.model(
  "DesignerPortfolio",
  designerPortfolioSchema,
);

// ============================================
// DESIGNER EARNINGS & PAYOUT SYSTEM
// ============================================

// Platform Commission Configuration
const PLATFORM_CONFIG = {
  defaultDesignerRate: 50, // Designer gets 50% (no production work)
  defaultPlatformRate: 50, // Platform gets 50% (covers production, delivery, operations)
  minimumPayout: 500, // Minimum payout amount in INR
  payoutHoldDays: 7, // Days to hold earnings before eligible for payout
  tiers: [
    { minEarnings: 0, designerRate: 50 },
    { minEarnings: 10000, designerRate: 52 },
    { minEarnings: 50000, designerRate: 55 },
    { minEarnings: 100000, designerRate: 58 },
  ],
};

// Designer Earnings Schema
const designerEarningsSchema = new mongoose.Schema({
  designerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  orderAmount: { type: Number, required: true },
  commissionRate: { type: Number, required: true },
  designerEarning: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "available", "processing", "paid"],
    default: "pending",
  },
  availableDate: Date, // Date when earnings become available for payout
  paidAt: Date,
  payoutRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PayoutRequest",
  },
  createdAt: { type: Date, default: Date.now },
});

designerEarningsSchema.index({ designerId: 1, status: 1 });
designerEarningsSchema.index({ orderId: 1 });

const DesignerEarning = mongoose.model(
  "DesignerEarning",
  designerEarningsSchema,
);

// Payout Request Schema
const payoutRequestSchema = new mongoose.Schema({
  designerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ["bank_transfer", "upi", "paypal"],
    required: true,
  },
  paymentDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String,
    upiId: String,
    paypalEmail: String,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "processing", "completed", "rejected"],
    default: "pending",
  },
  adminNotes: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin who processed
  processedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

payoutRequestSchema.index({ designerId: 1, status: 1 });

const PayoutRequest = mongoose.model("PayoutRequest", payoutRequestSchema);

// Helper function to calculate designer commission rate based on total earnings
const getDesignerCommissionRate = async (designerId) => {
  const totalEarnings = await DesignerEarning.aggregate([
    {
      $match: {
        designerId: new mongoose.Types.ObjectId(designerId),
        status: { $in: ["available", "processing", "paid"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$designerEarning" } } },
  ]);

  const total = totalEarnings[0]?.total || 0;

  // Find applicable tier
  let rate = PLATFORM_CONFIG.defaultDesignerRate;
  for (const tier of PLATFORM_CONFIG.tiers) {
    if (total >= tier.minEarnings) {
      rate = tier.designerRate;
    }
  }
  return rate;
};

// Helper function to create designer earning record
const createDesignerEarning = async (orderId, designerId, orderAmount) => {
  try {
    const commissionRate = await getDesignerCommissionRate(designerId);
    const designerEarning = Math.round((orderAmount * commissionRate) / 100);
    const platformFee = orderAmount - designerEarning;

    // Earnings become available after hold period
    const availableDate = new Date();
    availableDate.setDate(
      availableDate.getDate() + PLATFORM_CONFIG.payoutHoldDays,
    );

    const earning = new DesignerEarning({
      designerId,
      orderId,
      orderAmount,
      commissionRate,
      designerEarning,
      platformFee,
      status: "pending",
      availableDate,
    });

    await earning.save();
    console.log(
      `Created earning record: ₹${designerEarning} for designer ${designerId}`,
    );
    return earning;
  } catch (error) {
    console.error("Error creating designer earning:", error);
    throw error;
  }
};

// =============================================================================
// MIDDLEWARE CONFIGURATION - Individual Contributions (Role-Based)
// =============================================================================

// -----------------------------------------------------------------------------
// CHETAN - Admin & Delivery Dashboard Security Middleware
// Role: Admin Dashboard, Delivery Admin Dashboard, User Management
// -----------------------------------------------------------------------------

// Helmet: Sets various HTTP headers for security
// Essential for Admin panels - Protects against: XSS, clickjacking, MIME sniffing
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for development (enable in production)
    crossOriginEmbedderPolicy: false, // Allow 3D models loading
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images from different origin
  }),
);
console.log("✅ Helmet security middleware enabled (Chetan - Admin Security)");

// -----------------------------------------------------------------------------
// KUMAR - 3D Design Studio Performance Middleware
// Role: 3D Design Studio, Three.js Preview, Designer Selection, Customization
// -----------------------------------------------------------------------------

// Compression: Gzip compress 3D models, textures, and design assets
// Critical for 3D Design Studio performance with large model files
app.use(
  compression({
    level: 6, // Compression level (1-9) - balanced for 3D assets
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Enable compression for 3D model routes and design assets
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);
console.log("✅ Compression middleware enabled (Kumar - 3D Design Studio)");

// -----------------------------------------------------------------------------
// HARSHA - Manager Dashboard Middleware
// Role: Manager Dashboard, Production Milestones, Assign Delivery
// -----------------------------------------------------------------------------

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Morgan: HTTP request logging to file
// Essential for Manager to track production activities and delivery assignments
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "logs", "access.log"),
  { flags: "a" }, // Append mode
);

// Morgan format: Combined Apache-style logs for production tracking
app.use(morgan("combined", { stream: accessLogStream })); // Log to file
app.use(morgan("dev")); // Log to console (colored)
console.log(
  "✅ Morgan logging middleware enabled (Harsha - Manager Production Tracking)",
);

// Body Parser: Parse production milestone and delivery assignment form data
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
console.log("✅ Body-parser middleware enabled (Harsha - Manager Forms)");

// -----------------------------------------------------------------------------
// HARI - Customer Checkout & Session Security Middleware
// Role: Home, Shop, Cart, Checkout, Order Tracking, OTP Verification
// -----------------------------------------------------------------------------

// Cookie Parser: Manage cart sessions and user preferences
// Essential for shopping cart persistence and checkout process
app.use(cookieParser());
console.log("✅ Cookie-parser middleware enabled (Hari - Cart Sessions)");

// Custom CSRF Protection (Session-based)
// Critical for secure checkout and payment forms
const crypto = require("crypto");

// Generate CSRF Token for checkout security
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// CSRF Protection Middleware - Protects Cart and Checkout from CSRF attacks
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests (safe methods)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const token = req.headers["x-csrf-token"] || req.body._csrf;
  const sessionToken = req.session.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token - Checkout security violation",
    });
  }
  next();
};

console.log(
  "✅ CSRF protection middleware configured (Hari - Checkout Security)",
);

// -----------------------------------------------------------------------------
// CHETAN - Admin Rate Limiting & Brute-Force Protection
// Role: Admin Dashboard, Delivery Admin Dashboard, User Management
// -----------------------------------------------------------------------------

// General API Rate Limiter - Protects all admin API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again after 30 seconds",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict Admin Login Rate Limiter (Brute-force protection)
// Prevents unauthorized access to Admin and Delivery dashboards
const loginLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: "Too many login attempts, please try again after 30 seconds",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Store rate limiters for admin route protection
app.set("apiLimiter", apiLimiter);
app.set("loginLimiter", loginLimiter);
console.log(
  "✅ Rate limiting middleware configured (Chetan - Admin Protection)",
);

// -----------------------------------------------------------------------------
// MANOJ - Designer Dashboard File Upload Middleware
// Role: Designer Dashboard, Design Upload, Send to Customer/Manager
// -----------------------------------------------------------------------------

// Create upload directories using fs/promises for design files
// Essential for Designer Dashboard file management
const uploadDirs = [
  "public/uploads/designs", // Designer created designs
  "public/uploads/portfolios", // Designer portfolio images
  "public/uploads/products", // Product images
];

// Use fsPromises for async directory creation (Manoj - fs/promises)
uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Multer Storage Configuration for Designer uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Route designs to appropriate folders
    let folder = "public/uploads/designs"; // Default for designer uploads
    if (req.baseUrl.includes("portfolio") || req.path.includes("portfolio")) {
      folder = "public/uploads/portfolios"; // Designer portfolio
    } else if (
      req.baseUrl.includes("product") ||
      req.path.includes("product")
    ) {
      folder = "public/uploads/products";
    }
    cb(null, path.join(__dirname, folder));
  },
  filename: function (req, file, cb) {
    // Generate unique filename for designer uploads: timestamp-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// File Filter: Only allow design file types (images and PDFs)
// Validates files uploaded by designers
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "application/pdf", // Design specifications
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPG, PNG, GIF and PDF allowed."),
      false,
    );
  }
};

// Multer Upload Instance for Designer Dashboard
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for design files
    files: 5, // Max 5 design files at once
  },
});

// Store upload middleware for Designer routes
app.set("upload", upload);
console.log(
  "✅ Multer file upload middleware configured (Manoj - Designer Uploads)",
);

// -----------------------------------------------------------------------------
// Helper function to delete uploaded files (Manoj)
// -----------------------------------------------------------------------------
const deleteFile = async (filePath) => {
  try {
    await fsPromises.unlink(filePath);
    console.log(`File deleted: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error deleting file: ${filePath}`, error);
    return false;
  }
};

app.set("deleteFile", deleteFile);

// Trust reverse proxy (required on Render/Heroku so secure cookies work over HTTPS)
app.set("trust proxy", 1);

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

const allowedOrigins = [
  /^http:\/\/localhost:\d+$/, // Local development
  "https://design-den1.vercel.app", // Vercel production
  /^https:\/\/design-den1.*\.vercel\.app$/, // Vercel preview deployments
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some((pattern) => {
        if (typeof pattern === "string") {
          return origin === pattern;
        } else if (pattern instanceof RegExp) {
          return pattern.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        return callback(null, true);
      }

      console.log("⚠️  CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    exposedHeaders: ["X-Cache", "X-Cache-Key", "X-Cache-TTL"],
  }),
);

// =============================================================================
// STATIC FILES & SESSION
// =============================================================================

// Serve static files
app.use("/images", express.static(path.join(__dirname, "public/images")));
app.use("/models", express.static(path.join(__dirname, "public/models")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Session configuration
// isProd: true when running on Render (RENDER env var) or NODE_ENV=production
const isProd = process.env.NODE_ENV === "production" || !!process.env.RENDER;

// MongoDB-backed session store — sessions survive server restarts and spin-downs on Render
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/designden",
  dbName: "designden",
  collectionName: "sessions",
  ttl: 24 * 60 * 60, // 24 hours (seconds)
  autoRemove: "native", // Use MongoDB TTL index to auto-expire
  touchAfter: 3 * 3600, // Lazy session update: only save if data changed OR 3h passed
});

sessionStore.on("error", (err) => {
  console.error("[Session Store] MongoDB session store error:", err);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "designden_secret_key_12345",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: sessionStore,
    cookie: {
      secure: isProd,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: isProd ? "none" : "lax",
    },
  }),
);

// =============================================================================
// SWAGGER / OPENAPI DOCUMENTATION
// =============================================================================

const apiServerUrl = process.env.API_BASE_URL || `http://localhost:${PREFERRED_PORT}`;

const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "DesignDen API",
      version: "2.0.0",
      description: `
# DesignDen REST API - Complete Documentation

DesignDen is a custom clothing design platform with role-based access control (RBAC).

## Authentication
All authenticated endpoints use **session-based authentication** with cookies.
1. Call \`POST /api/auth/login\` with email/password
2. The server sets a \`connect.sid\` session cookie
3. Include this cookie in subsequent requests
4. For state-changing operations (POST/PUT/DELETE), include CSRF token in \`x-csrf-token\` header

## User Roles
| Role | Description | Access Level |
|------|-------------|--------------|
| **customer** | End users who shop and create custom designs | Cart, Orders, Wishlist, Design Studio |
| **designer** | Professional designers who fulfill custom orders | Design orders, Portfolio, Earnings |
| **manager** | Staff who manage production workflow | Assign orders, Track production, Manage inventory |
| **admin** | System administrators | Full access to all resources |
| **delivery** | Delivery personnel | Pickup and deliver orders |

## 2FA Support
Two-factor authentication via email is supported. When enabled:
1. Login returns \`requires2FA: true\`
2. User receives verification code via email
3. Resend with \`POST /api/auth/2fa/send-login-code\`
4. Complete login by including \`twoFactorCode\` in login request
      `,
      contact: {
        name: "DesignDen Support",
        email: "kumaritsme1510@gmail.com",
      },
    },
    servers: [
      {
        url: apiServerUrl,
        description: "Active API server",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication and session management" },
      { name: "2FA", description: "Two-factor authentication" },
      { name: "Security", description: "CSRF tokens and security utilities" },
      { name: "Shop", description: "Public product catalog" },
      { name: "Cart", description: "Shopping cart operations (Customer)" },
      { name: "Checkout", description: "Order placement (Customer)" },
      { name: "Customer Orders", description: "Order management for customers" },
      { name: "Design Studio", description: "Custom design creation (Customer)" },
      { name: "Wishlist", description: "Product wishlist (Customer)" },
      { name: "Addresses", description: "Shipping addresses (Customer)" },
      { name: "Reviews", description: "Product reviews" },
      { name: "Designer Dashboard", description: "Designer order management" },
      { name: "Designer Portfolio", description: "Designer profile and portfolio" },
      { name: "Designer Earnings", description: "Designer payouts and earnings" },
      { name: "Manager Dashboard", description: "Production management" },
      { name: "Manager - Designers", description: "Designer assignment and management" },
      { name: "Manager - Delivery", description: "Delivery assignment" },
      { name: "Manager - Products", description: "Product inventory management" },
      { name: "Admin Dashboard", description: "System administration" },
      { name: "Admin - Users", description: "User management" },
      { name: "Admin - Payouts", description: "Payout processing" },
      { name: "Delivery Dashboard", description: "Delivery person operations" },
      { name: "Order Tracking", description: "Order status and tracking" },
      { name: "Messaging", description: "Order-related communication" },
      { name: "Production", description: "Production milestones" },
      { name: "Marketplace", description: "Public designer marketplace" },
      { name: "Feedback", description: "Customer feedback" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
        },
        csrfHeader: {
          type: "apiKey",
          in: "header",
          name: "x-csrf-token",
        },
      },
      schemas: {
        // ===== USER & AUTH SCHEMAS =====
        UserSession: {
          type: "object",
          properties: {
            id: { type: "string", description: "User MongoDB ObjectId" },
            username: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            role: {
              type: "string",
              enum: ["customer", "designer", "manager", "admin", "delivery"],
              description: "User role determining access permissions",
            },
            contactNumber: { type: "string" },
            approved: { type: "boolean", description: "Whether account is approved (designers/managers require approval)" },
            twoFactorEnabled: { type: "boolean" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "customer@example.com" },
            password: { type: "string", example: "password123" },
            twoFactorCode: { type: "string", description: "6-digit 2FA code (required if 2FA enabled)", example: "123456" },
          },
        },
        SignupRequest: {
          type: "object",
          required: ["username", "email", "password"],
          properties: {
            username: { type: "string", example: "johndoe" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", format: "email", example: "john@example.com" },
            password: { type: "string", minLength: 6, example: "password123" },
            contactNumber: { type: "string", example: "+91 9876543210" },
            role: {
              type: "string",
              enum: ["customer", "designer", "manager", "delivery"],
              default: "customer",
              description: "Designer/Manager roles require admin approval",
            },
          },
        },
        
        // ===== PRODUCT SCHEMAS =====
        Product: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "Cotton T-Shirt" },
            description: { type: "string" },
            category: { type: "string", example: "T-Shirt" },
            gender: { type: "string", enum: ["Men", "Women", "Unisex"] },
            price: { type: "number", example: 599 },
            sizes: { type: "array", items: { type: "string" }, example: ["S", "M", "L", "XL"] },
            colors: { type: "array", items: { type: "string" }, example: ["White", "Black", "Blue"] },
            images: { type: "array", items: { type: "string" } },
            inStock: { type: "boolean" },
            stockQuantity: { type: "integer" },
            featured: { type: "boolean" },
            customizable: { type: "boolean" },
          },
        },
        ProductCreateRequest: {
          type: "object",
          required: ["name", "price", "category"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            gender: { type: "string" },
            price: { type: "number" },
            sizes: { type: "array", items: { type: "string" } },
            colors: { type: "array", items: { type: "string" } },
            images: { type: "array", items: { type: "string" } },
            inStock: { type: "boolean", default: true },
            stockQuantity: { type: "integer", default: 0 },
          },
        },
        
        // ===== CART SCHEMAS =====
        CartItem: {
          type: "object",
          properties: {
            _id: { type: "string" },
            productId: { type: "string", description: "Product ObjectId for shop items" },
            designId: { type: "string", description: "Design ObjectId for custom items" },
            quantity: { type: "integer", minimum: 1 },
            size: { type: "string" },
            color: { type: "string" },
            addedAt: { type: "string", format: "date-time" },
          },
        },
        CartResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            cart: {
              type: "object",
              properties: {
                _id: { type: "string" },
                userId: { type: "string" },
                items: { type: "array", items: { $ref: "#/components/schemas/CartItem" } },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
        AddToCartRequest: {
          type: "object",
          required: ["quantity"],
          properties: {
            productId: { type: "string", description: "Product ObjectId (for shop items)" },
            designId: { type: "string", description: "Design ObjectId (for custom items)" },
            quantity: { type: "integer", minimum: 1, example: 1 },
            size: { type: "string", example: "M" },
            color: { type: "string", example: "Blue" },
          },
        },
        
        // ===== ADDRESS SCHEMAS =====
        ShippingAddress: {
          type: "object",
          required: ["name", "phone", "street", "city", "state", "zipCode"],
          properties: {
            name: { type: "string", example: "John Doe" },
            email: { type: "string", format: "email" },
            phone: { type: "string", example: "+91 9876543210" },
            alternativePhone: { type: "string" },
            street: { type: "string", example: "123 Main Street" },
            landmark: { type: "string" },
            city: { type: "string", example: "Mumbai" },
            state: { type: "string", example: "Maharashtra" },
            zipCode: { type: "string", example: "400001" },
            country: { type: "string", default: "India" },
            addressType: { type: "string", enum: ["home", "work", "other"], default: "home" },
          },
        },
        SavedAddress: {
          type: "object",
          properties: {
            _id: { type: "string" },
            street: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            pincode: { type: "string" },
            isDefault: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        
        // ===== ORDER SCHEMAS =====
        OrderStatus: {
          type: "string",
          enum: [
            "pending", "assigned_to_manager", "confirmed", "processing",
            "assigned_to_designer", "designer_accepted", "design_in_progress",
            "design_pending_customer_approval", "design_approved_by_customer", "design_rejected_by_customer",
            "design_ready", "design_approved", "design_rejected",
            "in_production", "production_milestone", "production_completed",
            "ready_for_pickup", "picked_up", "in_transit", "out_for_delivery", "delivered",
            "cancelled", "return_requested", "returned"
          ],
          description: "Order workflow status",
        },
        OrderSummary: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderNumber: { type: "string", example: "DD-20260302-0001" },
            status: { $ref: "#/components/schemas/OrderStatus" },
            orderType: { type: "string", enum: ["shop", "custom"] },
            totalAmount: { type: "number" },
            paymentMethod: { type: "string", enum: ["card", "upi", "netbanking", "cod", "wallet"] },
            paymentStatus: { type: "string", enum: ["pending", "completed", "failed", "refunded"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        OrderDetail: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderNumber: { type: "string" },
            userId: { $ref: "#/components/schemas/UserSession" },
            items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
            totalAmount: { type: "number" },
            status: { $ref: "#/components/schemas/OrderStatus" },
            orderType: { type: "string", enum: ["shop", "custom"] },
            designerId: { type: "string", description: "Assigned designer (custom orders)" },
            deliveryPersonId: { type: "string", description: "Assigned delivery person" },
            shippingAddress: { $ref: "#/components/schemas/ShippingAddress" },
            paymentMethod: { type: "string" },
            paymentStatus: { type: "string" },
            progressPercentage: { type: "integer", minimum: 0, maximum: 100 },
            designProgress: { type: "integer", minimum: 0, maximum: 100 },
            timeline: { type: "array", items: { $ref: "#/components/schemas/TimelineEvent" } },
            designFiles: { type: "array", items: { $ref: "#/components/schemas/DesignFile" } },
            deliveryOTP: { type: "object", properties: { code: { type: "string" } } },
            estimatedDelivery: { type: "object", properties: { from: { type: "string", format: "date" }, to: { type: "string", format: "date" } } },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        OrderItem: {
          type: "object",
          properties: {
            productId: { type: "string" },
            designId: { type: "string" },
            quantity: { type: "integer" },
            size: { type: "string" },
            color: { type: "string" },
            price: { type: "number" },
          },
        },
        TimelineEvent: {
          type: "object",
          properties: {
            status: { type: "string" },
            message: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            actor: { type: "string" },
          },
        },
        
        // ===== DESIGN SCHEMAS =====
        Design: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "Custom Dragon T-Shirt" },
            category: { type: "string" },
            gender: { type: "string" },
            fabric: { type: "string" },
            color: { type: "string" },
            pattern: { type: "string" },
            size: { type: "string" },
            graphic: { type: "string" },
            customText: { type: "string" },
            estimatedPrice: { type: "number" },
            previewImage: { type: "string", description: "Base64 encoded preview" },
            userId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        DesignCreateRequest: {
          type: "object",
          required: ["name", "category"],
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            gender: { type: "string" },
            fabric: { type: "string" },
            color: { type: "string" },
            pattern: { type: "string" },
            size: { type: "string" },
            graphic: { type: "string" },
            customText: { type: "string" },
            estimatedPrice: { type: "number" },
            previewImage: { type: "string" },
          },
        },
        DesignFile: {
          type: "object",
          properties: {
            url: { type: "string" },
            name: { type: "string" },
            type: { type: "string", enum: ["image", "file"] },
            uploadedAt: { type: "string", format: "date-time" },
          },
        },
        DesignSubmitRequest: {
          type: "object",
          properties: {
            notes: { type: "string", example: "Design completed as per requirements" },
            files: { type: "array", items: { $ref: "#/components/schemas/DesignFile" } },
          },
        },
        DesignProgressRequest: {
          type: "object",
          properties: {
            progress: { type: "integer", minimum: 0, maximum: 100, example: 50 },
            note: { type: "string", example: "Initial concept completed" },
          },
        },
        
        // ===== DESIGNER SCHEMAS =====
        DesignerProfile: {
          type: "object",
          properties: {
            bio: { type: "string" },
            specializations: { type: "array", items: { type: "string" }, example: ["T-Shirts", "Ethnic Wear"] },
            experience: { type: "integer", description: "Years of experience" },
            rating: { type: "number", minimum: 0, maximum: 5 },
            totalRatings: { type: "integer" },
            completedOrders: { type: "integer" },
            isAvailable: { type: "boolean" },
            availabilityStatus: { type: "string", enum: ["available", "busy", "not_accepting"] },
            designFee: { type: "number" },
            priceRange: { type: "object", properties: { min: { type: "number" }, max: { type: "number" } } },
            turnaroundDays: { type: "integer" },
            badges: { type: "array", items: { type: "string" } },
          },
        },
        Designer: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            approved: { type: "boolean" },
            designerProfile: { $ref: "#/components/schemas/DesignerProfile" },
          },
        },
        DesignerProfileUpdateRequest: {
          type: "object",
          properties: {
            designerProfile: {
              type: "object",
              properties: {
                bio: { type: "string" },
                specializations: { type: "array", items: { type: "string" } },
                designFee: { type: "number" },
                priceRange: { type: "object", properties: { min: { type: "number" }, max: { type: "number" } } },
              },
            },
          },
        },
        DesignerAvailabilityRequest: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["available", "busy", "not_accepting"] },
            isAvailable: { type: "boolean" },
          },
        },
        PortfolioItem: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            image: { type: "string" },
            category: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        
        // ===== EARNINGS & PAYOUT SCHEMAS =====
        EarningsSummary: {
          type: "object",
          properties: {
            totalEarnings: { type: "number" },
            availableForPayout: { type: "number" },
            pendingEarnings: { type: "number" },
            completedPayouts: { type: "number" },
            designerRate: { type: "number", description: "Platform commission percentage" },
          },
        },
        PayoutRequest: {
          type: "object",
          required: ["amount", "upiId"],
          properties: {
            amount: { type: "number", example: 5000 },
            upiId: { type: "string", example: "designer@upi" },
          },
        },
        Payout: {
          type: "object",
          properties: {
            _id: { type: "string" },
            designerId: { type: "string" },
            amount: { type: "number" },
            upiId: { type: "string" },
            status: { type: "string", enum: ["pending", "approved", "completed", "rejected"] },
            processedAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        
        // ===== PRODUCTION SCHEMAS =====
        ProductionMilestone: {
          type: "string",
          enum: ["design_review", "fabric_selection", "cutting", "stitching", "embroidery", "finishing", "quality_check", "packaging", "ready_for_pickup"],
        },
        ProductionProgressRequest: {
          type: "object",
          properties: {
            progressPercentage: { type: "integer", minimum: 0, maximum: 100, example: 50 },
            currentMilestone: { $ref: "#/components/schemas/ProductionMilestone" },
            notes: { type: "string" },
          },
        },
        MilestoneRecord: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderId: { type: "string" },
            milestone: { $ref: "#/components/schemas/ProductionMilestone" },
            status: { type: "string", enum: ["pending", "in_progress", "completed"] },
            notes: { type: "string" },
            images: { type: "array", items: { type: "string" } },
            completedAt: { type: "string", format: "date-time" },
          },
        },
        
        // ===== DELIVERY SCHEMAS =====
        DeliveryOrder: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderNumber: { type: "string" },
            status: { type: "string" },
            shippingAddress: { $ref: "#/components/schemas/ShippingAddress" },
            deliveryOTP: { type: "object", properties: { code: { type: "string" } } },
            deliverySlot: { type: "object", properties: { date: { type: "string", format: "date" }, timeSlot: { type: "string" } } },
            customerPhone: { type: "string" },
          },
        },
        DeliveryStatusUpdateRequest: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["picked_up", "in_transit", "out_for_delivery"] },
            notes: { type: "string" },
          },
        },
        DeliveryVerifyOTPRequest: {
          type: "object",
          required: ["otp"],
          properties: {
            otp: { type: "string", example: "1234" },
          },
        },
        DeliveryStatistics: {
          type: "object",
          properties: {
            totalDeliveries: { type: "integer" },
            completedToday: { type: "integer" },
            pending: { type: "integer" },
            inTransit: { type: "integer" },
          },
        },
        
        // ===== REVIEW SCHEMAS =====
        Review: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { $ref: "#/components/schemas/UserSession" },
            productId: { type: "string" },
            rating: { type: "integer", minimum: 1, maximum: 5 },
            title: { type: "string" },
            comment: { type: "string" },
            verified: { type: "boolean", description: "Whether user purchased the product" },
            helpful: { type: "array", items: { type: "string" }, description: "User IDs who found review helpful" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ReviewCreateRequest: {
          type: "object",
          required: ["rating"],
          properties: {
            rating: { type: "integer", minimum: 1, maximum: 5 },
            title: { type: "string" },
            comment: { type: "string" },
          },
        },
        ReviewStats: {
          type: "object",
          properties: {
            average: { type: "number" },
            total: { type: "integer" },
            distribution: { type: "object", additionalProperties: { type: "integer" } },
          },
        },
        
        // ===== WISHLIST SCHEMAS =====
        WishlistItem: {
          type: "object",
          properties: {
            _id: { type: "string" },
            productId: { $ref: "#/components/schemas/Product" },
            designId: { $ref: "#/components/schemas/Design" },
            addedAt: { type: "string", format: "date-time" },
          },
        },
        WishlistAddRequest: {
          type: "object",
          properties: {
            productId: { type: "string" },
            designId: { type: "string" },
          },
        },
        
        // ===== MESSAGING SCHEMAS =====
        Message: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderId: { type: "string" },
            senderId: { type: "string" },
            senderRole: { type: "string", enum: ["customer", "designer", "manager"] },
            receiverId: { type: "string" },
            receiverRole: { type: "string", enum: ["customer", "designer", "manager"] },
            message: { type: "string" },
            attachments: { type: "array", items: { $ref: "#/components/schemas/DesignFile" } },
            read: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        SendMessageRequest: {
          type: "object",
          required: ["receiverId", "message"],
          properties: {
            receiverId: { type: "string" },
            receiverRole: { type: "string", enum: ["customer", "designer", "manager"] },
            message: { type: "string" },
            attachments: { type: "array", items: { $ref: "#/components/schemas/DesignFile" } },
          },
        },
        
        // ===== FEEDBACK SCHEMAS =====
        Feedback: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { $ref: "#/components/schemas/UserSession" },
            orderId: { type: "string" },
            rating: { type: "integer", minimum: 1, maximum: 5 },
            comment: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        FeedbackSubmitRequest: {
          type: "object",
          required: ["rating", "comment"],
          properties: {
            rating: { type: "integer", minimum: 1, maximum: 5 },
            comment: { type: "string" },
            orderId: { type: "string" },
          },
        },
        
        // ===== TRACKING SCHEMAS =====
        TrackingInfo: {
          type: "object",
          properties: {
            orderId: { type: "string" },
            orderNumber: { type: "string" },
            currentStatus: { $ref: "#/components/schemas/OrderStatus" },
            statusLabel: { type: "string" },
            progressPercentage: { type: "integer" },
            timeline: { type: "array", items: { $ref: "#/components/schemas/TimelineEvent" } },
            estimatedDelivery: { type: "object", properties: { from: { type: "string", format: "date" }, to: { type: "string", format: "date" } } },
            deliveryPartner: { type: "object", properties: { name: { type: "string" }, trackingNumber: { type: "string" }, trackingUrl: { type: "string" } } },
          },
        },
        
        // ===== ADMIN SCHEMAS =====
        UserStats: {
          type: "object",
          properties: {
            totalUsers: { type: "integer" },
            customers: { type: "integer" },
            designers: { type: "integer" },
            managers: { type: "integer" },
            deliveryPersons: { type: "integer" },
            pendingApprovals: { type: "integer" },
          },
        },
        DashboardStats: {
          type: "object",
          properties: {
            totalOrders: { type: "integer" },
            totalRevenue: { type: "number" },
            pendingOrders: { type: "integer" },
            completedOrders: { type: "integer" },
            activeDesigners: { type: "integer" },
            recentOrders: { type: "array", items: { $ref: "#/components/schemas/OrderSummary" } },
          },
        },
        
        // ===== CHECKOUT SCHEMAS =====
        CheckoutRequest: {
          type: "object",
          required: ["paymentMethod", "shippingAddress"],
          properties: {
            paymentMethod: { type: "string", enum: ["card", "upi", "netbanking", "cod", "wallet"] },
            shippingAddress: { $ref: "#/components/schemas/ShippingAddress" },
            notes: { type: "string" },
            items: { type: "array", items: { $ref: "#/components/schemas/CartItem" }, description: "Optional - if not provided, uses cart items" },
          },
        },
        
        // ===== COMMON RESPONSE SCHEMAS =====
        SuccessMessageResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                details: { type: "string" },
              },
            },
          },
        },
        AuthSuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            user: { $ref: "#/components/schemas/UserSession" },
          },
        },
        TwoFactorRequiredResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            requires2FA: { type: "boolean", example: true },
            message: { type: "string", example: "2FA code sent to your email" },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            total: { type: "integer" },
            page: { type: "integer" },
            limit: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, "docs/swagger/openapi.annotations.cjs")],
};

const openapiSpec = swaggerJSDoc(swaggerOptions);
const swaggerEnabled = process.env.SWAGGER_ENABLED !== "false";

if (swaggerEnabled) {
  // Dynamic OpenAPI spec that uses the actual request host
  app.get("/openapi.json", (req, res) => {
    const protocol = req.protocol;
    const host = req.get("host");
    const dynamicSpec = {
      ...openapiSpec,
      servers: [{ url: `${protocol}://${host}`, description: "Current server" }],
    };
    res.setHeader("Content-Type", "application/json");
    res.send(dynamicSpec);
  });

  // Swagger UI with dynamic spec URL
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(null, {
      explorer: true,
      customSiteTitle: "DesignDen API Docs",
      swaggerOptions: {
        url: "/openapi.json",
        withCredentials: true, // ✅ Enable sending cookies with requests
        persistAuthorization: true, // ✅ Remember authorization between page refreshes
      },
    }),
  );

  console.log(
    "✅ Swagger docs enabled at /api-docs (OpenAPI JSON: /openapi.json)",
  );
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

// Authentication Middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res
      .status(401)
      .json({ success: false, message: "Please login first" });
  }
  next();
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Please login first" });
    }
    if (!roles.includes(req.session.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }
    next();
  };
};

// =============================================================================
// CSRF TOKEN ENDPOINT (Hari)
// =============================================================================

// Get CSRF Token - Frontend should call this before making POST/PUT/DELETE requests
app.get("/api/csrf-token", (req, res) => {
  // Generate new CSRF token and store in session
  const csrfToken = generateCsrfToken();
  req.session.csrfToken = csrfToken;
  res.json({ success: true, csrfToken });
});

// =============================================================================
// ROUTES
// =============================================================================

// Login route with rate limiter (1 minute lockout after 5 failed attempts)
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;
    console.log("Login attempt:", email);

    const user = await User.findOne({
      $or: [{ email: email }, { username: email }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // If no 2FA code provided, send one and request it
      if (!twoFactorCode) {
        // Generate and send code
        const code = generateVerificationCode();
        await verificationCodes.set(user.email, {
          code,
          expiresAt: Date.now() + 5 * 60 * 1000,
          purpose: "2fa_login",
        });

        console.log(`📧 Sending login verification code to ${user.email}`);

        // Send email
        try {
          await sendVerificationEmail(user.email, code, "2fa_login");
          console.log(`✅ Login code sent successfully to ${user.email}`);

          return res.status(200).json({
            success: false,
            requires2FA: true,
            message: "Verification code sent to your email",
            devCode: code, // Include code for development
          });
        } catch (emailError) {
          console.error("❌ Failed to send login email:", emailError.message);
          // Don't delete code - it's still available
          return res.status(200).json({
            success: false,
            requires2FA: true,
            message: "Verification code generated (check server console)",
            devCode: code, // Include code for development
          });
        }
      }

      // Verify 2FA code from email
      const storedData = await verificationCodes.get(user.email);
      if (!storedData || storedData.purpose !== "2fa_login") {
        return res.status(401).json({
          success: false,
          requires2FA: true,
          message: "Verification code expired. Please try again.",
        });
      }

      if (Date.now() > storedData.expiresAt) {
        await verificationCodes.delete(user.email);
        return res.status(401).json({
          success: false,
          requires2FA: true,
          message: "Verification code expired. Please try again.",
        });
      }

      if (storedData.code !== String(twoFactorCode).trim()) {
        return res.status(401).json({
          success: false,
          requires2FA: true,
          message: "Invalid verification code",
        });
      }

      // Clear used code
      await verificationCodes.delete(user.email);
    }

    // Check if designer/manager is approved
    if (
      (user.role === "designer" || user.role === "manager") &&
      !user.approved
    ) {
      return res.status(403).json({
        success: false,
        message: `Your ${user.role} account is pending approval. Please wait for admin approval.`,
        pendingApproval: true,
      });
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      contactNumber: user.contactNumber,
      twoFactorEnabled: user.twoFactorEnabled,
      approved: user.approved,
    };

    req.session.save((err) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Session error" });
      }

      res.json({
        success: true,
        message: "Login successful",
        user: req.session.user,
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const {
      username,
      name,
      email,
      password,
      contactNumber,
      role,
      address,
      designerProfile: profileData,
    } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Designers require approval, other roles are auto-approved
    const requiresApproval = role === "designer" || role === "manager";

    const user = new User({
      username,
      name: name || username, // Use username as fallback if name not provided
      email,
      password: hashedPassword,
      contactNumber,
      role: role || "customer",
      approved: !requiresApproval, // Designers and managers need approval
      addresses: address
        ? [
            {
              street: address.street,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              isDefault: true,
            },
          ]
        : [],
    });

    // Initialize designer profile if role is designer
    if (role === "designer") {
      user.designerProfile = {
        bio: profileData?.bio || "",
        specializations: profileData?.specializations || [],
        experience: profileData?.experience || 0,
        portfolio: profileData?.portfolio || [],
        rating: 0,
        totalRatings: 0,
        completedOrders: 0,
        isAvailable: true,
        priceRange: profileData?.priceRange || { min: 500, max: 5000 },
        turnaroundDays: profileData?.turnaroundDays || 7,
        badges: ["New Designer"],
      };
    }

    await user.save();

    // Create notification for admin about new designer/manager signup
    if (requiresApproval) {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        const notification = new Notification({
          userId: admin._id,
          type: "approval_required",
          title: `New ${role} signup requires approval`,
          message: `${name || username} (${email}) has signed up as a ${role} and is awaiting approval.`,
          read: false,
        });
        await notification.save();
      }
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      contactNumber: user.contactNumber,
      approved: user.approved,
    };

    res.json({
      success: true,
      message: requiresApproval
        ? "Account created successfully. Please wait for admin approval before you can access designer features."
        : "Account created successfully",
      user: req.session.user,
      requiresApproval,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/auth/session", (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.json({ success: false, user: null });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// Legacy auth aliases kept for older frontend clients
app.get("/api/check-session", (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.json({ success: false, user: null });
  }
});

app.post("/api/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;
    const user = await User.findOne({
      $or: [{ email: email }, { username: email }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        const code = generateVerificationCode();
        await verificationCodes.set(user.email, {
          code,
          expiresAt: Date.now() + 5 * 60 * 1000,
          purpose: "2fa_login",
        });

        try {
          await sendVerificationEmail(user.email, code, "2fa_login");
        } catch (_) {}

        return res.status(200).json({
          success: false,
          requires2FA: true,
          message: "Verification code sent to your email",
          devCode: code,
        });
      }

      const storedData = await verificationCodes.get(user.email);
      if (!storedData || storedData.purpose !== "2fa_login") {
        return res.status(401).json({
          success: false,
          requires2FA: true,
          message: "Verification code expired. Please try again.",
        });
      }

      if (Date.now() > storedData.expiresAt) {
        await verificationCodes.delete(user.email);
        return res.status(401).json({
          success: false,
          requires2FA: true,
          message: "Verification code expired. Please try again.",
        });
      }

      if (storedData.code !== String(twoFactorCode).trim()) {
        return res.status(401).json({
          success: false,
          requires2FA: true,
          message: "Invalid verification code",
        });
      }

      await verificationCodes.delete(user.email);
    }

    if (
      (user.role === "designer" || user.role === "manager") &&
      !user.approved
    ) {
      return res.status(403).json({
        success: false,
        message: `Your ${user.role} account is pending approval. Please wait for admin approval.`,
        pendingApproval: true,
      });
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      contactNumber: user.contactNumber,
      twoFactorEnabled: user.twoFactorEnabled,
      approved: user.approved,
    };

    req.session.save((err) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Session error" });
      }

      res.json({
        success: true,
        message: "Login successful",
        user: req.session.user,
      });
    });
  } catch (error) {
    console.error("Legacy login alias error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/signup", async (req, res) => {
  try {
    const {
      username,
      name,
      email,
      password,
      contactNumber,
      role,
      address,
      designerProfile: profileData,
    } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const requiresApproval = role === "designer" || role === "manager";

    const user = new User({
      username,
      name: name || username,
      email,
      password: hashedPassword,
      contactNumber,
      role: role || "customer",
      approved: !requiresApproval,
      addresses: address
        ? [
            {
              street: address.street,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              isDefault: true,
            },
          ]
        : [],
    });

    if (role === "designer") {
      user.designerProfile = {
        bio: profileData?.bio || "",
        specializations: profileData?.specializations || [],
        experience: profileData?.experience || 0,
        portfolio: profileData?.portfolio || [],
        rating: 0,
        totalRatings: 0,
        completedOrders: 0,
        isAvailable: true,
        priceRange: profileData?.priceRange || { min: 500, max: 5000 },
        turnaroundDays: profileData?.turnaroundDays || 7,
        badges: ["New Designer"],
      };
    }

    await user.save();

    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      contactNumber: user.contactNumber,
      approved: user.approved,
    };

    res.json({
      success: true,
      message: requiresApproval
        ? "Account created successfully. Please wait for admin approval before you can access designer features."
        : "Account created successfully",
      user: req.session.user,
      requiresApproval,
    });
  } catch (error) {
    console.error("Legacy signup alias error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// ============================================
// TWO-FACTOR AUTHENTICATION (2FA) ROUTES - EMAIL BASED
// ============================================

// Send verification code to email for 2FA setup
app.post("/api/auth/2fa/setup", async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Generate 6-digit verification code
    const code = generateVerificationCode();

    // Store code with expiration (5 minutes)
    await verificationCodes.set(user.email, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      purpose: "2fa_setup",
    });

    console.log(`📧 Sending 2FA setup code to ${user.email}`);

    // Send email
    try {
      await sendVerificationEmail(user.email, code, "2fa_setup");
      console.log(`✅ 2FA code sent successfully to ${user.email}`);

      res.json({
        success: true,
        message: "Verification code sent to your email",
        email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Mask email
        devCode: code, // Include code in response for development
      });
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError.message);
      // Don't delete the code - it's still available in console
      res.json({
        success: true,
        message: "Verification code generated (check server console)",
        email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
        devCode: code, // Include code in response for development
      });
    }
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Verify code and enable 2FA
app.post("/api/auth/2fa/verify", async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const { token } = req.body;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Verification code required" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check stored code
    const storedData = await verificationCodes.get(user.email);
    if (!storedData || storedData.purpose !== "2fa_setup") {
      return res.status(400).json({
        success: false,
        message: "No verification code found. Please request a new one.",
      });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      await verificationCodes.delete(user.email);
      return res.status(400).json({
        success: false,
        message: "Verification code expired. Please request a new one.",
      });
    }

    // Verify code
    if (storedData.code !== String(token).trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorMethod = "email";
    await user.save();

    // Clear used code
    await verificationCodes.delete(user.email);

    // Update session
    req.session.user.twoFactorEnabled = true;

    res.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
    });
  } catch (error) {
    console.error("2FA verify error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Send 2FA code for login
app.post("/api/auth/2fa/send-login-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email required" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.twoFactorEnabled) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });
    }

    // Generate code
    const code = generateVerificationCode();

    // Store code
    await verificationCodes.set(email, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      purpose: "2fa_login",
    });

    console.log(`2FA Login Code for ${email}: ${code}`);

    // Send email using helper function
    try {
      await sendVerificationEmail(email, code, "2fa_login");
    } catch (emailError) {
      console.log("Email sending handled by helper function");
    }

    res.json({
      success: true,
      message: "Verification code sent to your email",
      devCode: code, // Include code in response for development
    });
  } catch (error) {
    console.error("Send login code error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Disable 2FA
app.post("/api/auth/2fa/disable", async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const { password } = req.body;
    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: "Password required" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    await user.save();

    // Update session
    req.session.user.twoFactorEnabled = false;

    res.json({
      success: true,
      message: "Two-factor authentication disabled successfully",
    });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get 2FA status
app.get("/api/auth/2fa/status", async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      enabled: user.twoFactorEnabled || false,
      method: "email",
    });
  } catch (error) {
    console.error("2FA status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Regenerate backup codes
app.post("/api/auth/2fa/backup-codes", async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const { password } = req.body;
    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: "Password required" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.twoFactorEnabled) {
      return res
        .status(400)
        .json({ success: false, message: "2FA is not enabled" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(
        Math.random().toString(36).substring(2, 10).toUpperCase(),
      );
    }

    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    res.json({
      success: true,
      backupCodes: backupCodes,
      message: "New backup codes generated",
    });
  } catch (error) {
    console.error("Backup codes error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================
// DESIGN WORKFLOW ENDPOINTS
// ============================================

// Designer: Update design progress
app.put("/api/orders/:id/design/progress", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({
        success: false,
        message: "Only designers can update design progress",
      });
    }

    const { progress, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify designer is assigned to this order
    if (order.designerId?.toString() !== req.session.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      });
    }

    // Update design progress
    order.designProgress = progress;
    if (progress > 0 && !order.status.includes("design")) {
      order.status = "design_in_progress";
    }

    // Add timeline entry
    order.timeline.push({
      status: "design_in_progress",
      at: new Date(),
      note: note || `Design progress updated to ${progress}%`,
    });

    await order.save();

    // Create notification for customer
    await Notification.create({
      userId: order.userId,
      type: "order",
      title: "Design Progress Updated",
      message: `Your order design is ${progress}% complete`,
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Design progress updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update design progress error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update design progress",
    });
  }
});

// Designer: Submit design for approval
app.put("/api/orders/:id/design/submit", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({
        success: false,
        message: "Only designers can submit designs",
      });
    }

    const { notes, designFiles } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify designer is assigned
    if (order.designerId?.toString() !== req.session.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      });
    }

    // Check if design is complete
    if (order.designProgress < 100) {
      return res.status(400).json({
        success: false,
        message: "Design must be 100% complete before submission",
      });
    }

    // Validate design files are uploaded
    if (!designFiles || designFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one design file for customer review",
      });
    }

    // Store design files
    order.designFiles = designFiles.map((file) => ({
      url: file.url,
      name: file.name,
      type: file.type,
      uploadedBy: req.session.user.id.toString(),
      uploadedAt: new Date(),
    }));

    // Update order status to pending customer approval
    order.status = "design_pending_customer_approval";
    order.designSubmittedAt = new Date();

    // Add timeline entry
    order.timeline.push({
      status: "design_pending_customer_approval",
      at: new Date(),
      note: notes || "Design submitted for customer approval",
    });

    await order.save();

    // Notify customer
    await Notification.create({
      userId: order.userId,
      type: "order",
      title: "Design Ready for Your Approval",
      message: `Your custom design is ready! Please review and approve it.`,
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Design submitted to customer for approval successfully",
      order,
    });
  } catch (error) {
    console.error("Submit design error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit design",
    });
  }
});

// Customer: Approve design
app.put("/api/orders/:id/design/customer-approve", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Use raw MongoDB to avoid Mongoose casting issues with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify user is the customer
    if (order.userId?.toString() !== req.session.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only approve your own orders",
      });
    }

    // Verify order status
    if (order.status !== "design_pending_customer_approval") {
      return res.status(400).json({
        success: false,
        message: "Design is not pending customer approval",
      });
    }

    // Update using raw MongoDB
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "design_approved_by_customer",
          customerApprovedAt: new Date(),
        },
        $push: {
          timeline: {
            status: "design_approved_by_customer",
            at: new Date(),
            note: "Design approved by customer",
          },
        },
      },
    );

    // Notify designer
    await Notification.create({
      userId: order.designerId,
      type: "order",
      title: "Customer Approved Design",
      message: `Customer approved the design for order ${order.orderNumber}. You can now submit to manager.`,
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Design approved successfully",
    });
  } catch (error) {
    console.error("Customer approve design error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve design",
    });
  }
});

// Customer: Reject design
app.put("/api/orders/:id/design/customer-reject", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    // Use raw MongoDB to avoid Mongoose casting issues with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify user is the customer
    if (order.userId?.toString() !== req.session.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only reject your own orders",
      });
    }

    // Verify order status
    if (order.status !== "design_pending_customer_approval") {
      return res.status(400).json({
        success: false,
        message: "Design is not pending customer approval",
      });
    }

    // Update using raw MongoDB
    const revisionCount = (order.designRejection?.revisionCount || 0) + 1;
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "design_rejected_by_customer",
          designProgress: 0,
          customerRejectedAt: new Date(),
          "designRejection.reason": reason,
          "designRejection.rejectedBy": req.session.user.id,
          "designRejection.rejectedAt": new Date(),
          "designRejection.revisionCount": revisionCount,
        },
        $push: {
          timeline: {
            status: "design_rejected_by_customer",
            at: new Date(),
            note: `Customer requested revision: ${reason}`,
          },
        },
      },
    );

    // Notify designer
    await Notification.create({
      userId: order.designerId,
      type: "order",
      title: "Design Revision Requested",
      message: `Customer requested revision for order ${order.orderNumber}: ${reason}`,
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Design rejected, revision requested",
    });
  } catch (error) {
    console.error("Customer reject design error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject design",
    });
  }
});

// Designer: Submit design to manager (after customer approval)
app.put("/api/orders/:id/design/submit-to-manager", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({
        success: false,
        message: "Only designers can submit designs to manager",
      });
    }

    const { notes } = req.body;

    // Use raw MongoDB to avoid Mongoose casting issues with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify designer is assigned
    if (order.designerId?.toString() !== req.session.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      });
    }

    // Verify customer has approved
    if (order.status !== "design_approved_by_customer") {
      return res.status(400).json({
        success: false,
        message: "Customer must approve design first",
      });
    }

    // Update using raw MongoDB
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "design_ready",
          "designApproval.status": "pending",
        },
        $push: {
          timeline: {
            status: "design_ready",
            at: new Date(),
            note: notes || "Design submitted to manager for final approval",
          },
        },
      },
    );

    // Notify manager(s)
    if (order.managerId) {
      await Notification.create({
        userId: order.managerId,
        type: "order",
        title: "Design Ready for Approval",
        message: `Order ${order.orderNumber} design is ready for your review (customer approved)`,
        relatedId: order._id,
        relatedModel: "Order",
      });
    } else {
      // No specific manager assigned - notify all managers
      const managers = await User.find({ role: "manager" }, "_id");
      for (const manager of managers) {
        await Notification.create({
          userId: manager._id,
          type: "order",
          title: "Design Ready for Approval",
          message: `Order ${order.orderNumber} design is ready for your review (customer approved)`,
          relatedId: order._id,
          relatedModel: "Order",
        });
      }
    }

    res.json({
      success: true,
      message: "Design submitted to manager successfully",
    });
  } catch (error) {
    console.error("Submit to manager error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit design to manager",
    });
  }
});

// Manager: Approve design
app.put("/api/orders/:id/design/approve", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only managers can approve designs",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order status
    order.status = "design_approved";
    order.designApprovedAt = new Date();

    // Update designApproval
    if (!order.designApproval) {
      order.designApproval = {};
    }
    order.designApproval.status = "approved";
    order.designApproval.approvedBy = req.session.user.id;
    order.designApproval.approvedAt = new Date();

    // Add timeline entry
    order.timeline.push({
      status: "design_approved",
      at: new Date(),
      note: "Design approved by manager",
    });

    await order.save();

    // Notify designer
    await Notification.create({
      userId: order.designerId,
      type: "order",
      title: "Design Approved",
      message: `Your design for order ${order.orderNumber} has been approved`,
      relatedId: order._id,
      relatedModel: "Order",
    });

    // Notify customer
    await Notification.create({
      userId: order.userId,
      type: "order",
      title: "Design Approved",
      message: "Your design has been approved. Production will begin soon.",
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Design approved successfully",
      order,
    });
  } catch (error) {
    console.error("Approve design error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve design",
    });
  }
});

// Manager: Reject design
app.put("/api/orders/:id/design/reject", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only managers can reject designs",
      });
    }

    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order status
    order.status = "design_rejected";
    order.designRejectedAt = new Date();

    // Update designApproval
    if (!order.designApproval) {
      order.designApproval = {};
    }
    order.designApproval.status = "rejected";
    order.designApproval.rejectedBy = req.session.user.id;
    order.designApproval.rejectedAt = new Date();
    order.designApproval.rejectionReason = reason;
    order.designApproval.revisionCount =
      (order.designApproval.revisionCount || 0) + 1;

    // Add timeline entry
    order.timeline.push({
      status: "design_rejected",
      at: new Date(),
      note: `Design rejected: ${reason}`,
    });

    await order.save();

    // Notify designer
    await Notification.create({
      userId: order.designerId,
      type: "order",
      title: "Design Needs Revision",
      message: `Order ${order.orderNumber}: ${reason}`,
      relatedId: order._id,
      relatedModel: "Order",
    });

    // Notify customer
    await Notification.create({
      userId: order.userId,
      type: "order",
      title: "Design Revision in Progress",
      message: "Your design is being revised based on feedback",
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Design rejected successfully",
      order,
    });
  } catch (error) {
    console.error("Reject design error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject design",
    });
  }
});

// Manager: Start production
app.put("/api/orders/:id/production/start", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only managers can start production",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order status
    order.status = "in_production";
    order.progressPercentage = 0;

    // Add timeline entry
    order.timeline.push({
      status: "in_production",
      at: new Date(),
      note: "Production started by manager",
    });

    // Update timestamps
    if (!order.timestamps) {
      order.timestamps = {};
    }
    order.timestamps.productionStarted = new Date();

    await order.save();

    // Notify designer
    await Notification.create({
      userId: order.designerId,
      type: "order",
      title: "Production Started",
      message: `Production started for order ${order.orderNumber}`,
      relatedId: order._id,
      relatedModel: "Order",
    });

    // Notify customer
    await Notification.create({
      userId: order.userId,
      type: "order",
      title: "Production Started",
      message: "Your order is now in production",
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Production started successfully",
      order,
    });
  } catch (error) {
    console.error("Start production error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start production",
    });
  }
});

// Manager: Update production progress
app.put("/api/orders/:id/production/progress", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only managers can update production progress",
      });
    }

    const { progress, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update production progress
    order.progressPercentage = progress;

    if (progress > 0 && progress < 100) {
      order.status = "production_milestone";
    }

    // Add timeline entry
    order.timeline.push({
      status: "production_milestone",
      at: new Date(),
      note: note || `Production progress: ${progress}%`,
    });

    await order.save();

    // Notify customer
    await Notification.create({
      userId: order.userId,
      type: "order",
      title: "Production Update",
      message: `Your order is ${progress}% complete`,
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Production progress updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update production progress error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update production progress",
    });
  }
});

// Manager: Complete production
app.put("/api/orders/:id/production/complete", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only managers can complete production",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order status
    order.status = "production_completed";
    order.progressPercentage = 100;

    // Add timeline entry
    order.timeline.push({
      status: "production_completed",
      at: new Date(),
      note: "Production completed by manager",
    });

    // Update timestamps
    if (!order.timestamps) {
      order.timestamps = {};
    }
    order.timestamps.productionCompleted = new Date();

    await order.save();

    // Notify designer
    await Notification.create({
      userId: order.designerId,
      type: "order",
      title: "Production Completed",
      message: `Order ${order.orderNumber} production is complete`,
      relatedId: order._id,
      relatedModel: "Order",
    });

    // Notify customer
    await Notification.create({
      userId: order.userId,
      type: "order",
      title: "Order Ready",
      message: "Your order is ready for delivery!",
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Production completed successfully",
      order,
    });
  } catch (error) {
    console.error("Complete production error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete production",
    });
  }
});

// Product Routes
app.get("/api/shop/products", async (req, res) => {
  try {
    const {
      category,
      gender,
      size,
      minPrice,
      maxPrice,
      sort,
      search,
      featured,
    } = req.query;

    const cacheKey = `products:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    res.setHeader("X-Cache-Key", cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    let query = {};

    // Case-insensitive category filter
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }
    // Case-insensitive gender filter
    if (gender) {
      query.gender = { $regex: new RegExp(`^${gender}$`, "i") };
    }
    if (size) query.sizes = { $in: [size] };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (featured === "true") query.featured = true;

    let sortOption = {};
    switch (sort) {
      case "price-low-high":
      case "price-asc":
        sortOption = { price: 1 };
        break;
      case "price-high-low":
      case "price-desc":
        sortOption = { price: -1 };
        break;
      case "name":
        sortOption = { name: 1 };
        break;
      case "newest":
      default:
        sortOption = { createdAt: -1 };
    }

    const products = await Product.find(query).sort(sortOption);
    const result = { success: true, products };
    if (!search) {
      await cacheSet(cacheKey, result, 120);
      res.setHeader("X-Cache", "MISS");
      res.setHeader("X-Cache-TTL", "120");
    } else {
      res.setHeader("X-Cache", "BYPASS");
    }
    res.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/shop/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Legacy product aliases for older frontend clients
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching legacy products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error("Error fetching legacy product by id:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json({ success: true, categories: categories.filter(Boolean).sort() });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/shop/featured", async (req, res) => {
  try {
    const cached = await cacheGet("products:featured");
    res.setHeader("X-Cache-Key", "products:featured");
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }
    const products = await Product.find({ featured: true }).limit(6);
    const result = { success: true, products };
    await cacheSet("products:featured", result, 300);
    res.setHeader("X-Cache", "MISS");
    res.setHeader("X-Cache-TTL", "300");
    res.json(result);
  } catch (error) {
    console.error("Error fetching featured products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================
// PUBLIC DESIGNER LISTING API (For Customer Selection)
// ============================================

// Get all available designers with their profiles
app.get("/api/designers", async (req, res) => {
  try {
    const { specialization, minRating, sortBy } = req.query;

    let query = {
      role: "designer",
      approved: true,
      "designerProfile.isAvailable": { $ne: false },
    };

    // Filter by specialization
    if (specialization) {
      query["designerProfile.specializations"] = {
        $regex: new RegExp(specialization, "i"),
      };
    }

    // Filter by minimum rating
    if (minRating) {
      query["designerProfile.rating"] = { $gte: Number(minRating) };
    }

    let sortOption = { "designerProfile.rating": -1 }; // Default sort by rating

    switch (sortBy) {
      case "rating":
        sortOption = { "designerProfile.rating": -1 };
        break;
      case "experience":
        sortOption = { "designerProfile.experience": -1 };
        break;
      case "orders":
        sortOption = { "designerProfile.completedOrders": -1 };
        break;
      case "price-low":
        sortOption = { "designerProfile.priceRange.min": 1 };
        break;
      case "price-high":
        sortOption = { "designerProfile.priceRange.max": -1 };
        break;
      case "turnaround":
        sortOption = { "designerProfile.turnaroundDays": 1 };
        break;
    }

    const designers = await User.find(query)
      .select("name email designerProfile")
      .sort(sortOption);

    // Transform data for frontend
    const designerList = designers.map((designer) => ({
      _id: designer._id,
      name: designer.name || designer.email?.split("@")[0] || "Designer",
      email: designer.email,
      bio:
        designer.designerProfile?.bio ||
        "Passionate clothing designer ready to bring your vision to life.",
      specializations: designer.designerProfile?.specializations || [
        "Custom Clothing",
      ],
      experience: designer.designerProfile?.experience || 1,
      portfolio: designer.designerProfile?.portfolio || [],
      rating: designer.designerProfile?.rating || 4.0,
      totalRatings: designer.designerProfile?.totalRatings || 0,
      completedOrders: designer.designerProfile?.completedOrders || 0,
      isAvailable: designer.designerProfile?.isAvailable !== false,
      priceRange: designer.designerProfile?.priceRange || {
        min: 500,
        max: 3000,
      },
      turnaroundDays: designer.designerProfile?.turnaroundDays || 7,
      designFee: designer.designerProfile?.designFee || 500, // Fixed design fee
      featuredWork: designer.designerProfile?.featuredWork || null,
      badges: designer.designerProfile?.badges || [],
    }));

    res.json({
      success: true,
      designers: designerList,
      count: designerList.length,
    });
  } catch (error) {
    console.error("Error fetching designers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get single designer profile
app.get("/api/designers/:id", async (req, res) => {
  try {
    const designer = await User.findOne({
      _id: req.params.id,
      role: "designer",
    }).select("name email designerProfile");

    if (!designer) {
      return res.status(404).json({
        success: false,
        message: "Designer not found",
      });
    }

    const designerData = {
      _id: designer._id,
      name: designer.name || designer.email?.split("@")[0] || "Designer",
      email: designer.email,
      bio:
        designer.designerProfile?.bio ||
        "Passionate clothing designer ready to bring your vision to life.",
      specializations: designer.designerProfile?.specializations || [
        "Custom Clothing",
      ],
      experience: designer.designerProfile?.experience || 1,
      portfolio: designer.designerProfile?.portfolio || [],
      rating: designer.designerProfile?.rating || 4.0,
      totalRatings: designer.designerProfile?.totalRatings || 0,
      completedOrders: designer.designerProfile?.completedOrders || 0,
      isAvailable: designer.designerProfile?.isAvailable !== false,
      priceRange: designer.designerProfile?.priceRange || {
        min: 500,
        max: 3000,
      },
      turnaroundDays: designer.designerProfile?.turnaroundDays || 7,
      featuredWork: designer.designerProfile?.featuredWork || null,
      badges: designer.designerProfile?.badges || [],
    };

    res.json({ success: true, designer: designerData });
  } catch (error) {
    console.error("Error fetching designer:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Initialize designer profiles with sample data (one-time setup endpoint)
app.post("/api/designers/init-profiles", async (req, res) => {
  try {
    const designers = await User.find({ role: "designer" });

    const sampleBios = [
      "Award-winning fashion designer with a passion for sustainable clothing. Specializing in modern ethnic wear and fusion designs.",
      "Creative designer focused on bringing your unique style to life. Expert in casual wear and streetwear aesthetics.",
      "Experienced tailor and designer. Known for precision fitting and attention to detail in formal and business attire.",
      "Young and innovative designer pushing boundaries in contemporary fashion. Loves experimenting with bold patterns and colors.",
    ];

    const sampleSpecializations = [
      ["T-Shirts", "Casual Wear", "Streetwear"],
      ["Ethnic Wear", "Fusion", "Party Wear"],
      ["Formal Wear", "Business Attire", "Suits"],
      ["Kids Wear", "Family Matching", "Casual"],
    ];

    const sampleBadges = [
      ["Top Rated", "Fast Delivery"],
      ["Premium Designer", "Best Seller"],
      ["Quick Response", "Customer Favorite"],
      ["New Talent", "Rising Star"],
    ];

    // 3D Model work samples for designers
    const samplePortfolios = [
      [
        {
          image:
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
          title: "T-Shirt 3D Model",
        },
        {
          image:
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
          title: "Casual Wear Design",
        },
        {
          image:
            "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop",
          title: "Custom Hoodie",
        },
      ],
      [
        {
          image:
            "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=400&fit=crop",
          title: "Polo Shirt Model",
        },
        {
          image:
            "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",
          title: "Graphic Design",
        },
        {
          image:
            "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=400&fit=crop",
          title: "Sports Jersey",
        },
      ],
      [
        {
          image:
            "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop",
          title: "Sweatshirt Design",
        },
        {
          image:
            "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop",
          title: "Street Style Tee",
        },
        {
          image:
            "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop",
          title: "Printed T-Shirt",
        },
      ],
      [
        {
          image:
            "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop",
          title: "Basic Tee Model",
        },
        {
          image:
            "https://images.unsplash.com/photo-1571455786673-9d9d6c194f90?w=400&h=400&fit=crop",
          title: "Tank Top Design",
        },
        {
          image:
            "https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=400&h=400&fit=crop",
          title: "Long Sleeve Shirt",
        },
      ],
    ];

    let updated = 0;
    for (let i = 0; i < designers.length; i++) {
      const designer = designers[i];

      // Only update if profile is empty
      if (!designer.designerProfile?.bio) {
        designer.designerProfile = {
          bio: sampleBios[i % sampleBios.length],
          specializations:
            sampleSpecializations[i % sampleSpecializations.length],
          experience: Math.floor(Math.random() * 10) + 1,
          portfolio: samplePortfolios[i % samplePortfolios.length],
          rating: (3.5 + Math.random() * 1.5).toFixed(1),
          totalRatings: Math.floor(Math.random() * 100) + 10,
          completedOrders: Math.floor(Math.random() * 200) + 20,
          isAvailable: true,
          priceRange: {
            min: [500, 800, 1000, 1200][Math.floor(Math.random() * 4)],
            max: [2000, 3000, 4000, 5000][Math.floor(Math.random() * 4)],
          },
          turnaroundDays: [3, 5, 7, 10][Math.floor(Math.random() * 4)],
          badges: sampleBadges[i % sampleBadges.length],
        };
        await designer.save();
        updated++;
      }
    }

    res.json({
      success: true,
      message: `Initialized ${updated} designer profiles`,
      total: designers.length,
    });
  } catch (error) {
    console.error("Error initializing designer profiles:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Force update designer portfolios with new images
app.post("/api/designers/update-portfolios", async (req, res) => {
  try {
    const designers = await User.find({ role: "designer" });

    // 3D Model work samples for designers
    const samplePortfolios = [
      [
        {
          image:
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
          title: "T-Shirt 3D Model",
        },
        {
          image:
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
          title: "Casual Wear Design",
        },
        {
          image:
            "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop",
          title: "Custom Hoodie",
        },
      ],
      [
        {
          image:
            "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=400&fit=crop",
          title: "Polo Shirt Model",
        },
        {
          image:
            "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",
          title: "Graphic Design",
        },
        {
          image:
            "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=400&fit=crop",
          title: "Sports Jersey",
        },
      ],
      [
        {
          image:
            "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop",
          title: "Sweatshirt Design",
        },
        {
          image:
            "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop",
          title: "Street Style Tee",
        },
        {
          image:
            "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop",
          title: "Printed T-Shirt",
        },
      ],
      [
        {
          image:
            "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop",
          title: "Basic Tee Model",
        },
        {
          image:
            "https://images.unsplash.com/photo-1571455786673-9d9d6c194f90?w=400&h=400&fit=crop",
          title: "Tank Top Design",
        },
        {
          image:
            "https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=400&h=400&fit=crop",
          title: "Long Sleeve Shirt",
        },
      ],
      [
        {
          image:
            "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400&h=400&fit=crop",
          title: "V-Neck Design",
        },
        {
          image:
            "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=400&fit=crop",
          title: "Crew Neck Model",
        },
        {
          image:
            "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop",
          title: "Custom Kurta",
        },
      ],
    ];

    let updated = 0;
    for (let i = 0; i < designers.length; i++) {
      const designer = designers[i];
      if (designer.designerProfile) {
        designer.designerProfile.portfolio =
          samplePortfolios[i % samplePortfolios.length];
        await designer.save();
        updated++;
      }
    }

    res.json({
      success: true,
      message: `Updated portfolios for ${updated} designers`,
      total: designers.length,
    });
  } catch (error) {
    console.error("Error updating designer portfolios:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Review Routes
// Get reviews for a product
app.get("/api/products/:productId/reviews", async (req, res) => {
  try {
    const { sort = "-createdAt", limit = 20 } = req.query;
    const reviews = await Review.find({ productId: req.params.productId })
      .populate("userId", "username")
      .sort(sort)
      .limit(parseInt(limit));

    // Calculate average rating
    const stats = await Review.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(req.params.productId),
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratings: {
            $push: "$rating",
          },
        },
      },
    ]);

    const ratingDistribution =
      stats.length > 0
        ? {
            5: stats[0].ratings.filter((r) => r === 5).length,
            4: stats[0].ratings.filter((r) => r === 4).length,
            3: stats[0].ratings.filter((r) => r === 3).length,
            2: stats[0].ratings.filter((r) => r === 2).length,
            1: stats[0].ratings.filter((r) => r === 1).length,
          }
        : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    res.json({
      success: true,
      reviews,
      stats:
        stats.length > 0
          ? {
              averageRating: stats[0].averageRating,
              totalReviews: stats[0].totalReviews,
              distribution: ratingDistribution,
            }
          : {
              averageRating: 0,
              totalReviews: 0,
              distribution: ratingDistribution,
            },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Check if user can review a product (has delivered order with this product)
app.get("/api/products/:productId/can-review", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({
        success: true,
        canReview: false,
        reason: "not_logged_in",
      });
    }

    if (req.session.user.role !== "customer") {
      return res.json({
        success: true,
        canReview: false,
        reason: "not_customer",
      });
    }

    const productId = req.params.productId;
    const userId = req.session.user.id;

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.json({
        success: true,
        canReview: false,
        reason: "already_reviewed",
      });
    }

    // Check if user has a DELIVERED order containing this product
    const deliveredOrder = await Order.findOne({
      userId,
      "items.productId": new mongoose.Types.ObjectId(productId),
      status: "delivered",
    });

    if (deliveredOrder) {
      return res.json({
        success: true,
        canReview: true,
        orderId: deliveredOrder._id,
        reason: "eligible",
      });
    }

    // Check if user has any pending/processing order with this product
    const pendingOrder = await Order.findOne({
      userId,
      "items.productId": new mongoose.Types.ObjectId(productId),
      status: {
        $in: [
          "pending",
          "processing",
          "confirmed",
          "shipped",
          "out_for_delivery",
        ],
      },
    });

    if (pendingOrder) {
      return res.json({
        success: true,
        canReview: false,
        reason: "order_not_delivered",
        orderStatus: pendingOrder.status,
      });
    }

    // User hasn't ordered this product
    return res.json({ success: true, canReview: false, reason: "not_ordered" });
  } catch (error) {
    console.error("Error checking review eligibility:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Create a review (customer only)
app.post("/api/products/:productId/reviews", async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Please login to review" });
    }

    const { rating, title, comment, orderId } = req.body;
    const productId = req.params.productId;
    const userId = req.session.user.id;

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    // Verify order if orderId is provided
    let verified = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        userId,
        "items.productId": productId,
        status: "delivered",
      });
      verified = !!order;
    }

    const review = new Review({
      productId,
      userId,
      orderId,
      rating,
      title,
      comment,
      verified,
    });

    await review.save();
    await review.populate("userId", "username");

    res.json({ success: true, review });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update a review (own review only)
app.put("/api/reviews/:reviewId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { rating, title, comment } = req.body;
    const review = await Review.findOne({
      _id: req.params.reviewId,
      userId: req.session.user.id,
    });

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    review.rating = rating;
    review.title = title;
    review.comment = comment;
    review.updatedAt = Date.now();

    await review.save();
    await review.populate("userId", "username");

    res.json({ success: true, review });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete a review (own review or admin)
app.delete("/api/reviews/:reviewId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const query = { _id: req.params.reviewId };
    if (req.session.user.role !== "admin") {
      query.userId = req.session.user.id;
    }

    const review = await Review.findOneAndDelete(query);

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Mark review as helpful
app.post("/api/reviews/:reviewId/helpful", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Please login" });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    const userId = req.session.user.id;
    const index = review.helpful.indexOf(userId);

    if (index > -1) {
      // Remove helpful
      review.helpful.splice(index, 1);
    } else {
      // Add helpful
      review.helpful.push(userId);
    }

    await review.save();
    res.json({ success: true, helpfulCount: review.helpful.length });
  } catch (error) {
    console.error("Error marking review helpful:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin Routes
app.get("/api/admin/products", requireRole("admin"), async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.put(
  "/api/admin/products/:id/stock",
  requireRole("admin"),
  async (req, res) => {
    try {
      const { inStock } = req.body;
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { inStock, stockQuantity: inStock ? 100 : 0 },
        { new: true },
      );
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }
      res.json({
        success: true,
        message: `Product marked as ${inStock ? "in stock" : "out of stock"}`,
        product,
      });
    } catch (error) {
      console.error("Error updating product stock:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

app.patch("/admin/api/products/:id/stock", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const requestedStock = Number(req.body.stock);
    const inStock =
      typeof req.body.inStock === "boolean" ? req.body.inStock : requestedStock > 0;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        inStock,
        stockQuantity: Number.isFinite(requestedStock) ? requestedStock : 0,
      },
      { new: true },
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product stock updated successfully",
      product,
    });
  } catch (error) {
    console.error("Error updating legacy admin stock:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Dashboard
app.get("/admin/dashboard", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const completedOrders = await Order.countDocuments({
      status: { $in: ["completed", "delivered", "shipped"] },
    });

    // Calculate total revenue from completed and delivered orders
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $in: ["completed", "delivered", "shipped"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // Calculate completed revenue (delivered orders only)
    const completedRevenue = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // Get recent orders
    const recentOrders = await Order.find({})
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        completedRevenue: completedRevenue[0]?.total || 0,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Get all orders
app.get("/admin/api/orders", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const orders = await Order.find({})
      .populate("userId", "username email")
      .populate("items.productId", "name images price")
      .populate("items.designId", "name graphic basePrice estimatedPrice")
      .populate("managerId", "username email")
      .populate("designerId", "username email")
      .populate("deliveryPersonId", "username email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Get order details
app.get("/admin/order/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const order = await Order.findById(req.params.id)
      .populate("userId", "username email contactNumber")
      .populate("items.productId", "name images price")
      .populate("items.designId", "name graphic basePrice estimatedPrice")
      .populate("managerId", "username email")
      .populate("designerId", "username email")
      .populate("deliveryPersonId", "username email")
      .lean();

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Update order status
app.put("/admin/order/:id/status", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.status = status;

    // Auto-mark payment as paid when order is delivered
    if (status === "delivered") {
      order.paymentStatus = "paid";
    }

    order.updatedAt = new Date();
    await order.save();

    res.json({ success: true, message: "Order status updated", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Get all feedbacks
app.get("/admin/feedbacks", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const feedbacks = await Feedback.find({})
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Submit feedback
app.post("/feedback/submit", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }
    const { rating, comment, orderId } = req.body;

    if (!rating || !comment) {
      return res
        .status(400)
        .json({ success: false, message: "Rating and comment are required" });
    }

    const feedback = new Feedback({
      userId: req.session.user.id,
      orderId,
      rating,
      comment,
    });

    await feedback.save();

    // Update order to mark that feedback has been submitted, and auto-gen reviews for shop items
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        order.hasFeedback = true;
        await order.save();

        // Target: Auto-generate Product Reviews for any shop items within this order
        for (const item of order.items) {
          // If the item has a productId, it is a shop product
          if (item.productId) {
            // Confirm a review hasn't already been submitted to prevent duplicates
            const existingReview = await Review.findOne({
              productId: item.productId,
              userId: req.session.user.id,
              orderId: orderId,
            });

            if (!existingReview) {
              const reviewTitle =
                comment.length > 30
                  ? comment.substring(0, 30) + "..."
                  : "Product Feedback";

              const newReview = new Review({
                productId: item.productId,
                userId: req.session.user.id,
                orderId: orderId,
                rating: rating,
                title: reviewTitle,
                comment: comment,
                verified: true, // It's from an explicitly verified delivered order
              });

              await newReview.save();
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Cancel order endpoint (customer only)
app.post("/customer/order/:id/cancel", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check if order belongs to the customer
    if (order.userId.toString() !== req.session.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Only allow cancellation if order is pending
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Order can only be cancelled when status is pending",
      });
    }

    order.status = "cancelled";
    order.updatedAt = new Date();
    await order.save();

    res.json({ success: true, message: "Order cancelled successfully", order });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Pincode lookup endpoint
app.get("/api/pincode/:pincode", async (req, res) => {
  try {
    const { pincode } = req.params;

    // Validate pincode format
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pincode format",
      });
    }

    // Use India Post API
    const axios = require("axios");
    try {
      const response = await axios.get(
        `https://api.postalpincode.in/pincode/${pincode}`,
        { timeout: 5000 },
      );

      if (
        response.data &&
        response.data[0] &&
        response.data[0].Status === "Success" &&
        response.data[0].PostOffice &&
        response.data[0].PostOffice.length > 0
      ) {
        const postOffice = response.data[0].PostOffice[0];
        res.json({
          success: true,
          data: {
            city: postOffice.District,
            state: postOffice.State,
            area: postOffice.Name,
          },
        });
      } else {
        // Pincode not found - return success but no data to avoid blocking checkout
        res.json({
          success: false,
          message: "Pincode not found. Please enter city and state manually.",
        });
      }
    } catch (apiError) {
      // API error - allow user to continue with manual entry
      console.log("Pincode API error:", apiError.message);
      res.json({
        success: false,
        message:
          "Unable to lookup pincode. Please enter city and state manually.",
      });
    }
  } catch (error) {
    console.error("Error looking up pincode:", error);
    res.json({
      success: false,
      message:
        "Unable to lookup pincode. Please enter city and state manually.",
    });
  }
});

// Get all feedbacks (public or for specific role)
app.get("/feedback/all", async (req, res) => {
  try {
    const feedbacks = await Feedback.find({})
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Get all feedbacks
app.get("/admin/feedbacks", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const feedbacks = await Feedback.find({})
      .populate("userId", "username email")
      .populate("orderId")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer Routes
// Designer - Dashboard
app.get("/designer/dashboard", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const assignedOrders = await Order.find({
      designerId: req.session.user.id,
    }).countDocuments();

    const pendingOrders = await Order.find({
      designerId: req.session.user.id,
      status: "assigned_to_designer",
    }).countDocuments();

    const inProductionOrders = await Order.find({
      designerId: req.session.user.id,
      status: "in_production",
    }).countDocuments();

    const completedOrders = await Order.find({
      designerId: req.session.user.id,
      status: "production_completed",
    }).countDocuments();

    // Get recent orders assigned to this designer
    const orders = await Order.find({
      designerId: req.session.user.id,
    })
      .populate("userId", "username email")
      .populate("designerId", "username email")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      stats: {
        assignedOrders,
        pendingOrders,
        activeOrders: inProductionOrders,
        inProductionOrders,
        completedOrders,
      },
      orders,
    });
  } catch (error) {
    console.error("Error fetching designer dashboard:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Get order details
app.get("/designer/order/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const order = await Order.findById(req.params.id)
      .populate("userId", "username email contactNumber")
      .populate("items.productId", "name images price description")
      .populate(
        "items.designId",
        "name graphic basePrice estimatedPrice category fabric color size customText",
      )
      .populate("designerId", "username email")
      .lean();

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Designers can only view orders assigned to them
    if (
      order.designerId &&
      order.designerId._id.toString() !== req.session.user.id
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to view this order" });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Get all assigned orders (API endpoint for Redux)
app.get("/designer/api/orders", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const orders = await Order.find({
      designerId: req.session.user.id,
    })
      .populate("userId", "username name email contactNumber")
      .populate("items.productId", "name images price")
      .populate(
        "items.designId",
        "name graphic basePrice estimatedPrice category fabric color size customText",
      )
      .populate("managerId", "username email")
      .populate("designerId", "username email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching designer orders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// In-memory store for graphic stock status
const graphicStockStatus = {
  graphic_1: true,
  graphic_2: true,
  graphic_3: true,
  graphic_4: true,
  graphic_5: true,
  graphic_6: true,
  graphic_7: true,
  graphic_8: true,
  graphic_9: true,
  graphic_10: true,
  graphic_11: true,
};

app.get("/api/designer/products", requireRole("designer"), async (req, res) => {
  try {
    // Return the 11 static graphics that designers can manage
    const staticGraphics = [
      {
        _id: "graphic_1",
        name: "Dragon Graphic 1",
        graphic: "/images/graphics/dragon_1.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_1,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_2",
        name: "Dragon Graphic 2",
        graphic: "/images/graphics/dragon_2.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_2,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_3",
        name: "Dragon Graphic 3",
        graphic: "/images/graphics/dragon_3.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_3,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_4",
        name: "Dragon Graphic 4",
        graphic: "/images/graphics/dragon_4.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_4,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_5",
        name: "Dragon Graphic 5",
        graphic: "/images/graphics/dragon_5.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_5,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_6",
        name: "Dragon Graphic 6",
        graphic: "/images/graphics/dragon_6.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_6,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_7",
        name: "Dragon Graphic 7",
        graphic: "/images/graphics/dragon_7.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_7,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_8",
        name: "Dragon Graphic 8",
        graphic: "/images/graphics/dragon_8.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_8,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_9",
        name: "Dragon Graphic 9",
        graphic: "/images/graphics/dragon_9.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_9,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_10",
        name: "Dragon Graphic 10",
        graphic: "/images/graphics/dragon_10.jpg",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_10,
        createdAt: new Date("2025-11-26"),
      },
      {
        _id: "graphic_11",
        name: "Model Graphic",
        graphic: "/images/graphics/model.png",
        category: "T-Shirt",
        basePrice: 500,
        inStock: graphicStockStatus.graphic_11,
        createdAt: new Date("2025-11-26"),
      },
    ];

    res.json({ success: true, products: staticGraphics });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Update design/graphic stock status
app.put("/api/designer/products/:id/stock", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const { inStock } = req.body;
    const graphicId = req.params.id;

    // Update in-memory stock status
    if (graphicStockStatus.hasOwnProperty(graphicId)) {
      graphicStockStatus[graphicId] = inStock;
      res.json({
        success: true,
        message: `Graphic marked as ${inStock ? "in stock" : "out of stock"}`,
      });
    } else {
      res.status(404).json({ success: false, message: "Graphic not found" });
    }
  } catch (error) {
    console.error("Error updating graphic stock:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================================================
// DESIGNER PROFILE & AVAILABILITY ENDPOINTS
// =====================================================

// Designer - Get own profile
app.get("/api/designer/profile", requireRole("designer"), async (req, res) => {
  try {
    const designer = await User.findById(req.session.user.id)
      .select("-password")
      .lean();
    if (!designer) {
      return res
        .status(404)
        .json({ success: false, message: "Designer not found" });
    }

    res.json({ success: true, designer });
  } catch (error) {
    console.error("Error fetching designer profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Update availability status
app.put(
  "/api/designer/availability",
  requireRole("designer"),
  async (req, res) => {
    try {
      const { isAvailable, status } = req.body;
      // status can be: "available", "busy", "not_accepting"

      console.log("=== UPDATE AVAILABILITY ===");
      console.log("Received status:", status);
      console.log("Received isAvailable:", isAvailable);

      const updateData = {
        "designerProfile.isAvailable":
          isAvailable !== false && status !== "not_accepting",
        "designerProfile.availabilityStatus":
          status || (isAvailable ? "available" : "busy"),
      };

      console.log("Update data:", updateData);
      console.log("==========================");

      const designer = await User.findByIdAndUpdate(
        req.session.user.id,
        { $set: updateData },
        { new: true },
      ).select("-password");

      if (!designer) {
        return res
          .status(404)
          .json({ success: false, message: "Designer not found" });
      }

      console.log("✅ Updated designer availability:");
      console.log(
        "   availabilityStatus:",
        designer.designerProfile?.availabilityStatus,
      );
      console.log("   isAvailable:", designer.designerProfile?.isAvailable);

      res.json({
        success: true,
        message: "Availability updated successfully",
        designer: {
          isAvailable: designer.designerProfile?.isAvailable,
          availabilityStatus: designer.designerProfile?.availabilityStatus,
        },
      });
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Designer - Update profile
app.put("/api/designer/profile", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { bio, specializations, experience, priceRange, turnaroundDays } =
      req.body;

    const updateData = {};
    if (bio !== undefined) updateData["designerProfile.bio"] = bio;
    if (specializations !== undefined)
      updateData["designerProfile.specializations"] = specializations;
    if (experience !== undefined)
      updateData["designerProfile.experience"] = experience;
    if (priceRange !== undefined)
      updateData["designerProfile.priceRange"] = priceRange;
    if (turnaroundDays !== undefined)
      updateData["designerProfile.turnaroundDays"] = turnaroundDays;

    const designer = await User.findByIdAndUpdate(
      req.session.user.id,
      { $set: updateData },
      { new: true },
    ).select("-password");

    if (!designer) {
      return res
        .status(404)
        .json({ success: false, message: "Designer not found" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      designer,
    });
  } catch (error) {
    console.error("Error updating designer profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================================================
// DESIGNER PORTFOLIO ENDPOINTS
// =====================================================

// Designer - Get own portfolio items
app.get("/api/designer/portfolio", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const portfolioItems = await DesignerPortfolio.find({
      designerId: req.session.user.id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, portfolio: portfolioItems });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Create portfolio item
app.post("/designer/products", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { name, description, category, style, basePrice, graphic, tags } =
      req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    const newPortfolioItem = new DesignerPortfolio({
      designerId: req.session.user.id,
      name,
      description: description || "",
      category: category || "T-Shirt",
      style: style || "Casual",
      basePrice: basePrice || 500,
      graphic: graphic || "",
      tags: tags || [],
      isActive: true,
      inStock: true,
    });

    await newPortfolioItem.save();

    res.json({
      success: true,
      message: "Design created successfully",
      portfolio: newPortfolioItem,
    });
  } catch (error) {
    console.error("Error creating portfolio item:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Update portfolio item
app.put("/api/designer/portfolio/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const {
      name,
      description,
      category,
      style,
      basePrice,
      graphic,
      tags,
      isActive,
      inStock,
    } = req.body;

    const portfolioItem = await DesignerPortfolio.findOne({
      _id: req.params.id,
      designerId: req.session.user.id,
    });

    if (!portfolioItem) {
      return res
        .status(404)
        .json({ success: false, message: "Portfolio item not found" });
    }

    // Update fields
    if (name) portfolioItem.name = name;
    if (description !== undefined) portfolioItem.description = description;
    if (category) portfolioItem.category = category;
    if (style) portfolioItem.style = style;
    if (basePrice) portfolioItem.basePrice = basePrice;
    if (graphic) portfolioItem.graphic = graphic;
    if (tags) portfolioItem.tags = tags;
    if (isActive !== undefined) portfolioItem.isActive = isActive;
    if (inStock !== undefined) portfolioItem.inStock = inStock;
    portfolioItem.updatedAt = new Date();

    await portfolioItem.save();

    res.json({
      success: true,
      message: "Design updated successfully",
      portfolio: portfolioItem,
    });
  } catch (error) {
    console.error("Error updating portfolio item:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Delete portfolio item
app.delete("/api/designer/portfolio/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const result = await DesignerPortfolio.findOneAndDelete({
      _id: req.params.id,
      designerId: req.session.user.id,
    });

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Portfolio item not found" });
    }

    res.json({ success: true, message: "Design deleted successfully" });
  } catch (error) {
    console.error("Error deleting portfolio item:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Public - Get all active designer portfolios (for marketplace browsing)
app.get("/api/marketplace/designs", async (req, res) => {
  try {
    const { category, designer, minPrice, maxPrice, sort } = req.query;

    const filter = { isActive: true, inStock: true };

    if (category) filter.category = category;
    if (designer) filter.designerId = designer;
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_low") sortOption = { basePrice: 1 };
    if (sort === "price_high") sortOption = { basePrice: -1 };
    if (sort === "popular") sortOption = { orderCount: -1 };

    const designs = await DesignerPortfolio.find(filter)
      .populate("designerId", "username fullName")
      .sort(sortOption)
      .lean();

    res.json({ success: true, designs });
  } catch (error) {
    console.error("Error fetching marketplace designs:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================================================
// MARKETPLACE DESIGNERS ENDPOINTS
// =====================================================

// Public - Browse all designers with filters
app.get("/api/marketplace/designers", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      specialization,
      minRating,
      maxPrice,
      available,
      sortBy = "rating",
      search,
    } = req.query;

    const filter = {
      role: "designer",
      approved: true,
      // Show all designers, including unavailable ones (removed isAvailable filter)
    };

    // Apply filters
    if (specialization) {
      filter["designerProfile.specializations"] = { $in: [specialization] };
    }
    if (minRating) {
      filter["designerProfile.rating"] = { $gte: Number(minRating) };
    }
    if (maxPrice) {
      filter["designerProfile.priceRange.min"] = { $lte: Number(maxPrice) };
    }
    if (available === "true") {
      // Only filter by availability if checkbox is checked
      filter["designerProfile.isAvailable"] = true;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { "designerProfile.bio": { $regex: search, $options: "i" } },
        {
          "designerProfile.specializations": { $regex: search, $options: "i" },
        },
      ];
    }

    // Sort options
    let sortOption = { "designerProfile.rating": -1 };
    if (sortBy === "orders")
      sortOption = { "designerProfile.completedOrders": -1 };
    if (sortBy === "price_low")
      sortOption = { "designerProfile.priceRange.min": 1 };
    if (sortBy === "price_high")
      sortOption = { "designerProfile.priceRange.min": -1 };
    if (sortBy === "newest") sortOption = { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const cacheKey = `marketplace:designers:${JSON.stringify({ page, limit, specialization, minRating, maxPrice, available, sortBy, search })}`;
    const cached = await cacheGet(cacheKey);
    res.setHeader("X-Cache-Key", cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const total = await User.countDocuments(filter);

    const designers = await User.find(filter)
      .select("name username email designerProfile createdAt")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    console.log("=== MARKETPLACE DESIGNERS QUERY ===");
    console.log("Total designers found:", designers.length);
    designers.forEach((d, idx) => {
      console.log(`Designer ${idx + 1}: ${d.name}`);
      console.log(
        `  - availabilityStatus: ${d.designerProfile?.availabilityStatus}`,
      );
      console.log(`  - isAvailable: ${d.designerProfile?.isAvailable}`);
    });
    console.log("===================================");

    // Transform designers for frontend
    const formattedDesigners = designers.map((d) => ({
      _id: d._id,
      name: d.name || d.username,
      username: d.username,
      email: d.email,
      bio: d.designerProfile?.bio || "",
      specializations: d.designerProfile?.specializations || [],
      experience: d.designerProfile?.experience || 0,
      portfolio: d.designerProfile?.portfolio || [],
      rating: d.designerProfile?.rating || 0,
      totalRatings: d.designerProfile?.totalRatings || 0,
      completedOrders: d.designerProfile?.completedOrders || 0,
      isAvailable: d.designerProfile?.isAvailable !== false,
      availabilityStatus: d.designerProfile?.availabilityStatus || "available",
      priceRange: d.designerProfile?.priceRange || { min: 500, max: 5000 },
      turnaroundDays: d.designerProfile?.turnaroundDays || 7,
      badges: d.designerProfile?.badges || [],
      joinedAt: d.createdAt,
    }));

    const result = {
      success: true,
      designers: formattedDesigners,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalDesigners: total,
      },
    };
    if (!search) {
      await cacheSet(cacheKey, result, 60);
      res.setHeader("X-Cache", "MISS");
      res.setHeader("X-Cache-TTL", "60");
    } else {
      res.setHeader("X-Cache", "BYPASS");
    }
    res.json(result);
  } catch (error) {
    console.error("Error fetching marketplace designers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Public - Get single designer profile
app.get("/api/marketplace/designers/:id", async (req, res) => {
  try {
    console.log("=== FETCHING DESIGNER PROFILE ===");
    console.log("Designer ID:", req.params.id);

    const designer = await User.findOne({
      _id: req.params.id,
      role: "designer",
    })
      .select("name username email designerProfile createdAt approved")
      .lean();

    console.log("Designer found:", !!designer);
    if (designer) {
      console.log("Designer approved status:", designer.approved);
    }

    if (!designer) {
      console.log("❌ Designer not found in database");
      return res
        .status(404)
        .json({ success: false, message: "Designer not found" });
    }

    // Allow fetching designer profile even if not approved (for checkout flow)
    // The approval check should be for marketplace listing, not for already-selected designers

    // Get designer's portfolio items
    const portfolioItems = await DesignerPortfolio.find({
      designerId: designer._id,
      isActive: true,
    }).lean();

    // Get recent reviews for this designer
    const reviews = await Review.find({
      productId: { $in: portfolioItems.map((p) => p._id) },
    })
      .populate("userId", "name username")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const formattedDesigner = {
      _id: designer._id,
      name: designer.name || designer.username,
      username: designer.username,
      email: designer.email,
      bio: designer.designerProfile?.bio || "",
      specializations: designer.designerProfile?.specializations || [],
      experience: designer.designerProfile?.experience || 0,
      portfolio: designer.designerProfile?.portfolio || [],
      rating: designer.designerProfile?.rating || 0,
      totalRatings: designer.designerProfile?.totalRatings || 0,
      completedOrders: designer.designerProfile?.completedOrders || 0,
      isAvailable: designer.designerProfile?.isAvailable !== false,
      availabilityStatus:
        designer.designerProfile?.availabilityStatus || "available",
      priceRange: designer.designerProfile?.priceRange || {
        min: 500,
        max: 5000,
      },
      turnaroundDays: designer.designerProfile?.turnaroundDays || 7,
      badges: designer.designerProfile?.badges || [],
      joinedAt: designer.createdAt,
      portfolioItems,
      reviews,
    };

    console.log("✅ Designer profile fetched successfully");
    console.log("=================================");
    res.json({ success: true, designer: formattedDesigner });
  } catch (error) {
    console.error("❌ Error fetching designer profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================================================
// DESIGNER EARNINGS & PAYOUT ENDPOINTS
// =====================================================

// Get platform commission info (public)
app.get("/api/platform/commission-info", (req, res) => {
  res.json({
    success: true,
    commission: {
      designerRate: PLATFORM_CONFIG.defaultDesignerRate,
      platformRate: PLATFORM_CONFIG.defaultPlatformRate,
      minimumPayout: PLATFORM_CONFIG.minimumPayout,
      payoutHoldDays: PLATFORM_CONFIG.payoutHoldDays,
      tiers: PLATFORM_CONFIG.tiers,
      comparison: {
        fiverr: { designerRate: 80 },
        upwork: { designerRate: 80 },
        "99designs": { designerRate: 75 },
      },
      payoutApprovedBy: "Admin", // Clarify who approves payouts
    },
  });
});

// Designer - Get earnings dashboard
app.get("/api/designer/earnings", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const designerId = req.session.user.id;

    // Update pending earnings to available if past hold period
    await DesignerEarning.updateMany(
      {
        designerId,
        status: "pending",
        availableDate: { $lte: new Date() },
      },
      { $set: { status: "available" } },
    );

    // Get all earnings
    const earnings = await DesignerEarning.find({ designerId })
      .populate("orderId", "orderNumber totalAmount status")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate summary
    const summary = {
      totalEarned: 0,
      pending: 0,
      availableBalance: 0,
      processing: 0,
      paid: 0,
    };

    for (const earning of earnings) {
      summary.totalEarned += earning.designerEarning;
      switch (earning.status) {
        case "pending":
          summary.pending += earning.designerEarning;
          break;
        case "available":
          summary.availableBalance += earning.designerEarning;
          break;
        case "processing":
          summary.processing += earning.designerEarning;
          break;
        case "paid":
          summary.paid += earning.designerEarning;
          break;
      }
    }

    res.json({ success: true, earnings, summary });
  } catch (error) {
    console.error("Error fetching earnings:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Get payout requests
app.get("/api/designer/payout/requests", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const requests = await PayoutRequest.find({
      designerId: req.session.user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching payout requests:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Request payout
app.post("/api/designer/payout/request", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { amount, paymentMethod, paymentDetails } = req.body;
    const designerId = req.session.user.id;

    // Validate amount
    if (!amount || amount < PLATFORM_CONFIG.minimumPayout) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout amount is ₹${PLATFORM_CONFIG.minimumPayout}`,
      });
    }

    // Check available balance
    const availableEarnings = await DesignerEarning.aggregate([
      {
        $match: {
          designerId: new mongoose.Types.ObjectId(designerId),
          status: "available",
        },
      },
      { $group: { _id: null, total: { $sum: "$designerEarning" } } },
    ]);

    const availableBalance = availableEarnings[0]?.total || 0;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₹${availableBalance}`,
      });
    }

    // Create payout request
    const payoutRequest = new PayoutRequest({
      designerId,
      amount,
      paymentMethod,
      paymentDetails,
      status: "pending",
    });

    await payoutRequest.save();

    // Mark earnings as processing (FIFO)
    let remainingAmount = amount;
    const earningsToUpdate = await DesignerEarning.find({
      designerId,
      status: "available",
    }).sort({ createdAt: 1 });

    for (const earning of earningsToUpdate) {
      if (remainingAmount <= 0) break;

      if (earning.designerEarning <= remainingAmount) {
        earning.status = "processing";
        earning.payoutRequestId = payoutRequest._id;
        remainingAmount -= earning.designerEarning;
      } else {
        // Partial - don't update this one
        break;
      }
      await earning.save();
    }

    // Create notification for admin
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: "payout_request",
        title: "New Payout Request",
        message: `Designer ${req.session.user.name || req.session.user.username} requested a payout of ₹${amount}`,
        relatedId: payoutRequest._id,
        relatedModel: "PayoutRequest",
      });
    }

    res.json({
      success: true,
      message: "Payout request submitted successfully",
      request: payoutRequest,
    });
  } catch (error) {
    console.error("Error creating payout request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Get all payout requests
app.get("/api/admin/payout/requests", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const requests = await PayoutRequest.find()
      .populate("designerId", "username name email")
      .populate("processedBy", "username name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching payout requests:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Process payout request (approve/reject/complete)
app.put("/api/admin/payout/:id/process", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { action, adminNotes } = req.body; // action: 'approve', 'reject', 'complete'
    const payoutRequest = await PayoutRequest.findById(req.params.id);

    if (!payoutRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Payout request not found" });
    }

    payoutRequest.processedBy = req.session.user.id;
    payoutRequest.processedAt = new Date();
    if (adminNotes) payoutRequest.adminNotes = adminNotes;

    if (action === "approve") {
      payoutRequest.status = "approved";
    } else if (action === "reject") {
      payoutRequest.status = "rejected";
      // Revert earnings to available
      await DesignerEarning.updateMany(
        { payoutRequestId: payoutRequest._id },
        { $set: { status: "available" }, $unset: { payoutRequestId: 1 } },
      );
    } else if (action === "complete") {
      payoutRequest.status = "completed";
      // Mark earnings as paid
      await DesignerEarning.updateMany(
        { payoutRequestId: payoutRequest._id },
        { $set: { status: "paid", paidAt: new Date() } },
      );
    }

    await payoutRequest.save();

    // Notify designer
    await Notification.create({
      userId: payoutRequest.designerId,
      type: "payout_update",
      title: `Payout ${action === "complete" ? "Completed" : action === "approve" ? "Approved" : "Rejected"}`,
      message:
        action === "complete"
          ? `Your payout of ₹${payoutRequest.amount} has been processed and sent!`
          : action === "approve"
            ? `Your payout request of ₹${payoutRequest.amount} has been approved and is being processed.`
            : `Your payout request of ₹${payoutRequest.amount} was rejected. ${adminNotes || ""}`,
      relatedId: payoutRequest._id,
      relatedModel: "PayoutRequest",
    });

    res.json({
      success: true,
      message: `Payout ${action}d successfully`,
      request: payoutRequest,
    });
  } catch (error) {
    console.error("Error processing payout request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================================================
// ADMIN - DESIGNER MANAGEMENT
// =====================================================

// Admin - Get all designers
app.get("/api/admin/designers", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const designers = await User.find({ role: "designer" })
      .select("-password")
      .lean();

    // Get earnings summary for each designer
    const designersWithStats = await Promise.all(
      designers.map(async (designer) => {
        const earningsSummary = await DesignerEarning.aggregate([
          { $match: { designerId: designer._id } },
          {
            $group: {
              _id: "$status",
              total: { $sum: "$designerEarning" },
            },
          },
        ]);

        const earnings = {
          pending: 0,
          available: 0,
          processing: 0,
          paid: 0,
          total: 0,
        };

        earningsSummary.forEach((e) => {
          earnings[e._id] = e.total;
          earnings.total += e.total;
        });

        const orderCount = await Order.countDocuments({
          designerId: designer._id,
        });

        return {
          ...designer,
          earnings,
          orderCount,
        };
      }),
    );

    res.json({ success: true, designers: designersWithStats });
  } catch (error) {
    console.error("Error fetching designers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Get designer profile details
app.get("/api/admin/designers/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const designer = await User.findOne({
      _id: req.params.id,
      role: "designer",
    })
      .select("-password")
      .lean();

    if (!designer) {
      return res
        .status(404)
        .json({ success: false, message: "Designer not found" });
    }

    // Get earnings details
    const earnings = await DesignerEarning.find({ designerId: designer._id })
      .populate("orderId", "orderNumber totalAmount status")
      .sort({ createdAt: -1 })
      .lean();

    // Get payout requests
    const payoutRequests = await PayoutRequest.find({
      designerId: designer._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Get portfolio items from both sources
    const portfolioFromCollection = await DesignerPortfolio.find({
      designerId: designer._id,
    }).lean();

    // Combine portfolio from designer profile and separate collection
    const portfolio = [
      ...(designer.designerProfile?.portfolio || []),
      ...portfolioFromCollection,
    ];

    // Get order history
    const orders = await Order.find({ designerId: designer._id })
      .select("orderNumber totalAmount status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      designer,
      earnings,
      payoutRequests,
      portfolio,
      orders,
    });
  } catch (error) {
    console.error("Error fetching designer details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Update designer approval status
app.put("/api/admin/designers/:id/approve", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { approved } = req.body;
    const designer = await User.findOneAndUpdate(
      { _id: req.params.id, role: "designer" },
      { approved: approved },
      { new: true },
    ).select("-password");

    if (!designer) {
      return res
        .status(404)
        .json({ success: false, message: "Designer not found" });
    }

    // Notify designer
    await Notification.create({
      userId: designer._id,
      type: "account_update",
      title: approved ? "Account Approved!" : "Account Status Updated",
      message: approved
        ? "Congratulations! Your designer account has been approved. You can now receive orders."
        : "Your designer account has been put on hold. Please contact support for more information.",
    });

    res.json({
      success: true,
      message: `Designer ${approved ? "approved" : "unapproved"} successfully`,
      designer,
    });
  } catch (error) {
    console.error("Error updating designer approval:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Update designer profile
app.put("/api/admin/designers/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const updates = req.body;
    delete updates.password; // Don't allow password update through this endpoint
    delete updates.role; // Don't allow role change

    const designer = await User.findOneAndUpdate(
      { _id: req.params.id, role: "designer" },
      updates,
      { new: true },
    ).select("-password");

    if (!designer) {
      return res
        .status(404)
        .json({ success: false, message: "Designer not found" });
    }

    res.json({
      success: true,
      message: "Designer updated successfully",
      designer,
    });
  } catch (error) {
    console.error("Error updating designer:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get all graphics with stock status for design studio
app.get("/api/graphics/all", async (req, res) => {
  try {
    // Return the same 11 static graphics with their stock status
    const staticGraphics = [
      {
        _id: "graphic_1",
        name: "Dragon Graphic 1",
        graphic: "/images/graphics/dragon_1.jpg",
        filename: "dragon_1.jpg",
        inStock: graphicStockStatus.graphic_1,
      },
      {
        _id: "graphic_2",
        name: "Dragon Graphic 2",
        graphic: "/images/graphics/dragon_2.jpg",
        filename: "dragon_2.jpg",
        inStock: graphicStockStatus.graphic_2,
      },
      {
        _id: "graphic_3",
        name: "Dragon Graphic 3",
        graphic: "/images/graphics/dragon_3.jpg",
        filename: "dragon_3.jpg",
        inStock: graphicStockStatus.graphic_3,
      },
      {
        _id: "graphic_4",
        name: "Dragon Graphic 4",
        graphic: "/images/graphics/dragon_4.jpg",
        filename: "dragon_4.jpg",
        inStock: graphicStockStatus.graphic_4,
      },
      {
        _id: "graphic_5",
        name: "Dragon Graphic 5",
        graphic: "/images/graphics/dragon_5.jpg",
        filename: "dragon_5.jpg",
        inStock: graphicStockStatus.graphic_5,
      },
      {
        _id: "graphic_6",
        name: "Dragon Graphic 6",
        graphic: "/images/graphics/dragon_6.jpg",
        filename: "dragon_6.jpg",
        inStock: graphicStockStatus.graphic_6,
      },
      {
        _id: "graphic_7",
        name: "Dragon Graphic 7",
        graphic: "/images/graphics/dragon_7.jpg",
        filename: "dragon_7.jpg",
        inStock: graphicStockStatus.graphic_7,
      },
      {
        _id: "graphic_8",
        name: "Dragon Graphic 8",
        graphic: "/images/graphics/dragon_8.jpg",
        filename: "dragon_8.jpg",
        inStock: graphicStockStatus.graphic_8,
      },
      {
        _id: "graphic_9",
        name: "Dragon Graphic 9",
        graphic: "/images/graphics/dragon_9.jpg",
        filename: "dragon_9.jpg",
        inStock: graphicStockStatus.graphic_9,
      },
      {
        _id: "graphic_10",
        name: "Dragon Graphic 10",
        graphic: "/images/graphics/dragon_10.jpg",
        filename: "dragon_10.jpg",
        inStock: graphicStockStatus.graphic_10,
      },
      {
        _id: "graphic_11",
        name: "Model Graphic",
        graphic: "/images/graphics/model.png",
        filename: "model.png",
        inStock: graphicStockStatus.graphic_11,
      },
    ];

    res.json({ success: true, graphics: staticGraphics });
  } catch (error) {
    console.error("Error fetching graphics:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get available graphics for design studio (only in-stock items)
app.get("/api/graphics/available", async (req, res) => {
  try {
    const designs = await Design.find({ inStock: { $ne: false } })
      .select("graphic name category basePrice")
      .sort({ createdAt: -1 });
    res.json({ success: true, graphics: designs });
  } catch (error) {
    console.error("Error fetching available graphics:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager Routes
// Manager - Dashboard
app.get("/manager/dashboard", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const inProductionOrders = await Order.countDocuments({
      status: "in-production",
    });
    const completedOrders = await Order.countDocuments({ status: "completed" });

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        inProductionOrders,
        completedOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching manager dashboard:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Get list of designers
app.get("/manager/designers", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const designers = await User.find({ role: "designer" })
      .select("username email")
      .lean();

    res.json({ success: true, designers });
  } catch (error) {
    console.error("Error fetching designers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Get all orders
app.get("/manager/api/orders", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const orders = await Order.find({})
      .populate("userId", "username name email")
      .populate("items.productId", "name images price")
      .populate("items.designId", "name graphic basePrice estimatedPrice")
      .populate("managerId", "username name email")
      .populate("designerId", "username name email")
      .populate("deliveryPersonId", "username name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Get pending orders
app.get("/manager/pending", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const orders = await Order.find({ status: "pending" })
      .populate("userId", "username email")
      .populate("items.productId", "name images price")
      .populate("items.designId", "name graphic basePrice estimatedPrice")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Get order details
app.get("/manager/order/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const order = await Order.findById(req.params.id)
      .populate("userId", "username email contactNumber")
      .populate("items.productId", "name images price description")
      .populate(
        "items.designId",
        "name graphic basePrice estimatedPrice category fabric color size customText",
      )
      .populate("managerId", "username email")
      .populate("designerId", "username email")
      .populate("deliveryPersonId", "username email")
      .lean();

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Update order status
app.put("/manager/order/:id/status", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    res.json({ success: true, message: "Order status updated", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Assign order to designer
app.post("/manager/order/:id/assign", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { designerId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // ⚠️ CRITICAL RESTRICTION: Only designer@designden.com can be assigned
    const designer = await User.findOne({ _id: designerId, role: "designer" });
    if (!designer || designer.email !== "designer@designden.com") {
      return res.status(403).json({
        success: false,
        message: "Only designer@designden.com can be assigned to orders",
      });
    }

    // Update order with designer assignment
    order.designerId = designerId;
    order.status = "assigned_to_designer";
    order.designerAssignedAt = new Date();
    order.updatedAt = new Date();

    // Add to timeline
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: "assigned_to_designer",
      note: `Assigned to designer ${designer.email}`,
      at: new Date(),
    });

    await order.save();
    await order.populate("designerId", "username email");

    // Create notifications
    // 1. Notify designer
    await Notification.create({
      userId: designerId,
      orderId: order._id,
      message: `You have been assigned order #${order._id
        .toString()
        .substring(0, 8)}`,
      type: "info",
    });

    // 2. Notify customer
    await Notification.create({
      userId: order.userId,
      orderId: order._id,
      message: `Your order has been assigned to a designer`,
      type: "success",
    });

    res.json({
      success: true,
      message: "Designer assigned successfully",
      order,
    });
  } catch (error) {
    console.error("Error assigning designer:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Ship order
app.post("/manager/order/:id/ship", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.status = "shipped";
    order.trackingNumber = trackingNumber;
    order.updatedAt = new Date();
    await order.save();

    res.json({ success: true, message: "Order marked as shipped", order });
  } catch (error) {
    console.error("Error shipping order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Deliver order
app.post("/manager/order/:id/deliver", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.status = "delivered";
    order.paymentStatus = "paid"; // Auto-mark payment as paid on delivery
    order.updatedAt = new Date();
    await order.save();

    // Create designer earnings if this order has a designer
    if (order.designerId) {
      try {
        await createDesignerEarning(
          order._id,
          order.designerId,
          order.totalAmount,
        );

        // Notify designer about earnings
        await Notification.create({
          userId: order.designerId,
          type: "earning",
          title: "New Earnings!",
          message: `You earned from order ${order.orderNumber || order._id}. Check your earnings dashboard!`,
          relatedId: order._id,
          relatedModel: "Order",
        });
      } catch (earningError) {
        console.error("Error creating designer earning:", earningError);
      }
    }

    res.json({ success: true, message: "Order marked as delivered", order });
  } catch (error) {
    console.error("Error delivering order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Assign delivery person
app.post("/manager/order/:id/assign-delivery", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { deliveryPerson } = req.body;
    const order = await Order.findById(req.params.id)
      .populate("userId", "username email")
      .populate("designerId", "username email");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (!deliveryPerson || !deliveryPerson.trim()) {
      return res.status(400).json({
        success: false,
        message: "Delivery person name is required",
      });
    }

    // Determine order type
    const isCustomOrder = await order.isCustomOrder();
    const isShopOrder = await order.isShopOrder();

    // Update order with delivery person
    order.deliveryPerson = deliveryPerson.trim();
    order.deliveryAssignedAt = new Date();
    order.status = "shipped"; // Both types move to "shipped" when delivery is assigned
    order.updatedAt = new Date();

    // Add to timeline
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: "shipped",
      note: `Delivery assigned to ${deliveryPerson.trim()}${
        isCustomOrder
          ? " (Custom order ready from designer)"
          : " (Shop order ready from warehouse)"
      }`,
      at: new Date(),
    });

    await order.save();

    // Create notification for customer
    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `Delivery Assigned - Your ${
        isCustomOrder ? "custom design" : ""
      } order will be delivered by ${deliveryPerson.trim()}`,
      type: "info",
    });

    // Notify designer if it's a custom order
    if (isCustomOrder && order.designerId) {
      await Notification.create({
        userId: order.designerId._id,
        orderId: order._id,
        message: `Your completed design for Order #${order._id
          .toString()
          .substring(0, 8)} has been dispatched for delivery`,
        type: "success",
      });
    }

    res.json({
      success: true,
      message: `Delivery assigned to ${deliveryPerson.trim()}`,
      order,
    });
  } catch (error) {
    console.error("Error assigning delivery:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================================================
// MANAGER - DESIGNER & PAYOUT MANAGEMENT
// =====================================================

// Manager - Get all designers with details
app.get("/manager/api/designers", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const designers = await User.find({ role: "designer" })
      .select(
        "name username email approved designerProfile createdAt contactNumber",
      )
      .lean();

    // Get earnings summary for each designer
    const designersWithEarnings = await Promise.all(
      designers.map(async (designer) => {
        const earningsSummary = await DesignerEarning.aggregate([
          { $match: { designerId: designer._id } },
          {
            $group: {
              _id: "$status",
              total: { $sum: "$designerEarning" },
            },
          },
        ]);

        const earnings = {
          pending: 0,
          available: 0,
          processing: 0,
          paid: 0,
          total: 0,
        };

        earningsSummary.forEach((e) => {
          earnings[e._id] = e.total;
          earnings.total += e.total;
        });

        // Get order count
        const orderCount = await Order.countDocuments({
          designerId: designer._id,
        });

        return {
          ...designer,
          earnings,
          orderCount,
          rating: designer.designerProfile?.rating || 0,
          completedOrders: designer.designerProfile?.completedOrders || 0,
          isAvailable: designer.designerProfile?.isAvailable !== false,
        };
      }),
    );

    res.json({ success: true, designers: designersWithEarnings });
  } catch (error) {
    console.error("Error fetching designers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Get designer profile details
app.get("/manager/api/designers/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const designer = await User.findOne({
      _id: req.params.id,
      role: "designer",
    })
      .select("-password")
      .lean();

    if (!designer) {
      return res
        .status(404)
        .json({ success: false, message: "Designer not found" });
    }

    // Get earnings details
    const earnings = await DesignerEarning.find({ designerId: designer._id })
      .populate("orderId", "orderNumber totalAmount status")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get payout requests
    const payoutRequests = await PayoutRequest.find({
      designerId: designer._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Get order history
    const orders = await Order.find({ designerId: designer._id })
      .select("orderNumber totalAmount status createdAt")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      designer,
      earnings,
      payoutRequests,
      orders,
    });
  } catch (error) {
    console.error("Error fetching designer details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Get all payout requests
app.get("/manager/api/payout/requests", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const requests = await PayoutRequest.find()
      .populate("designerId", "username name email")
      .populate("processedBy", "username name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching payout requests:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Process payout request (approve/reject/complete)
app.put("/manager/api/payout/:id/process", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { action, adminNotes } = req.body;
    const payoutRequest = await PayoutRequest.findById(req.params.id);

    if (!payoutRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Payout request not found" });
    }

    payoutRequest.processedBy = req.session.user.id;
    payoutRequest.processedAt = new Date();
    if (adminNotes) payoutRequest.adminNotes = adminNotes;

    if (action === "approve") {
      payoutRequest.status = "approved";
    } else if (action === "reject") {
      payoutRequest.status = "rejected";
      // Revert earnings to available
      await DesignerEarning.updateMany(
        { payoutRequestId: payoutRequest._id },
        { $set: { status: "available" }, $unset: { payoutRequestId: 1 } },
      );
    } else if (action === "complete") {
      payoutRequest.status = "completed";
      // Mark earnings as paid
      await DesignerEarning.updateMany(
        { payoutRequestId: payoutRequest._id },
        { $set: { status: "paid", paidAt: new Date() } },
      );
    }

    await payoutRequest.save();

    // Notify designer
    await Notification.create({
      userId: payoutRequest.designerId,
      type: "payout_update",
      title: `Payout ${action === "complete" ? "Completed" : action === "approve" ? "Approved" : "Rejected"}`,
      message:
        action === "complete"
          ? `Your payout of ₹${payoutRequest.amount} has been processed and sent!`
          : action === "approve"
            ? `Your payout request of ₹${payoutRequest.amount} has been approved and is being processed.`
            : `Your payout request of ₹${payoutRequest.amount} was rejected. ${adminNotes || ""}`,
      relatedId: payoutRequest._id,
      relatedModel: "PayoutRequest",
    });

    res.json({
      success: true,
      message: `Payout ${action}d successfully`,
      request: payoutRequest,
    });
  } catch (error) {
    console.error("Error processing payout request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Create direct payout for designer
app.post("/manager/api/payout/create", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { designerId, amount, paymentMethod, paymentDetails, notes } =
      req.body;

    // Validate designer exists
    const designer = await User.findOne({ _id: designerId, role: "designer" });
    if (!designer) {
      return res
        .status(404)
        .json({ success: false, message: "Designer not found" });
    }

    // Check available balance
    const availableEarnings = await DesignerEarning.aggregate([
      {
        $match: {
          designerId: new mongoose.Types.ObjectId(designerId),
          status: "available",
        },
      },
      { $group: { _id: null, total: { $sum: "$designerEarning" } } },
    ]);

    const availableBalance = availableEarnings[0]?.total || 0;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Designer has ₹${availableBalance} available`,
      });
    }

    // Create payout request and mark as completed immediately
    const payoutRequest = new PayoutRequest({
      designerId,
      amount,
      paymentMethod: paymentMethod || "bank_transfer",
      paymentDetails: paymentDetails || {},
      status: "completed",
      adminNotes: notes || `Direct payout by manager`,
      processedBy: req.session.user.id,
      processedAt: new Date(),
    });

    await payoutRequest.save();

    // Mark earnings as paid (FIFO)
    let remainingAmount = amount;
    const earningsToUpdate = await DesignerEarning.find({
      designerId,
      status: "available",
    }).sort({ createdAt: 1 });

    for (const earning of earningsToUpdate) {
      if (remainingAmount <= 0) break;

      if (earning.designerEarning <= remainingAmount) {
        earning.status = "paid";
        earning.paidAt = new Date();
        earning.payoutRequestId = payoutRequest._id;
        remainingAmount -= earning.designerEarning;
        await earning.save();
      }
    }

    // Notify designer
    await Notification.create({
      userId: designerId,
      type: "payout_update",
      title: "Payout Completed!",
      message: `You have been paid ₹${amount}. Thank you for your work!`,
      relatedId: payoutRequest._id,
      relatedModel: "PayoutRequest",
    });

    res.json({
      success: true,
      message: "Payout completed successfully",
      request: payoutRequest,
    });
  } catch (error) {
    console.error("Error creating direct payout:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Update order status
app.put("/designer/order/:id/status", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Designers can only update orders assigned to them
    if (
      !order.designerId ||
      order.designerId.toString() !== req.session.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    res.json({ success: true, message: "Order status updated", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Start production on order
app.post("/designer/order/:id/start-production", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const order = await Order.findById(req.params.id).populate(
      "userId",
      "username email",
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Verify designer owns this order
    if (
      !order.designerId ||
      order.designerId.toString() !== req.session.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    // Can only start production if status is "assigned_to_designer" or "designer_accepted"
    if (
      order.status !== "assigned_to_designer" &&
      order.status !== "designer_accepted"
    ) {
      return res.status(400).json({
        success: false,
        message: "Order must be assigned to you to start production",
      });
    }

    // Update order to in_production
    order.status = "in_production";
    order.updatedAt = new Date();

    // Add to timeline
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: "in_production",
      note: `Designer has started working on the custom design`,
      at: new Date(),
    });

    await order.save();

    // Notify customer
    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `Production Started! Designer has started working on your custom design.`,
      type: "info",
    });

    res.json({
      success: true,
      message: "Production started",
      order,
    });
  } catch (error) {
    console.error("Error starting production:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Mark order as ready/completed
app.post("/designer/order/:id/mark-ready", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { completionNote } = req.body;
    const order = await Order.findById(req.params.id).populate(
      "userId",
      "username email",
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Verify designer owns this order
    if (
      !order.designerId ||
      order.designerId.toString() !== req.session.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    // Update order to production completed
    order.status = "production_completed";
    order.productionCompletedAt = new Date();
    order.progressPercentage = 100;
    order.currentMilestone = "Ready for Delivery";
    order.updatedAt = new Date();

    // Add to timeline
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: "production_completed",
      note: `Design work completed${
        completionNote ? ": " + completionNote : ""
      }`,
      at: new Date(),
    });

    await order.save();

    // Create notifications
    // 1. Notify customer
    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `🎊 Your Custom Design is Complete! Order #${order._id
        .toString()
        .substring(0, 8)}${completionNote ? ": " + completionNote : ""}`,
      type: "success",
    });

    // 2. Notify all managers
    const managers = await User.find({ role: "manager" });
    for (const manager of managers) {
      await Notification.create({
        userId: manager._id,
        orderId: order._id,
        message: `Order #${order._id
          .toString()
          .substring(
            0,
            8,
          )} ready for shipping - Designer has completed production`,
        type: "info",
      });
    }

    res.json({
      success: true,
      message: "Order marked as completed",
      order,
      redirect: `/designer/order/${order._id}`,
    });
  } catch (error) {
    console.error("Error marking order ready:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delivery Boy Routes (UPDATED to use deliveryPersonId)
// Delivery Boy - Dashboard
app.get("/delivery/dashboard", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Get orders assigned to this delivery person using deliveryPersonId
    const assignedOrders = await Order.find({
      deliveryPersonId: req.session.user.id,
      status: {
        $in: [
          "ready_for_pickup",
          "picked_up",
          "in_transit",
          "out_for_delivery",
        ],
      },
    })
      .populate("userId", "username email")
      .populate("designerId", "username email")
      .sort({ deliveryAssignedAt: -1 });

    res.json({
      success: true,
      orders: assignedOrders,
      stats: {
        pending: assignedOrders.filter((o) => o.status === "ready_for_pickup")
          .length,
        pickedUp: assignedOrders.filter((o) => o.status === "picked_up").length,
        inTransit: assignedOrders.filter(
          (o) => o.status === "in_transit" || o.status === "out_for_delivery",
        ).length,
      },
    });
  } catch (error) {
    console.error("Error fetching delivery orders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delivery Boy - Update delivery status
app.post("/delivery/order/:id/update-status", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { status, note } = req.body;
    const order = await Order.findById(req.params.id)
      .populate("userId", "username email")
      .populate("designerId", "username email");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Verify this delivery person is assigned to this order
    if (order.deliveryPersonId?.toString() !== req.session.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      });
    }

    // Validate status transition
    if (
      !["picked_up", "in_transit", "out_for_delivery", "delivered"].includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Use 'picked_up', 'in_transit', 'out_for_delivery' or 'delivered'",
      });
    }

    // Determine order type for better messaging
    const isCustomOrder = await order.isCustomOrder();

    // Update order status
    const oldStatus = order.status;
    order.status = status;
    order.updatedAt = new Date();

    if (status === "delivered") {
      order.deliveredAt = new Date();
      order.paymentStatus = "completed"; // Mark payment as completed on delivery
    }

    // Generate OTP if not already present and status is out_for_delivery
    if (status === "out_for_delivery" && !order.deliveryOTP?.code) {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      order.deliveryOTP = {
        code: otp,
        generatedAt: new Date(),
        verified: false,
      };
      console.log("Generated OTP for delivery:", otp);
    }

    // Add to timeline
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: status,
      note:
        note ||
        `Status updated by delivery person: ${req.session.user.username}`,
      at: new Date(),
    });

    await order.save();

    // Create notifications based on status
    if (status === "out_for_delivery") {
      // Notify customer with OTP info
      await Notification.create({
        userId: order.userId._id,
        orderId: order._id,
        message: `Your ${
          isCustomOrder ? "custom design " : ""
        }order is on the way! Your delivery OTP is: ${
          order.deliveryOTP?.code
        }. Delivery person: ${req.session.user.username}`,
        type: "info",
      });
    } else if (status === "delivered") {
      // Create designer earnings if this order has a designer
      if (order.designerId) {
        try {
          const designerIdStr = order.designerId._id || order.designerId;
          await createDesignerEarning(
            order._id,
            designerIdStr,
            order.totalAmount,
          );
        } catch (earningError) {
          console.error("Error creating designer earning:", earningError);
        }
      }

      // Notify customer
      await Notification.create({
        userId: order.userId._id,
        orderId: order._id,
        message: `✅ Your ${
          isCustomOrder ? "custom design " : ""
        }order has been delivered! Please provide feedback.`,
        type: "success",
      });

      // Notify managers
      const managers = await User.find({ role: "manager" });
      for (const manager of managers) {
        await Notification.create({
          userId: manager._id,
          orderId: order._id,
          message: `Order #${order._id
            .toString()
            .substring(0, 8)} delivered successfully by ${
            req.session.user.username
          }`,
          type: "success",
        });
      }

      // Notify designer if it's a custom order
      if (isCustomOrder && order.designerId) {
        await Notification.create({
          userId: order.designerId._id || order.designerId,
          orderId: order._id,
          message: `🎉 Your custom design for Order #${order._id
            .toString()
            .substring(
              0,
              8,
            )} was successfully delivered! Check your earnings dashboard.`,
          type: "success",
        });
      }
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delivery Boy - Get assigned orders (UPDATED to use deliveryPersonId)
app.get("/delivery/orders", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Use raw MongoDB to avoid CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");
    const usersCollection = db.collection("users");

    const orders = await ordersCollection
      .find({
        deliveryPersonId: new mongoose.Types.ObjectId(req.session.user.id),
      })
      .sort({ deliveryAssignedAt: -1 })
      .toArray();

    // Manually populate user info
    for (let order of orders) {
      if (order.userId) {
        const user = await usersCollection.findOne(
          { _id: new mongoose.Types.ObjectId(order.userId) },
          { projection: { username: 1, email: 1 } },
        );
        order.userId = user || order.userId;
      }
      if (order.designerId) {
        const designer = await usersCollection.findOne(
          { _id: new mongoose.Types.ObjectId(order.designerId) },
          { projection: { username: 1, email: 1 } },
        );
        order.designerId = designer || order.designerId;
      }
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching delivery orders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delivery Boy - Get order details
app.get("/delivery/order/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Use raw MongoDB to avoid CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");
    const usersCollection = db.collection("users");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Verify this delivery person is assigned
    if (order.deliveryPersonId?.toString() !== req.session.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      });
    }

    // Manually populate user info
    if (order.userId) {
      const user = await usersCollection.findOne(
        { _id: new mongoose.Types.ObjectId(order.userId) },
        { projection: { username: 1, email: 1, contactNumber: 1 } },
      );
      order.userId = user || order.userId;
    }
    if (order.designerId) {
      const designer = await usersCollection.findOne(
        { _id: new mongoose.Types.ObjectId(order.designerId) },
        { projection: { username: 1, email: 1 } },
      );
      order.designerId = designer || order.designerId;
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer Routes
// Customer - Dashboard
app.get("/customer/dashboard", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const totalOrders = await Order.countDocuments({
      userId: req.session.user.id,
    });
    const pendingOrders = await Order.countDocuments({
      userId: req.session.user.id,
      status: "pending",
    });
    const completedOrders = await Order.countDocuments({
      userId: req.session.user.id,
      status: "completed",
    });

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching customer dashboard:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Get orders
app.get("/customer/api/orders", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Use raw MongoDB to avoid CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const orders = await ordersCollection
      .find({ userId: new mongoose.Types.ObjectId(req.session.user.id) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Get order details
app.get("/customer/order/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Use raw MongoDB to avoid CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");
    const usersCollection = db.collection("users");
    const productsCollection = db.collection("products");
    const designsCollection = db.collection("designs");

    const toObjectId = (value) => {
      if (!value) return null;

      try {
        return new mongoose.Types.ObjectId(
          typeof value === "object" && value._id ? value._id : value,
        );
      } catch {
        return null;
      }
    };

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      userId: new mongoose.Types.ObjectId(req.session.user.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Manually populate delivery person info
    if (order.deliveryPersonId) {
      const deliveryPersonId = toObjectId(order.deliveryPersonId);
      if (deliveryPersonId) {
        const deliveryPerson = await usersCollection.findOne(
          { _id: deliveryPersonId },
          { projection: { name: 1, contactNumber: 1 } },
        );
        order.deliveryPersonId = deliveryPerson || order.deliveryPersonId;
      }
    }

    const productIds = [
      ...new Set(
        (order.items || [])
          .map((item) => {
            const objectId = toObjectId(item.productId);
            return objectId ? String(objectId) : null;
          })
          .filter(Boolean),
      ),
    ];

    const designIds = [
      ...new Set(
        (order.items || [])
          .map((item) => {
            const objectId = toObjectId(item.designId);
            return objectId ? String(objectId) : null;
          })
          .filter(Boolean),
      ),
    ];

    const [products, designs] = await Promise.all([
      productIds.length
        ? productsCollection
            .find({
              _id: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) },
            })
            .project({ name: 1, images: 1, price: 1, description: 1 })
            .toArray()
        : [],
      designIds.length
        ? designsCollection
            .find({
              _id: { $in: designIds.map((id) => new mongoose.Types.ObjectId(id)) },
            })
            .project({
              name: 1,
              graphic: 1,
              previewImage: 1,
              basePrice: 1,
              estimatedPrice: 1,
              category: 1,
              fabric: 1,
              color: 1,
              size: 1,
              pattern: 1,
              customText: 1,
            })
            .toArray()
        : [],
    ]);

    const productMap = new Map(
      products.map((product) => [String(product._id), product]),
    );
    const designMap = new Map(
      designs.map((design) => [String(design._id), design]),
    );

    order.items = (order.items || []).map((item) => {
      const productId = toObjectId(item.productId);
      const designId = toObjectId(item.designId);

      return {
        ...item,
        productId: productId
          ? productMap.get(String(productId)) || item.productId
          : item.productId,
        designId: designId
          ? designMap.get(String(designId)) || item.designId
          : item.designId,
      };
    });

    // Debug OTP
    console.log("=== Customer Order Details ===");
    console.log("Order ID:", order._id);
    console.log("Order Status:", order.status);
    console.log("Delivery OTP object:", order.deliveryOTP);
    console.log("Delivery OTP code:", order.deliveryOTP?.code);

    // Add OTP to response if order is out for delivery
    const deliveryStatuses = [
      "out_for_delivery",
      "picked_up",
      "in_transit",
      "ready_for_pickup",
    ];
    const shouldShowOTP =
      order.deliveryOTP?.code && deliveryStatuses.includes(order.status);

    console.log("Should show OTP:", shouldShowOTP);
    console.log("==============================");

    const orderWithOTP = {
      ...order,
      // Show OTP only when order is being delivered
      deliveryOTPCode: shouldShowOTP ? order.deliveryOTP.code : null,
    };

    res.json({ success: true, order: orderWithOTP });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Save design
app.post("/customer/save-design", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    console.log("=== SAVE DESIGN REQUEST ===");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Designer ID from request:", req.body.designerId);
    console.log(
      "Preview image received:",
      req.body.previewImage
        ? "Yes (length: " + req.body.previewImage.length + ")"
        : "No",
    );

    // Filter out non-schema fields
    const {
      name,
      category,
      fabric,
      color,
      pattern,
      size,
      graphic,
      customText,
      estimatedPrice,
      basePrice,
      price, // Also accept 'price' as alternative
      sustainabilityScore,
      designerId,
      gender,
      customImage,
      previewImage,
    } = req.body;

    // Calculate price - use estimatedPrice, then price, then basePrice, fallback to 1200
    const finalPrice = estimatedPrice || price || basePrice || 1200;
    const finalBasePrice = basePrice || 1200;

    console.log(
      "Price calculation: estimatedPrice=",
      estimatedPrice,
      "price=",
      price,
      "basePrice=",
      basePrice,
      "final=",
      finalPrice,
    );

    const design = new Design({
      userId: req.session.user.id,
      name,
      category,
      fabric,
      color,
      pattern,
      size,
      graphic,
      customText,
      estimatedPrice: finalPrice,
      basePrice: finalBasePrice,
      sustainabilityScore,
      designerId: designerId || null, // Explicitly set designerId
      previewImage: previewImage || null, // Store the 3D preview image
    });

    await design.save();
    console.log("Design saved with ID:", design._id);
    console.log("Design saved with designerId:", design.designerId);
    console.log(
      "Design saved with previewImage:",
      design.previewImage ? "Yes" : "No",
    );
    console.log("===========================");

    res.json({ success: true, message: "Design saved successfully", design });
  } catch (error) {
    console.error("Error saving design:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Get designs
app.get("/customer/designs", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const designs = await Design.find({ userId: req.session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, designs });
  } catch (error) {
    console.error("Error fetching designs:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Get single design by ID
app.get("/customer/designs/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const design = await Design.findOne({
      _id: req.params.id,
      userId: req.session.user.id,
    }).lean();

    if (!design) {
      return res
        .status(404)
        .json({ success: false, message: "Design not found" });
    }

    res.json({ success: true, design });
  } catch (error) {
    console.error("Error fetching design:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Add to wishlist
app.post("/customer/wishlist/add", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { productId, designId } = req.body;

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      userId: req.session.user.id,
      ...(productId && { productId }),
      ...(designId && { designId }),
    });

    if (existing) {
      return res.json({ success: true, message: "Already in wishlist" });
    }

    const wishlistItem = new Wishlist({
      userId: req.session.user.id,
      productId,
      designId,
    });

    await wishlistItem.save();
    res.json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Get wishlist
app.get("/customer/wishlist/list", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const wishlist = await Wishlist.find({ userId: req.session.user.id })
      .populate("productId")
      .populate("designId")
      .sort({ addedAt: -1 })
      .lean();

    res.json({ success: true, wishlist });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Remove from wishlist
app.delete("/customer/wishlist/remove/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await Wishlist.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.user.id,
    });

    res.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Cart Routes
app.get("/api/customer/cart", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }
    let cart = await Cart.findOne({ userId: req.session.user.id })
      .populate("items.productId")
      .populate({
        path: "items.designId",
        populate: {
          path: "designerId",
          select: "username email",
        },
      });

    console.log("=== BACKEND CART DEBUG ===");
    console.log("User ID:", req.session.user.id);
    console.log("Cart found:", !!cart);
    if (cart) {
      console.log("Raw cart items count:", cart.items.length);
      cart.items.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          _id: item._id,
          productId: item.productId?._id || "NOT POPULATED",
          designId: item.designId?._id || "NOT POPULATED",
          designerId:
            item.designId?.designerId?._id ||
            item.designId?.designerId ||
            "NO DESIGNER",
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        });
      });
    }
    console.log("=========================");

    if (!cart) {
      cart = new Cart({ userId: req.session.user.id, items: [] });
      await cart.save();
    }
    res.json({ success: true, cart });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/customer/cart", requireRole("customer"), async (req, res) => {
  try {
    const { productId, designId, quantity, size, color } = req.body;

    if (!productId && !designId) {
      return res.status(400).json({
        success: false,
        message: "Product ID or Design ID is required",
      });
    }

    // If adding a product (not a custom design), check stock
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      if (!product.inStock || product.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock available",
        });
      }
    }

    // If adding a custom design, verify it exists
    if (designId) {
      const design = await Design.findById(designId);
      if (!design) {
        return res
          .status(404)
          .json({ success: false, message: "Design not found" });
      }
    }

    let cart = await Cart.findOne({ userId: req.session.user.id });
    if (!cart) {
      cart = new Cart({ userId: req.session.user.id, items: [] });
    }

    const existingItem = cart.items.find((item) => {
      if (productId && item.productId) {
        return (
          item.productId.toString() === productId &&
          item.size === size &&
          item.color === color
        );
      }
      if (designId && item.designId) {
        return item.designId.toString() === designId;
      }
      return false;
    });

    let addedQuantity = quantity;
    if (existingItem) {
      addedQuantity = quantity;
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, designId, quantity, size, color });
    }

    // NOTE: Stock is NOT reduced when adding to cart
    // Stock will be reduced only when order is placed (in checkout/place-order)

    cart.updatedAt = new Date();
    await cart.save();
    res.json({ success: true, message: "Item added to cart", cart });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update cart item quantity
app.put("/api/customer/cart/:itemId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }

    const cart = await Cart.findOne({ userId: req.session.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    // NOTE: Stock is NOT modified when updating cart
    // Stock will only be reduced when order is placed

    item.quantity = quantity;
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ success: true, message: "Cart updated", cart });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Remove item from cart
app.delete("/api/customer/cart/:itemId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId: req.session.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    // NOTE: Stock is NOT returned when removing from cart
    // Stock was never reduced when adding to cart

    item.deleteOne();
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ success: true, message: "Item removed from cart", cart });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Legacy cart aliases for older frontend clients
app.get("/customer/api/cart", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    let cart = await Cart.findOne({ userId: req.session.user.id })
      .populate("items.productId")
      .populate({
        path: "items.designId",
        populate: {
          path: "designerId",
          select: "username email",
        },
      });

    if (!cart) {
      cart = new Cart({ userId: req.session.user.id, items: [] });
      await cart.save();
    }

    const items = Array.isArray(cart.items) ? cart.items : [];
    const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const total = items.reduce((sum, item) => {
      const productPrice = item.productId?.price;
      const designPrice = item.designId?.estimatedPrice;
      const unitPrice =
        typeof productPrice === "number"
          ? productPrice
          : typeof designPrice === "number"
            ? designPrice
            : 0;
      return sum + unitPrice * (item.quantity || 0);
    }, 0);

    res.json({ success: true, items, itemCount, total, cart });
  } catch (error) {
    console.error("Error fetching legacy cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/customer/api/cart/add", requireRole("customer"), async (req, res) => {
  try {
    const {
      productId,
      designId,
      quantity,
      size,
      color,
      customDesign,
    } = req.body;
    const resolvedDesignId =
      designId ||
      customDesign?.designId ||
      (typeof customDesign === "string" ? customDesign : undefined);

    if (!productId && !resolvedDesignId) {
      return res.status(400).json({
        success: false,
        message: "Product ID or Design ID is required",
      });
    }

    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      if (!product.inStock || product.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock available",
        });
      }
    }

    if (resolvedDesignId) {
      const design = await Design.findById(resolvedDesignId);
      if (!design) {
        return res
          .status(404)
          .json({ success: false, message: "Design not found" });
      }
    }

    let cart = await Cart.findOne({ userId: req.session.user.id });
    if (!cart) {
      cart = new Cart({ userId: req.session.user.id, items: [] });
    }

    const existingItem = cart.items.find((item) => {
      if (productId && item.productId) {
        return (
          item.productId.toString() === productId &&
          item.size === size &&
          item.color === color
        );
      }
      if (resolvedDesignId && item.designId) {
        return item.designId.toString() === resolvedDesignId;
      }
      return false;
    });

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId,
        designId: resolvedDesignId,
        quantity,
        size,
        color,
      });
    }

    cart.updatedAt = new Date();
    await cart.save();
    res.json({ success: true, message: "Item added to cart", cart });
  } catch (error) {
    console.error("Error adding legacy cart item:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.put("/customer/api/cart/update/:itemId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }

    const cart = await Cart.findOne({ userId: req.session.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    item.quantity = quantity;
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ success: true, message: "Cart updated", cart });
  } catch (error) {
    console.error("Error updating legacy cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.delete("/customer/api/cart/remove/:itemId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const cart = await Cart.findOne({ userId: req.session.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    item.deleteOne();
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ success: true, message: "Item removed from cart", cart });
  } catch (error) {
    console.error("Error removing legacy cart item:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.delete("/customer/api/cart/clear", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const cart = await Cart.findOne({ userId: req.session.user.id });
    if (!cart) {
      return res.json({ success: true, message: "Cart cleared", cart: null });
    }

    cart.items = [];
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ success: true, message: "Cart cleared", cart });
  } catch (error) {
    console.error("Error clearing legacy cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Get all saved addresses
app.get("/api/customer/addresses", async (req, res) => {
  try {
    console.log("=== Fetch Addresses Request ===");
    console.log("Session user:", req.session.user);

    if (!req.session.user || req.session.user.role !== "customer") {
      console.log("Unauthorized - no session or not customer");
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(req.session.user.id).select("addresses");
    console.log("User found:", user ? "Yes" : "No");
    console.log("User addresses:", user?.addresses);

    res.json({ success: true, addresses: user.addresses || [] });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Add new address
app.post("/api/customer/addresses", async (req, res) => {
  try {
    console.log("=== Add Address Request ===");
    console.log("Session user:", req.session.user);
    console.log("Request body:", req.body);

    if (!req.session.user || req.session.user.role !== "customer") {
      console.log("Unauthorized - no session or not customer");
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { street, city, state, pincode, isDefault } = req.body;
    const user = await User.findById(req.session.user.id);

    if (!user) {
      console.log("User not found:", req.session.user.id);
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log("Current user addresses:", user.addresses);

    // If this is set as default, unset all other defaults
    if (isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push({ street, city, state, pincode, isDefault });
    await user.save();

    console.log("Address saved. New addresses array:", user.addresses);

    res.json({
      success: true,
      message: "Address added successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Customer - Update address
app.put("/api/customer/addresses/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { street, city, state, pincode, isDefault } = req.body;
    const user = await User.findById(req.session.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const address = user.addresses.id(req.params.id);
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    // If this is set as default, unset all other defaults
    if (isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    address.street = street;
    address.city = city;
    address.state = state;
    address.pincode = pincode;
    address.isDefault = isDefault;

    await user.save();

    res.json({
      success: true,
      message: "Address updated successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Customer - Delete address
app.delete("/api/customer/addresses/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(req.session.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const address = user.addresses.id(req.params.id);
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    address.deleteOne();
    await user.save();

    res.json({
      success: true,
      message: "Address deleted successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update customer profile (e.g., contact number)
app.put("/api/customer/profile", async (req, res) => {
  try {
    console.log("=== Update Profile Request ===");
    console.log("Session user:", req.session.user);
    console.log("Request body:", req.body);

    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    if (req.session.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update contact number if provided
    if (req.body.contactNumber) {
      user.contactNumber = req.body.contactNumber;
    }

    // Save user profile changes
    await user.save();

    // Update session with new data
    req.session.user.contactNumber = user.contactNumber;

    console.log("User profile updated successfully");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        contactNumber: user.contactNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Process checkout and create order
app.post("/customer/api/process-checkout", async (req, res) => {
  try {
    console.log("=== Process Checkout Request ===");
    console.log("Session user:", req.session.user);
    console.log("Request body:", req.body);

    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    if (req.session.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can place orders",
      });
    }

    const {
      name,
      email,
      phone,
      alternativePhone,
      deliveryAddress,
      city,
      state,
      pincode,
      saveAddress, // New field to check if user wants to save address
      paymentMethod, // Payment method: card, upi, netbanking, cod
      paymentStatus, // Payment status: pending, completed, failed
      selectedDesignerId, // Customer-selected designer for custom orders
    } = req.body;

    // Get user for updating profile
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update phone number if provided
    if (phone && phone !== user.contactNumber) {
      user.contactNumber = phone;
      console.log("Updating phone number:", phone);
    }

    // Save address if checkbox was checked
    if (saveAddress === true || saveAddress === "true") {
      const addressData = {
        street: deliveryAddress,
        city: city,
        state: state,
        pincode: pincode,
        isDefault: user.addresses.length === 0, // Make first address default
      };

      // Check if this exact address already exists
      const addressExists = user.addresses.some(
        (addr) =>
          addr.street === deliveryAddress &&
          addr.city === city &&
          addr.state === state &&
          addr.pincode === pincode,
      );

      if (!addressExists) {
        user.addresses.push(addressData);
        console.log("Saving new address to user profile");
      } else {
        console.log("Address already exists in user profile");
      }
    }

    // Save user profile changes
    await user.save();
    console.log("User profile updated successfully");

    // Get user's cart
    const cart = await Cart.findOne({ userId: req.session.user.id })
      .populate("items.productId")
      .populate("items.designId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Calculate total and prepare order items
    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      let price = 0;

      if (item.productId) {
        price = item.productId.price;

        // Check stock availability
        const product = await Product.findById(item.productId._id);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product ${item.productId.name} not found`,
          });
        }

        if (product.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Only ${product.stockQuantity} available.`,
          });
        }

        // Decrease stock quantity
        product.stockQuantity -= item.quantity;

        // Update inStock flag if out of stock
        if (product.stockQuantity <= 0) {
          product.inStock = false;
        }

        await product.save();
        console.log(
          `Stock updated for ${product.name}: ${product.stockQuantity} remaining`,
        );
      } else if (item.designId) {
        price = item.designId.basePrice || item.designId.estimatedPrice || 500;
      }

      subtotal += price * item.quantity;

      orderItems.push({
        productId: item.productId?._id || null,
        designId: item.designId?._id || null,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: price,
      });
    }

    const tax = subtotal * 0.18;
    const shipping = 100;
    const totalAmount = subtotal + tax + shipping;

    // Create order
    const order = new Order({
      userId: req.session.user.id,
      items: orderItems,
      totalAmount: totalAmount,
      status: "pending",
      paymentMethod: paymentMethod || "card", // Use provided payment method or default to card
      paymentStatus: paymentStatus || "completed", // Use provided status or default to completed
      shippingAddress: {
        name: name,
        email: email,
        phone: phone,
        alternativePhone: alternativePhone,
        street: deliveryAddress,
        city: city,
        state: state,
        zipCode: pincode,
        country: "India",
      },
      timeline: [
        {
          status: "pending",
          note: "Order placed by customer",
          at: new Date(),
        },
      ],
    });

    await order.save();
    console.log("Order created:", order._id);

    // Check if this is a custom order with customer-selected designer
    const isCustomOrder = orderItems.some(
      (item) => item.designId && !item.productId,
    );

    // Determine the designer to assign
    let designerToAssign = selectedDesignerId;

    // If no designer was explicitly selected during checkout, check if design has a pre-assigned designer
    if (isCustomOrder && !designerToAssign) {
      for (const item of cart.items) {
        if (item.designId && item.designId.designerId) {
          designerToAssign =
            typeof item.designId.designerId === "object"
              ? item.designId.designerId._id
              : item.designId.designerId;
          console.log("Using designer from design:", designerToAssign);
          break; // Use the first designer found
        }
      }
    }

    if (isCustomOrder && designerToAssign) {
      // Customer selected a designer - directly assign to designer (skip manager)
      const selectedDesigner = await User.findOne({
        _id: designerToAssign,
        role: "designer",
        approved: true,
      });

      if (selectedDesigner) {
        order.designerId = selectedDesigner._id;
        order.status = "assigned_to_designer";
        order.designerAssignedAt = new Date();
        order.orderType = "custom";
        order.chatEnabled = true;
        order.timeline.push({
          status: "assigned_to_designer",
          note: `Custom order directly assigned to designer ${
            selectedDesigner.name || selectedDesigner.email
          } (Customer selected)`,
          at: new Date(),
        });
        await order.save();

        // Notify designer
        await Notification.create({
          userId: selectedDesigner._id,
          orderId: order._id,
          message: `New custom order #${order._id
            .toString()
            .substring(
              0,
              8,
            )} assigned to you! Customer chose you as their designer.`,
          type: "success",
        });

        console.log(
          `Custom order assigned directly to designer: ${selectedDesigner.name}`,
        );
      } else {
        // Fallback to manager if selected designer not found
        console.log(
          "Selected designer not found, falling back to manager assignment",
        );
        await assignToManager(order);
      }
    } else {
      // Regular flow - assign to manager
      await assignToManager(order);
    }

    // Helper function for manager assignment
    async function assignToManager(order) {
      const manager = await User.findOne({ role: "manager" });
      if (manager) {
        order.managerId = manager._id;
        order.status = "assigned_to_manager";
        order.managerAssignedAt = new Date();
        order.timeline.push({
          status: "assigned_to_manager",
          note: `Order automatically assigned to manager ${manager.name}`,
          at: new Date(),
        });
        await order.save();

        // Notify manager
        await Notification.create({
          userId: manager._id,
          orderId: order._id,
          message: `New order #${order._id
            .toString()
            .substring(0, 8)} assigned to you`,
          type: "info",
        });
      }
    }

    // Create notification for customer
    await Notification.create({
      userId: req.session.user.id,
      orderId: order._id,
      message: `Order #${order._id
        .toString()
        .substring(0, 8)} placed successfully`,
      type: "success",
    });

    // Clear the cart
    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: "Order placed successfully",
      orderId: order._id,
      order: order,
    });
  } catch (error) {
    console.error("Error processing checkout:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process checkout",
      error: error.message,
    });
  }
});

// ============================================
// ENHANCED WORKFLOW ENDPOINTS
// ============================================

// Manager - Assign CUSTOM order to designer
app.post("/manager/api/order/:id/assign-designer", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Manager only" });
    }

    const { designerId } = req.body;
    const order = await Order.findById(req.params.id).populate(
      "userId",
      "name email",
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check if it's a custom order
    const isCustom = await order.isCustomOrder();
    if (!isCustom) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot assign designer to shop orders. Use assign-delivery instead.",
      });
    }

    // Verify designer exists
    const designer = await User.findOne({ _id: designerId, role: "designer" });
    if (!designer) {
      return res
        .status(404)
        .json({ success: false, message: "Designer not found" });
    }

    // Update order
    order.designerId = designerId;
    order.status = "assigned_to_designer";
    order.designerAssignedAt = new Date();
    order.timeline.push({
      status: "assigned_to_designer",
      note: `Assigned to designer ${designer.name || designer.email}`,
      at: new Date(),
    });
    await order.save();

    // Notify designer
    await Notification.create({
      userId: designerId,
      orderId: order._id,
      message: `New custom design order #${order._id
        .toString()
        .substring(0, 8)} assigned to you by manager`,
      type: "info",
    });

    // Notify customer
    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `Your custom order has been assigned to a designer`,
      type: "info",
    });

    res.json({
      success: true,
      message: "Order assigned to designer successfully",
      order: await Order.findById(order._id)
        .populate("userId", "name email")
        .populate("designerId", "name email")
        .populate("managerId", "name email"),
    });
  } catch (error) {
    console.error("Error assigning designer:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Manager - Assign order to delivery (for SHOP orders or completed CUSTOM orders)
app.post("/manager/api/order/:id/assign-delivery", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Manager only" });
    }

    const { deliveryPersonId } = req.body;

    if (!deliveryPersonId) {
      return res.status(400).json({ success: false, message: "Delivery person ID is required" });
    }

    // Use raw MongoDB to avoid Mongoose CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Verify delivery person exists
    const deliveryPerson = await User.findOne({
      _id: deliveryPersonId,
      role: "delivery",
    });
    if (!deliveryPerson) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery person not found" });
    }

    const isCustom =
      order.orderType === "custom" ||
      (order.items && order.items.some((item) => item.designId));

    // For custom orders, ensure production is completed
    if (isCustom && order.status !== "production_completed") {
      return res.status(400).json({
        success: false,
        message:
          "Custom orders can only be assigned to delivery after production is completed",
      });
    }

    // Update order using raw MongoDB
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          deliveryPersonId: new mongoose.Types.ObjectId(deliveryPersonId),
          status: "ready_for_pickup", // Changed from ready_for_delivery to match delivery flow
          deliveryAssignedAt: new Date(),
        },
        $push: {
          timeline: {
            status: "ready_for_pickup",
            note: `Assigned to delivery person ${
              deliveryPerson.name || deliveryPerson.email
            }`,
            at: new Date(),
          },
        },
      },
    );

    // Notify delivery person
    await Notification.create({
      userId: deliveryPersonId,
      orderId: order._id,
      message: `Order #${order._id
        .toString()
        .substring(0, 8)} assigned to you for delivery`,
      type: "info",
    });

    // Notify customer
    await Notification.create({
      userId: order.userId,
      orderId: order._id,
      message: `Your order is ready for delivery`,
      type: "info",
    });

    // Fetch updated order for response
    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message: "Order assigned to delivery person successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error assigning delivery:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Designer - Accept assigned order
app.post("/designer/api/order/:id/accept", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Designer only" });
    }

    const order = await Order.findById(req.params.id)
      .populate("userId", "name email")
      .populate("managerId", "name email");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.designerId?.toString() !== req.session.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "This order is not assigned to you" });
    }

    if (order.status !== "assigned_to_designer") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be accepted at this stage",
      });
    }

    // Update order
    order.status = "designer_accepted";
    order.designerAcceptedAt = new Date();
    order.progressPercentage = 10; // Start with 10%
    order.timeline.push({
      status: "designer_accepted",
      note: "Designer accepted the order",
      at: new Date(),
    });
    await order.save();

    // Notify manager
    if (order.managerId) {
      await Notification.create({
        userId: order.managerId,
        orderId: order._id,
        message: `Designer accepted order #${order._id
          .toString()
          .substring(0, 8)}`,
        type: "success",
      });
    }

    // Notify customer
    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `Designer has accepted your custom order and will start working on it`,
      type: "success",
    });

    res.json({
      success: true,
      message: "Order accepted successfully",
      order: await Order.findById(order._id)
        .populate("userId", "name email")
        .populate("designerId", "name email")
        .populate("managerId", "name email"),
    });
  } catch (error) {
    console.error("Error accepting order:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Designer - Start production
app.post("/designer/api/order/:id/start-production", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Designer only" });
    }

    const order = await Order.findById(req.params.id).populate(
      "userId",
      "name email",
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.designerId?.toString() !== req.session.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "This order is not assigned to you" });
    }

    // Update order
    order.status = "in_production";
    order.progressPercentage = 30; // 30% when production starts
    order.timeline.push({
      status: "in_production",
      note: "Designer started production",
      at: new Date(),
    });
    await order.save();

    // Notify customer
    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `Designer has started working on your order`,
      type: "info",
    });

    res.json({
      success: true,
      message: "Production started",
      order: await Order.findById(order._id)
        .populate("userId", "name email")
        .populate("designerId", "name email"),
    });
  } catch (error) {
    console.error("Error starting production:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Designer - Update production progress
app.put("/designer/api/order/:id/progress", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Designer only" });
    }

    const { progressPercentage, note } = req.body;
    const order = await Order.findById(req.params.id).populate(
      "userId",
      "name email",
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.designerId?.toString() !== req.session.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "This order is not assigned to you" });
    }

    // Update progress
    order.progressPercentage = progressPercentage;
    if (note) {
      order.timeline.push({
        status: order.status,
        note: note,
        at: new Date(),
      });
    }
    await order.save();

    // Notify customer on milestone progress (every 25%)
    if (progressPercentage % 25 === 0 && progressPercentage > 0) {
      await Notification.create({
        userId: order.userId._id,
        orderId: order._id,
        message: `Your order is ${progressPercentage}% complete`,
        type: "info",
      });
    }

    res.json({
      success: true,
      message: "Progress updated",
      order,
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Designer - Complete production and send back to manager
app.post("/designer/api/order/:id/complete", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Designer only" });
    }

    const { notes } = req.body;
    const order = await Order.findById(req.params.id)
      .populate("userId", "name email")
      .populate("managerId", "name email");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.designerId?.toString() !== req.session.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "This order is not assigned to you" });
    }

    // Update order
    order.status = "production_completed";
    order.progressPercentage = 100;
    order.productionCompletedAt = new Date();
    order.timeline.push({
      status: "production_completed",
      note: notes || "Production completed by designer",
      at: new Date(),
    });
    await order.save();

    // Notify manager
    if (order.managerId) {
      await Notification.create({
        userId: order.managerId,
        orderId: order._id,
        message: `Order #${order._id
          .toString()
          .substring(
            0,
            8,
          )} production completed - Ready to assign for delivery`,
        type: "success",
      });
    }

    // Notify customer
    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `Your custom order is ready! Waiting for delivery assignment`,
      type: "success",
    });

    res.json({
      success: true,
      message:
        "Production completed successfully. Order sent back to manager for delivery assignment.",
      order: await Order.findById(order._id)
        .populate("userId", "name email")
        .populate("designerId", "name email")
        .populate("managerId", "name email"),
    });
  } catch (error) {
    console.error("Error completing production:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// ===== NEW DESIGN WORKFLOW ENDPOINTS =====

// Designer - Update design progress
app.put("/designer/api/order/:id/design-progress", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Designer only" });
    }

    const { designProgress, note } = req.body;

    // Use raw MongoDB to avoid Mongoose casting issues with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.designerId?.toString() !== req.session.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "This order is not assigned to you" });
    }

    // Build update object
    const updateData = {
      $set: {
        designProgress: designProgress,
        status: "design_in_progress",
      },
    };

    // Add timeline entry if note provided
    if (note) {
      updateData.$push = {
        timeline: {
          status: "design_in_progress",
          note: note,
          by: req.session.user.id,
          byRole: "designer",
          at: new Date(),
        },
      };
    }

    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      updateData,
    );

    // Return updated order so frontend can update Redux state immediately
    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message: "Design progress updated",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating design progress:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Designer - Submit design for manager approval
app.post("/designer/api/order/:id/submit-design", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Designer only" });
    }

    console.log("=== SUBMIT DESIGN DEBUG ===");
    console.log("Request body type:", typeof req.body);
    console.log("Request body:", JSON.stringify(req.body).substring(0, 200));
    console.log("Notes:", req.body.notes);
    console.log("Design files type:", typeof req.body.designFiles);
    console.log("Design files is array:", Array.isArray(req.body.designFiles));
    if (req.body.designFiles && req.body.designFiles.length > 0) {
      console.log("First file type:", typeof req.body.designFiles[0]);
      console.log(
        "First file keys:",
        Object.keys(req.body.designFiles[0] || {}),
      );
    }
    console.log("===========================");

    const { notes, designFiles } = req.body;
    const order = await Order.findById(req.params.id)
      .populate("userId", "name email")
      .populate("managerId", "name email");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.designerId?.toString() !== req.session.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "This order is not assigned to you" });
    }

    // Check if design is complete
    if (order.designProgress < 100) {
      return res.status(400).json({
        success: false,
        message: "Design must be 100% complete before submission",
      });
    }

    // Validate design files are uploaded
    if (!designFiles || designFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one design file for customer review",
      });
    }

    // Validate each file has required properties
    const validatedFiles = [];
    for (const file of designFiles) {
      if (!file || typeof file !== "object") {
        console.error("Invalid file object:", file);
        return res.status(400).json({
          success: false,
          message: "Invalid file format - each file must be an object",
        });
      }
      if (!file.url || !file.name || !file.type) {
        console.error("Missing required file properties:", file);
        return res.status(400).json({
          success: false,
          message: "Each file must have url, name, and type properties",
        });
      }
      validatedFiles.push({
        url: String(file.url),
        name: String(file.name),
        type: String(file.type),
        uploadedBy: req.session.user.id.toString(),
        uploadedAt: new Date(),
      });
    }

    console.log("Validated files count:", validatedFiles.length);
    console.log(
      "First validated file:",
      JSON.stringify(validatedFiles[0]).substring(0, 100),
    );

    // Use raw MongoDB update to bypass Mongoose schema validation completely
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const updateResult = await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          designFiles: validatedFiles,
          status: "design_pending_customer_approval",
          designSubmittedAt: new Date(),
        },
        $push: {
          timeline: {
            status: "design_pending_customer_approval",
            note: notes || "Design submitted for customer approval",
            by: req.session.user.id,
            byRole: "designer",
            at: new Date(),
          },
        },
      },
    );

    console.log("Update result:", updateResult);

    if (!updateResult.modifiedCount) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to update order" });
    }

    // Notify customer (NOT manager - customer reviews first)
    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `Your custom design is ready! Please review and approve it.`,
      type: "info",
    });

    res.json({
      success: true,
      message: "Design submitted to customer for approval successfully",
      order: await Order.findById(order._id)
        .populate("userId", "name email")
        .populate("designerId", "name email")
        .populate("managerId", "name email"),
    });
  } catch (error) {
    console.error("Error submitting design:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Manager - Approve design and start production
app.post("/manager/api/order/:id/approve-design", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Manager only" });
    }

    const { notes } = req.body;

    // Use raw MongoDB to avoid Mongoose CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update order using raw MongoDB
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "design_approved",
          "designApproval.status": "approved",
          "designApproval.approvedBy": new mongoose.Types.ObjectId(
            req.session.user.id,
          ),
          "designApproval.approvedAt": new Date(),
          designApprovedAt: new Date(),
        },
        $push: {
          timeline: {
            status: "design_approved",
            note: notes || "Design approved by manager, moving to production",
            by: new mongoose.Types.ObjectId(req.session.user.id),
            byRole: "manager",
            at: new Date(),
          },
        },
      },
    );

    // Notify designer
    if (order.designerId) {
      await Notification.create({
        userId: order.designerId,
        orderId: order._id,
        message: `Your design for order #${order.orderNumber} has been approved!`,
        type: "success",
      });
    }

    // Notify customer
    await Notification.create({
      userId: order.userId,
      orderId: order._id,
      message: `Your design has been approved! Production will begin shortly`,
      type: "success",
    });

    // Fetch updated order for response
    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message: "Design approved successfully. You can now start production.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error approving design:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Manager - Reject design and send back to designer
app.post("/manager/api/order/:id/reject-design", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Manager only" });
    }

    const { reason } = req.body;

    // Use raw MongoDB to avoid Mongoose CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for rejection",
      });
    }

    // Update order using raw MongoDB
    const revisionCount = (order.designApproval?.revisionCount || 0) + 1;
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "design_rejected",
          "designApproval.status": "rejected",
          "designApproval.rejectedBy": new mongoose.Types.ObjectId(
            req.session.user.id,
          ),
          "designApproval.rejectedAt": new Date(),
          "designApproval.rejectionReason": reason,
          "designApproval.revisionCount": revisionCount,
          designRejectedAt: new Date(),
          designProgress: 0, // Reset progress for revision
        },
        $push: {
          timeline: {
            status: "design_rejected",
            note: `Design rejected: ${reason}`,
            by: new mongoose.Types.ObjectId(req.session.user.id),
            byRole: "manager",
            at: new Date(),
          },
        },
      },
    );

    // Notify designer
    if (order.designerId) {
      await Notification.create({
        userId: order.designerId,
        orderId: order._id,
        message: `Design rejected for order #${order.orderNumber}. Reason: ${reason}`,
        type: "warning",
      });
    }

    // Notify customer
    await Notification.create({
      userId: order.userId,
      orderId: order._id,
      message: `Your design needs revision. Our designer is working on improvements.`,
      type: "info",
    });

    // Fetch updated order for response
    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message: "Design rejected. Designer will revise and resubmit.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error rejecting design:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Manager - Start production (after design approval)
app.post("/manager/api/order/:id/start-production", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Manager only" });
    }

    // Use raw MongoDB to avoid Mongoose CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.status !== "design_approved") {
      return res.status(400).json({
        success: false,
        message: "Design must be approved before starting production",
      });
    }

    // Update order using raw MongoDB
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "in_production",
          progressPercentage: 10, // 10% when production starts
          productionStartedAt: new Date(),
        },
        $push: {
          timeline: {
            status: "in_production",
            note: "Manager started production",
            by: new mongoose.Types.ObjectId(req.session.user.id),
            byRole: "manager",
            at: new Date(),
          },
        },
      },
    );

    // Notify customer
    await Notification.create({
      userId: order.userId,
      orderId: order._id,
      message: `Production has started on your order!`,
      type: "info",
    });

    // Fetch updated order for response
    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message: "Production started successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error starting production:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Manager - Update production progress
app.put("/manager/api/order/:id/production-progress", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Manager only" });
    }

    const { progressPercentage, note } = req.body;

    // Use raw MongoDB to avoid Mongoose CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update production progress using raw MongoDB
    const updateObj = {
      $set: {
        progressPercentage: progressPercentage,
      },
    };

    if (note) {
      updateObj.$push = {
        timeline: {
          status: order.status,
          note: note,
          by: new mongoose.Types.ObjectId(req.session.user.id),
          byRole: "manager",
          at: new Date(),
        },
      };
    }

    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      updateObj,
    );

    // Notify customer on milestone progress (every 25%)
    if (progressPercentage % 25 === 0 && progressPercentage > 0) {
      await Notification.create({
        userId: order.userId,
        orderId: order._id,
        message: `Production is ${progressPercentage}% complete`,
        type: "info",
      });
    }

    // Fetch updated order for response
    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message: "Production progress updated",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating production progress:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Manager - Complete production
app.post("/manager/api/order/:id/complete-production", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized - Manager only" });
    }

    const { notes } = req.body;

    // Use raw MongoDB to avoid Mongoose CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update order using raw MongoDB
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "production_completed",
          progressPercentage: 100,
          productionCompletedAt: new Date(),
        },
        $push: {
          timeline: {
            status: "production_completed",
            note: notes || "Production completed, ready for delivery",
            by: new mongoose.Types.ObjectId(req.session.user.id),
            byRole: "manager",
            at: new Date(),
          },
        },
      },
    );

    // Notify customer
    await Notification.create({
      userId: order.userId,
      orderId: order._id,
      message: `Your order is ready! Waiting for delivery assignment`,
      type: "success",
    });

    // Fetch updated order for response
    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message:
        "Production completed successfully. Ready to assign for delivery.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error completing production:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// ===== END NEW DESIGN WORKFLOW ENDPOINTS =====

// REMOVED - DUPLICATE ROUTE - See line ~4400 for correct implementation

// REMOVED - DUPLICATE ROUTE - See line ~4583 for correct OTP-based implementation

// Customer - Get order tracking with complete timeline
app.get("/customer/api/order/:id/tracking", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const order = await Order.findById(req.params.id)
      .populate("userId", "name email")
      .populate("managerId", "name email")
      .populate("designerId", "name email")
      .populate("deliveryPersonId", "name email")
      .populate("items.productId")
      .populate("items.designId");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Only customer or staff can view tracking
    const isOwner = order.userId._id.toString() === req.session.user.id;
    const isStaff = ["admin", "manager", "designer", "delivery"].includes(
      req.session.user.role,
    );

    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const isCustom = await order.isCustomOrder();

    // Build tracking info
    const tracking = {
      orderId: order._id,
      orderNumber: order._id.toString().substring(0, 8),
      orderType: isCustom ? "Custom Design" : "Shop Order",
      currentStatus: order.status,
      progressPercentage: order.progressPercentage || 0,
      timeline: order.timeline,
      assignedPersonnel: {
        manager: order.managerId
          ? { name: order.managerId.name, email: order.managerId.email }
          : null,
        designer: order.designerId
          ? { name: order.designerId.name, email: order.designerId.email }
          : null,
        delivery: order.deliveryPersonId
          ? {
              name: order.deliveryPersonId.name,
              email: order.deliveryPersonId.email,
            }
          : null,
      },
      timestamps: {
        orderPlaced: order.createdAt,
        managerAssigned: order.managerAssignedAt,
        designerAssigned: order.designerAssignedAt,
        designerAccepted: order.designerAcceptedAt,
        productionCompleted: order.productionCompletedAt,
        deliveryAssigned: order.deliveryAssignedAt,
      },
      items: order.items,
      shippingAddress: order.shippingAddress,
      totalAmount: order.totalAmount,
    };

    res.json({ success: true, tracking, order });
  } catch (error) {
    console.error("Error fetching tracking:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get all delivery persons (for manager to assign)
app.get("/manager/api/delivery-persons", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const deliveryPersons = await User.find({ role: "delivery" }).select(
      "name email contactNumber",
    );

    res.json({ success: true, deliveryPersons });
  } catch (error) {
    console.error("Error fetching delivery persons:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get all designers (for manager to assign)
app.get("/manager/api/designers", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const designers = await User.find({ role: "designer" }).select(
      "name email contactNumber",
    );

    res.json({ success: true, designers });
  } catch (error) {
    console.error("Error fetching designers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Get all products with stock info
app.get("/manager/api/products", async (req, res) => {
  try {
    console.log("=== Manager Products Request ===");
    console.log("Session user:", req.session.user);

    if (!req.session.user || req.session.user.role !== "manager") {
      console.log("❌ Unauthorized: User is not a manager");
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const products = await Product.find({})
      .select("name category price stockQuantity inStock images")
      .sort({ name: 1 })
      .lean();

    console.log(`✅ Found ${products.length} products`);
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Update product stock
app.put("/manager/api/product/:id/stock", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { stockQuantity, inStock } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    product.stockQuantity = stockQuantity;
    product.inStock = inStock !== undefined ? inStock : stockQuantity > 0;
    await product.save();

    res.json({
      success: true,
      message: "Stock updated successfully",
      product,
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Create new product
app.post("/manager/api/product", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const {
      name,
      description,
      category,
      gender,
      price,
      stockQuantity,
      sizes,
      colors,
      patterns,
      fabrics,
      images,
      featured,
      customizable,
      modelPath,
    } = req.body;

    const product = new Product({
      name,
      description,
      category,
      gender,
      price,
      stockQuantity: stockQuantity || 0,
      inStock: stockQuantity > 0,
      sizes: sizes || [],
      colors: colors || [],
      patterns: patterns || [],
      fabrics: fabrics || [],
      images: images || [],
      featured: featured || false,
      customizable: customizable || false,
      modelPath: modelPath || "",
    });

    await product.save();

    res.json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manager - Delete product
app.delete("/manager/api/product/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Get all users by role
app.get("/admin/api/users", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { role } = req.query;

    let query = {};
    if (role && role !== "all") {
      query.role = role;
    }

    const users = await User.find(query)
      .select("name username email role contactNumber createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Get all products with stock
app.get("/admin/api/products", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const products = await Product.find({})
      .select("name category price stockQuantity inStock images gender")
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin - Get user statistics
app.get("/admin/api/user-stats", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const customers = await User.countDocuments({ role: "customer" });
    const managers = await User.countDocuments({ role: "manager" });
    const designers = await User.countDocuments({ role: "designer" });
    const delivery = await User.countDocuments({ role: "delivery" });

    res.json({
      success: true,
      stats: {
        customers,
        managers,
        designers,
        delivery,
        total: customers + managers + designers + delivery,
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================
// REAL-WORLD DELIVERY PARTNER SYSTEM
// ============================================

// Initialize default delivery partners (like Ekart, Delhivery)
const initializeDeliveryPartners = async () => {
  const partners = [
    {
      name: "DesignDen Express",
      code: "DDE",
      logo: "/images/delivery/dde-logo.png",
      contactNumber: "+91-1800-123-4567",
      email: "support@designdenexpress.com",
      avgDeliveryDays: 3,
      rating: 4.7,
      serviceablePincodes: ["560001", "560002", "560003", "560004", "560005"],
    },
    {
      name: "Swift Logistics",
      code: "SWL",
      logo: "/images/delivery/swift-logo.png",
      contactNumber: "+91-1800-765-4321",
      email: "care@swiftlogistics.in",
      avgDeliveryDays: 4,
      rating: 4.5,
      serviceablePincodes: ["560001", "560002", "560006", "560007", "560008"],
    },
    {
      name: "FastTrack Delivery",
      code: "FTD",
      logo: "/images/delivery/fasttrack-logo.png",
      contactNumber: "+91-1800-999-8888",
      email: "hello@fasttrackdelivery.com",
      avgDeliveryDays: 2,
      rating: 4.8,
      serviceablePincodes: [
        "560001",
        "560002",
        "560003",
        "560004",
        "560005",
        "560006",
        "560007",
        "560008",
        "560009",
        "560010",
      ],
    },
  ];

  for (const partner of partners) {
    await DeliveryPartner.findOneAndUpdate({ code: partner.code }, partner, {
      upsert: true,
      new: true,
    });
  }
  console.log("Delivery partners initialized");
};

// Call on server start
setTimeout(initializeDeliveryPartners, 2000);

// Get available delivery partners
app.get("/api/delivery-partners", async (req, res) => {
  try {
    const { pincode } = req.query;
    let query = { isActive: true };

    if (pincode) {
      query.serviceablePincodes = pincode;
    }

    const partners = await DeliveryPartner.find(query);
    res.json({ success: true, partners });
  } catch (error) {
    console.error("Error fetching delivery partners:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Generate tracking number
const generateTrackingNumber = (partnerCode) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${partnerCode}${timestamp}${random}`;
};

// Generate OTP for delivery verification
const generateDeliveryOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Manager - Assign delivery partner and generate tracking (Flipkart-like)
app.post("/manager/api/order/:id/ship", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { deliveryPersonId, deliveryPartnerId, deliverySlot } = req.body;
    const order = await Order.findById(req.params.id).populate(
      "userId",
      "name email phone",
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Get delivery partner
    let partner = null;
    if (deliveryPartnerId) {
      partner = await DeliveryPartner.findById(deliveryPartnerId);
    } else {
      // Auto-select best partner based on pincode and rating
      partner = await DeliveryPartner.findOne({
        isActive: true,
        serviceablePincodes: order.shippingAddress.zipCode,
      }).sort({ rating: -1 });
    }

    if (!partner) {
      // Fallback to default partner
      partner = await DeliveryPartner.findOne({ isActive: true }).sort({
        rating: -1,
      });
    }

    // Verify delivery person
    const deliveryPerson = await User.findOne({
      _id: deliveryPersonId,
      role: "delivery",
    });
    if (!deliveryPerson) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery person not found" });
    }

    // Generate tracking details
    const trackingNumber = generateTrackingNumber(partner?.code || "DD");
    const otp = generateDeliveryOTP();

    // Calculate estimated delivery
    const today = new Date();
    const deliveryDays = partner?.avgDeliveryDays || 3;
    const estimatedFrom = new Date(
      today.setDate(today.getDate() + deliveryDays - 1),
    );
    const estimatedTo = new Date(today.setDate(today.getDate() + 2));

    // Update order
    order.deliveryPersonId = deliveryPersonId;
    order.status = "ready_for_pickup";
    order.deliveryAssignedAt = new Date();

    order.deliveryPartner = {
      partnerId: partner?._id,
      partnerName: partner?.name || "DesignDen Express",
      trackingNumber: trackingNumber,
      trackingUrl: `https://track.designden.com/${trackingNumber}`,
      awbNumber: `AWB${trackingNumber}`,
    };

    if (deliverySlot) {
      order.deliverySlot = deliverySlot;
    }

    order.estimatedDelivery = {
      from: estimatedFrom,
      to: estimatedTo,
    };

    order.deliveryOTP = {
      code: otp,
      generatedAt: new Date(),
      verified: false,
    };

    order.timeline.push({
      status: "ready_for_pickup",
      note: `Order assigned to ${
        partner?.name || "DesignDen Express"
      } for delivery. Tracking: ${trackingNumber}`,
      by: req.session.user.id,
      byRole: "manager",
      at: new Date(),
    });

    await order.save();

    // Send notifications
    await Notification.create({
      userId: deliveryPersonId,
      orderId: order._id,
      message: `New pickup assigned - Order #${
        order.orderNumber || order._id.toString().substring(0, 8)
      }. Track: ${trackingNumber}`,
      type: "info",
    });

    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `Your order has been shipped! Tracking ID: ${trackingNumber}. Delivery OTP: ${otp}`,
      type: "success",
    });

    res.json({
      success: true,
      message: "Order shipped successfully",
      tracking: {
        trackingNumber,
        partnerName: partner?.name,
        estimatedDelivery: order.estimatedDelivery,
        otp: otp,
      },
      order: await Order.findById(order._id)
        .populate("userId", "name email")
        .populate("deliveryPersonId", "name email contactNumber")
        .populate("deliveryPartner.partnerId"),
    });
  } catch (error) {
    console.error("Error shipping order:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Delivery person - Pick up order
app.post("/delivery/api/order/:id/pickup", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Use raw MongoDB to avoid Mongoose CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.deliveryPersonId?.toString() !== req.session.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "This order is not assigned to you" });
    }

    if (order.status !== "ready_for_pickup") {
      return res
        .status(400)
        .json({ success: false, message: "Order is not ready for pickup" });
    }

    const now = new Date();
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "picked_up",
          pickedUpAt: now,
          liveTracking: {
            isActive: true,
            currentLocation: {
              address: "DesignDen Warehouse, Bangalore",
              updatedAt: now,
            },
          },
        },
        $push: {
          timeline: {
            status: "picked_up",
            note: "Package picked up from warehouse",
            location: "DesignDen Warehouse",
            by: req.session.user.id,
            byRole: "delivery",
            at: now,
          },
        },
      },
    );

    await Notification.create({
      userId: order.userId,
      orderId: order._id,
      message: `Your order has been picked up and is on the way!`,
      type: "info",
    });

    // Get updated order for response
    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message: "Order picked up successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error picking up order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delivery person - Update location (simulated GPS tracking)
app.put("/delivery/api/order/:id/location", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { lat, lng, address } = req.body;

    // Use raw MongoDB to avoid CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order || order.deliveryPersonId?.toString() !== req.session.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          liveTracking: {
            isActive: true,
            currentLocation: { lat, lng, address, updatedAt: now },
            deliveryPersonLocation: { lat, lng, updatedAt: now },
          },
        },
      },
    );

    res.json({ success: true, message: "Location updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delivery person - Mark in transit
app.post("/delivery/api/order/:id/in-transit", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { location } = req.body;

    // Use raw MongoDB to avoid CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order || order.deliveryPersonId?.toString() !== req.session.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();
    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: { status: "in_transit" },
        $push: {
          timeline: {
            status: "in_transit",
            note: "Package in transit",
            location: location || "In Transit Hub",
            by: req.session.user.id,
            byRole: "delivery",
            at: now,
          },
        },
      },
    );

    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });
    res.json({
      success: true,
      message: "Status updated to in transit",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delivery person - Out for delivery
app.post("/delivery/api/order/:id/out-for-delivery", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Use raw MongoDB to avoid CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order || order.deliveryPersonId?.toString() !== req.session.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();

    // Generate OTP for delivery verification if not already generated
    let otp = order.deliveryOTP?.code;
    let deliveryOTP = order.deliveryOTP;
    if (!otp) {
      otp = Math.floor(1000 + Math.random() * 9000).toString();
      deliveryOTP = {
        code: otp,
        generatedAt: now,
        verified: false,
      };
      console.log("Generated OTP for order:", order._id, "OTP:", otp);
    }

    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "out_for_delivery",
          deliveryOTP: deliveryOTP,
        },
        $push: {
          timeline: {
            status: "out_for_delivery",
            note: "Package is out for delivery",
            location: order.shippingAddress?.city || "Customer Location",
            by: req.session.user.id,
            byRole: "delivery",
            at: now,
          },
        },
      },
    );

    // Send OTP reminder to customer
    await Notification.create({
      userId: order.userId,
      orderId: order._id,
      message: `Your order is out for delivery! Your delivery OTP is: ${otp}. Share this with the delivery person to confirm delivery.`,
      type: "info",
    });

    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });
    res.json({
      success: true,
      message: "Order is out for delivery",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error marking out for delivery:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delivery person - Verify OTP and deliver (Flipkart-like)
app.post("/delivery/api/order/:id/deliver", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { otp, receivedBy, relationship, signature, photo, notes } = req.body;

    // Use raw MongoDB to avoid CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");

    const order = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!order || order.deliveryPersonId?.toString() !== req.session.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Verify OTP - REQUIRED for delivery
    if (!order.deliveryOTP?.code) {
      return res.status(400).json({
        success: false,
        message:
          "OTP not generated. Please mark order as 'Out for Delivery' first.",
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required for delivery confirmation.",
      });
    }

    // Compare OTP (trim and convert to string for safety)
    const enteredOTP = String(otp).trim();
    const actualOTP = String(order.deliveryOTP.code).trim();

    console.log(
      "OTP Verification - Entered:",
      enteredOTP,
      "Actual:",
      actualOTP,
    );

    if (enteredOTP !== actualOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please ask customer for correct OTP.",
      });
    }

    const now = new Date();
    const receiverName =
      receivedBy || order.shippingAddress?.name || "Customer";
    const receiverRelation = relationship || "Self";

    await ordersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          status: "delivered",
          deliveredAt: now,
          actualDelivery: now,
          paymentStatus: "completed",
          "deliveryOTP.verified": true,
          "deliveryOTP.verifiedAt": now,
          proofOfDelivery: {
            receivedBy: receiverName,
            relationship: receiverRelation,
            signature: signature,
            photo: photo,
            notes: notes,
          },
          "liveTracking.isActive": false,
        },
        $push: {
          timeline: {
            status: "delivered",
            note: `Delivered to ${receiverName} (${receiverRelation})`,
            location: order.shippingAddress?.city || "Customer Location",
            by: req.session.user.id,
            byRole: "delivery",
            at: now,
          },
        },
      },
    );

    // Create designer earnings if this order has a designer
    if (order.designerId) {
      try {
        await createDesignerEarning(
          order._id,
          order.designerId,
          order.totalAmount,
        );

        // Notify designer about earnings
        await Notification.create({
          userId: order.designerId,
          type: "earning",
          title: "New Earnings!",
          message: `You earned from order ${order.orderNumber || order._id}. Check your earnings dashboard!`,
          relatedId: order._id,
          relatedModel: "Order",
        });
      } catch (earningError) {
        console.error("Error creating designer earning:", earningError);
      }
    }

    // Notifications
    await Notification.create({
      userId: order.userId,
      orderId: order._id,
      message: `Your order has been delivered successfully! Thank you for shopping with DesignDen.`,
      type: "success",
    });

    if (order.managerId) {
      await Notification.create({
        userId: order.managerId,
        orderId: order._id,
        message: `Order #${
          order.orderNumber || order._id.toString().substring(0, 8)
        } delivered successfully`,
        type: "success",
      });
    }

    const updatedOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });
    res.json({
      success: true,
      message: "Order delivered successfully!",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error delivering order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================
// CUSTOMER-DESIGNER CHAT SYSTEM
// ============================================

// Get chat messages for an order
app.get("/api/order/:orderId/messages", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order || !order.chatEnabled) {
      return res
        .status(404)
        .json({ success: false, message: "Chat not available" });
    }

    // Check if user is part of this order
    const userId = req.session.user.id;
    const isCustomer = order.userId.toString() === userId;
    const isDesigner = order.designerId?.toString() === userId;
    const isManager = order.managerId?.toString() === userId;

    if (!isCustomer && !isDesigner && !isManager) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to view this chat" });
    }

    const messages = await Message.find({ orderId: req.params.orderId })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { orderId: req.params.orderId, receiverId: userId, read: false },
      { read: true, readAt: new Date() },
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Send message in order chat
app.post("/api/order/:orderId/messages", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { message, attachments } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order || !order.chatEnabled) {
      return res
        .status(404)
        .json({ success: false, message: "Chat not available" });
    }

    const senderId = req.session.user.id;
    const senderRole = req.session.user.role;

    // Determine receiver
    let receiverId, receiverRole;
    if (senderRole === "customer") {
      receiverId = order.designerId;
      receiverRole = "designer";
    } else if (senderRole === "designer") {
      receiverId = order.userId;
      receiverRole = "customer";
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sender role for chat" });
    }

    if (!receiverId) {
      return res
        .status(400)
        .json({ success: false, message: "No designer assigned yet" });
    }

    const newMessage = new Message({
      orderId: req.params.orderId,
      senderId,
      senderRole,
      receiverId,
      receiverRole,
      message,
      attachments: attachments || [],
    });

    await newMessage.save();
    await newMessage.populate("senderId", "name email");

    // Update unread count
    await Order.findByIdAndUpdate(req.params.orderId, {
      $inc: { unreadMessages: 1 },
    });

    // Notify receiver
    await Notification.create({
      userId: receiverId,
      orderId: order._id,
      message: `New message from ${senderRole}: "${message.substring(
        0,
        50,
      )}..."`,
      type: "info",
    });

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get unread message count
app.get("/api/order/:orderId/messages/unread", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const count = await Message.countDocuments({
      orderId: req.params.orderId,
      receiverId: req.session.user.id,
      read: false,
    });

    res.json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================
// PRODUCTION MILESTONES (Designer Progress Sharing)
// ============================================

// Get milestones for an order
app.get("/api/order/:orderId/milestones", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check authorization
    const userId = req.session.user.id;
    const isCustomer = order.userId.toString() === userId;
    const isDesigner = order.designerId?.toString() === userId;
    const isManager = order.managerId?.toString() === userId;

    if (
      !isCustomer &&
      !isDesigner &&
      !isManager &&
      req.session.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const milestones = await ProductionMilestone.find({
      orderId: req.params.orderId,
    })
      .populate("designerId", "name email")
      .sort({ createdAt: 1 });

    res.json({ success: true, milestones });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Designer - Create/Update milestone
app.post("/api/order/:orderId/milestones", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "designer") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { milestone, status, notes, images } = req.body;
    const order = await Order.findById(req.params.orderId).populate(
      "userId",
      "name email",
    );

    if (!order || order.designerId?.toString() !== req.session.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Check if milestone already exists
    let existingMilestone = await ProductionMilestone.findOne({
      orderId: req.params.orderId,
      milestone,
    });

    if (existingMilestone) {
      existingMilestone.status = status;
      existingMilestone.notes = notes;
      if (images) existingMilestone.images = images;
      if (status === "completed") existingMilestone.completedAt = new Date();
      await existingMilestone.save();
    } else {
      existingMilestone = new ProductionMilestone({
        orderId: req.params.orderId,
        designerId: req.session.user.id,
        milestone,
        status,
        notes,
        images,
        completedAt: status === "completed" ? new Date() : null,
      });
      await existingMilestone.save();
    }

    // Update order current milestone and calculate progress
    const milestoneOrder = [
      "design_review",
      "fabric_selection",
      "cutting",
      "stitching",
      "embroidery",
      "finishing",
      "quality_check",
      "packaging",
      "ready_for_pickup",
    ];

    const milestoneIndex = milestoneOrder.indexOf(milestone);
    const progress = Math.round(
      ((milestoneIndex + 1) / milestoneOrder.length) * 100,
    );

    order.currentMilestone = milestone;
    order.progressPercentage = progress;

    // Add to order milestones array
    const orderMilestoneIndex = order.milestones?.findIndex(
      (m) => m.name === milestone,
    );
    if (orderMilestoneIndex > -1) {
      order.milestones[orderMilestoneIndex] = {
        name: milestone,
        status,
        completedAt: status === "completed" ? new Date() : null,
        notes,
      };
    } else {
      order.milestones = order.milestones || [];
      order.milestones.push({
        name: milestone,
        status,
        completedAt: status === "completed" ? new Date() : null,
        notes,
      });
    }

    order.timeline.push({
      status: "production_milestone",
      note: `${milestone.replace(/_/g, " ").toUpperCase()}: ${status}${
        notes ? ` - ${notes}` : ""
      }`,
      by: req.session.user.id,
      byRole: "designer",
      at: new Date(),
    });

    await order.save();

    // Notify customer
    await Notification.create({
      userId: order.userId._id,
      orderId: order._id,
      message: `Progress update: ${milestone.replace(
        /_/g,
        " ",
      )} - ${status}. Your order is ${progress}% complete!`,
      type: "info",
    });

    res.json({
      success: true,
      message: "Milestone updated",
      milestone: existingMilestone,
      progress,
    });
  } catch (error) {
    console.error("Error updating milestone:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================
// COMPREHENSIVE ORDER TRACKING (Customer View)
// ============================================

// Get complete order tracking info
app.get("/api/order/:orderId/track", async (req, res) => {
  try {
    // Use raw MongoDB to avoid Mongoose CastError with designFiles
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");
    const usersCollection = db.collection("users");

    const rawOrder = await ordersCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.orderId),
    });

    if (!rawOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Get populated fields manually
    const [userId, managerId, designerId, deliveryPersonId] = await Promise.all(
      [
        rawOrder.userId
          ? usersCollection.findOne({ _id: rawOrder.userId })
          : null,
        rawOrder.managerId
          ? usersCollection.findOne({ _id: rawOrder.managerId })
          : null,
        rawOrder.designerId
          ? usersCollection.findOne({ _id: rawOrder.designerId })
          : null,
        rawOrder.deliveryPersonId
          ? usersCollection.findOne({ _id: rawOrder.deliveryPersonId })
          : null,
      ],
    );

    // Create order object with populated fields for compatibility
    const order = {
      ...rawOrder,
      userId: userId,
      managerId: managerId,
      designerId: designerId,
      deliveryPersonId: deliveryPersonId,
    };

    // Get milestones for custom orders
    let productionMilestones = [];
    if (order.orderType === "custom") {
      productionMilestones = await ProductionMilestone.find({
        orderId: order._id,
      }).sort({ createdAt: 1 });
    }

    // Get recent messages
    const recentMessages = await Message.find({ orderId: order._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("senderId", "name");

    // Build comprehensive tracking response (flattened for frontend compatibility)
    const trackingInfo = {
      // Flatten order data for component compatibility
      orderId: order._id,
      orderNumber: order.orderNumber || order._id.toString().substring(0, 8),
      orderType: order.orderType === "custom" ? "Custom Design" : "Shop Order",
      currentStatus: order.status,
      progressPercentage: order.progressPercentage || 0,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,

      // Items
      items: order.items,

      // Shipping info
      shippingAddress: order.shippingAddress,
      deliverySlot: order.deliverySlot,
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,

      // Delivery partner (3rd party like Ekart)
      deliveryPartner: order.deliveryPartner
        ? {
            name: order.deliveryPartner.partnerName,
            trackingNumber: order.deliveryPartner.trackingNumber,
            trackingUrl: order.deliveryPartner.trackingUrl,
            awbNumber: order.deliveryPartner.awbNumber,
          }
        : null,

      // Assigned personnel
      assignedPersonnel: {
        manager: order.managerId
          ? {
              name: order.managerId.name || order.managerId.username,
              email: order.managerId.email,
            }
          : null,
        designer: order.designerId
          ? {
              name: order.designerId.name || order.designerId.username,
              email: order.designerId.email,
            }
          : null,
        delivery: order.deliveryPersonId
          ? {
              name:
                order.deliveryPersonId.name || order.deliveryPersonId.username,
              phone: order.deliveryPersonId.contactNumber,
              email: order.deliveryPersonId.email,
            }
          : null,
      },

      // Timestamps
      timestamps: {
        orderPlaced: order.createdAt,
        managerAssigned: order.managerAssignedAt,
        designerAssigned: order.designerAssignedAt,
        designerAccepted: order.designerAcceptedAt,
        productionCompleted: order.productionCompletedAt,
        deliveryAssigned: order.deliveryAssignedAt,
      },

      // OTP for delivery verification (CUSTOMER SEES THIS!)
      otp:
        order.deliveryOTP?.code &&
        [
          "ready_for_pickup",
          "out_for_delivery",
          "picked_up",
          "in_transit",
        ].includes(order.status)
          ? order.deliveryOTP.code
          : null,

      // Live tracking
      liveTracking: order.liveTracking?.isActive ? order.liveTracking : null,

      // Production milestones (for custom orders)
      production:
        order.orderType === "custom"
          ? {
              designer: order.designerId
                ? {
                    name: order.designerId.name || order.designerId.username,
                  }
                : null,
              progress: order.progressPercentage,
              currentMilestone: order.currentMilestone,
              milestones: productionMilestones.map((m) => ({
                name: m.milestone,
                status: m.status,
                notes: m.notes,
                images: m.images,
                completedAt: m.completedAt,
              })),
            }
          : null,

      // Timeline
      timeline: order.timeline.map((t) => ({
        status: t.status,
        note: t.note,
        location: t.location,
        at: t.at,
        by: t.by,
        byRole: t.byRole,
      })),

      // Chat
      chat: {
        enabled: order.chatEnabled,
        unreadMessages: order.unreadMessages,
        recentMessages: recentMessages.map((m) => ({
          from: m.senderId?.name,
          message: m.message.substring(0, 100),
          at: m.createdAt,
        })),
      },

      // Proof of delivery
      proofOfDelivery:
        order.status === "delivered" ? order.proofOfDelivery : null,

      // Design files sent by designer (for customer approval)
      designFiles: order.designFiles || [],
    };

    res.json({ success: true, tracking: trackingInfo });
  } catch (error) {
    console.error("Error fetching tracking info:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================
// DELIVERY PERSON DASHBOARD ENDPOINTS
// ============================================

// Get delivery person's orders
app.get("/delivery/api/orders", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Use raw MongoDB to avoid CastError with designFiles
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;
    const ordersCollection = db.collection("orders");
    const usersCollection = db.collection("users");
    const productsCollection = db.collection("products");
    const designsCollection = db.collection("designs");

    const orders = await ordersCollection
      .find({
        deliveryPersonId: new mongoose.Types.ObjectId(req.session.user.id),
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Manually populate user info for each order
    for (let order of orders) {
      if (order.userId) {
        const user = await usersCollection.findOne(
          { _id: new mongoose.Types.ObjectId(order.userId) },
          { projection: { name: 1, email: 1, phone: 1 } },
        );
        order.userId = user || order.userId;
      }
    }

    // SECURITY: Remove OTP code from response - delivery person should NOT see the OTP
    // They need to ask the customer for the OTP and enter it for verification
    const sanitizedOrders = orders.map((order) => {
      if (order.deliveryOTP) {
        // Keep the hash for verification but remove the actual code
        order.deliveryOTP = {
          hash: order.deliveryOTP.hash,
          generatedAt: order.deliveryOTP.generatedAt,
          verified: order.deliveryOTP.verified,
          // code is intentionally NOT included
        };
      }
      return order;
    });

    res.json({ success: true, orders: sanitizedOrders });
  } catch (error) {
    console.error("Error fetching delivery orders:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get delivery statistics
app.get("/delivery/api/statistics", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "delivery") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const deliveryPersonId = req.session.user.id;

    const stats = await Order.aggregate([
      {
        $match: {
          deliveryPersonId: new mongoose.Types.ObjectId(deliveryPersonId),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "ready_for_pickup"] }, 1, 0] },
          },
          pickedUp: {
            $sum: { $cond: [{ $eq: ["$status", "picked_up"] }, 1, 0] },
          },
          inTransit: {
            $sum: { $cond: [{ $eq: ["$status", "in_transit"] }, 1, 0] },
          },
          outForDelivery: {
            $sum: { $cond: [{ $eq: ["$status", "out_for_delivery"] }, 1, 0] },
          },
          delivered: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      statistics: stats[0] || {
        total: 0,
        pending: 0,
        pickedUp: 0,
        inTransit: 0,
        outForDelivery: 0,
        delivered: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Initialize sample designers — always runs to insert any missing ones
async function initializeSampleDesigners() {
  try {
    console.log("Checking sample designers...");

    const sampleDesigners = [
        {
          email: "priya.designer@example.com",
          password: await bcrypt.hash("password123", 10),
          name: "Priya Sharma",
          role: "designer",
          approved: true,
          contactNumber: "9876543210",
          designerProfile: {
            bio: "Award-winning fashion designer with 8 years of experience. Specializing in elegant ethnic wear and modern fusion designs that blend traditional craftsmanship with contemporary aesthetics.",
            specializations: ["Ethnic Wear", "Fusion", "Party Wear", "Bridal"],
            experience: 8,
            portfolio: [
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop",
                title: "Bridal Lehenga",
              },
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&h=400&fit=crop",
                title: "Silk Saree",
              },
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop",
                title: "Ethnic Kurta",
              },
            ],
            rating: 4.8,
            totalRatings: 156,
            completedOrders: 234,
            isAvailable: true,
            priceRange: { min: 1500, max: 5000 },
            turnaroundDays: 5,
            badges: ["Top Rated", "Premium Designer", "Quick Delivery"],
          },
        },
        {
          email: "rahul.designer@example.com",
          password: await bcrypt.hash("password123", 10),
          name: "Rahul Verma",
          role: "designer",
          approved: true,
          contactNumber: "9876543211",
          designerProfile: {
            bio: "Creative streetwear designer focused on bold, unique styles. Expert in casual wear, T-shirt designs, and urban fashion that makes you stand out from the crowd.",
            specializations: [
              "T-Shirts",
              "Casual Wear",
              "Streetwear",
              "Hoodies",
            ],
            experience: 5,
            portfolio: [
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",
                title: "Graphic Tees",
              },
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop",
                title: "Street Style",
              },
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop",
                title: "Hoodie Collection",
              },
            ],
            rating: 4.5,
            totalRatings: 89,
            completedOrders: 145,
            isAvailable: true,
            priceRange: { min: 800, max: 2500 },
            turnaroundDays: 3,
            badges: ["Fast Delivery", "Rising Star", "Customer Favorite"],
          },
        },
        {
          email: "anita.designer@example.com",
          password: await bcrypt.hash("password123", 10),
          name: "Anita Patel",
          role: "designer",
          approved: true,
          contactNumber: "9876543212",
          designerProfile: {
            bio: "Experienced tailor and formal wear specialist with precision fitting skills. Known for impeccable business attire, suits, and professional clothing that makes lasting impressions.",
            specializations: [
              "Formal Wear",
              "Business Attire",
              "Suits",
              "Dresses",
            ],
            experience: 12,
            portfolio: [
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=400&fit=crop",
                title: "Executive Suits",
              },
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400&h=400&fit=crop",
                title: "Formal Dresses",
              },
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&h=400&fit=crop",
                title: "Business Shirts",
              },
            ],
            rating: 4.9,
            totalRatings: 203,
            completedOrders: 312,
            isAvailable: true,
            priceRange: { min: 2000, max: 8000 },
            turnaroundDays: 7,
            badges: ["Top Rated", "Expert Tailor", "Premium"],
          },
        },
        {
          email: "kiran.designer@example.com",
          password: await bcrypt.hash("password123", 10),
          name: "Kiran Reddy",
          role: "designer",
          approved: true,
          contactNumber: "9876543213",
          designerProfile: {
            bio: "Young and innovative designer pushing boundaries in sustainable fashion. Eco-friendly designs using organic fabrics and ethical production methods.",
            specializations: [
              "Sustainable Fashion",
              "Eco-Friendly",
              "Casual",
              "Kids Wear",
            ],
            experience: 3,
            portfolio: [
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=400&fit=crop",
                title: "Organic Cotton",
              },
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=400&h=400&fit=crop",
                title: "Kids Collection",
              },
              {
                imageUrl:
                  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop",
                title: "Eco Fashion",
              },
            ],
            rating: 4.3,
            totalRatings: 45,
            completedOrders: 67,
            isAvailable: true,
            priceRange: { min: 600, max: 2000 },
            turnaroundDays: 4,
            badges: ["Eco Champion", "New Talent", "Quick Response"],
          },
        },
      ];

      for (const designerData of sampleDesigners) {
        const existingDesigner = await User.findOne({
          email: designerData.email,
        });
        if (!existingDesigner) {
          await User.create(designerData);
          console.log(`Created sample designer: ${designerData.name}`);
        }
      }

    console.log("Sample designers check complete!");
  } catch (error) {
    console.error("Error initializing sample designers:", error);
  }
}

// Ensure at least one delivery user exists for the manager to assign orders
async function ensureDeliveryUser() {
  try {
    const exists = await User.findOne({ role: "delivery" });
    if (!exists) {
      const hashed = await bcrypt.hash("delivery123", 10);
      await User.create({
        username: "delivery",
        name: "Delivery Person",
        email: "delivery@designden.com",
        password: hashed,
        contactNumber: "9876543210",
        role: "delivery",
        approved: true,
      });
      console.log("✅ Default delivery user created (delivery@designden.com / delivery123)");
    }
  } catch (err) {
    console.error("Error ensuring delivery user:", err.message);
  }
}

// Health + cache-status endpoint
app.get("/api/health", async (req, res) => {
  const mongoState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "ok",
    mongodb: mongoState,
    redis: redisAvailable ? "connected" : "unavailable",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Session debug — verify session config and proxy detection
app.get("/api/session-debug", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    RENDER_set: !!process.env.RENDER,
    isProd,
    trustProxy: app.get("trust proxy"),
    reqSecure: req.secure,
    proto: req.headers["x-forwarded-proto"],
    sessionUser: req.session.user ? req.session.user.email : null,
    sessionID: req.sessionID,
    cookieConfig: {
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    },
  });
});

// Redis debug — check env vars and connection status
app.get("/api/redis-debug", (req, res) => {
  res.json({
    redisAvailable,
    REDIS_URL_set: !!process.env.REDIS_URL,
    REDIS_URL_prefix: process.env.REDIS_URL ? process.env.REDIS_URL.substring(0, 20) + "..." : null,
    REDIS_HOST_set: !!process.env.REDIS_HOST,
    clientStatus: redisClient ? redisClient.status : "no client",
  });
});

// Redis benchmark endpoint (for evaluation demo)
app.get("/api/cache/benchmark", async (req, res) => {
  const results = {};

  // Without cache: direct DB query
  const t0 = Date.now();
  await Product.find({ featured: true }).limit(6).lean();
  results.dbQueryMs = Date.now() - t0;

  // With cache
  if (redisAvailable) {
    await cacheSet("bench:featured", await Product.find({ featured: true }).limit(6).lean(), 30);
    const t1 = Date.now();
    await cacheGet("bench:featured");
    results.cacheHitMs = Date.now() - t1;
    results.improvementPct = Math.round((1 - results.cacheHitMs / results.dbQueryMs) * 100);
  } else {
    results.cacheHitMs = null;
    results.note = "Redis not running — start Redis to see cache benchmark";
  }

  res.json({ success: true, benchmark: results });
});

// Run initialization when server starts
mongoose.connection.once("open", () => {
  initializeSampleDesigners();
  ensureDeliveryUser();
});

// Serve React frontend in production (Docker / Render)
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

findFreePort(PREFERRED_PORT).then((PORT) => {
  app.listen(PORT, "0.0.0.0", () => {
    // Write actual port so Vite and start.cjs can read it
    fs.writeFileSync(".port", String(PORT));
    // Override VITE_API_URL so frontend always calls the right port
    fs.writeFileSync(".env.local", `VITE_API_URL=http://localhost:${PORT}\n`);

    console.log(`✅ Server running on port ${PORT}`);
    if (PORT !== PREFERRED_PORT) {
      console.log(
        `ℹ️  Port ${PREFERRED_PORT} was busy — using port ${PORT} instead`,
      );
      console.log(`   .env.local updated with correct API URL for Vite`);
    }
  });
});
