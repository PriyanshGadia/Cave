const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const base64 = fs.readFileSync('front_tmp.png').toString('base64');
  const result = await page.evaluate(async (b64) => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        
        // Find non-transparent bounds
        let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const a = data[(y * img.width + x) * 4 + 3];
            if (a > 20) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        
        // Find head region (top 25% of body height)
        const bodyHeight = maxY - minY;
        const headBottomY = minY + Math.round(bodyHeight * 0.22);
        
        // In head region, find horizontal bounds
        let headMinX = img.width, headMaxX = 0;
        for (let y = minY; y <= headBottomY; y++) {
          for (let x = 0; x < img.width; x++) {
            const a = data[(y * img.width + x) * 4 + 3];
            if (a > 20) {
              if (x < headMinX) headMinX = x;
              if (x > headMaxX) headMaxX = x;
            }
          }
        }

        resolve({
          imgWidth: img.width,
          imgHeight: img.height,
          body: { minX, maxX, minY, maxY },
          headPixels: { headMinX, headMaxX, minY, headBottomY },
          // UV coords in Three.js (where u in [0, 1] left to right, v in [0, 1] bottom to top):
          uvHead: {
            uMin: +(headMinX / img.width).toFixed(3),
            uMax: +(headMaxX / img.width).toFixed(3),
            vMin: +(1.0 - headBottomY / img.height).toFixed(3), // bottom of chin/neck
            vMax: +(1.0 - minY / img.height).toFixed(3)         // top of hair
          }
        });
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  }, base64);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
