// ============================================
// تحويل Office إلى PDF
// ============================================
async function doOffice2Pdf() {
    updateProgress(30, 'جاري قراءة الملف...');
    
    try {
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const buf = await readFileAB(files[0]);
        const fileName = files[0].name.replace(/[^\x00-\x7F]/g, '_');
        
        updateProgress(40, 'جاري معالجة المحتوى...');
        
        // قراءة الملف كنص
        const text = await readFileAsText(files[0]);
        
        updateProgress(70, 'جاري إنشاء PDF...');
        
        // إنشاء PDF جديد
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        
        // تقسيم النص لأسطر
        const lines = text.split('\n');
        let y = 800;
        const pageHeight = 842;
        const lineHeight = 14;
        let currentPage = doc.addPage([595, pageHeight]);
        
        // إضافة عنوان
        currentPage.drawText('File: ' + fileName, {
            x: 50, y: 820, size: 10, font, color: rgb(0.3, 0.3, 0.3)
        });
        currentPage.drawText('Converted by PDF Master Pro', {
            x: 50, y: 805, size: 8, font, color: rgb(0.5, 0.5, 0.5)
        });
        
        y = 780;
        
        // إضافة محتوى الملف
        for (let i = 0; i < lines.length; i++) {
            if (y < 50) {
                currentPage = doc.addPage([595, pageHeight]);
                y = 820;
            }
            
            const line = lines[i].replace(/[^\x00-\x7F]/g, ' ').substring(0, 80);
            if (line.trim()) {
                currentPage.drawText(line, {
                    x: 50, y: y, size: 10, font, color: rgb(0, 0, 0)
                });
                y -= lineHeight;
            }
        }
        
        const bytes = await doc.save();
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تم التحويل!');
        showResult(
            '<p>تم تحويل الملف الي PDF بنجاح</p>' +
            '<p style="color:#666;font-size:0.9rem;">' + fileName + '</p>',
            'converted.pdf'
        );
        showToast('تم تحويل الملف الي PDF', 'success');
        
    } catch (e) {
        hideProgress();
        console.error('Office conversion error:', e);
        showToast('Error: ' + e.message, 'error');
    }
}

// دالة مساعدة لقراءة الملف كنص
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        
        // قراءة حسب نوع الملف
        if (file.name.match(/\.(doc|docx)$/i)) {
            reader.readAsText(file, 'utf-8');
        } else if (file.name.match(/\.(xls|xlsx|csv)$/i)) {
            reader.readAsText(file, 'utf-8');
        } else if (file.name.match(/\.(ppt|pptx)$/i)) {
            reader.readAsText(file, 'utf-8');
        } else {
            reader.readAsText(file, 'utf-8');
        }
    });
}
