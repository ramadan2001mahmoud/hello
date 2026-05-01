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
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdfDoc = await PDFDocument.load(buf);
        
        updateProgress(50, 'جاري تطبيق الحماية...');
        
        let bytes;
        
        // ============ طريقة التشفير المتوافقة مع PDF-lib 1.17 ============
        // PDF-lib 1.17 يستخدم طريقة محددة للتشفير عبر كائن options
        
        const encryptOptions = {
            userPassword: pw,
            ownerPassword: pw + '_owner_' + Date.now()
        };
        
        // إضافة الصلاحيات بشكل متوافق
        const permissions = {
            printing: 'lowResolution',
            copying: false,
            modifying: false,
            annotating: false,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: false
        };
        
        try {
            // محاولة التشفير مع الصلاحيات الكاملة
            pdfDoc.encrypt({ ...encryptOptions, permissions });
            bytes = await pdfDoc.save();
            console.log('Encryption with full permissions succeeded');
        } catch (e1) {
            console.warn('Full permissions failed:', e1.message);
            
            try {
                // محاولة التشفير مع صلاحيات أقل
                pdfDoc.encrypt({
                    userPassword: pw,
                    ownerPassword: pw + '_owner_' + Date.now(),
                    permissions: {
                        printing: 'lowResolution',
                        copying: false,
                        modifying: false
                    }
                });
                bytes = await pdfDoc.save();
                console.log('Encryption with basic permissions succeeded');
            } catch (e2) {
                console.warn('Basic permissions failed:', e2.message);
                
                try {
                    // محاولة التشفير بدون صلاحيات
                    pdfDoc.encrypt({
                        userPassword: pw,
                        ownerPassword: pw + '_owner_' + Date.now()
                    });
                    bytes = await pdfDoc.save();
                    console.log('Encryption without permissions succeeded');
                } catch (e3) {
                    console.warn('No permissions failed:', e3.message);
                    
                    try {
                        // محاولة أخيرة - استخدام setEncryption لو موجودة
                        if (typeof pdfDoc.setEncryption === 'function') {
                            pdfDoc.setEncryption({
                                userPassword: pw,
                                ownerPassword: pw + '_owner_' + Date.now()
                            });
                            bytes = await pdfDoc.save();
                            console.log('setEncryption succeeded');
                        } else {
                            throw new Error('setEncryption not available');
                        }
                    } catch (e4) {
                        console.error('All encryption methods failed');
                        hideProgress();
                        showToast('المتصفح لا يدعم تشفير PDF. استخدم برنامج Adobe Acrobat.', 'error');
                        return;
                    }
                }
            }
        }
        
        // نجاح - إنشاء الملف
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
        console.error('Protect error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}
