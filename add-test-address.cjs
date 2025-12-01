const mongoose = require("mongoose");

// MongoDB connection
mongoose
  .connect("mongodb://localhost:27017/clothing-design", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// User Schema
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

async function addTestAddress() {
  try {
    // Find all users
    const allUsers = await User.find();
    console.log("Total users:", allUsers.length);

    allUsers.forEach((user) => {
      console.log(`- ${user.username} (${user.email}) - Role: ${user.role}`);
    });

    // Find customer user by email
    const customer = await User.findOne({
      $or: [{ role: "customer" }, { email: "sai4@gmail.com" }],
    });

    if (!customer) {
      console.log("❌ No customer user found.");
      process.exit(1);
    }

    console.log("\n✅ Found customer:", customer.username, "-", customer.email);
    console.log("Current addresses:", customer.addresses.length);

    // Add test address
    const testAddress = {
      street: "37-1-28 labbipet, vijayawada",
      city: "Vijayawada",
      state: "Andhra Pradesh",
      pincode: "520010",
      isDefault: true,
    };

    customer.addresses.push(testAddress);
    await customer.save();

    console.log("✅ Test address added successfully!");
    console.log("Total addresses now:", customer.addresses.length);
    console.log("Address details:", testAddress);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addTestAddress();
