async function doWatermark() {
    updateProgress(30, 'جاري إضافة العلامة المائية...');
    try {
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdf = await PDFDocument.load(buf);
        const text = document.getElementById('wmText')?.value || 'PDF Master Pro';
        const size = parseInt(document.getElementById('wmSize')?.value) || 30;
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        
        pdf.getPages().forEach(page => {
            const { width, height } = page.getSize();
            for (let y = 0; y < height; y += 150) {
                for (let x = 0; x < width; x += 200) {
                    page.drawText(text, {
                        x: x + 50,
                        y: y + 50,
                        size: size,
                        font: font,
                        color: rgb(0.7, 0.7, 0.7),
                        opacity: 0.3,
                        rotate: { angle: 45, type: 'degrees' }
                    });
                }
            }
        });
        
        const bytes = await pdf.save();
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تمت الإضافة!');
        showResult('<p>💧 تمت إضافة العلامة المائية</p>', 'watermarked.pdf');
    } catch(e) {
        hideProgress();
        showToast('❌ خطأ: ' + e.message, 'error');
    }
}
