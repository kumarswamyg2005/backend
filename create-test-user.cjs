const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/clothing-design")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: "manoj@test.com" });

    if (existingUser) {
      console.log("User already exists. Adding address...");

      const testAddress = {
        street: "37-1-28 labbipet, vijayawada",
        city: "Vijayawada",
        state: "Andhra Pradesh",
        pincode: "520010",
        isDefault: true,
      };

      // Check if address already exists
      const addressExists = existingUser.addresses.some(
        (addr) => addr.street === testAddress.street
      );

      if (!addressExists) {
        existingUser.addresses.push(testAddress);
        await existingUser.save();
        console.log("✅ Address added to existing user!");
      } else {
        console.log("Address already exists!");
      }

      console.log("\nUser details:");
      console.log("Email:", existingUser.email);
      console.log("Username:", existingUser.username);
      console.log("Phone:", existingUser.contactNumber);
      console.log("Total addresses:", existingUser.addresses.length);
      existingUser.addresses.forEach((addr, i) => {
        console.log(`\nAddress ${i + 1}:`);
        console.log(`  ${addr.street}`);
        console.log(`  ${addr.city}, ${addr.state} - ${addr.pincode}`);
        console.log(`  Default: ${addr.isDefault}`);
      });

      process.exit(0);
    }

    // Create new user
    // Using a simple password for testing (in production, use bcrypt)
    const testUser = new User({
      username: "manoj",
      email: "manoj@test.com",
      password: "password123", // In production, hash this
      contactNumber: "8688210905",
      role: "customer",
      approved: true,
      addresses: [
        {
          street: "37-1-28 labbipet, vijayawada",
          city: "Vijayawada",
          state: "Andhra Pradesh",
          pincode: "520010",
          isDefault: true,
        },
      ],
    });

    await testUser.save();

    console.log("✅ Test user created successfully!");
    console.log("\nLogin credentials:");
    console.log("Email: manoj@test.com");
    console.log("Password: password123");
    console.log("\nUser has 1 saved address:");
    console.log("37-1-28 labbipet, vijayawada");
    console.log("Vijayawada, Andhra Pradesh - 520010");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createTestUser();
