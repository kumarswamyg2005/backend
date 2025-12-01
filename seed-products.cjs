const mongoose = require("mongoose");

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/designden";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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

// Sample products
const sampleProducts = [
  {
    name: "Classic White T-Shirt",
    description:
      "Premium cotton t-shirt for everyday wear. Comfortable and stylish.",
    category: "Tshirt",
    gender: "Male",
    price: 599,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Black", "Grey"],
    patterns: ["Plain"],
    fabrics: ["Cotton"],
    images: ["/images/casual-tshirt.jpeg"],
    inStock: true,
    stockQuantity: 50,
    featured: true,
    customizable: true,
  },
  {
    name: "Casual Jeans",
    description:
      "Comfortable and stylish jeans for women. Perfect for everyday wear.",
    category: "Jeans",
    gender: "Female",
    price: 1299,
    sizes: ["26", "28", "30", "32", "34"],
    colors: ["Blue", "Black", "Grey", "White"],
    patterns: ["Plain", "Faded"],
    fabrics: ["Denim"],
    images: ["/images/casual-tshirt.jpeg"],
    inStock: true,
    stockQuantity: 88,
    featured: true,
    customizable: false,
  },
  {
    name: "Formal Shirt",
    description: "Professional formal shirt for office wear.",
    category: "Shirt",
    gender: "Male",
    price: 899,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Blue", "Black"],
    patterns: ["Plain", "Striped"],
    fabrics: ["Cotton", "Polyester"],
    images: ["/images/casual-tshirt.jpeg"],
    inStock: true,
    stockQuantity: 35,
    featured: false,
    customizable: true,
  },
  {
    name: "Summer Dress",
    description: "Light and breezy summer dress for women.",
    category: "Dress",
    gender: "Female",
    price: 1599,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Pink", "Blue", "Yellow", "White"],
    patterns: ["Floral", "Plain"],
    fabrics: ["Cotton", "Linen"],
    images: ["/images/casual-tshirt.jpeg"],
    inStock: true,
    stockQuantity: 42,
    featured: true,
    customizable: false,
  },
  {
    name: "Casual Hoodie",
    description: "Warm and comfortable hoodie for winter.",
    category: "Hoodie",
    gender: "Unisex",
    price: 1199,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Grey", "Navy Blue"],
    patterns: ["Plain"],
    fabrics: ["Cotton", "Fleece"],
    images: ["/images/casual-tshirt.jpeg"],
    inStock: true,
    stockQuantity: 60,
    featured: true,
    customizable: true,
  },
  {
    name: "Denim Jacket",
    description: "Stylish denim jacket for casual outings.",
    category: "Jacket",
    gender: "Unisex",
    price: 1999,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "Black"],
    patterns: ["Plain", "Distressed"],
    fabrics: ["Denim"],
    images: ["/images/casual-tshirt.jpeg"],
    inStock: true,
    stockQuantity: 25,
    featured: false,
    customizable: false,
  },
  {
    name: "Formal Trouser",
    description: "Professional trousers for office wear.",
    category: "Trouser",
    gender: "Male",
    price: 1099,
    sizes: ["28", "30", "32", "34", "36"],
    colors: ["Black", "Navy Blue", "Grey"],
    patterns: ["Plain"],
    fabrics: ["Cotton", "Polyester"],
    images: ["/images/casual-tshirt.jpeg"],
    inStock: true,
    stockQuantity: 45,
    featured: false,
    customizable: false,
  },
  {
    name: "Ethnic Kurthi",
    description: "Traditional kurthi with modern design.",
    category: "Kurthi",
    gender: "Female",
    price: 899,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Red", "Blue", "Green", "Yellow"],
    patterns: ["Printed", "Embroidered"],
    fabrics: ["Cotton", "Rayon"],
    images: ["/images/casual-tshirt.jpeg"],
    inStock: true,
    stockQuantity: 38,
    featured: true,
    customizable: false,
  },
];

async function seedProducts() {
  try {
    // Clear existing products
    await Product.deleteMany({});
    console.log("🗑️  Cleared existing products");

    // Insert sample products
    const result = await Product.insertMany(sampleProducts);
    console.log(`✅ Successfully added ${result.length} products:`);

    result.forEach((product) => {
      console.log(`   - ${product.name} (Stock: ${product.stockQuantity})`);
    });

    console.log("\n✨ Database seeded successfully!");
    console.log("📊 Stock Summary:");
    console.log(`   Total Products: ${result.length}`);
    console.log(
      `   Total Stock: ${result.reduce(
        (sum, p) => sum + p.stockQuantity,
        0
      )} items`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedProducts();
