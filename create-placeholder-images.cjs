const fs = require("fs");
const path = require("path");

// Create a simple SVG placeholder
const createSVGPlaceholder = (name, width = 400, height = 500) => {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    <text x="50%" y="50%" font-family="Arial" font-size="20" fill="#666" text-anchor="middle" dominant-baseline="middle">${name}</text>
  </svg>`;
};

const images = [
  "casual-tshirt.jpeg",
  "classic-hoodie.jpeg",
  "kurthi.jpeg",
  "polo t-shirt.jpg",
  "women-jeans.jpeg",
  "women-tshirt.jpeg",
];

const outputDir = path.join(__dirname, "public", "images");

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create placeholder images
images.forEach((imageName) => {
  const productName = imageName
    .replace(/\.(jpeg|jpg|png)$/i, "")
    .replace(/-/g, " ");
  const svgContent = createSVGPlaceholder(productName.toUpperCase());
  const outputPath = path.join(outputDir, imageName);

  fs.writeFileSync(outputPath, svgContent);
  console.log(`Created: ${imageName}`);
});

console.log("\n✅ All placeholder images created successfully!");
