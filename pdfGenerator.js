// ====================================
//  סמי בוט – יצירת PDF עם pdfkit
// ====================================

const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');
const config      = require('./config');

async function generateQuotePDF({ clientName, businessName, photos, videos, total, pricePhoto, priceVideo }) {
  const quotesDir = path.join(__dirname, 'quotes');
  if (!fs.existsSync(quotesDir)) fs.mkdirSync(quotesDir);

  const outputPath = path.join(quotesDir, `${businessName}. הצעת מחיר.pdf`);
  const today      = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
  const quoteNum   = `QT-${Date.now().toString().slice(-6)}`;
  const photoTotal = photos * pricePhoto;
  const videoTotal = videos * priceVideo;

  return new Promise((resolve, reject) => {
    const doc  = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // ── רקע כחול לכותרת ──
    doc.rect(0, 0, 595, 140).fill('#1a3a6e');

    // ── לוגו / שם ──
    const logoPath = path.join(__dirname, 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 30, { height: 60, fit: [150, 60] });
    } else {
      doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold').text('IWDZN', 50, 45);
    }

    // ── מספר הצעה ──
    doc.fontSize(9).fillColor('rgba(255,255,255,0.7)').font('Helvetica').text('QUOTE NUMBER', 420, 40, { width: 120, align: 'right' });
    doc.fontSize(13).fillColor('#ffffff').font('Helvetica-Bold').text(quoteNum, 420, 54, { width: 120, align: 'right' });

    // ── כותרת ──
    doc.fontSize(28).fillColor('#ffffff').font('Helvetica-Bold').text('Quote', 50, 90);
    doc.fontSize(11).fillColor('rgba(255,255,255,0.75)').font('Helvetica').text(today, 50, 122);

    // ── פס כחול ──
    doc.rect(0, 140, 595, 5)
       .fill('#2563b0');

    // ── פרטי לקוח ──
    doc.rect(50, 165, 4, 50).fill('#1a3a6e');
    doc.rect(54, 165, 490, 50).fill('#f0f7ff');

    doc.fontSize(14).fillColor('#0f2657').font('Helvetica-Bold').text(clientName, 70, 175);
    doc.fontSize(11).fillColor('#4b5563').font('Helvetica').text(businessName, 70, 193);

    // ── טבלת שירותים ──
    const tableTop = 240;
    doc.rect(50, tableTop, 494, 30).fill('#0f2657');
    doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('Service', 60, tableTop + 9);
    doc.text('Qty', 280, tableTop + 9, { width: 60, align: 'center' });
    doc.text('Unit Price', 340, tableTop + 9, { width: 90, align: 'center' });
    doc.text('Total', 430, tableTop + 9, { width: 100, align: 'right' });

    let y = tableTop + 30;
    const rows = [];
    if (photos > 0) rows.push({ name: 'Photography', qty: photos, unit: pricePhoto, sub: photoTotal });
    if (videos > 0) rows.push({ name: 'Video Production', qty: videos, unit: priceVideo, sub: videoTotal });

    rows.forEach((row, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f8faff';
      doc.rect(50, y, 494, 35).fill(bg);
      doc.fontSize(11).fillColor('#374151').font('Helvetica');
      doc.text(row.name, 60, y + 11);
      doc.text(String(row.qty), 280, y + 11, { width: 60, align: 'center' });
      doc.text(`ILS ${row.unit.toLocaleString()}`, 340, y + 11, { width: 90, align: 'center' });
      doc.font('Helvetica-Bold').text(`ILS ${row.sub.toLocaleString()}`, 430, y + 11, { width: 100, align: 'right' });
      y += 35;
    });

    // ── סכום סופי ──
    y += 20;
    doc.rect(50, y, 494, 70).fill('#0f2657').roundedRect(50, y, 250, 70, 8).fill('#0f2657');
    doc.fontSize(10).fillColor('rgba(255,255,255,0.7)').font('Helvetica').text('TOTAL AMOUNT DUE', 65, y + 15);
    doc.fontSize(28).fillColor('#ffffff').font('Helvetica-Bold').text(`ILS ${total.toLocaleString()}`, 65, y + 30);

    // ── הערות ──
    y += 90;
    doc.rect(50, y, 494, 55).fill('#fffbeb');
    doc.rect(50, y, 494, 55).stroke('#fde68a');
    doc.fontSize(9).fillColor('#92400e').font('Helvetica-Bold').text('NOTES', 65, y + 12);
    doc.fontSize(10).fillColor('#78350f').font('Helvetica')
       .text('This quote is valid for 14 days from the date of issue. To confirm, please contact us directly.', 65, y + 26, { width: 460 });

    // ── Footer ──
    doc.rect(0, 780, 595, 61).fill('#0f2657');
    doc.fontSize(10).fillColor('rgba(255,255,255,0.55)').font('Helvetica')
       .text(`Quote #${quoteNum}  •  ${today}`, 50, 797);
    doc.fontSize(11).fillColor('rgba(255,255,255,0.85)').font('Helvetica-Bold')
       .text('IWDZN', 0, 797, { align: 'right', width: 545 });

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateQuotePDF };
