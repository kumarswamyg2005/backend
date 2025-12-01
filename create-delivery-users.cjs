const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/designden")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  name: String,
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

async function createDeliveryUsers() {
  try {
    // Check if delivery users already exist
    const existingDelivery = await User.find({ role: "delivery" });

    if (existingDelivery.length > 0) {
      console.log(
        `✅ ${existingDelivery.length} delivery users already exist:`
      );
      existingDelivery.forEach((d) => {
        console.log(`   - ${d.name} (${d.email})`);
      });
      return;
    }

    // Create delivery users
    const deliveryUsers = [
      {
        username: "delivery1",
        name: "Rajesh Kumar",
        email: "delivery1@designden.com",
        password: await bcrypt.hash("delivery123", 10),
        role: "delivery",
        contactNumber: "+91 98765 43210",
        approved: true,
      },
      {
        username: "delivery2",
        name: "Amit Sharma",
        email: "delivery2@designden.com",
        password: await bcrypt.hash("delivery123", 10),
        role: "delivery",
        contactNumber: "+91 98765 43211",
        approved: true,
      },
      {
        username: "delivery3",
        name: "Suresh Patel",
        email: "delivery3@designden.com",
        password: await bcrypt.hash("delivery123", 10),
        role: "delivery",
        contactNumber: "+91 98765 43212",
        approved: true,
      },
    ];

    await User.insertMany(deliveryUsers);
    console.log("✅ Created 3 delivery users successfully!");
    console.log("\nDelivery User Credentials:");
    console.log("========================");
    deliveryUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: delivery123`);
      console.log(`   Phone: ${user.contactNumber}`);
    });
    console.log("\n========================");
  } catch (error) {
    console.error("Error creating delivery users:", error);
  } finally {
    mongoose.connection.close();
  }
}

createDeliveryUsers();
