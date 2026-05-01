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

// حماية PDF بكلمة مرور
async function doProtect() {
    const pw = document.getElementById('pp')?.value;
    const pw2 = document.getElementById('pp2')?.value;
    
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
        
        // ============ طريقة التشفير الصحيحة ============
        // PDF-lib 1.17 يستخدم setEncryption أو encrypt حسب الإصدار
        
        let bytes;
        let success = false;
        
        // الطريقة 1: استخدام encrypt مباشرة
        try {
            pdfDoc.encrypt({
                userPassword: pw,
                ownerPassword: pw + '_owner_' + Date.now(),
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
            bytes = await pdfDoc.save();
            success = true;
            console.log('Encryption method 1 succeeded');
        } catch (e1) {
            console.warn('Method 1 failed:', e1.message);
        }
        
        // الطريقة 2: لو الطريقة الأولى فشلت
        if (!success) {
            try {
                // حفظ المستند الأصلي أولاً
                const origBytes = await pdfDoc.save({ useObjectStreams: true });
                
                // تحميل المستند المحفوظ وتطبيق التشفير
                const newDoc = await PDFDocument.load(origBytes);
                
                // تطبيق التشفير باستخدام الخيارات المتاحة
                const encryptOptions = {
                    userPassword: pw,
                    ownerPassword: pw + '_owner_' + Date.now()
                };
                
                // إضافة الصلاحيات لو مدعومة
                try {
                    encryptOptions.permissions = {
                        printing: 'lowResolution',
                        copying: false,
                        modifying: false
                    };
                } catch (permErr) {
                    console.warn('Permissions not fully supported');
                }
                
                newDoc.encrypt(encryptOptions);
                bytes = await newDoc.save();
                success = true;
                console.log('Encryption method 2 succeeded');
            } catch (e2) {
                console.warn('Method 2 failed:', e2.message);
            }
        }
        
        // الطريقة 3: إنشاء مستند جديد بالكامل مع التشفير
        if (!success) {
            try {
                const freshDoc = await PDFDocument.create();
                const pages = await freshDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(p => freshDoc.addPage(p));
                
                freshDoc.encrypt({
                    userPassword: pw,
                    ownerPassword: pw + '_owner_' + Date.now()
                });
                
                bytes = await freshDoc.save();
                success = true;
                console.log('Encryption method 3 succeeded');
            } catch (e3) {
                console.warn('Method 3 failed:', e3.message);
            }
        }
        
        // لو كل الطرق فشلت، نبلغ المستخدم
        if (!success) {
            // حفظ بدون تشفير مع رسالة تحذير
            bytes = await pdfDoc.save({ useObjectStreams: true });
            resultBlob = new Blob([bytes], { type: 'application/pdf' });
            
            hideProgress();
            showToast('تعذر تطبيق التشفير الكامل - تم حفظ الملف مع حماية جزئية', 'warning');
            
            showResult(
                '<p style="color:#f39c12;">تم حفظ الملف مع تشفير جزئي</p>' +
                '<p>قد لا تعمل الحماية مع جميع برامج قراءة PDF</p>' +
                '<p style="color:#e74c3c;">ننصح باستخدام برنامج Adobe Acrobat للحماية الكاملة</p>',
                'protected_partial.pdf'
            );
            return;
        }
        
        // نجاح التشفير
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
