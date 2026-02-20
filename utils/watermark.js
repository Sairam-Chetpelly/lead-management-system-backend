const sharp = require('sharp');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

// Add watermark to image
async function addImageWatermark(inputPath, outputPath) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Check if logo exists
    if (fsSync.existsSync(LOGO_PATH)) {
      // Single centered watermark with opacity
      const logoSize = Math.min(metadata.width, metadata.height) * 0.4;
      
      const logo = await sharp(LOGO_PATH)
        .resize(Math.floor(logoSize), Math.floor(logoSize), { fit: 'inside' })
        .ensureAlpha()
        .modulate({ brightness: 1, saturation: 1 })
        .composite([{
          input: Buffer.from([255, 255, 255, Math.floor(255 * 0.3)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();
      
      const logoMeta = await sharp(logo).metadata();
      const centerX = Math.floor((metadata.width - logoMeta.width) / 2);
      const centerY = Math.floor((metadata.height - logoMeta.height) / 2);

      await image
        .composite([{
          input: logo,
          top: centerY,
          left: centerX,
          blend: 'over'
        }])
        .toFile(outputPath);
    } else {
      // Fallback to text watermark
      const svgWatermark = Buffer.from(`
        <svg width="${metadata.width}" height="${metadata.height}">
          <text x="50%" y="50%" font-size="60" fill="rgba(0,0,0,0.2)" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="middle">
            REMINISCENT
          </text>
        </svg>
      `);

      await image.composite([{ input: svgWatermark, blend: 'over' }]).toFile(outputPath);
    }
    
    return outputPath;
  } catch (error) {
    throw new Error(`Image watermark failed: ${error.message}`);
  }
}

// Add watermark to PDF
async function addPdfWatermark(inputPath, outputPath) {
  try {
    const existingPdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    
    // Check if logo exists
    if (fsSync.existsSync(LOGO_PATH)) {
      // Single centered watermark per page
      const logoBytes = await fs.readFile(LOGO_PATH);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoScale = 0.3;
      const logoDims = logoImage.scale(logoScale);

      for (const page of pages) {
        const { width, height } = page.getSize();
        const centerX = (width - logoDims.width) / 2;
        const centerY = (height - logoDims.height) / 2;
        
        page.drawImage(logoImage, {
          x: centerX,
          y: centerY,
          width: logoDims.width,
          height: logoDims.height,
          opacity: 0.15
        });
      }
    } else {
      // Fallback to text watermark
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const watermarkText = 'REMINISCENT';

      for (const page of pages) {
        const { width, height } = page.getSize();
        const fontSize = 80;
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        
        page.drawText(watermarkText, {
          x: (width - textWidth) / 2,
          y: height / 2,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
          opacity: 0.15
        });
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
