const fs = require('fs');
const path = require('path');

// Create a simple 1x1 pixel PNG as base64 and then create colored variations
const createPNGPlaceholder = (color, text) => {
  // Minimal PNG header for a simple colored image
  // This is a base64 encoded 400x500 PNG with text
  const canvas = `<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${text}</text>
  </svg>`;
  return canvas;
};

const images = [
  { name: 'casual-tshirt.jpeg', color: '#4A90E2', text: 'Casual T-Shirt' },
  { name: 'classic-hoodie.jpeg', color: '#E74C3C', text: 'Classic Hoodie' },
  { name: 'kurthi.jpeg', color: '#9B59B6', text: 'Kurthi' },
  { name: 'polo t-shirt.jpg', color: '#3498DB', text: 'Polo Shirt' },
  { name: 'women-jeans.jpeg', color: '#2ECC71', text: 'Women Jeans' },
  { name: 'women-tshirt.jpeg', color: '#E91E63', text: 'Women T-Shirt' },
  { name: 'denim-jeans.webp', color: '#34495E', text: 'Denim Jeans' },
  { name: 'winter-hoodie.webp', color: '#16A085', text: 'Winter Hoodie' },
  { name: 'women-hoodie.webp', color: '#F39C12', text: 'Women Hoodie' }
];

const outputDir = path.join(__dirname, 'public', 'images');

images.forEach(({ name, color, text }) => {
  const svgContent = createPNGPlaceholder(color, text);
  const outputPath = path.join(outputDir, name);
  fs.writeFileSync(outputPath, svgContent);
  console.log(`Created: ${name}`);
});

console.log('\n✅ All placeholder images created!');
