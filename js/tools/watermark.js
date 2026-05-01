// ============================================
// أداة العلامة المائية
// ============================================

async function doWatermark() {
    updateProgress(30, 'جاري اضافة العلامة المائية...');
    
    try {
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdf = await PDFDocument.load(buf);
        
        // الحصول على النص وتنظيفه من أي حروف غير إنجليزية
        let text = document.getElementById('wt')?.value || 'PDF Master Pro';
        
        // إزالة أي حروف غير إنجليزية (Unicode فوق 0x7F)
        text = text.replace(/[^\x00-\x7F]/g, '');
        
        // لو النص بقى فاضي، استخدم النص الافتراضي
        if (!text || text.trim().length === 0) {
            text = 'PDF Master Pro';
        }
        
        const size = parseInt(document.getElementById('ws')?.value) || 30;
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        
        // إضافة العلامة المائية لكل الصفحات
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
        
        // رسالة النجاح
        showResult(
            '<p>تمت اضافة العلامة المائية بنجاح</p>' +
            '<p style="color:#666;font-size:0.9rem;">النص المستخدم: ' + text + '</p>',
            'watermarked.pdf'
        );
        
        showToast('تمت اضافة العلامة المائية', 'success');
        
    } catch (e) {
        hideProgress();
        console.error('Watermark error:', e);
        
        if (e.message && e.message.includes('WinAnsi')) {
            showToast('Error: Use English letters only for watermark text', 'error');
        } else {
            showToast('Error: ' + e.message, 'error');
        }
    }
}
