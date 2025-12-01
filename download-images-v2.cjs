const https = require("https");
const fs = require("fs");
const path = require("path");

const images = [
  { name: "casual-tshirt.jpeg", color: "4A90E2", text: "Casual+T-Shirt" },
  { name: "classic-hoodie.jpeg", color: "9B59B6", text: "Classic+Hoodie" },
  { name: "kurthi.jpeg", color: "E74C3C", text: "Kurthi" },
  { name: "polo t-shirt.jpg", color: "2ECC71", text: "Polo+T-Shirt" },
  { name: "women-jeans.jpeg", color: "3498DB", text: "Women+Jeans" },
  { name: "women-tshirt.jpeg", color: "E91E63", text: "Women+T-Shirt" },
  { name: "denim-jeans.webp", color: "34495E", text: "Denim+Jeans" },
  { name: "winter-hoodie.webp", color: "16A085", text: "Winter+Hoodie" },
  { name: "women-hoodie.webp", color: "F39C12", text: "Women+Hoodie" },
];

const outputDir = path.join(__dirname, "public", "images");

// Function to download placeholder image
function downloadImage(imageInfo) {
  const url = `https://placehold.co/400x500/${imageInfo.color}/white?text=${imageInfo.text}`;
  const outputPath = path.join(outputDir, imageInfo.name);

  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
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
                console.log(`✓ Downloaded: ${imageInfo.name}`);
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
          console.log(`✓ Downloaded: ${imageInfo.name}`);
          resolve();
        });

        fileStream.on("error", (err) => {
          fs.unlink(outputPath, () => {});
          reject(err);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

// Download all images
async function downloadAll() {
  console.log("Downloading placeholder images...\n");

  for (const imageInfo of images) {
    try {
      await downloadImage(imageInfo);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limit
    } catch (error) {
      console.error(`✗ Failed: ${imageInfo.name} - ${error.message}`);
    }
  }

  console.log("\n✅ Done!");
}

downloadAll();
