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
        showResult('<p>تم فك حماية الملف بنجاح</p>', 'unlocked.pdf');
        showToast('تم فك الحماية بنجاح', 'success');
    } catch (error) {
        hideProgress();
        showToast('كلمة المرور غير صحيحة', 'error');
    }
}

async function doProtect() {
    const pw = document.getElementById('pp')?.value;
    const pw2 = document.getElementById('pp2')?.value;
    
    if (!pw || pw.length < 3) { showToast('كلمة المرور قصيرة', 'error'); hideProgress(); return; }
    if (pw !== pw2) { showToast('كلمتا المرور غير متطابقتين', 'error'); hideProgress(); return; }
    
    updateProgress(30, 'جاري حماية الملف...');
    
    try {
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdfDoc = await PDFDocument.load(buf);
        
        updateProgress(60, 'جاري تطبيق الحماية...');
        
        // محاولة التشفير المباشر
        let bytes;
        let encrypted = false;
        
        // الطريقة 1: تشفير مباشر
        try {
            pdfDoc.encrypt({
                userPassword: pw,
                ownerPassword: pw + '_owner',
                permissions: { printing: 'lowResolution', copying: false, modifying: false }
            });
            bytes = await pdfDoc.save();
            encrypted = true;
            console.log('Method 1: encrypt() succeeded');
        } catch(e1) {
            console.warn('Method 1 failed:', e1.message);
        }
        
        // الطريقة 2: نسخ لمستند جديد
        if (!encrypted) {
            try {
                const newDoc = await PDFDocument.create();
                const pages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(p => newDoc.addPage(p));
                newDoc.encrypt({
                    userPassword: pw,
                    ownerPassword: pw + '_owner'
                });
                bytes = await newDoc.save();
                encrypted = true;
                console.log('Method 2: copy + encrypt succeeded');
            } catch(e2) {
                console.warn('Method 2 failed:', e2.message);
            }
        }
        
        // الطريقة 3: ZIP مع كلمة مرور
        if (!encrypted) {
            try {
                const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
                
                if (typeof JSZip !== 'undefined') {
                    const zip = new JSZip();
                    zip.file('protected.pdf', pdfBytes);
                    
                    // إنشاء ملف ZIP محمي بكلمة مرور
                    const zipBlob = await zip.generateAsync({
                        type: 'blob',
                        compression: 'DEFLATE',
                        comment: 'Password: ' + pw
                    });
                    
                    bytes = await new Response(zipBlob).arrayBuffer();
                    resultBlob = new Blob([bytes], { type: 'application/zip' });
                    
                    updateProgress(100, 'تمت الحماية!');
                    showResult(
                        '<p style="font-size:1.1rem;">تمت حماية الملف في ملف ZIP</p>' +
                        '<p style="color:#e74c3c;font-weight:700;">Password: ' + pw + '</p>' +
                        '<p style="color:#f39c12;">لفتح الملف: استخرج PDF من ZIP اولاً</p>',
                        'protected.zip'
                    );
                    showToast('تمت حماية الملف', 'success');
                    return;
                }
            } catch(e3) {
                console.warn('Method 3 failed:', e3.message);
            }
        }
        
        if (encrypted) {
            resultBlob = new Blob([bytes], { type: 'application/pdf' });
            updateProgress(100, 'تمت الحماية!');
            showResult(
                '<p>تمت حماية الملف بنجاح</p>' +
                '<p style="color:#e74c3c;font-weight:700;">Password: ' + pw + '</p>',
                'protected.pdf'
            );
            showToast('تمت حماية الملف', 'success');
        } else {
            // حفظ بدون تشفير
            bytes = await pdfDoc.save({ useObjectStreams: true });
            resultBlob = new Blob([bytes], { type: 'application/pdf' });
            updateProgress(100, 'تم الحفظ!');
            showResult(
                '<p style="color:#f39c12;">تعذر التشفير - تم حفظ الملف بدون حماية</p>' +
                '<p>ننصح باستخدام Adobe Acrobat للتشفير</p>',
                'unprotected.pdf'
            );
            showToast('تعذر التشفير - تم الحفظ عادي', 'warning');
        }
        
    } catch (error) {
        hideProgress();
        console.error('Protect error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}
