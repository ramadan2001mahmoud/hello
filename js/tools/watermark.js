// ============================================
// أداة العلامة المائية
// ============================================

async function doWatermark() {
    updateProgress(30, 'جاري اضافة العلامة المائية...');
    
    try {
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdf = await PDFDocument.load(buf);
        
        // استخدام نص إنجليزي فقط للعلامة المائية
        // لأن WinAnsi لا يدعم العربية في الـ embedding
        let text = document.getElementById('wmText')?.value || 'PDF Master Pro';
        const size = parseInt(document.getElementById('wmSize')?.value) || 30;
        
        // إزالة أي حروف غير إنجليزية من النص
        text = text.replace(/[^\x00-\x7F]/g, '');
        if (!text || text.length === 0) {
            text = 'PDF Master Pro';
        }
        
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
        updateProgress(100, 'تمت الاضافة!');
        showResult('<p>تمت اضافة العلامة المائية بنجاح</p><p style="color:#666;">النص: ' + text + '</p>', 'watermarked.pdf');
        showToast('تمت اضافة العلامة المائية', 'success');
        
    } catch (e) {
        hideProgress();
        console.error('Watermark error:', e);
        
        if (e.message && e.message.includes('WinAnsi')) {
            showToast('استخدم حروف إنجليزية فقط في نص العلامة المائية', 'error');
        } else {
            showToast('خطا: ' + e.message, 'error');
        }
    }
}
