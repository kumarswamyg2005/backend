const https = require("https");
const fs = require("fs");
const path = require("path");

const images = [
  { name: "casual-tshirt.jpeg", text: "Casual T-Shirt" },
  { name: "classic-hoodie.jpeg", text: "Classic Hoodie" },
  { name: "kurthi.jpeg", text: "Kurthi" },
  { name: "polo t-shirt.jpg", text: "Polo T-Shirt" },
  { name: "women-jeans.jpeg", text: "Women Jeans" },
  { name: "women-tshirt.jpeg", text: "Women's T-Shirt" },
  { name: "denim-jeans.webp", text: "Denim Jeans" },
  { name: "winter-hoodie.webp", text: "Winter Hoodie" },
  { name: "women-hoodie.webp", text: "Women's Hoodie" },
];

const outputDir = path.join(__dirname, "public", "images");

// Use dummyimage.com which returns actual PNG images
function downloadImage(imageInfo) {
  const url = `https://dummyimage.com/400x500/4a90e2/ffffff&text=${encodeURIComponent(
    imageInfo.text
  )}`;
  const outputPath = path.join(outputDir, imageInfo.name);

  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          https
            .get(response.headers.location, (res2) => {
              if (res2.statusCode !== 200) {
                reject(new Error(`Failed: ${res2.statusCode}`));
                return;
              }
              const fileStream = fs.createWriteStream(outputPath);
              res2.pipe(fileStream);
              fileStream.on("finish", () => {
                fileStream.close();
                console.log(`✓ ${imageInfo.name}`);
                resolve();
              });
            })
            .on("error", reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed: ${response.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(outputPath);
        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          console.log(`✓ ${imageInfo.name}`);
          resolve();
        });
      })
      .on("error", reject);
  });
}

async function downloadAll() {
  console.log("Downloading actual PNG images...\n");

  for (const imageInfo of images) {
    try {
      await downloadImage(imageInfo);
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`✗ ${imageInfo.name}: ${error.message}`);
    }
  }

  console.log("\n✅ All images downloaded!");
}

downloadAll();
