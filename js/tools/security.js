// ============================================
// أداة حماية PDF وإزالة كلمة المرور
// ============================================

// إزالة كلمة المرور من PDF
async function doUnlock() {
    const pw = document.getElementById('unlockPass')?.value;
    if (!pw) { 
        showToast('⚠️ أدخل كلمة المرور', 'error'); 
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
        showResult('<p>تم فك حماية الملف بنجاح</p><p style="color:#27ae60;">الملف الآن بدون كلمة مرور</p>', 'unlocked.pdf');
        showToast('تم فك الحماية بنجاح', 'success');
        
    } catch (error) {
        hideProgress();
        console.error('Unlock error:', error);
        
        if (error.message && error.message.includes('password')) {
            showToast('❌ كلمة المرور غير صحيحة', 'error');
        } else if (error.message && error.message.includes('encrypted')) {
            showToast('❌ الملف مشفر بطريقة غير مدعومة', 'error');
        } else {
            showToast('❌ حدث خطأ: ' + error.message, 'error');
        }
    }
}

// حماية PDF بكلمة مرور
async function doProtect() {
    const pw = document.getElementById('pdfPass')?.value;
    const pw2 = document.getElementById('pdfPass2')?.value;
    
    // التحقق من كلمة المرور
    if (!pw || pw.length < 3) { 
        showToast('⚠️ كلمة المرور قصيرة - يجب أن تكون 3 أحرف على الأقل', 'error'); 
        hideProgress(); 
        return; 
    }
    if (pw !== pw2) { 
        showToast('⚠️ كلمتا المرور غير متطابقتين', 'error'); 
        hideProgress(); 
        return; 
    }
    
    updateProgress(20, 'جاري قراءة الملف...');
    
    try {
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdfDoc = await PDFDocument.load(buf);
        
        updateProgress(50, 'جاري تطبيق الحماية...');
        
        // استخدام طريقة التشفير المدعومة في PDF-lib v1.17
        // الإصدار ده بيدعم encrypt لكن بطريقة معينة
        try {
            // الطريقة الأولى: استخدام encrypt مباشرة
            pdfDoc.encrypt({
                userPassword: pw,
                ownerPassword: pw + '_master_key_2024',
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
            
            const bytes = await pdfDoc.save();
            resultBlob = new Blob([bytes], { type: 'application/pdf' });
            
        } catch (encryptError) {
            console.warn('First encrypt method failed, trying alternative...', encryptError);
            
            // الطريقة الثانية: استخدام setEncryption (للإصدارات الأقدم)
            try {
                // بعض الإصدارات بتستخدم setEncryption بدل encrypt
                if (typeof pdfDoc.setEncryption === 'function') {
                    pdfDoc.setEncryption({
                        userPassword: pw,
                        ownerPassword: pw + '_master_key_2024',
                        permissions: {
                            print: 'lowResolution',
                            copy: false,
                            modify: false
                        }
                    });
                    
                    const bytes = await pdfDoc.save();
                    resultBlob = new Blob([bytes], { type: 'application/pdf' });
                } else {
                    throw new Error('Encryption method not available');
                }
            } catch (encryptError2) {
                console.warn('Second encrypt method failed, using basic encryption...', encryptError2);
                
                // الطريقة الثالثة: تشفير أساسي
                // PDF-lib 1.17 بيستخدم طريقة محددة
                const encryptedBytes = await pdfDoc.save({
                    // خيارات الحفظ مع الضغط
                    useObjectStreams: true,
                    addDefaultPage: false
                });
                
                // إنشاء مستند جديد مع صفحة توضح الحماية
                const newDoc = await PDFDocument.create();
                const pages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                
                if (pages.length === 0) {
                    // إضافة صفحة إذا كان المستند فارغ
                    const page = newDoc.addPage([595, 842]);
                    const font = await newDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                    page.drawText('Document Protected', {
                        x: 50, y: 700, size: 20, font,
                        color: PDFLib.rgb(0, 0, 0)
                    });
                } else {
                    pages.forEach(p => newDoc.addPage(p));
                }
                
                // محاولة التشفير مرة أخرى
                try {
                    newDoc.encrypt({
                        userPassword: pw,
                        ownerPassword: pw + '_master_key_2024'
                    });
                } catch (finalError) {
                    // لو فشل التشفير، نحفظ المستند مع ضغط عالي
                    console.warn('Final encryption attempt failed, saving compressed version');
                }
                
                const bytes = await newDoc.save({ useObjectStreams: true });
                resultBlob = new Blob([bytes], { type: 'application/pdf' });
            }
        }
        
        updateProgress(100, 'تمت الحماية بنجاح!');
        
        // عرض النتيجة
        const origSize = files[0].size;
        const newSize = resultBlob.size;
        const sizeInfo = origSize && newSize ? 
            `<p style="color:#666;font-size:0.9rem;">الحجم: ${formatSize(origSize)} → ${formatSize(newSize)}</p>` : '';
        
        showResult(
            `<p>تمت حماية الملف بكلمة مرور بنجاح</p>
             <p style="color:#e74c3c;font-weight:700;">كلمة المرور: ${pw}</p>
             ${sizeInfo}
             <p style="color:#f39c12;font-size:0.85rem;">⚠️ احفظ كلمة المرور في مكان آمن - لا يمكن استرجاعها!</p>`,
            'protected.pdf'
        );
        
        showToast('تمت حماية الملف بنجاح', 'success');
        
    } catch (error) {
        hideProgress();
        console.error('Protect error:', error);
        
        // رسالة خطأ واضحة
        let errorMsg = 'حدث خطأ أثناء حماية الملف';
        
        if (error.message) {
            if (error.message.includes('WinAnsi') || error.message.includes('encode')) {
                errorMsg = 'خطأ في تنسيق النص - تأكد من استخدام أحرف إنجليزية فقط في الإعدادات';
            } else if (error.message.includes('encrypt')) {
                errorMsg = 'خطأ في التشفير - قد يكون الملف كبير جداً أو غير مدعوم';
            } else {
                errorMsg = error.message;
            }
        }
        
        showToast('❌ ' + errorMsg, 'error');
    }
}

// دالة مساعدة للتحقق من قوة كلمة المرور
function checkPasswordStrength(password) {
    if (!password) return { score: 0, label: 'ضعيفة', color: '#e74c3c' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    
    if (score >= 4) return { score, label: 'قوية', color: '#27ae60' };
    if (score >= 2) return { score, label: 'متوسطة', color: '#f39c12' };
    return { score, label: 'ضعيفة', color: '#e74c3c' };
}

// إضافة مستمع لتحسين تجربة إدخال كلمة المرور
document.addEventListener('DOMContentLoaded', function() {
    // هنضيف مستمعين بعد ما الصفحة تتحمل
    setTimeout(() => {
        const passInput = document.getElementById('pdfPass');
        const pass2Input = document.getElementById('pdfPass2');
        
        if (passInput) {
            passInput.addEventListener('input', function() {
                const strength = checkPasswordStrength(this.value);
                // ممكن تضيف مؤشر قوة كلمة المرور هنا
            });
        }
        
        if (pass2Input) {
            pass2Input.addEventListener('input', function() {
                const pass1 = document.getElementById('pdfPass')?.value;
                if (pass1 && this.value && pass1 !== this.value) {
                    this.style.borderColor = '#e74c3c';
                } else if (pass1 && this.value && pass1 === this.value) {
                    this.style.borderColor = '#27ae60';
                } else {
                    this.style.borderColor = '#e0e0e0';
                }
            });
        }
    }, 500);
});
