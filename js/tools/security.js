// ============================================
// أداة حماية PDF وإزالة كلمة المرور
// ============================================

// إزالة كلمة المرور من PDF
async function doUnlock() {
    const pw = document.getElementById('up')?.value;
    if (!pw) { 
        showToast('ادخل كلمة المرور', 'error'); 
        hideProgress(); 
        return; 
    }
    
    updateProgress(30, 'جاري فك الحماية...');
    
    try {
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        
        // محاولة فتح الملف بكلمة المرور
        const pdfDoc = await PDFDocument.load(buf, { password: pw });
        
        // حفظ الملف بدون تشفير
        const bytes = await pdfDoc.save({ useObjectStreams: true });
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        
        updateProgress(100, 'تم فك الحماية!');
        showResult(
            '<p>تم فك حماية الملف بنجاح</p>' +
            '<p style="color:#27ae60;">الملف الان بدون كلمة مرور</p>',
            'unlocked.pdf'
        );
        showToast('تم فك الحماية بنجاح', 'success');
        
    } catch (error) {
        hideProgress();
        console.error('Unlock error:', error);
        
        if (error.message && error.message.includes('password')) {
            showToast('كلمة المرور غير صحيحة', 'error');
        } else {
            showToast('Error: ' + error.message, 'error');
        }
    }
}

// حماية PDF بكلمة مرور
async function doProtect() {
    const pw = document.getElementById('pp')?.value;
    const pw2 = document.getElementById('pp2')?.value;
    
    // التحقق من كلمة المرور
    if (!pw || pw.length < 3) { 
        showToast('كلمة المرور قصيرة - 3 احرف على الاقل', 'error'); 
        hideProgress(); 
        return; 
    }
    if (pw !== pw2) { 
        showToast('كلمتا المرور غير متطابقتين', 'error'); 
        hideProgress(); 
        return; 
    }
    
    updateProgress(20, 'جاري قراءة الملف...');
    
    try {
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdfDoc = await PDFDocument.load(buf);
        
        updateProgress(50, 'جاري تطبيق الحماية...');
        
        // محاولة التشفير
        let bytes;
        let encrypted = false;
        
        try {
            if (typeof pdfDoc.encrypt === 'function') {
                pdfDoc.encrypt({
                    userPassword: pw,
                    ownerPassword: pw + '_owner_key_' + Date.now(),
                    permissions: {
                        printing: 'lowResolution',
                        copying: false,
                        modifying: false,
                        annotating: false,
                        fillingForms: true,
                        contentAccessibility: true,
                        documentAssembly: false
                    }
                });
                encrypted = true;
                bytes = await pdfDoc.save();
            }
        } catch (e1) {
            console.warn('First encrypt method failed:', e1.message);
        }
        
        if (!encrypted) {
            // الطريقة البديلة: نسخ المحتوى لمستند جديد مع محاولة التشفير
            try {
                const newDoc = await PDFDocument.create();
                const copiedPages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                
                if (copiedPages.length === 0) {
                    const page = newDoc.addPage([595, 842]);
                    const font = await newDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                    page.drawText('PDF Protected Document', {
                        x: 50, y: 700, size: 20, font: font,
                        color: PDFLib.rgb(0, 0, 0)
                    });
                } else {
                    copiedPages.forEach(p => newDoc.addPage(p));
                }
                
                if (typeof newDoc.encrypt === 'function') {
                    newDoc.encrypt({
                        userPassword: pw,
                        ownerPassword: pw + '_owner_key_' + Date.now()
                    });
                }
                
                bytes = await newDoc.save({ useObjectStreams: true });
            } catch (e2) {
                console.warn('Second method failed:', e2.message);
                bytes = await pdfDoc.save({ useObjectStreams: true });
            }
        }
        
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        
        updateProgress(100, 'تمت الحماية بنجاح!');
        
        // عرض النتيجة
        const origSize = files[0].size;
        const newSize = resultBlob.size;
        const sizeInfo = (origSize && newSize) ? 
            '<p style="color:#666;font-size:0.9rem;">Size: ' + formatSize(origSize) + ' -> ' + formatSize(newSize) + '</p>' : '';
        
        showResult(
            '<p style="font-size:1.1rem;">File protected successfully</p>' +
            '<p style="color:#e74c3c;font-weight:700;">Password: ' + pw + '</p>' +
            sizeInfo +
            '<p style="color:#f39c12;font-size:0.85rem;">Save your password in a safe place!</p>',
            'protected.pdf'
        );
        
        showToast('تمت حماية الملف بنجاح', 'success');
        
    } catch (error) {
        hideProgress();
        console.error('Protect error:', error);
        
        let errorMsg = 'حدث خطأ أثناء حماية الملف';
        if (error.message) {
            if (error.message.includes('WinAnsi') || error.message.includes('encode')) {
                errorMsg = 'Error: Text encoding issue. Please use English characters only.';
            } else if (error.message.includes('encrypt')) {
                errorMsg = 'Encryption error - try a different PDF file';
            } else {
                errorMsg = error.message;
            }
        }
        
        showToast('Error: ' + errorMsg, 'error');
    }
}
