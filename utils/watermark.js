const sharp = require('sharp');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

// Add watermark to image
async function addImageWatermark(inputPath, outputPath, watermarkText = 'REMINISCENT') {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    const svgWatermark = Buffer.from(`
      <svg width="${metadata.width}" height="${metadata.height}">
        <defs>
          <pattern id="watermark" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <text x="50" y="200" font-size="40" fill="rgba(0,0,0,0.15)" font-family="Arial, sans-serif" font-weight="bold">
              ${watermarkText}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#watermark)"/>
      </svg>
    `);

    await image
      .composite([{ input: svgWatermark, blend: 'over' }])
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Image watermark failed: ${error.message}`);
  }
}

// Add watermark to PDF
async function addPdfWatermark(inputPath, outputPath, watermarkText = 'REMINISCENT') {
  try {
    const existingPdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = 60;
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      
      // Add diagonal watermarks
      for (let y = -height; y < height * 2; y += 200) {
        for (let x = -width; x < width * 2; x += 400) {
          page.drawText(watermarkText, {
            x: x,
            y: y,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
            opacity: 0.1,
            rotate: { angle: -45, type: 'degrees' }
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    
    return outputPath;
  } catch (error) {
    throw new Error(`PDF watermark failed: ${error.message}`);
  }
}

// Main watermark function
async function addWatermark(filePath, fileType) {
  const ext = path.extname(filePath).toLowerCase();
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath, ext);
  const outputPath = path.join(dir, `${filename}_watermarked${ext}`);

  // Check if it's an image by MIME type or extension
  if (fileType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.svg'].includes(ext)) {
    await addImageWatermark(filePath, outputPath);
  } else if (ext === '.pdf') {
    await addPdfWatermark(filePath, outputPath);
  } else {
    return filePath; // No watermark for other file types
  }

  // Delete original and rename watermarked file
  await fs.unlink(filePath);
  await fs.rename(outputPath, filePath);
  
  return filePath;
}

module.exports = { addWatermark };
