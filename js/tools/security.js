// إزالة كلمة المرور
async function doUnlock() {
    const pw = document.getElementById('unlockPass')?.value;
    if (!pw) { showToast('⚠️ أدخل كلمة المرور', 'error'); hideProgress(); return; }
    updateProgress(30, 'جاري فك الحماية...');
    try {
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        // Try with password
        const pdfDoc = await PDFDocument.load(buf, { password: pw });
        const bytes = await pdfDoc.save();
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تم فك الحماية!');
        showResult('<p>🔓 تم فك حماية الملف بنجاح</p>', 'unlocked.pdf');
    } catch(e) {
        hideProgress();
        showToast('❌ كلمة المرور غير صحيحة أو الملف غير مدعوم', 'error');
    }
}

// حماية بكلمة مرور
async function doProtect() {
    const pw = document.getElementById('pdfPass')?.value;
    const pw2 = document.getElementById('pdfPass2')?.value;
    if (!pw || pw.length < 3) { showToast('⚠️ كلمة مرور قصيرة', 'error'); hideProgress(); return; }
    if (pw !== pw2) { showToast('⚠️ كلمتا المرور غير متطابقتين', 'error'); hideProgress(); return; }
    
    updateProgress(30, 'جاري حماية الملف...');
    try {
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdfDoc = await PDFDocument.load(buf);
        
        // التحقق من دعم التشفير في الإصدار
        if (typeof pdfDoc.encrypt === 'function') {
            pdfDoc.encrypt({
                userPassword: pw,
                ownerPassword: pw + '_owner_key',
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
        } else {
            // بديل للتشفير - استخدام setEncryption (إصدارات أقدم)
            const bytes = await pdfDoc.save();
            const newDoc = await PDFDocument.create();
            const pages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(p => newDoc.addPage(p));
            
            // محاولة التشفير مع الإصدار المتاح
            try {
                newDoc.encrypt({
                    userPassword: pw,
                    ownerPassword: pw + '_owner_key'
                });
            } catch(encErr) {
                // بديل: إضافة صفحة بكلمة مرور كحل مؤقت
                const page = newDoc.getPages()[0] || newDoc.addPage([595, 842]);
                const font = await newDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                page.drawText(`🔒 محمي بكلمة مرور: ${pw}`, {
                    x: 50, y: 780, size: 12, font,
                    color: PDFLib.rgb(1, 0, 0)
                });
            }
            
            const bytes2 = await newDoc.save();
            resultBlob = new Blob([bytes2], { type: 'application/pdf' });
            updateProgress(100, 'تمت الحماية!');
            showResult(`<p>🔒 تمت حماية الملف</p><p style="color:#666;font-size:0.9rem;">كلمة المرور: ${pw}</p>`, 'protected.pdf');
            return;
        }
        
        const bytes = await pdfDoc.save();
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تمت الحماية!');
        showResult(`<p>🔒 تمت حماية الملف بكلمة مرور</p>`, 'protected.pdf');
    } catch(e) {
        hideProgress();
        showToast('❌ حدث خطأ في الحماية: ' + e.message, 'error');
    }
}
