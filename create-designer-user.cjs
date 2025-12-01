const mongoose = require("mongoose");

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/designden", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  contactNumber: String,
  role: String,
  approved: { type: Boolean, default: true },
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
});

const User = mongoose.model("User", userSchema);

async function createDesignerUser() {
  try {
    // Check if designer already exists
    const existing = await User.findOne({ email: "designer@designden.com" });
    if (existing) {
      console.log("Designer user already exists!");
      console.log("Username:", existing.username);
      console.log("Email:", existing.email);
      console.log("Role:", existing.role);
      process.exit(0);
    }

    // Create new designer user
    const designer = new User({
      username: "designer1",
      email: "designer@designden.com",
      password: "password", // In production, this should be hashed
      contactNumber: "9876543210",
      role: "designer",
      approved: true,
    });

    await designer.save();
    console.log("Designer user created successfully!");
    console.log("Username: designer1");
    console.log("Email: designer@designden.com");
    console.log("Password: password");
    console.log("Role: designer");

    process.exit(0);
  } catch (error) {
    console.error("Error creating designer user:", error);
    process.exit(1);
  }
}

createDesignerUser();
