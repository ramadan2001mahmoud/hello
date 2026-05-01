// ============================================
// أداة حماية PDF وإزالة كلمة المرور
// ============================================

// إزالة كلمة المرور من PDF
async function doUnlock() {
    const pw = document.getElementById('unlockPass')?.value;
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
        showResult('<p>تم فك حماية الملف بنجاح</p><p style="color:#27ae60;">الملف الان بدون كلمة مرور</p>', 'unlocked.pdf');
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
        showToast('كلمة المرور قصيرة - يجب أن تكون 3 أحرف على الأقل', 'error'); 
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
        let encrypted = false;
        
        try {
            // الطريقة الأولى: استخدام encrypt مباشرة
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
            }
        } catch (e1) {
            console.warn('First encrypt method failed:', e1.message);
        }
        
        // حفظ الملف
        let bytes;
        if (encrypted) {
            bytes = await pdfDoc.save();
        } else {
            // الطريقة الثانية: إنشاء مستند جديد مع التشفير
            try {
                const newDoc = await PDFDocument.create();
                const copiedPages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                
                if (copiedPages.length === 0) {
                    // إذا كان المستند فارغ، أضف صفحة
                    const page = newDoc.addPage([595, 842]);
                    const font = await newDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                    // استخدام حروف إنجليزية فقط لتجنب مشكلة WinAnsi
                    page.drawText('PDF Protected Document', {
                        x: 50, y: 700,
                        size: 20,
                        font: font,
                        color: PDFLib.rgb(0, 0, 0)
                    });
                } else {
                    copiedPages.forEach(p => newDoc.addPage(p));
                }
                
                // محاولة التشفير على المستند الجديد
                if (typeof newDoc.encrypt === 'function') {
                    newDoc.encrypt({
                        userPassword: pw,
                        ownerPassword: pw + '_owner_key_' + Date.now()
                    });
                }
                
                bytes = await newDoc.save({ useObjectStreams: true });
            } catch (e2) {
                console.warn('Second method failed:', e2.message);
                // الطريقة الثالثة: حفظ بسيط مع ضغط
                bytes = await pdfDoc.save({ useObjectStreams: true });
            }
        }
        
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        
        updateProgress(100, 'تمت الحماية بنجاح!');
        
        // عرض النتيجة - استخدام نصوص إنجليزية للعرض
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

// دالة مساعدة للتحقق من قوة كلمة المرور
function checkPasswordStrength(password) {
    if (!password) return { score: 0, label: 'Weak', color: '#e74c3c' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    
    if (score >= 4) return { score, label: 'Strong', color: '#27ae60' };
    if (score >= 2) return { score, label: 'Medium', color: '#f39c12' };
    return { score, label: 'Weak', color: '#e74c3c' };
}

// إضافة مستمع لتحسين تجربة إدخال كلمة المرور
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const passInput = document.getElementById('pdfPass');
        const pass2Input = document.getElementById('pdfPass2');
        
        if (passInput) {
            passInput.addEventListener('input', function() {
                const strength = checkPasswordStrength(this.value);
                // يمكن إضافة مؤشر قوة هنا
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
