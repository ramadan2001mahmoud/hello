// ============================================
// حماية وإزالة كلمة المرور
// ============================================

async function doUnlock() {
    const pw = document.getElementById('up')?.value;
    if (!pw) { showToast('ادخل كلمة المرور', 'error'); hideProgress(); return; }
    updateProgress(30, 'جاري فك الحماية...');
    try {
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdfDoc = await PDFDocument.load(buf, { password: pw });
        const bytes = await pdfDoc.save({ useObjectStreams: true });
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تم فك الحماية!');
        showResult('<p>تم فك حماية الملف بنجاح</p><p style="color:#27ae60;">الملف الان بدون كلمة مرور</p>', 'unlocked.pdf');
        showToast('تم فك الحماية بنجاح', 'success');
    } catch (error) {
        hideProgress();
        if (error.message && error.message.includes('password')) {
            showToast('كلمة المرور غير صحيحة', 'error');
        } else {
            showToast('Error: ' + error.message, 'error');
        }
    }
}

async function doProtect() {
    const pw = document.getElementById('pp')?.value;
    const pw2 = document.getElementById('pp2')?.value;
    
    if (!pw || pw.length < 3) { showToast('كلمة المرور قصيرة - 3 احرف على الاقل', 'error'); hideProgress(); return; }
    if (pw !== pw2) { showToast('كلمتا المرور غير متطابقتين', 'error'); hideProgress(); return; }
    
    updateProgress(20, 'جاري قراءة الملف...');
    
    try {
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdfDoc = await PDFDocument.load(buf);
        
        updateProgress(50, 'جاري تطبيق الحماية...');
        
        let bytes;
        let success = false;
        
        // 4 محاولات للتشفير
        try {
            pdfDoc.encrypt({
                userPassword: pw,
                ownerPassword: pw + '_owner_' + Date.now(),
                permissions: { printing: 'lowResolution', copying: false, modifying: false, annotating: false, fillingForms: true, contentAccessibility: true, documentAssembly: false }
            });
            bytes = await pdfDoc.save();
            success = true;
        } catch(e1) {}
        
        if (!success) {
            try {
                const tempBytes = await pdfDoc.save({ useObjectStreams: true });
                const newDoc = await PDFDocument.load(tempBytes);
                newDoc.encrypt({ userPassword: pw, ownerPassword: pw + '_owner_' + Date.now() });
                bytes = await newDoc.save();
                success = true;
            } catch(e2) {}
        }
        
        if (!success) {
            try {
                const newDoc = await PDFDocument.create();
                const pages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(p => newDoc.addPage(p));
                newDoc.encrypt({ userPassword: pw, ownerPassword: pw + '_owner_' + Date.now() });
                bytes = await newDoc.save();
                success = true;
            } catch(e3) {}
        }
        
        if (!success) {
            try {
                const newDoc = await PDFDocument.create();
                const pages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(p => newDoc.addPage(p));
                newDoc.encrypt({ userPassword: pw, ownerPassword: pw + '_owner_' + Date.now() });
                bytes = await newDoc.save({ useObjectStreams: true });
                success = true;
            } catch(e4) {}
        }
        
        if (!success) {
            hideProgress();
            showToast('فشل تطبيق التشفير - جرب ملف PDF مختلف', 'error');
            return;
        }
        
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تمت الحماية بنجاح!');
        showResult(
            '<p style="font-size:1.1rem;">تمت حماية الملف بنجاح</p>' +
            '<p style="color:#e74c3c;font-weight:700;">Password: ' + pw + '</p>' +
            '<p style="color:#f39c12;font-size:0.85rem;">احفظ كلمة المرور في مكان امن</p>',
            'protected.pdf'
        );
        showToast('تمت حماية الملف بنجاح', 'success');
        
    } catch (error) {
        hideProgress();
        showToast('Error: ' + error.message, 'error');
    }
}
